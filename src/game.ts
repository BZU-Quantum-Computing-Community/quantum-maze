import {LEVELS} from './levels'
import type {Level} from './levels'
export {LEVELS}
export type QS='0'|'1'|'+'|'-'
export const SYM:Record<QS,string>={'0':'|0⟩','1':'|1⟩','+':'|+⟩','-':'|−⟩'}
export const COLORS=['#a855f7','#22d3ee','#f472b6','#fb923c']
export const CTRL=['W A S D','ARROW KEYS','I J K L','NUMPAD 8 4 5 6']
const KEYS=[['KeyW','KeyS','KeyA','KeyD'],['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'],['KeyI','KeyK','KeyJ','KeyL'],['Numpad8','Numpad5','Numpad4','Numpad6']]
const DIRS=[[0,-1],[0,1],[-1,0],[1,0]]
export const CELL=40
export const fmt=(t:number)=>{const m=Math.floor(t/60);return String(m).padStart(2,'0')+':'+(t-m*60).toFixed(2).padStart(5,'0')}
let ac:AudioContext|null=null
export const tone=(f:number,d:number,type:OscillatorType='sine',at=0,v=0.06)=>{try{ac=ac||new AudioContext();const t=ac.currentTime+at,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+d)}catch{}}
export const sfx={
 H:()=>{tone(440,0.25);tone(660,0.25,'sine',0.08)},
 X:()=>{tone(330,0.1,'square');tone(220,0.15,'square',0.08)},
 Y:()=>{tone(392,0.12,'square');tone(587,0.2,'triangle',0.08)},
 Z:()=>{tone(300,0.3,'triangle');tone(450,0.3,'triangle',0.1)},
 M:()=>{for(let i=0;i<6;i++)tone(900-i*120,0.08,'sawtooth',i*0.05,0.05)},
 cp:()=>{tone(660,0.12,'triangle');tone(880,0.18,'triangle',0.1)},
 lock:()=>tone(110,0.25,'sawtooth',0,0.07),
 unlock:()=>[523,659,784,1047].forEach((f,i)=>tone(f,0.25,'triangle',i*0.09)),
 win:()=>{[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,0.4,'triangle',i*0.12,0.08));[523,659,784,1047].forEach(f=>tone(f,1.4,'sine',0.9,0.05))}
}
type Gates={H:number;X:number;Z:number;M:number;Y:number}
interface P{id:number;x:number;y:number;px:number;py:number;sx:number;sy:number;was:boolean;state:QS;phase:boolean;color:string;keys:string[];cd:number;cps:Set<string>;gates:Gates;finished:boolean;finishTime?:number;mistakes:number;last:string}
interface Part{x:number;y:number;vx:number;vy:number;life:number;color:string}
export interface Row{id:number;label:string;color:string;state:QS;target:QS;stateOk:boolean;unlocked:boolean;cp:number;total:number;finished:boolean;finishTime?:number;gates:Gates;mistakes:number}
export interface Snap{time:number;rows:Row[];msg:string;winner:number|null}
const GC:Record<string,string>={H:'#a855f7',X:'#22d3ee',Z:'#f472b6',M:'#facc15',Y:'#fb923c'}
export class Engine{
 players:P[]=[];time=0;running=false;paused=false;winner:P|null=null;parts:Part[]=[];keys=new Set<string>();msg='';msgT=0;t=0;total=0;exit:[number,number]=[0,0]
 constructor(public level:Level,n:number){
  const g=level.grid;let st:[number,number]=[1,1]
  g.forEach((r,y)=>r.split('').forEach((c,x)=>{if(c==='C')this.total++;if(c==='E')this.exit=[x,y];if(c==='S')st=[x,y]}))
  const sp:[number,number][]=[],seen=new Set([st.join()]),q:[number,number][]=[st]
  while(q.length&&sp.length<4){const [x,y]=q.shift()!;sp.push([x,y]);for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(g[ny]?.[nx]&&g[ny][nx]!=='#'&&!seen.has(k)){seen.add(k);q.push([nx,ny])}}}
  for(let i=0;i<n;i++)this.players.push({id:i,x:sp[i][0],y:sp[i][1],px:sp[i][0],py:sp[i][1],sx:sp[i][0],sy:sp[i][1],was:false,state:'0',phase:false,color:COLORS[i],keys:KEYS[i],cd:0,cps:new Set(),gates:{H:0,X:0,Z:0,M:0,Y:0},finished:false,mistakes:0,last:''})
 }
 unlocked(p:P){return p.state===this.level.target&&p.cps.size===this.total}
 say(s:string){this.msg=s;this.msgT=2.2}
 burst(p:P,n=24){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=40+Math.random()*120;this.parts.push({x:p.px*CELL+CELL/2,y:p.py*CELL+CELL/2,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.8,color:p.color})}}
 update(dt:number){
  this.t+=dt;this.msgT-=dt
  this.parts.forEach(q=>{q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt});this.parts=this.parts.filter(q=>q.life>0)
  this.players.forEach(p=>{p.px+=(p.x-p.px)*Math.min(1,dt*18);p.py+=(p.y-p.py)*Math.min(1,dt*18)})
  if(!this.running||this.paused)return
  this.time+=dt
  for(const p of this.players){
   if(p.finished)continue
   p.cd-=dt;if(p.cd>0)continue
   const d=p.keys.findIndex(k=>this.keys.has(k));if(d<0)continue
   const nx=p.x+DIRS[d][0],ny=p.y+DIRS[d][1]
   if(this.level.grid[ny]?.[nx]&&this.level.grid[ny][nx]!=='#'){p.x=nx;p.y=ny;p.cd=0.13;this.onCell(p)}
  }
 }
 onCell(p:P){
  const c=this.level.grid[p.y][p.x],k=p.x+','+p.y;if(k===p.last)return;p.last=k
  const before=p.state,T=this.level.target
  if(c==='X'){p.gates.X++;sfx.X();if(p.state==='0'||p.state==='1'){p.state=p.state==='0'?'1':'0';this.say('X GATE · BIT FLIP\n'+SYM[before]+' → '+SYM[p.state])}else this.say('X GATE · BIT FLIP\nNo effect on '+SYM[p.state]+' — only |0⟩ and |1⟩ flip.')}
  else if(c==='Y'){p.gates.Y++;sfx.Y();p.state=({'0':'1','1':'0','+':'-','-':'+'} as Record<QS,QS>)[p.state];this.say('Y GATE · FLIP + PHASE\n'+SYM[before]+' → '+SYM[p.state]+'\nY does what X and Z do together.')}
  else if(c==='H'){p.gates.H++;sfx.H();p.state=({'0':'+','+':'0','1':'-','-':'1'} as Record<QS,QS>)[p.state];this.say('H GATE · SUPERPOSITION\n'+SYM[before]+' → '+SYM[p.state]+(p.state==='0'||p.state==='1'?'\nH undoes the superposition!':''))}
  else if(c==='Z'){p.gates.Z++;sfx.Z();p.phase=!p.phase;if(p.state==='+'||p.state==='-'){p.state=p.state==='+'?'-':'+';this.say('Z GATE · PHASE FLIP\n'+SYM[before]+' → '+SYM[p.state]+'\nSame odds, opposite phase. Apply H to see the difference!')}else this.say('Z GATE · PHASE FLIP\nNo visible effect on '+SYM[p.state]+'. Try it in superposition.')}
  else if(c==='M'){p.gates.M++;sfx.M();if(p.state==='+'||p.state==='-'){p.state=Math.random()<0.5?'0':'1';this.burst(p,40);p.x=p.sx;p.y=p.sy;p.px=p.x;p.py=p.y;p.last='';this.say('MEASURE · COLLAPSE\nSuperposition collapsed to '+SYM[p.state]+'.\nMeasuring disturbs the qubit — back to the start!')}else this.say('MEASURE\nAlready definite: '+SYM[p.state])}
  else if(c==='C'){if(!p.cps.has(k)){p.cps.add(k);sfx.cp();this.say('CHECKPOINT '+p.cps.size+'/'+this.total)}}
  else if(c==='E'){
   if(this.unlocked(p)){p.finished=true;p.finishTime=this.time;if(!this.winner){this.winner=p;this.running=false};sfx.win();this.burst(p,100)}
   else{p.mistakes++;sfx.lock();this.say('EXIT LOCKED\n'+(p.state!==T?'Required state: '+SYM[T]+'  Current: '+SYM[p.state]:'State OK, but checkpoints: '+p.cps.size+'/'+this.total))}
  }
  if('HXZMY'.includes(c))this.burst(p)
  const u=this.unlocked(p)
  if(u&&!p.was&&c!=='E'){this.say('✓ TARGET STATE REACHED!\nALL CHECKPOINTS DONE — EXIT UNLOCKED!');sfx.unlock()}
  else if(!u&&p.state!==before&&p.state===T)this.say('✓ TARGET STATE REACHED!\nNow collect all checkpoints ('+p.cps.size+'/'+this.total+') without changing it.')
  p.was=u
 }
 snapshot():Snap{
  const rows:Row[]=this.players.map(p=>({id:p.id,label:'P'+(p.id+1),color:p.color,state:p.state,target:this.level.target,stateOk:p.state===this.level.target,unlocked:this.unlocked(p),cp:p.cps.size,total:this.total,finished:p.finished,finishTime:p.finishTime,gates:{...p.gates},mistakes:p.mistakes}))
  rows.sort((a,b)=>(+b.finished-+a.finished)||(a.finished&&b.finished?a.finishTime!-b.finishTime!:0)||(+b.unlocked-+a.unlocked)||(b.cp-a.cp)||(a.id-b.id))
  return{time:this.time,rows,msg:this.msgT>0?this.msg:'',winner:this.winner?this.winner.id:null}
 }
 render(c:CanvasRenderingContext2D){
  const g=this.level.grid,W=g[0].length*CELL,H=g.length*CELL,any=this.players.some(p=>this.unlocked(p)),pu=0.5+0.5*Math.sin(this.t*4)
  c.clearRect(0,0,W,H);c.fillStyle='#0d0718';c.fillRect(0,0,W,H)
  c.textAlign='center';c.textBaseline='middle'
  g.forEach((r,y)=>r.split('').forEach((ch,x)=>{
   const X=x*CELL,Y=y*CELL,cx=X+CELL/2,cy=Y+CELL/2
   if(ch==='#'){c.fillStyle='#24124a';c.fillRect(X,Y,CELL,CELL);c.strokeStyle='#7c3aed';c.lineWidth=1;c.strokeRect(X+1.5,Y+1.5,CELL-3,CELL-3);return}
   c.strokeStyle='rgba(168,85,247,.1)';c.strokeRect(X,Y,CELL,CELL)
   if(GC[ch]){c.save();c.shadowColor=GC[ch];c.shadowBlur=14;c.fillStyle=GC[ch]+'33';c.strokeStyle=GC[ch];c.lineWidth=2;c.fillRect(X+5,Y+5,CELL-10,CELL-10);c.strokeRect(X+5,Y+5,CELL-10,CELL-10);c.restore();c.fillStyle='#fff';c.font='bold 20px system-ui';c.fillText(ch,cx,cy+1)}
   if(ch==='C'){const got=this.players.some(p=>p.cps.has(x+','+y));c.strokeStyle=got?'#c084fc':'#6b4fa0';c.lineWidth=2;c.beginPath();c.arc(cx,cy,7,0,6.28);c.stroke();if(got){c.fillStyle='#c084fc';c.fill()}}
   if(ch==='E'){
    if(any){c.save();c.shadowColor='#a855f7';c.shadowBlur=20+pu*20;c.strokeStyle='#d8b4fe';c.lineWidth=3;c.beginPath();c.arc(cx,cy,10+pu*6,0,6.28);c.stroke();c.fillStyle='rgba(168,85,247,.5)';c.fill();c.restore();c.font='14px system-ui';c.fillText('🔓',cx,cy)}
    else{c.fillStyle='rgba(239,68,68,.18)';c.strokeStyle='#f97316';c.lineWidth=2;c.fillRect(X+4,Y+4,CELL-8,CELL-8);c.strokeRect(X+4,Y+4,CELL-8,CELL-8);c.font='16px system-ui';c.fillText('🔒',cx,cy)}
   }
  }))
  this.parts.forEach(q=>{c.globalAlpha=Math.max(0,q.life);c.fillStyle=q.color;c.fillRect(q.x-2,q.y-2,4,4)});c.globalAlpha=1
  this.players.forEach(p=>{
   const x=p.px*CELL+CELL/2,y=p.py*CELL+CELL/2
   c.save();c.shadowColor=p.color;c.shadowBlur=18
   c.fillStyle=p.color;c.beginPath();c.arc(x,y,'+-'.includes(p.state)?7:11,0,6.28);c.fill()
   if(p.state==='1'){c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(x,y,15,0,6.28);c.stroke()}
   if(p.state==='+'||p.state==='-'){for(let i=0;i<2;i++){const a=this.t*3+i*Math.PI;c.beginPath();c.arc(x+Math.cos(a)*13,y+Math.sin(a)*13,5,0,6.28);c.fill()}}
   if(p.state==='-'){c.strokeStyle='#fff';c.setLineDash([3,3]);c.beginPath();c.arc(x,y,9,0,6.28);c.stroke()}
   c.restore();c.fillStyle='#fff';c.font='bold 11px system-ui';c.fillText('P'+(p.id+1),x,y-21)
  })
 }
}
