import {useEffect,useRef,useState} from 'react'
import {Engine,SYM,CTRL,COLORS,CELL,fmt,Row,Snap} from './game'
import {sfx,music,audio} from './audio'
import {LEVELS,RACE} from './levels'
import type {Level} from './levels'
import {addScore,clearScores,loadScores,calcScore,stars} from './scores'
import {t,L,useLang,setLang,getLang} from './i18n'

type Screen='menu'|'how'|'select'|'brief'|'game'|'win'|'scores'
const arr=()=>getLang()==='ar'?'←':'→'
const Logo=({s=140}:{s?:number})=><img src="/logo.png" alt={t('logoAlt')} style={{height:s,width:'auto'}} className="logo"/>
const Foot=()=><div className="foot">{t('foot')}</div>

function Hall({n}:{n:number}){
 const a=loadScores().slice(0,n)
 if(!a.length)return <p className="note">{t('noScores')}</p>
 return <div className="board hall"><h2>{t('hs')}</h2>{a.map((e,i)=><div key={i} className={'row'+(i===0?' open':'')}><span className="rk">{i+1}</span><span className="rmid"><b>{e.name}</b><small> · {e.mode==='race'?t('grand'):t('level',{n:e.level+1})} · {fmt(e.time)}</small></span><b className="ok">{e.score}</b></div>)}</div>
}

function Board({rows,flash,names}:{rows:Row[];flash:number|null;names:string[]}){
 return <div className="board"><h2>{t('qrace')}</h2>
  {rows.map((r,i)=><div key={r.id} className={'row'+(flash===r.id?' flash':'')+(r.unlocked?' open':'')} style={{borderColor:r.color}}>
   <span className="rk">{i+1}</span><span className="chip" style={{background:r.color}}>{r.label}</span>
   <div className="rmid"><b className="nm">{names[r.id]}</b><div className="bar"><i style={{width:(r.finished?100:r.total?r.cp/r.total*100:0)+'%',background:r.color}}/></div>
    <small>{t('cpShort')} {r.cp}/{r.total} · {SYM[r.state]} {arr()} {t('target')} {SYM[r.target]}{r.stateOk?' ✓':''}{flash===r.id?'  '+t('leading'):''}</small></div>
   <b className={r.unlocked?'ok':'lk'}>{r.finished?t('exitDone'):r.unlocked?t('open'):t('locked')}</b></div>)}
 </div>
}

function ScorePanel({level,time,bumps}:{level:Level;time:number;bumps:number}){
 const b=calcScore(level,time,bumps)
 return <div className="board score"><h2>{t('points')}</h2>
  <div className="sr"><span>{t('levelBase')} {stars(level.diff)}</span><b>+{b.base}</b></div>
  <div className="sr"><span>{t('speed')} <small>{t('shrinks',{n:level.par})}</small></span><b>+{b.speed}</b></div>
  <div className="sr"><span>{t('clean')} <small>{t('noBumps')}</small></span><b className={b.clean?'':'lk'}>{b.clean?'+'+b.clean:t('lost')}</b></div>
  {b.bumps>0&&<div className="sr"><span>{t('bumps',{n:b.bumps})}</span><b className="lk">−{b.penalty}</b></div>}
  <div className="sr tot"><span>{t('ifExit')}</span><b>{b.total}</b></div></div>
}

function Game({mode,n,level,names,onEnd,onExit}:{mode:'solo'|'race';n:number;level:Level;names:string[];onEnd:(s:Snap)=>void;onExit:()=>void}){
 const cv=useRef<HTMLCanvasElement>(null)
 const [eng]=useState(()=>new Engine(level,mode==='solo'?1:n))
 const cols=level.grid[0].length,rows=level.grid.length
 const [snap,setSnap]=useState<Snap>(eng.snapshot())
 const [cd,setCd]=useState(3),[paused,setPaused]=useState(false)
 const [flash,setFlash]=useState<number|null>(null)
 const lead=useRef<number|null>(null),ended=useRef(false),dead=useRef(false),pz=useRef(false)
 const setP=(v:boolean)=>{pz.current=v;eng.paused=v;eng.keys.clear();setPaused(v);music.duck(v);sfx.pause()}
 useEffect(()=>{
  music.start(level.diff);music.duck(false)
  const ctx=cv.current!.getContext('2d')!;let raf=0,last=performance.now()
  const loop=(t:number)=>{const dt=Math.min(0.05,(t-last)/1000);last=t;eng.update(dt);eng.render(ctx);raf=requestAnimationFrame(loop)}
  raf=requestAnimationFrame(loop)
  const dn=(e:KeyboardEvent)=>{if(e.code==='Escape'){e.preventDefault();if(!ended.current)setP(!pz.current);return}if(/^(Arrow|Numpad|Space)/.test(e.code))e.preventDefault();if(!pz.current)eng.keys.add(e.code)}
  const up=(e:KeyboardEvent)=>eng.keys.delete(e.code)
  addEventListener('keydown',dn);addEventListener('keyup',up)
  const cdi=setInterval(()=>setCd(c=>{if(pz.current||c===0)return c;if(c<=1)sfx.go();else sfx.count();if(c<=1){eng.running=true;return 0}return c-1}),800)
  const si=setInterval(()=>{
   const s=eng.snapshot();setSnap(s)
   const top=s.rows[0];const prog=top.cp+(top.unlocked?1:0)>0
   if(mode==='race'&&prog&&lead.current!==null&&lead.current!==top.id){sfx.lead();setFlash(top.id);setTimeout(()=>setFlash(null),1200)}
   if(mode==='race'&&prog)lead.current=top.id
   music.intensity(s.rows.some(r=>r.unlocked)?1:Math.max(...s.rows.map(r=>r.total?r.cp/r.total:0))*0.8)
   if(eng.winner&&!ended.current){ended.current=true;music.stop();setTimeout(()=>{if(!dead.current)onEnd(eng.snapshot())},1800)}
  },100)
  return()=>{dead.current=true;cancelAnimationFrame(raf);removeEventListener('keydown',dn);removeEventListener('keyup',up);clearInterval(cdi);clearInterval(si)}
 },[])
 const me=snap.rows[0]
 return <div className="game">
  <header className="bar"><Logo s={44}/><div><b>{t('gameTitle')}</b><small>{t('gameSub')}</small></div><div className="timer">{fmt(snap.time)}</div></header>
  <div className="main">
   <div className="stage" style={{maxWidth:`min(1100px,calc((100vh - 150px)*${cols/rows}))`}}><canvas ref={cv} width={cols*CELL} height={rows*CELL}/>
    {cd>0&&<div className="cd">{cd}</div>}{cd===0&&snap.time<0.8&&<div className="cd">{t('go')}</div>}
    {snap.msg&&<div className="toast">{snap.msg}</div>}</div>
   <aside>{mode==='race'?<Board rows={snap.rows} flash={flash} names={names}/>:
    <div className="board solo"><h2>{t('quantumRun',{name:names[0]})}</h2>
     <p>{t('current')}</p><div className="big">{SYM[me.state]}</div><p>{t('target')}</p><div className="big dim">{SYM[me.target]}</div>
     <p>{t('checkpoints')}</p><div className="big">{me.cp}/{me.total}</div><p>{t('exit')}</p><div className={'big '+(me.unlocked?'ok':'lk')}>{me.unlocked?t('open'):t('locked')}</div></div>}
    <ScorePanel level={level} time={snap.time} bumps={mode==='solo'?me.mistakes:0}/>
    <div className="hint"><b>{t('hint')} · </b>{L(level).hint}</div></aside>
  </div>
  <footer className="keys">{t('keys')}</footer>
  {paused&&<div className="pause"><h2>{t('paused')}</h2><div className="btns"><button className="pri" onClick={()=>setP(false)}>{t('resume')}</button><button onClick={onExit}>{t('exitMenu')}</button></div></div>}
 </div>
}

function Sound(){
 const lang=useLang(),[sf,setSf]=useState(audio.isSfx()),[mu,setMu]=useState(audio.isMusic())
 return <div className="snd"><button className="lang" onClick={()=>setLang(lang==='ar'?'en':'ar')}>{t('langBtn')}</button><button title={t('sfxTitle')} onClick={()=>setSf(audio.toggleSfx())}>{sf?'🔊':'🔇'}<small>{t('fx')}</small></button><button title={t('musTitle')} onClick={()=>setMu(audio.toggleMusic())}>{mu?'🎵':'🔕'}<small>{t('music')}</small></button></div>
}

export default function App(){return <><Main/><Sound/></>}

function Main(){
 useLang()
 const [screen,setScreen]=useState<Screen>('menu'),[mode,setMode]=useState<'solo'|'race'>('solo'),[n,setN]=useState(2),[lvl,setLvl]=useState(0),[run,setRun]=useState(0),[res,setRes]=useState<Snap|null>(null)
 const [names,setNames]=useState(['','','','']),[score,setScore]=useState(0),[rank,setRank]=useState(-1),[sure,setSure]=useState(false)
 const cur:Level=mode==='solo'?LEVELS[lvl]:RACE
 const [bd,setBd]=useState(calcScore(RACE,0,0))
useEffect(()=>{
  const un=()=>audio.unlock()
  const clk=(e:Event)=>{if((e.target as HTMLElement)?.closest?.('button'))sfx.click()}
  let lastB:Element|null=null
  const hov=(e:Event)=>{const b=(e.target as HTMLElement)?.closest?.('button');if(b&&b!==lastB){lastB=b;sfx.hover()}else if(!b)lastB=null}
  addEventListener('pointerdown',un);addEventListener('keydown',un);addEventListener('click',clk,true);addEventListener('pointerover',hov)
  return()=>{removeEventListener('pointerdown',un);removeEventListener('keydown',un);removeEventListener('click',clk,true);removeEventListener('pointerover',hov)}
 },[])
 useEffect(()=>{if(screen==='game')return;if(screen==='win'){music.stop();return};music.start(screen==='brief'?cur.diff:0)},[screen])
 const nm=(i:number)=>names[i].trim()||t('player')+' '+(i+1)
 const shown=[0,1,2,3].map(nm)
 useEffect(()=>{
  const h=(e:KeyboardEvent)=>{if(e.code==='Escape'&&screen!=='game'&&screen!=='menu'){setSure(false);setScreen('menu')}}
  addEventListener('keydown',h);return()=>removeEventListener('keydown',h)
 },[screen])
 const go=(m:'solo'|'race')=>{setMode(m);setScreen('select')}
 const begin=()=>{sfx.ready();setRun(r=>r+1);setScreen('game')}
 const start=()=>setScreen('brief')
 const finish=(s:Snap)=>{
  const w=s.rows[0],b=calcScore(cur,w.finishTime!,w.mistakes),sc=b.total
  const rk=addScore({name:shown[w.id],score:sc,time:w.finishTime!,level:mode==='solo'?lvl:LEVELS.length,mode,date:Date.now()})
  setBd(b);setScore(sc);setRank(rk);setRes(s);setScreen('win');if(rk===0)setTimeout(()=>sfx.high(),1600)
 }
 if(screen==='game')return <Game key={run} mode={mode} n={n} level={cur} names={shown} onEnd={finish} onExit={()=>setScreen('menu')}/>
 if(screen==='win'&&res){
  const w=res.rows[0],solo=mode==='solo'
  return <div className="page win"><Logo/><p className="sub">{t('sub')}</p>
   <h1>{solo?t('escaped'):t('champion')}</h1>
   <div className="champ" style={{color:w.color}}>{shown[w.id]}</div>
   <div className="big">{fmt(w.finishTime!)} · {t('score')} {score}</div>
   <div className="board score bd"><h2>{t('howAdds',{name:L(cur).name})}</h2>
    <div className="sr"><span>{t('levelBase')} <small>{stars(cur.diff)} {t('diff'+cur.diff)}</small></span><b>+{bd.base}</b></div>
    <div className="sr"><span>{t('speed')} <small>{t('vsPar',{t:fmt(w.finishTime!),n:cur.par,m:bd.speedMax})}</small></span><b>+{bd.speed}</b></div>
    <div className="sr"><span>{t('clean')} <small>{t('cleanNote')}</small></span><b className={bd.clean?'':'lk'}>{bd.clean?'+'+bd.clean:t('none')}</b></div>
    {bd.bumps>0&&<div className="sr"><span>{t('bumps',{n:bd.bumps})}</span><b className="lk">−{bd.penalty}</b></div>}
    <div className="sr tot"><span>{t('total')} <small>{t('best',{n:bd.max})}</small></span><b>{score}</b></div></div>
   <p className="ok">{rank===0?t('newHigh'):rank>0?t('rank',{n:rank+1}):''}</p>
   <p>{t('reached')}</p>
   <p>{t('finalState',{a:SYM[w.state],b:SYM[w.target]})}</p>
   {solo?<p>{t('gatesUsed',{h:w.gates.H,x:w.gates.X,z:w.gates.Z,y:w.gates.Y,m:w.gates.M})}</p>:
    <div className="board res"><h2>{t('raceResults')}</h2>{res.rows.map((r,i)=><div key={r.id} className={'row'+(i===0?' open':'')} style={{borderColor:r.color}}><span className="rk">{i+1}</span><span className="chip" style={{background:r.color}}>{r.label}</span><span className="rmid"><b>{shown[r.id]}</b><small> · {r.finished?fmt(r.finishTime!):`${t('cpShort')} ${r.cp}/${r.total} · ${SYM[r.state]}`}</small></span><b className={r.finished?'ok':'lk'}>{r.finished?t('exitDone'):r.unlocked?t('openS'):t('lockedS')}</b></div>)}</div>}
   <Hall n={5}/>
   <div className="learn"><b>{t('learnHead')}</b> {t('learnBody')}<br/>{t('learnEnd')}</div>
   <div className="btns">{solo&&lvl<LEVELS.length-1&&<button className="pri" onClick={()=>{setLvl(lvl+1);setScreen('brief')}}>{t('nextLevel')}</button>}<button className={solo&&lvl<LEVELS.length-1?'':'pri'} onClick={begin}>{t('playAgain')}</button><button onClick={()=>setScreen('menu')}>{t('mainMenu')}</button></div><Foot/></div>
 }
 if(screen==='scores')return <div className="page"><Logo s={90}/><Hall n={10}/>
  <div className="btns"><button className="pri" onClick={()=>setScreen('menu')}>{t('back')}</button><button onClick={()=>{if(sure){clearScores();setSure(false)}else setSure(true)}}>{sure?t('confirm'):t('clear')}</button></div><Foot/></div>
 if(screen==='how')return <div className="page"><Logo s={90}/><h1>{t('howTitle')}</h1>
  <div className="cards"><div><h3>{t('h1')}</h3><p>{t('b1')}</p></div>
  <div><h3>{t('h2')}</h3><p>{t('b2')}</p></div>
  <div><h3>{t('h3')}</h3><p>{t('b3')}</p></div>
  <div><h3>{t('h4')}</h3><p>{t('b4')}</p></div></div>
  <p className="note">{t('note')}</p>
  <div className="btns"><button className="pri" onClick={()=>setScreen('menu')}>{t('back')}</button></div><Foot/></div>
 if(screen==='brief')return <div className="page brief"><Logo s={70}/>
  <p className="sub">{mode==='race'?t('raceLabel',{n}):t('soloLabel',{n:lvl+1,m:LEVELS.length})}</p>
  <h1>{L(cur).name}</h1>
  <div className="meta"><span className="stars">{stars(cur.diff)}</span><b>{t('diff'+cur.diff)}</b><span>·</span><b className="ok">{t('basePts',{n:cur.points})}</b><span>·</span><span>{t('upTo',{n:Math.round(cur.points*1.6)})}</span></div>
  <div className="card"><h3>{t('newIdea')}</h3><p>{L(cur).idea}</p></div>
  <div className="card hintc"><h3>{t('hintT')}</h3><p>{L(cur).hint}</p></div>
  <div className="card"><h3>{t('mission')}</h3><p>{t('missionBody',{z:SYM['0'],t:SYM[cur.target]})}</p></div>
  <div className="btns"><button className="pri" onClick={begin}>{t('ready')}</button><button onClick={()=>setScreen('select')}>{t('back')}</button></div><Foot/></div>
 if(screen==='select'){
  const cnt=mode==='race'?n:1
  return <div className="page"><Logo s={90}/>
  {mode==='race'&&<><h1>{t('howMany')}</h1><div className="btns">{[2,3,4].map(k=><button key={k} className={n===k?'pri':''} onClick={()=>setN(k)}>{k}</button>)}</div><p className="note">{t('raceNote',{name:L(RACE).name,stars:stars(5),diff:t('diff6'),n:RACE.points})}</p></>}
  {mode==='solo'&&<><h1>{t('chooseLevel')}</h1><div className="btns col">{LEVELS.map((l,i)=><button key={i} className={'lv'+(lvl===i?' pri':'')} onClick={()=>setLvl(i)}><span>{L(l).name}</span><small>{stars(l.diff)} · {t('pts',{n:l.points})}</small></button>)}</div></>}
  <h3>{t('playerNames')}</h3>
  <div className="ctrls">{Array.from({length:cnt},(_,i)=><div key={i} style={{borderColor:COLORS[i]}}><b style={{color:COLORS[i]}}>P{i+1}</b> <input value={names[i]} maxLength={12} dir="auto" placeholder={t('player')+' '+(i+1)} onChange={e=>setNames(a=>a.map((v,j)=>j===i?e.target.value:v))}/><small> {mode==='race'?(i===1?t('ctrl1'):i===3?t('ctrl3'):CTRL[i]):t('soloKeys')}</small></div>)}</div>
  <div className="btns"><button className="pri" onClick={start}>{t('start')}</button><button onClick={()=>setScreen('menu')}>{t('back')}</button></div><Foot/></div>
 }
 const top=loadScores()[0]
 return <div className="page menu"><Logo s={170}/><p className="sub">{t('sub')}</p><h3 className="club">{t('club')}</h3>
  <h1 className="title">{t('title').split('|').map((x,i)=><span key={i}>{i>0&&<br/>}{x}</span>)}</h1><p className="tag">{t('tag1')}<br/>{t('tag2')}</p>
  {top&&<p className="sub">{t('topScore',{name:top.name,n:top.score})}</p>}
  <div className="btns col"><button onClick={()=>go('solo')}>{t('playSolo')}</button><button className="pri" onClick={()=>go('race')}>{t('qrace')}</button><button onClick={()=>setScreen('how')}>{t('howBtn')}</button><button onClick={()=>setScreen('scores')}>{t('hsBtn')}</button></div><Foot/></div>
}
