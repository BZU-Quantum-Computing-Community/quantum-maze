from collections import deque
B=["#################","#.....#.........#","#.###.#.#######.#","#.#...#.#.....#.#","#.#.#####.###.#.#","#.#.......#...#.#","#.#######.#.###.#","#.......#.#.....#","#.##.##.#.#####.#","#.#...#...#.....#","#################"]
A=["#################","#...............#","#.##.######.###.#","#.#...###.....#.#","#.#...###.....#.#","#.#...###.....#.#","#.##.######.###.#","#...............#","#.#############.#","#...............E","#################"]
def build(base,tf,S,items):
    H,W=len(base),len(base[0]);g=[list(r) for r in base]
    out=[['#']*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            nx,ny=tf(x,y);out[ny][nx]=g[y][x]
    for (x,y),c in items.items():
        nx,ny=tf(x,y);assert out[ny][nx]!='#',(x,y,c);out[ny][nx]=c
    sx,sy=tf(*S);out[sy][sx]='S'
    return [''.join(r) for r in out]
def solve(g,target,noM=False):
    H,W=len(g),len(g[0]);cells={}
    for y in range(H):
        for x in range(W):
            if g[y][x]!='#':cells[(x,y)]=g[y][x]
    S=[k for k,v in cells.items() if v=='S'][0];cps=[k for k,v in cells.items() if v=='C'];ex=[k for k,v in cells.items() if v=='E'][0]
    full=(1<<len(cps))-1
    def gate(st,c):
        if c=='H':return {'0':'+','+':'0','1':'-','-':'1'}[st]
        if c=='X':return {'0':'1','1':'0','+':'+','-':'-'}[st]
        if c=='Z':return {'+':'-','-':'+','0':'0','1':'1'}[st]
        if c=='Y':return {'0':'1','1':'0','+':'-','-':'+'}[st]
        return st
    start=(S[0],S[1],'0',0);seen={start:0};q=deque([start])
    while q:
        s=q.popleft();x,y,st,m=s;d=seen[s]
        for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
            n=(x+dx,y+dy)
            if n not in cells:continue
            c=cells[n];nst=st;nm=m;opts=[]
            if c=='M':
                if noM:continue
                if st in'+-':opts=[(S[0],S[1],'0',m),(S[0],S[1],'1',m)]
                else:opts=[(n[0],n[1],st,m)]
            else:
                if c in'HXZY':nst=gate(st,c)
                if c=='C':nm|=1<<cps.index(n)
                if c=='E':
                    if st==target and m==full:return d+1
                    continue
                opts=[(n[0],n[1],nst,nm)]
            for o in opts:
                if o not in seen:seen[o]=d+1;q.append(o)
    return None
V=lambda x,y:(x,10-y);R=lambda x,y:(16-x,10-y);I=lambda x,y:(x,y)
LV=[("Level 1 · Flip the qubit","Find X to flip |0⟩ to |1⟩, then collect every checkpoint before the exit opens.",'1',build(A,I,(1,1),{(11,4):'X',(4,4):'Z',(8,7):'C',(8,9):'C',(1,5):'C'})),
("Level 2 · Phase matters","One gate guards the only way east. Plan your state before you cross it.",'1',build(B,I,(1,1),{(4,5):'H',(7,5):'Z',(12,3):'H',(13,9):'M',(3,9):'Z',(1,9):'C',(7,3):'C',(15,1):'C',(11,9):'E'})),
("Level 3 · Measurement challenge","M collapses a superposition and sends you back to the start. Arrive in |−⟩ and let H finish the job.",'1',build(B,V,(1,9),{(4,5):'H',(5,5):'Z',(7,5):'M',(5,9):'X',(12,3):'H',(13,5):'M',(1,1):'C',(11,9):'C',(15,1):'C',(7,3):'E'})),
("Level 4 · Find |−⟩","Target is |−⟩. Y flips both 0↔1 and +↔−. Plan your state before the crossing.",'-',build(B,R,(1,1),{(3,7):'H',(6,7):'Z',(1,9):'X',(9,6):'M',(12,3):'Y',(4,9):'C',(15,1):'C',(11,5):'C',(7,3):'E'})),
("Level 5 · Two doors","Both passages down are guarded. Y flips phase of superpositions, X does not. Choose your route.",'-',build(A,I,(1,1),{(4,4):'H',(3,3):'Z',(1,8):'Y',(15,8):'X',(12,4):'M',(10,4):'Z',(8,7):'C',(8,9):'C',(1,5):'C'}))]
for n,h,t,g in LV:
    print(n,'solution steps:',solve(g,t),'| without M:',solve(g,t,True))
    print('\n'.join(g))
with open('src/levels.ts','w') as f:
    f.write("import type {QS} from './game'\nexport interface Level{name:string;hint:string;target:QS;grid:string[]}\nexport const LEVELS:Level[]=[\n")
    for n,h,t,g in LV:f.write(" {name:%s,hint:%s,target:'%s',grid:[%s]},\n"%(repr(n).replace("'",'"') if False else '"'+n+'"','"'+h+'"',t,','.join('"'+r+'"' for r in g)))
    f.write("]\n")
