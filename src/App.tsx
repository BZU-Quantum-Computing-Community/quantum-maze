import {useEffect,useRef,useState} from 'react'
import {Engine,LEVELS,SYM,CTRL,COLORS,CELL,fmt,tone,Row,Snap} from './game'
import {addScore,clearScores,loadScores} from './scores'

type Screen='menu'|'how'|'select'|'game'|'win'|'scores'
const SUB='Birzeit University - Qiskit Fall Fest 2026 Application'
const Logo=({s=140}:{s?:number})=><img src="/logo.png" alt="Quantum Computing Club logo" style={{height:s,width:'auto'}} className="logo"/>
const Foot=()=><div className="foot">Birzeit University · Quantum Computing Club · Qiskit Fall Fest 2026 · ESC = back</div>

function Hall({n}:{n:number}){
 const a=loadScores().slice(0,n)
 if(!a.length)return <p className="note">No scores yet. Be the first!</p>
 return <div className="board hall"><h2>HIGH SCORES</h2>{a.map((e,i)=><div key={i} className={'row'+(i===0?' open':'')}><span className="rk">{i+1}</span><span className="rmid"><b>{e.name}</b><small> · Level {e.level+1} · {e.mode==='solo'?'Solo':'Race'} · {fmt(e.time)}</small></span><b className="ok">{e.score}</b></div>)}</div>
}

function Board({rows,flash,names}:{rows:Row[];flash:number|null;names:string[]}){
 return <div className="board"><h2>QUANTUM RACE</h2>
  {rows.map((r,i)=><div key={r.id} className={'row'+(flash===r.id?' flash':'')+(r.unlocked?' open':'')} style={{borderColor:r.color}}>
   <span className="rk">{i+1}</span><span className="chip" style={{background:r.color}}>{r.label}</span>
   <div className="rmid"><b className="nm">{names[r.id]}</b><div className="bar"><i style={{width:(r.finished?100:r.total?r.cp/r.total*100:0)+'%',background:r.color}}/></div>
    <small>CP {r.cp}/{r.total} · {SYM[r.state]} → TARGET {SYM[r.target]}{r.stateOk?' ✓':''}{flash===r.id?'  ↑ NOW LEADING':''}</small></div>
   <b className={r.unlocked?'ok':'lk'}>{r.finished?'EXIT ✓':r.unlocked?'🔓 OPEN':'🔒 LOCKED'}</b></div>)}
 </div>
}

function Game({mode,n,lvl,names,onEnd,onExit}:{mode:'solo'|'race';n:number;lvl:number;names:string[];onEnd:(s:Snap)=>void;onExit:()=>void}){
 const cv=useRef<HTMLCanvasElement>(null)
 const li=mode==='solo'?lvl:1
 const [eng]=useState(()=>new Engine(LEVELS[li],mode==='solo'?1:n))
 const [snap,setSnap]=useState<Snap>(eng.snapshot())
 const [cd,setCd]=useState(3),[paused,setPaused]=useState(false)
 const [flash,setFlash]=useState<number|null>(null)
 const lead=useRef<number|null>(null),ended=useRef(false),dead=useRef(false),pz=useRef(false)
 const setP=(v:boolean)=>{pz.current=v;eng.paused=v;eng.keys.clear();setPaused(v)}
 useEffect(()=>{
  const ctx=cv.current!.getContext('2d')!;let raf=0,last=performance.now()
  const loop=(t:number)=>{const dt=Math.min(0.05,(t-last)/1000);last=t;eng.update(dt);eng.render(ctx);raf=requestAnimationFrame(loop)}
  raf=requestAnimationFrame(loop)
  const dn=(e:KeyboardEvent)=>{if(e.code==='Escape'){e.preventDefault();if(!ended.current)setP(!pz.current);return}if(/^(Arrow|Numpad|Space)/.test(e.code))e.preventDefault();if(!pz.current)eng.keys.add(e.code)}
  const up=(e:KeyboardEvent)=>eng.keys.delete(e.code)
  addEventListener('keydown',dn);addEventListener('keyup',up)
  const cdi=setInterval(()=>setCd(c=>{if(pz.current||c===0)return c;tone(c<=1?880:440,0.15,'square',0,0.04);if(c<=1){eng.running=true;return 0}return c-1}),800)
  const si=setInterval(()=>{
   const s=eng.snapshot();setSnap(s)
   const top=s.rows[0];const prog=top.cp+(top.unlocked?1:0)>0
   if(mode==='race'&&prog&&lead.current!==null&&lead.current!==top.id){setFlash(top.id);setTimeout(()=>setFlash(null),1200)}
   if(mode==='race'&&prog)lead.current=top.id
   if(eng.winner&&!ended.current){ended.current=true;setTimeout(()=>{if(!dead.current)onEnd(eng.snapshot())},1800)}
  },100)
  return()=>{dead.current=true;cancelAnimationFrame(raf);removeEventListener('keydown',dn);removeEventListener('keyup',up);clearInterval(cdi);clearInterval(si)}
 },[])
 const me=snap.rows[0]
 return <div className="game">
  <header className="bar"><Logo s={44}/><div><b>QUANTUM MAZE RACE</b><small>Birzeit University | Qiskit Fall Fest 2026</small></div><div className="timer">{fmt(snap.time)}</div></header>
  <div className="main">
   <div className="stage"><canvas ref={cv} width={17*CELL} height={11*CELL}/>
    {cd>0&&<div className="cd">{cd}</div>}{cd===0&&snap.time<0.8&&<div className="cd">GO!</div>}
    {snap.msg&&<div className="toast">{snap.msg}</div>}</div>
   <aside>{mode==='race'?<Board rows={snap.rows} flash={flash} names={names}/>:
    <div className="board solo"><h2>QUANTUM RUN · {names[0]}</h2>
     <p>CURRENT</p><div className="big">{SYM[me.state]}</div><p>TARGET</p><div className="big dim">{SYM[me.target]}</div>
     <p>CHECKPOINTS</p><div className="big">{me.cp}/{me.total}</div><p>EXIT</p><div className={'big '+(me.unlocked?'ok':'lk')}>{me.unlocked?'🔓 OPEN':'🔒 LOCKED'}</div></div>}
    <div className="hint">{LEVELS[li].hint}</div></aside>
  </div>
  <footer className="keys">H = SUPERPOSITION · X = FLIP · Z = PHASE · Y = FLIP+PHASE · M = MEASURE (collapse + restart) — collect all checkpoints, hold the target state, then exit · ESC = pause</footer>
  {paused&&<div className="pause"><h2>PAUSED</h2><div className="btns"><button className="pri" onClick={()=>setP(false)}>RESUME (ESC)</button><button onClick={onExit}>EXIT TO MENU</button></div></div>}
 </div>
}

export default function App(){
 const [screen,setScreen]=useState<Screen>('menu'),[mode,setMode]=useState<'solo'|'race'>('solo'),[n,setN]=useState(2),[lvl,setLvl]=useState(0),[run,setRun]=useState(0),[res,setRes]=useState<Snap|null>(null)
 const [names,setNames]=useState(['','','','']),[score,setScore]=useState(0),[rank,setRank]=useState(-1),[sure,setSure]=useState(false)
 const nm=(i:number)=>names[i].trim()||'Player '+(i+1)
 const shown=[0,1,2,3].map(nm)
 useEffect(()=>{
  const h=(e:KeyboardEvent)=>{if(e.code==='Escape'&&screen!=='game'&&screen!=='menu'){setSure(false);setScreen('menu')}}
  addEventListener('keydown',h);return()=>removeEventListener('keydown',h)
 },[screen])
 const go=(m:'solo'|'race')=>{setMode(m);setScreen('select')}
 const start=()=>{setRun(r=>r+1);setScreen('game')}
 const finish=(s:Snap)=>{
  const w=s.rows[0],li=mode==='solo'?lvl:1,sc=Math.max(0,Math.round(1000-w.finishTime!*5-w.mistakes*25))
  setScore(sc);setRank(addScore({name:shown[w.id],score:sc,time:w.finishTime!,level:li,mode,date:Date.now()}));setRes(s);setScreen('win')
 }
 if(screen==='game')return <Game key={run} mode={mode} n={n} lvl={lvl} names={shown} onEnd={finish} onExit={()=>setScreen('menu')}/>
 if(screen==='win'&&res){
  const w=res.rows[0],solo=mode==='solo'
  return <div className="page win"><Logo/><p className="sub">{SUB}</p>
   <h1>{solo?'YOU ESCAPED THE QUANTUM MAZE!':'🏆 QUANTUM CHAMPION'}</h1>
   <div className="champ" style={{color:w.color}}>{shown[w.id]}</div>
   <div className="big">{fmt(w.finishTime!)} · SCORE {score}</div>
   <p className="ok">{rank===0?'★ NEW HIGH SCORE! ★':rank>0?'Rank #'+(rank+1)+' on the high-score list':''}</p>
   <p>TARGET STATE REACHED ✓ &nbsp; ALL CHECKPOINTS ✓ &nbsp; EXIT REACHED ✓</p>
   <p>FINAL STATE {SYM[w.state]} · TARGET {SYM[w.target]}</p>
   {solo?<p>H × {w.gates.H} · X × {w.gates.X} · Z × {w.gates.Z} · Y × {w.gates.Y} · MEASURE × {w.gates.M}</p>:
    <div className="board res"><h2>QUANTUM RACE RESULTS</h2>{res.rows.map((r,i)=><div key={r.id} className={'row'+(i===0?' open':'')} style={{borderColor:r.color}}><span className="rk">{i+1}</span><span className="chip" style={{background:r.color}}>{r.label}</span><span className="rmid"><b>{shown[r.id]}</b><small> · {r.finished?fmt(r.finishTime!):`CP ${r.cp}/${r.total} · ${SYM[r.state]}`}</small></span><b className={r.finished?'ok':'lk'}>{r.finished?'EXIT ✓':r.unlocked?'OPEN':'LOCKED'}</b></div>)}</div>}
   <Hall n={5}/>
   <div className="learn"><b>YOU JUST EXPERIENCED:</b> SUPERPOSITION · BIT FLIP · PHASE · MEASUREMENT<br/>STATE → GATE → NEW STATE. Now you've played like a qubit.</div>
   <div className="btns"><button className="pri" onClick={start}>PLAY AGAIN</button><button onClick={()=>setScreen('menu')}>MAIN MENU</button></div><Foot/></div>
 }
 if(screen==='scores')return <div className="page"><Logo s={90}/><Hall n={10}/>
  <div className="btns"><button className="pri" onClick={()=>setScreen('menu')}>BACK</button><button onClick={()=>{if(sure){clearScores();setSure(false)}else setSure(true)}}>{sure?'CLICK AGAIN TO CONFIRM':'CLEAR SCORES'}</button></div><Foot/></div>
 if(screen==='how')return <div className="page"><Logo s={90}/><h1>How to play</h1>
  <div className="cards"><div><h3>You are the qubit</h3><p>You start at |0⟩. Step on a gate to use it.</p></div>
  <div><h3>Gates</h3><p>X flips 0↔1 · H makes or undoes superposition · Z flips |+⟩↔|−⟩ · Y does both · M collapses and restarts you.</p></div>
  <div><h3>Open the exit</h3><p>Collect every checkpoint AND hold the TARGET state. Gates on your route can change it, so plan.</p></div></div>
  <p className="note">A simplified educational metaphor, not a real quantum simulator.</p>
  <div className="btns"><button className="pri" onClick={()=>setScreen('menu')}>BACK</button></div><Foot/></div>
 if(screen==='select'){
  const cnt=mode==='race'?n:1
  return <div className="page"><Logo s={90}/>
  {mode==='race'&&<><h1>HOW MANY PLAYERS?</h1><div className="btns">{[2,3,4].map(k=><button key={k} className={n===k?'pri':''} onClick={()=>setN(k)}>{k}</button>)}</div></>}
  {mode==='solo'&&<><h1>CHOOSE A LEVEL</h1><div className="btns col">{LEVELS.map((l,i)=><button key={i} className={lvl===i?'pri':''} onClick={()=>setLvl(i)}>{l.name}</button>)}</div></>}
  <h3>PLAYER NAMES</h3>
  <div className="ctrls">{Array.from({length:cnt},(_,i)=><div key={i} style={{borderColor:COLORS[i]}}><b style={{color:COLORS[i]}}>P{i+1}</b> <input value={names[i]} maxLength={12} placeholder={'Player '+(i+1)} onChange={e=>setNames(a=>a.map((v,j)=>j===i?e.target.value:v))}/><small> {mode==='race'?CTRL[i]:'W A S D / ARROWS'}</small></div>)}</div>
  <div className="btns"><button className="pri" onClick={start}>START</button><button onClick={()=>setScreen('menu')}>BACK</button></div><Foot/></div>
 }
 const top=loadScores()[0]
 return <div className="page menu"><Logo s={170}/><p className="sub">{SUB}</p><h3 className="club">QUANTUM COMPUTING CLUB</h3>
  <h1 className="title">QUANTUM<br/>MAZE RACE</h1><p className="tag">DON'T JUST SOLVE THE MAZE.<br/>BECOME THE QUBIT.</p>
  {top&&<p className="sub">🏆 Top score: {top.name} — {top.score}</p>}
  <div className="btns col"><button onClick={()=>go('solo')}>PLAY SOLO</button><button className="pri" onClick={()=>go('race')}>QUANTUM RACE</button><button onClick={()=>setScreen('how')}>HOW TO PLAY</button><button onClick={()=>setScreen('scores')}>HIGH SCORES</button></div><Foot/></div>
}
