import {useSyncExternalStore} from 'react'
import type {Level} from './levels'
export type Lang='en'|'ar'
const K='qmr-lang'
const init=():Lang=>{try{const v=localStorage.getItem(K);if(v==='ar'||v==='en')return v}catch{};return (typeof navigator!=='undefined'&&/^ar/i.test(navigator.language))?'ar':'en'}
let lang:Lang=init()
const subs=new Set<()=>void>()
const apply=()=>{if(typeof document!=='undefined'){document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr'}}
apply()
export const getLang=()=>lang
export const setLang=(l:Lang)=>{lang=l;try{localStorage.setItem(K,l)}catch{};apply();subs.forEach(f=>f())}
export const useLang=()=>useSyncExternalStore(f=>{subs.add(f);return()=>subs.delete(f)},getLang,getLang)

/* qubit symbols are wrapped in LTR isolates so |0⟩ never gets scrambled inside Arabic text */
export const iso=(s:string)=>'\u2066'+s+'\u2069'
const Z0=iso('|0⟩'),PM=iso('|+⟩↔|−⟩'),B=iso('0↔1')

const D:Record<string,[string,string]>={
 sub:['Birzeit University - Qiskit Fall Fest 2026 Application','جامعة بيرزيت · مشروع مشاركة في Qiskit Fall Fest 2026'],
 foot:['Birzeit University · Quantum Computing Club · Qiskit Fall Fest 2026 · ESC = back','جامعة بيرزيت · نادي الحوسبة الكمومية · Qiskit Fall Fest 2026 · ESC = رجوع'],
 logoAlt:['Quantum Computing Club logo','شعار نادي الحوسبة الكمومية'],
 title:['QUANTUM|MAZE RACE','سباق|المتاهة الكمومية'],
 gameTitle:['QUANTUM MAZE RACE','سباق المتاهة الكمومية'],
 gameSub:['Birzeit University | Qiskit Fall Fest 2026','جامعة بيرزيت | Qiskit Fall Fest 2026'],
 club:['QUANTUM COMPUTING CLUB','نادي الحوسبة الكمومية'],
 tag1:["DON'T JUST SOLVE THE MAZE.",'لا تكتفِ بحلّ المتاهة.'],
 tag2:['BECOME THE QUBIT.','كُن أنت الكيوبت.'],
 topScore:['🏆 Top score: {name} — {n}','🏆 أعلى نتيجة: {name} — {n}'],
 playSolo:['PLAY SOLO','لعب فردي'],qrace:['QUANTUM RACE','السباق الكمومي'],howBtn:['HOW TO PLAY','طريقة اللعب'],hsBtn:['HIGH SCORES','أعلى النتائج'],
 back:['BACK','رجوع'],start:['START','ابدأ'],
 // scores
 noScores:['No scores yet. Be the first!','لا توجد نتائج بعد. كن الأول!'],hs:['HIGH SCORES','أعلى النتائج'],
 grand:['Grand Race','المسابقة الكبرى'],level:['Level {n}','المرحلة {n}'],
 confirm:['CLICK AGAIN TO CONFIRM','اضغط مرة أخرى للتأكيد'],clear:['CLEAR SCORES','مسح النتائج'],
 // select
 howMany:['HOW MANY PLAYERS?','كم عدد اللاعبين؟'],raceNote:['🔥 {name} · {stars} {diff} · {n} pts base','🔥 {name} · {stars} {diff} · {n} نقطة أساسية'],
 chooseLevel:['CHOOSE A LEVEL','اختر مرحلة'],pts:['{n} pts','{n} نقطة'],playerNames:['PLAYER NAMES','أسماء اللاعبين'],player:['Player','لاعب'],
 ctrl1:['ARROW KEYS','مفاتيح الأسهم'],ctrl3:['NUMPAD 8 4 5 6','لوحة الأرقام 8 4 5 6'],
 soloKeys:['W A S D / ARROWS','W A S D / الأسهم'],
 // brief
 soloLabel:['SOLO · LEVEL {n} OF {m}','فردي · المرحلة {n} من {m}'],raceLabel:['QUANTUM RACE · {n} PLAYERS','السباق الكمومي · {n} لاعبين'],
 basePts:['{n} base pts','{n} نقطة أساسية'],upTo:['up to {n} pts','حتى {n} نقطة'],
 newIdea:['NEW IDEA','فكرة جديدة'],hintT:['💡 HINT','💡 تلميح'],mission:['MISSION','المهمة'],
 missionBody:['Start as {z} · collect all checkpoints · reach {t} · then take the exit.','ابدأ بالحالة {z} · اجمع كل المحطات · بلغ الحالة {t} · ثم اخرج من الباب.'],
 ready:["I'M READY · START",'أنا جاهز · ابدأ'],
 diff1:['EASY','سهل'],diff2:['EASY+','سهل+'],diff3:['MEDIUM','متوسط'],diff4:['HARD','صعب'],diff5:['VERY HARD','صعب جداً'],diff6:['EXTREME','أقصى صعوبة'],
 // how to play
 howTitle:['How to play','طريقة اللعب'],
 h1:['You are the qubit','أنت الكيوبت'],b1:[`You start at ${Z0}. Step on a gate to use it.`,`تبدأ من الحالة ${Z0}. مرّ فوق البوابة لتستخدمها.`],
 h2:['Gates','البوابات'],b2:[`X flips ${B} · H makes or undoes superposition · Z flips ${PM} · Y does both · M collapses and restarts you.`,`X تقلب ${B} · H تصنع التراكب أو تلغيه · Z تقلب ${PM} · Y تفعل الاثنتين معاً · M تُنهي التراكب وتعيدك إلى البداية.`],
 h3:['Open the exit','افتح المخرج'],b3:['Collect every checkpoint AND hold the TARGET state. Gates on your route can change it, so plan.','اجمع كل المحطات وحافظ على الحالة الهدف. بوابات طريقك قد تغيّرها، فخطّط جيداً.'],
 h4:['Points','النقاط'],b4:['Every level has BASE points: harder level, more points. Finish under the PAR time for the full SPEED bonus (up to +50%). A clean run (no bumps into the locked exit) gives +10%; each bump costs −5%. The Grand Race is the hardest and worth the most.','لكل مرحلة نقاط أساسية: كلما صعبت المرحلة زادت نقاطها. أنهِ المرحلة قبل الوقت المرجعي لتنال مكافأة السرعة كاملة (حتى +50%). التشغيل النظيف (دون اصطدام بالباب المقفل) يمنح +10%، وكل اصطدام يخصم 5%. المسابقة الكبرى هي الأصعب والأعلى نقاطاً.'],
 note:['A simplified educational metaphor, not a real quantum simulator.','هذه استعارة تعليمية مبسّطة وليست محاكياً كمومياً حقيقياً.'],
 // in game
 quantumRun:['QUANTUM RUN · {name}','رحلة كمومية · {name}'],current:['CURRENT','الحالية'],target:['TARGET','الهدف'],checkpoints:['CHECKPOINTS','المحطات'],exit:['EXIT','المخرج'],
 cpShort:['CP','المحطات'],leading:['↑ NOW LEADING','↑ يتصدّر الآن'],
 exitDone:['EXIT ✓','خرج ✓'],open:['🔓 OPEN','🔓 مفتوح'],locked:['🔒 LOCKED','🔒 مقفل'],openS:['OPEN','مفتوح'],lockedS:['LOCKED','مقفل'],
 go:['GO!','انطلق!'],hint:['HINT','تلميح'],
 keys:['H = SUPERPOSITION · X = FLIP · Z = PHASE · Y = FLIP+PHASE · M = MEASURE (collapse + restart) — collect all checkpoints, hold the target state, then exit · ESC = pause','H = تراكب · X = قلب · Z = طور · Y = قلب + طور · M = قياس (انهيار + إعادة من البداية) — اجمع كل المحطات، حافظ على الحالة الهدف، ثم اخرج · ESC = إيقاف مؤقت'],
 paused:['PAUSED','متوقف مؤقتاً'],resume:['RESUME (ESC)','متابعة (ESC)'],exitMenu:['EXIT TO MENU','الخروج إلى القائمة'],
 fx:['FX','مؤثرات'],music:['MUSIC','موسيقى'],sfxTitle:['Sound effects','المؤثرات الصوتية'],musTitle:['Music','الموسيقى'],langBtn:['العربية','English'],
 // points panel
 points:['POINTS','النقاط'],levelBase:['Level base','نقاط المرحلة'],speed:['Speed bonus','مكافأة السرعة'],shrinks:['(shrinks after {n}s)','(تتناقص بعد {n} ث)'],
 clean:['Clean run','تشغيل نظيف'],noBumps:['(no exit bumps)','(بدون اصطدام بالباب)'],lost:['lost','ضاعت'],none:['none','لا شيء'],bumps:['Exit bumps ×{n}','اصطدامات بالباب ×{n}'],
 ifExit:['IF YOU EXIT NOW','نقاطك لو خرجت الآن'],
 // win
 escaped:['YOU ESCAPED THE QUANTUM MAZE!','لقد هربت من المتاهة الكمومية!'],champion:['🏆 QUANTUM CHAMPION','🏆 بطل الكَم'],score:['SCORE','النقاط'],
 howAdds:['HOW YOUR SCORE ADDS UP · {name}','كيف حُسبت نقاطك · {name}'],vsPar:['{t} vs par {n}s · max +{m}','{t} مقابل الوقت المرجعي {n} ث · الحد الأقصى +{m}'],
 cleanNote:['no bumps into the locked exit','بدون اصطدام بالباب المقفل'],total:['TOTAL','المجموع'],best:['(best possible here: {n})','(أعلى ما يمكن هنا: {n})'],
 newHigh:['★ NEW HIGH SCORE! ★','★ رقم قياسي جديد! ★'],rank:['Rank #{n} on the high-score list','المركز {n} في قائمة أعلى النتائج'],
 reached:['TARGET STATE REACHED ✓   ALL CHECKPOINTS ✓   EXIT REACHED ✓','بلغت الحالة الهدف ✓   كل المحطات ✓   وصلت المخرج ✓'],
 finalState:['FINAL STATE {a} · TARGET {b}','الحالة النهائية {a} · الهدف {b}'],
 gatesUsed:['H × {h} · X × {x} · Z × {z} · Y × {y} · MEASURE × {m}','H × {h} · X × {x} · Z × {z} · Y × {y} · قياس × {m}'],
 raceResults:['QUANTUM RACE RESULTS','نتائج السباق الكمومي'],
 learnHead:['YOU JUST EXPERIENCED:','لقد جرّبت للتو:'],learnBody:['SUPERPOSITION · BIT FLIP · PHASE · MEASUREMENT','التراكب · قلب البت · الطور · القياس'],
 learnEnd:["STATE {arr} GATE {arr} NEW STATE. Now you've played like a qubit.",'حالة {arr} بوابة {arr} حالة جديدة. لقد لعبتَ الآن كما يتصرّف الكيوبت.'],
 nextLevel:['NEXT LEVEL {arr}','المرحلة التالية {arr}'],playAgain:['PLAY AGAIN','العب مجدداً'],mainMenu:['MAIN MENU','القائمة الرئيسية'],
 // engine messages (shown over the maze)
 mXflip:['X GATE · BIT FLIP\n{a} {arr} {b}','بوابة X · قلب البت\n{a} {arr} {b}'],
 mXno:['X GATE · BIT FLIP\nNo effect on {a} — only {z} and {o} flip.','بوابة X · قلب البت\nلا أثر على {a} — الذي ينقلب هو {z} و{o} فقط.'],
 mY:['Y GATE · FLIP + PHASE\n{a} {arr} {b}\nY does what X and Z do together.','بوابة Y · قلب + طور\n{a} {arr} {b}\nY تفعل ما تفعله X وZ معاً.'],
 mH:['H GATE · SUPERPOSITION\n{a} {arr} {b}','بوابة H · التراكب\n{a} {arr} {b}'],mHundo:['\nH undoes the superposition!','\nH تلغي التراكب!'],
 mZ:['Z GATE · PHASE FLIP\n{a} {arr} {b}\nSame odds, opposite phase. Apply H to see the difference!','بوابة Z · قلب الطور\n{a} {arr} {b}\nالاحتمالات نفسها والطور معاكس. مرّر على H لترى الفرق!'],
 mZno:['Z GATE · PHASE FLIP\nNo visible effect on {a}. Try it in superposition.','بوابة Z · قلب الطور\nلا أثر ظاهر على {a}. جرّبها وأنت في تراكب.'],
 mMc:['MEASURE · COLLAPSE\nSuperposition collapsed to {a}.\nMeasuring disturbs the qubit — back to the start!','القياس · الانهيار\nانهار التراكب إلى {a}.\nالقياس يُربك الكيوبت — عدتَ إلى البداية!'],
 mMno:['MEASURE\nAlready definite: {a}','القياس\nالحالة محددة أصلاً: {a}'],
 mCp:['CHECKPOINT {n}/{m}','المحطة {n}/{m}'],
 mLockT:['EXIT LOCKED\nRequired state: {t}  Current: {a}','المخرج مقفل\nالحالة المطلوبة: {t}  حالتك الآن: {a}'],
 mLockC:['EXIT LOCKED\nState OK, but checkpoints: {n}/{m}','المخرج مقفل\nالحالة صحيحة، لكن المحطات: {n}/{m}'],
 mUnlock:['✓ TARGET STATE REACHED!\nALL CHECKPOINTS DONE — EXIT UNLOCKED!','✓ بلغت الحالة الهدف!\nاكتملت كل المحطات — فُتح المخرج!'],
 mTarget:['✓ TARGET STATE REACHED!\nNow collect all checkpoints ({n}/{m}) without changing it.','✓ بلغت الحالة الهدف!\nاجمع الآن كل المحطات ({n}/{m}) دون أن تغيّرها.'],
}
export const t=(k:string,v:Record<string,string|number>={}):string=>{
 const e=D[k];if(!e)return k
 const arr=lang==='ar'?'←':'→'
 return e[lang==='ar'?1:0].replace(/\{(\w+)\}/g,(_,n)=>n==='arr'?arr:String(v[n]??''))
}
/* level text in the current language */
export const L=(l:Level)=>lang==='ar'?l.ar:l
