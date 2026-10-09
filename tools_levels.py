"""
Level generator + solver for Quantum Maze Race.

For every level it:
  1. builds a maze (seeded, so results are reproducible),
  2. places gates / checkpoints / exit following the level's "idea",
  3. SOLVES it (BFS over position x qubit-state x checkpoints) to prove it is
     winnable, measures difficulty, and checks that nobody can get soft-locked,
  4. writes src/levels.ts (including a par time used by the scoring system).

Run:  python3 tools_levels.py
"""
import random
from collections import deque, defaultdict

DIRS = [(0, -1), (0, 1), (-1, 0), (1, 0)]
ST = {'0': 0, '1': 1, '+': 2, '-': 3}
# 0->|0>  1->|1>  2->|+>  3->|->     (same tables as the game engine)
GATE = {'H': [2, 3, 0, 1], 'X': [1, 0, 2, 3], 'Z': [0, 1, 3, 2], 'Y': [1, 0, 3, 2]}
STEP_TIME = 0.13  # seconds per move in the engine


def gen_maze(cw, ch, rng, loops):
    W, H = cw * 2 + 1, ch * 2 + 1
    g = [['#'] * W for _ in range(H)]
    sx, sy = rng.randrange(cw), rng.randrange(ch)
    g[2 * sy + 1][2 * sx + 1] = '.'
    seen = {(sx, sy)}
    stack = [(sx, sy)]
    while stack:
        x, y = stack[-1]
        nb = [(x + dx, y + dy, dx, dy) for dx, dy in DIRS
              if 0 <= x + dx < cw and 0 <= y + dy < ch and (x + dx, y + dy) not in seen]
        if not nb:
            stack.pop()
            continue
        nx, ny, dx, dy = rng.choice(nb)
        g[2 * y + 1 + dy][2 * x + 1 + dx] = '.'
        g[2 * ny + 1][2 * nx + 1] = '.'
        seen.add((nx, ny))
        stack.append((nx, ny))
    walls = [(x, y) for y in range(1, H - 1) for x in range(1, W - 1)
             if g[y][x] == '#' and ((x % 2 == 1) != (y % 2 == 1))]
    rng.shuffle(walls)
    for x, y in walls[:loops]:
        g[y][x] = '.'
    return g


def carve(g, x0, y0, w, h):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            g[y][x] = '.'


def bfs_dist(g, src):
    H, W = len(g), len(g[0])
    d = {src: 0}
    q = deque([src])
    while q:
        x, y = q.popleft()
        for dx, dy in DIRS:
            n = (x + dx, y + dy)
            if 0 <= n[0] < W and 0 <= n[1] < H and g[n[1]][n[0]] != '#' and n not in d:
                d[n] = d[(x, y)] + 1
                q.append(n)
    return d


def free_nb(g, x, y):
    return [(x + dx, y + dy) for dx, dy in DIRS if g[y + dy][x + dx] != '#']


def build(spec, seed):
    rng = random.Random(seed)
    cw, ch = spec['cells']
    g = gen_maze(cw, ch, rng, spec['loops'])
    H, W = len(g), len(g[0])
    for _ in range(spec.get('rooms', 0)):
        x0 = rng.randrange(0, (W - 3) // 2) * 2 + 1
        y0 = rng.randrange(0, (H - 3) // 2) * 2 + 1
        carve(g, x0, y0, 3, 3)
    if spec.get('start_room'):
        x0 = rng.randrange(0, (W - 3) // 2) * 2 + 1
        y0 = rng.randrange(0, (H - 3) // 2) * 2 + 1
        carve(g, x0, y0, 3, 3)
        S = (x0 + 1, y0 + 1)
    else:
        cand = [(x, y) for y in range(1, H - 1) for x in range(1, W - 1) if g[y][x] == '.']
        S = rng.choice(cand)
    dS = bfs_dist(g, S)
    far = max(dS.values())
    dead = [p for p, d in dS.items() if len(free_nb(g, *p)) == 1 and d >= far * spec.get('exit_far', 0.6) and p != S]
    if not dead:
        return None
    E = rng.choice(dead)
    items = {}

    def ok(p, ch_):
        if p == S or p == E or g[p[1]][p[0]] != '.' or p in items:
            return False
        if dS[p] <= 2:  # keep the spawn area clean (up to 4 racers start here)
            return False
        for q, c in items.items():
            dist = abs(p[0] - q[0]) + abs(p[1] - q[1])
            if dist < 2:
                return False
            if ch_ == 'C' and c == 'C' and dist < spec.get('cp_gap', 5):
                return False
        return True

    cells = [p for p in dS if p not in (S, E)]
    letters = ['C'] * spec['cps'] + [k for k, n in spec['gates'].items() for _ in range(n)]
    letters.sort(key=lambda c: 0 if c == 'C' else 1)
    for L in letters:
        for _ in range(400):
            p = rng.choice(cells)
            if ok(p, L):
                items[p] = L
                break
        else:
            return None
    for (x, y), L in items.items():
        g[y][x] = L
    g[E[1]][E[0]] = 'E'
    g[S[1]][S[0]] = 'S'
    return [''.join(r) for r in g]


def analyze(rows, target, gates_on=True, mmode='safe', softlock=False):
    """mmode: 'harmless' | 'safe' (M only crossed while |0>/|1>) | 'full' (real engine behaviour)"""
    H, W = len(rows), len(rows[0])
    cid, types, coords = {}, [], []
    for y in range(H):
        for x in range(W):
            if rows[y][x] != '#':
                cid[(x, y)] = len(types)
                types.append(rows[y][x])
                coords.append((x, y))
    nbr = [[cid[(x + dx, y + dy)] for dx, dy in DIRS if (x + dx, y + dy) in cid] for x, y in coords]
    S, E = types.index('S'), types.index('E')
    cps = [i for i, t in enumerate(types) if t == 'C']
    bit = {c: 1 << k for k, c in enumerate(cps)}
    full = (1 << len(cps)) - 1
    tgt = ST[target]
    start = (S, 0, 0)
    prev, dist = {start: None}, {start: 0}
    q = deque([start])
    rev = defaultdict(list)
    goalnodes, best = set(), None
    while q:
        node = q.popleft()
        c, st, m = node
        for n in nbr[c]:
            t = types[n]
            if n == E:
                if m == full and (not gates_on or st == tgt):
                    goalnodes.add(node)
                    if best is None:
                        best = node
                continue
            if not gates_on and t != 'C':
                t = '.'
            if t == 'M' and mmode == 'harmless':
                t = '.'
            nst, nm, outs = st, m, None
            if t in GATE:
                nst = GATE[t][st]
            elif t == 'C':
                nm = m | bit[n]
            elif t == 'M':
                if st >= 2:
                    if mmode == 'safe':
                        continue
                    outs = [(S, 0, m), (S, 1, m)]
                else:
                    outs = [(n, st, m)]
            if outs is None:
                outs = [(n, nst, nm)]
            for o in outs:
                if softlock:
                    rev[o].append(node)
                if o not in prev:
                    prev[o] = node
                    dist[o] = dist[node] + 1
                    q.append(o)
        if best is not None and not softlock:
            break
    if best is None:
        return None
    path, n = [], best
    while n is not None:
        path.append(n)
        n = prev[n]
    path.reverse()
    cells_path = [coords[p[0]] for p in path] + [coords[E]]
    seq = [types[p[0]] for p in path[1:] if types[p[0]] in 'HXZYM']
    res = {'steps': dist[best] + 1, 'path': cells_path, 'seq': seq}
    if softlock:
        can = set(goalnodes)
        dq = deque(goalnodes)
        while dq:
            x = dq.popleft()
            for p in rev[x]:
                if p not in can:
                    can.add(p)
                    dq.append(p)
        res['stuck'] = sum(1 for n in prev if n not in can)
    return res


def evaluate(rows, target):
    safe = analyze(rows, target, True, 'safe')
    if not safe:
        return None
    walk = analyze(rows, target, False, 'harmless')
    mfree = analyze(rows, target, True, 'harmless')
    mf = mfree['steps'] if mfree else safe['steps']
    return dict(steps=safe['steps'], walk=walk['steps'], stuck=0, seq=safe['seq'], path=safe['path'],
                pressure=safe['steps'] - walk['steps'], mpressure=safe['steps'] - mf, gatepass=len(safe['seq']))


LEVEL_SPECS = [
    dict(name="Level 1 · Bit Flip", seed=90, diff=1, points=500, target='1',
         idea="Gates change your state the moment you step on them.",
         hint="You begin as |0⟩ and the exit wants a different state. Several gates on this map change your state, and every step onto one counts. Plan your route before you rush.",
         cells=(8, 5), loops=5, rooms=1, cps=3, gates={'X': 3}, cp_gap=6,
         ok=lambda s: s['stuck'] == 0 and 52 <= s['steps'] <= 72 and s['pressure'] >= 8 and s['seq'].count('X') >= 1),
    dict(name="Level 2 · Superposition", seed=6696, diff=2, points=800, target='+',
         idea="Applying the same gate twice cancels it out.",
         hint="H turns a definite state into a superposition, and turns it back if you step on it again. Count how many H gates your whole route crosses. Does it end odd or even?",
         cells=(8, 5), loops=5, rooms=0, cps=4, gates={'H': 4}, cp_gap=5,
         ok=lambda s: s['stuck'] == 0 and 62 <= s['steps'] <= 84 and s['pressure'] >= 6 and s['gatepass'] >= 3),
    dict(name="Level 3 · Hidden Phase", seed=1254, diff=3, points=1200, target='-',
         idea="Some gates only matter once you are in superposition.",
         hint="Z looks useless on |0⟩ or |1⟩. It only shows its power on a superposition. Order matters: the same two gates in the opposite order can give a different result.",
         cells=(8, 5), loops=4, rooms=0, cps=4, gates={'H': 3, 'Z': 3, 'X': 1}, cp_gap=5,
         ok=lambda s: s['stuck'] == 0 and 68 <= s['steps'] <= 98 and s['pressure'] >= 12 and s['seq'].count('Z') >= 1),
    dict(name="Level 4 · Measurement", seed=39, diff=4, points=1700, target='1',
         idea="Measuring destroys a superposition, but a definite state passes M untouched.",
         hint="M sends a superposed qubit back to the start. Cross it only while you are definite. There is no X on this map, but a qubit can still reach |1⟩ the long way round.",
         cells=(8, 5), loops=4, rooms=0, cps=4, gates={'H': 3, 'Z': 2, 'M': 4}, cp_gap=5,
         ok=lambda s: s['stuck'] == 0 and 88 <= s['steps'] <= 104 and s['mpressure'] >= 10 and s['seq'].count('H') >= 2),
    dict(name="Level 5 · Undo", seed=355, diff=5, points=2300, target='0',
         idea="Every gate here is its own undo button.",
         hint="The exit wants the very state you started with, but the maze drags you through gates on the way. What you apply you can take back, in the reverse order.",
         cells=(8, 5), loops=3, rooms=0, cps=5, gates={'X': 2, 'H': 3, 'Z': 2, 'Y': 2, 'M': 3}, cp_gap=4,
         ok=lambda s: s['stuck'] == 0 and 106 <= s['steps'] <= 150 and s['gatepass'] >= 12 and s['pressure'] >= 6 and s['mpressure'] >= 4),
]

RACE_SPEC = dict(
    name="The Grand Quantum Maze", seed=246, diff=6, points=4000, target='-',
    idea="Everything you learned, in one giant maze. And everybody is racing.",
    hint="All five gates and five M traps are on this map. Don't grab the first thing you see: think about the state you want to be in every time you cross an M, and keep an eye on the scoreboard.",
    cells=(14, 9), loops=22, rooms=3, start_room=True, cps=8, gates={'H': 4, 'X': 3, 'Z': 4, 'Y': 3, 'M': 5},
    cp_gap=8, exit_far=0.75,
    ok=lambda s: s['stuck'] == 0 and 155 <= s['steps'] <= 330 and s['gatepass'] >= 8 and s['pressure'] >= 16 and s['mpressure'] >= 10)

AR = {
    "Level 1 · Bit Flip": ("المرحلة 1 · قلب البت",
        "البوابات تغيّر حالتك بمجرد أن تمرّ فوقها.",
        "تبدأ بالحالة |0⟩ والمخرج يريد حالة مختلفة. عدة بوابات على الخريطة تغيّر حالتك، وكل مرور فوق بوابة يُحتسب. خطّط لمسارك قبل أن تتسرّع."),
    "Level 2 · Superposition": ("المرحلة 2 · التراكب",
        "تطبيق البوابة نفسها مرتين يلغي أثرها.",
        "بوابة H تحوّل الحالة الأساسية إلى تراكب، وتعيدها إلى ما كانت عليه إذا مررت فوقها مرة أخرى. احسب كم بوابة H يعبر مسارك كله. هل العدد فردي أم زوجي؟"),
    "Level 3 · Hidden Phase": ("المرحلة 3 · الطور الخفي",
        "بعض البوابات لا يظهر أثرها إلا وأنت في حالة تراكب.",
        "تبدو Z عديمة الفائدة على |0⟩ أو |1⟩، ولا تظهر قوتها إلا في التراكب. الترتيب مهم: البوابتان نفسهما بترتيب معاكس قد تعطيان نتيجة مختلفة."),
    "Level 4 · Measurement": ("المرحلة 4 · القياس",
        "القياس يُنهي التراكب، أما الحالة الأساسية فتعبر M دون أن تتأثر.",
        "بوابة M تعيد الكيوبت المتراكب إلى نقطة البداية، فاعبرها وأنت في حالة أساسية فقط. لا توجد بوابة X في هذه الخريطة، لكن يمكن الوصول إلى |1⟩ عبر طريق أطول."),
    "Level 5 · Undo": ("المرحلة 5 · التراجع",
        "كل بوابة هنا هي زر التراجع الخاص بها.",
        "المخرج يريد الحالة نفسها التي بدأت بها، لكن المتاهة تجرّك عبر بوابات في الطريق. ما طبّقته يمكنك التراجع عنه، بالترتيب المعاكس."),
    "The Grand Quantum Maze": ("المتاهة الكمومية الكبرى",
        "كل ما تعلمته في متاهة واحدة ضخمة، والجميع يتسابق.",
        "فيها كل البوابات الخمس وخمس بوابات M. لا تتسرّع في أول شيء تراه: فكّر في الحالة التي تريدها كلما عبرت M، وراقب لوحة الترتيب."),
}

def make(spec, start_seed=1, tries=20000):
    if spec.get('seed'):
        start_seed, tries = spec['seed'], 1
    for seed in range(start_seed, start_seed + tries):
        rows = build(spec, seed)
        if not rows:
            continue
        s = evaluate(rows, spec['target'])
        if s and spec['ok'](s):
            # expensive soft-lock check only for candidates that already look good
            full = analyze(rows, spec['target'], True, 'full', softlock=True)
            if full['stuck'] == 0:
                return seed, rows, s
    raise SystemExit('no level found for ' + spec['name'])


def par_for(steps):
    return int(round((steps * STEP_TIME * 4 + 10) / 5.0) * 5)


def main():
    out = []
    for spec in LEVEL_SPECS + [RACE_SPEC]:
        seed, rows, s = make(spec)
        par = par_for(s['steps'])
        print(f"\n{spec['name']}  seed={seed}  opt={s['steps']} steps  walk-only={s['walk']}  "
              f"gate-pressure=+{s['pressure']}  M-pressure=+{s['mpressure']}  gates-on-route={''.join(s['seq'])}  par={par}s", flush=True)
        print('\n'.join(rows))
        out.append((spec, rows, par))
    esc = lambda t: t.replace('\\', '\\\\').replace('"', '\\"')

    def ts(spec, rows, par, lid):
        an, ai, ah = AR[spec['name']]
        return ('{id:"%s",name:"%s",idea:"%s",hint:"%s",ar:{name:"%s",idea:"%s",hint:"%s"},target:\'%s\',diff:%d,points:%d,par:%d,grid:[%s]}' % (
            lid, esc(spec['name']), esc(spec['idea']), esc(spec['hint']), esc(an), esc(ai), esc(ah), spec['target'], spec['diff'], spec['points'], par,
            ','.join('"' + r + '"' for r in rows)))
    with open('src/levels.ts', 'w') as f:
        f.write("import type {QS} from './game'\n")
        f.write("export interface Level{id:string;name:string;idea:string;hint:string;ar:{name:string;idea:string;hint:string};target:QS;diff:number;points:number;par:number;grid:string[]}\n")
        f.write("export const LEVELS:Level[]=[\n")
        for i, (spec, rows, par) in enumerate(out[:-1]):
            f.write(' ' + ts(spec, rows, par, 'L%d' % (i + 1)) + ',\n')
        f.write("]\n")
        f.write("export const RACE:Level=" + ts(*out[-1], 'RACE') + "\n")


if __name__ == '__main__':
    main()
