/* Quantum Maze Race · audio engine (everything is synthesised, no audio files)
   - SFX bus (loud, punchy) + MUSIC bus (per-level procedural theme) -> compressor -> speakers
   - Music theme depends on the level difficulty: faster, darker, more percussion as levels get harder
   - Music intensity rises while you collect checkpoints and peaks when the exit opens            */
const DEBUG=()=>!!(globalThis as any).__QMR_DEBUG
const rd=(k:string,d:boolean)=>{try{const v=localStorage.getItem(k);return v===null?d:v==='1'}catch{return d}}
const wr=(k:string,v:boolean)=>{try{localStorage.setItem(k,v?'1':'0')}catch{}}
let sfxOn=rd('qmr-sfx',true),musOn=rd('qmr-mus',true)

let ac:AudioContext|null=null,sfxBus:GainNode,musBus:GainNode,noiseBuf:AudioBuffer
const ctx=():AudioContext=>{
 if(!ac){
  ac=new AudioContext()
  const comp=ac.createDynamicsCompressor()
  comp.threshold.value=-14;comp.knee.value=18;comp.ratio.value=7;comp.attack.value=0.003;comp.release.value=0.18
  const master=ac.createGain();master.gain.value=1.15
  sfxBus=ac.createGain();sfxBus.gain.value=sfxOn?1:0
  musBus=ac.createGain();musBus.gain.value=musOn?0.5:0
  sfxBus.connect(master);musBus.connect(master);master.connect(comp);comp.connect(ac.destination)
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate)
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1
 }
 if(ac.state==='suspended')ac.resume().catch(()=>{})
 return ac
}
const guard=(fn:()=>void)=>{try{fn()}catch(e){if(DEBUG())throw e}}

/* absolute-time oscillator note */
const tn=(f:number,d:number,type:OscillatorType,t:number,v:number,f2?:number,mus=false)=>guard(()=>{
 const a=ctx(),o=a.createOscillator(),g=a.createGain()
 o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d)
 g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+d)
 o.connect(g);g.connect(mus?musBus:sfxBus);o.start(t);o.stop(t+d+0.03)
})
/* absolute-time filtered noise (whooshes, hats, crashes) */
const nz=(d:number,t:number,v:number,f:number,f2?:number,q=1,mus=false)=>guard(()=>{
 const a=ctx(),s=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain()
 s.buffer=noiseBuf;s.loop=true;fl.type='bandpass';fl.Q.value=q;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+d)
 g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+Math.min(0.02,d/3));g.gain.exponentialRampToValueAtTime(0.0001,t+d)
 s.connect(fl);fl.connect(g);g.connect(mus?musBus:sfxBus);s.start(t);s.stop(t+d+0.03)
})
const now=()=>ctx().currentTime
/* relative-time helpers used by the game */
export const tone=(f:number,d:number,type:OscillatorType='sine',at=0,v=0.25,f2?:number)=>guard(()=>tn(f,d,type,now()+at,v,f2))
const noise=(d:number,at:number,v:number,f:number,f2?:number,q=1)=>guard(()=>nz(d,now()+at,v,f,f2,q))
const arp=(fs:number[],d:number,type:OscillatorType,gap:number,v:number,at=0)=>fs.forEach((f,i)=>tone(f,d,type,at+i*gap,v))

const PENTA=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.5,1567.98]

export const sfx={
 click:()=>{tone(760,0.07,'square',0,0.16);tone(1140,0.06,'triangle',0.025,0.14)},
 hover:()=>tone(540,0.04,'sine',0,0.07),
 ready:()=>{arp([330,495,660,990],0.2,'sawtooth',0.06,0.2);noise(0.35,0,0.25,400,5000,1.2)},
 count:()=>{tone(520,0.2,'square',0,0.3);tone(260,0.22,'sine',0,0.4)},
 go:()=>{arp([523,659,784,1047],0.55,'sawtooth',0.0,0.16);arp([1047,1319],0.5,'triangle',0.05,0.25);noise(0.5,0,0.35,300,6000,1)},
 step:(s:string)=>{
  if(s==='0')tone(170,0.05,'sine',0,0.13,120)
  else if(s==='1')tone(250,0.05,'sine',0,0.13,180)
  else{tone(340,0.06,'triangle',0,0.1);tone(347,0.06,'triangle',0,0.1)}
 },
 /* H: rising shimmer when you ENTER superposition, falling when you leave it */
 H:(toSuper:boolean)=>{
  const f=toSuper?[440,554,659,880,1109]:[1109,880,659,554,440]
  arp(f,0.28,'triangle',0.055,0.3);noise(0.3,0,0.18,toSuper?800:4000,toSuper?4000:800,2)
 },
 X:(eff:boolean)=>{
  if(eff){tone(120,0.14,'square',0,0.35,55);tone(330,0.12,'square',0,0.25);tone(660,0.12,'triangle',0.07,0.28);noise(0.08,0,0.2,2000)}
  else{tone(210,0.12,'triangle',0,0.22,150)}
 },
 Y:()=>{tone(392,0.14,'square',0,0.3);tone(587,0.22,'triangle',0.08,0.32);tone(784,0.22,'sine',0.16,0.26);noise(0.2,0.05,0.15,1500,3500)},
 Z:(eff:boolean)=>{
  if(eff){tone(300,0.4,'triangle',0,0.34);tone(450,0.4,'triangle',0.1,0.3);tone(600,0.45,'sine',0.2,0.24);noise(0.35,0,0.16,2500,500,2)}
  else{tone(260,0.16,'sine',0,0.2,200)}
 },
 M:(collapse:boolean)=>{
  if(collapse){noise(0.55,0,0.5,3500,180,1.5);tone(95,0.45,'sine',0,0.6,38);for(let i=0;i<7;i++)tone(1000-i*120,0.1,'sawtooth',i*0.05,0.26)}
  else{tone(520,0.09,'sine',0,0.2);tone(780,0.09,'sine',0.05,0.16)}
 },
 /* checkpoint pitch climbs with every one you collect; the last one rings out */
 cp:(n:number,total:number)=>{
  const f=PENTA[(n-1)%PENTA.length]
  tone(f,0.28,'triangle',0,0.38);tone(f*2,0.32,'sine',0.07,0.26)
  if(n>=total){arp([523,659,784,1047],0.5,'triangle',0.05,0.28,0.12);noise(0.4,0.1,0.2,1500,7000)}
 },
 target:()=>{arp([659,784,988,1319],0.32,'triangle',0.07,0.32);tone(2637,0.3,'sine',0.3,0.16)},
 unlock:()=>{arp([523,659,784,1047,1319],0.4,'triangle',0.09,0.34);tone(131,0.9,'sawtooth',0,0.2);noise(0.6,0,0.3,300,6000,1)},
 lose:()=>{tone(420,0.35,'sawtooth',0,0.24,140);noise(0.25,0,0.12,2000,300)},
 lock:()=>{tone(110,0.32,'sawtooth',0,0.4);tone(104,0.32,'square',0,0.3);tone(220,0.1,'square',0.12,0.25);noise(0.12,0,0.25,900)},
 lead:()=>{noise(0.4,0,0.3,500,5000,1.5);tone(600,0.25,'triangle',0,0.3,1200)},
 pause:()=>tone(420,0.14,'sine',0,0.25,250),
 /* bigger levels = longer, bigger fanfare */
 win:(diff:number)=>{
  const base=[523,659,784,1047,784,1047,1319]
  base.forEach((f,i)=>{tone(f,0.45,'triangle',i*0.12,0.34);tone(f/2,0.45,'sine',i*0.12,0.25)})
  arp([523,659,784,1047],1.6,'sine',0,0.2,0.9)
  if(diff>=3){arp([1319,1568,2093],0.5,'triangle',0.1,0.28,1.0);noise(1.2,0.9,0.25,2000,9000)}
  if(diff>=5){arp([784,988,1175,1568,1976],0.6,'sawtooth',0.09,0.14,1.3);tone(65,1.6,'sawtooth',0.9,0.3)}
 },
 high:()=>arp([784,988,1175,1568,1976,2349,2637,3136],0.3,'triangle',0.07,0.28)
}

/* ---------------------------------------------------------------- music -- */
interface Theme{bpm:number;root:number;scale:number[];prog:number[];third:number;wave:OscillatorType;bass:OscillatorType;arp:number;kick:boolean;hat:boolean}
const THEMES:Record<number,Theme>={
 0:{bpm:84, root:220,  scale:[0,2,4,7,9],     prog:[0,3,4,2],third:4,wave:'sine',    bass:'sine',    arp:0.35,kick:false,hat:false}, // menu
 1:{bpm:96, root:220,  scale:[0,2,4,7,9],     prog:[0,4,3,4],third:4,wave:'triangle',bass:'sine',    arp:0.45,kick:false,hat:false},
 2:{bpm:106,root:196,  scale:[0,2,4,7,9],     prog:[0,2,3,4],third:4,wave:'triangle',bass:'triangle',arp:0.5, kick:false,hat:true},
 3:{bpm:114,root:185,  scale:[0,2,3,7,9],     prog:[0,3,2,4],third:3,wave:'triangle',bass:'triangle',arp:0.55,kick:true, hat:true},
 4:{bpm:122,root:174.6,scale:[0,1,3,7,8],     prog:[0,0,3,1],third:3,wave:'square',  bass:'sawtooth',arp:0.55,kick:true, hat:true},
 5:{bpm:132,root:164.8,scale:[0,3,5,6,7,10],  prog:[0,2,3,1],third:3,wave:'sawtooth',bass:'sawtooth',arp:0.6, kick:true, hat:true},
 6:{bpm:146,root:146.8,scale:[0,2,3,5,7,8,10],prog:[0,5,3,4],third:3,wave:'sawtooth',bass:'sawtooth',arp:0.7, kick:true, hat:true}  // grand race
}
let cur=-1,step=0,next=0,timer:ReturnType<typeof setInterval>|0=0,inten=0,ducked=false
const rootF=(th:Theme,semi:number)=>th.root*Math.pow(2,semi/12)
const play=(th:Theme,s:number,t:number,sd:number)=>{
 const bar=Math.floor(s/16)%th.prog.length,p=s%16,rs=th.scale[th.prog[bar]%th.scale.length],rf=rootF(th,rs)
 const kick=th.kick||inten>0.5,hat=th.hat||inten>0.75,dens=Math.min(0.95,th.arp+0.3*inten)
 if(p===0){[0,th.third,7].forEach((x,i)=>tn(rootF(th,rs+x),sd*15.5,'sine',t,0.07-i*0.01,undefined,true))}      // pad
 if(p%(cur>=4?2:4)===0)tn(rf/2,sd*(cur>=4?1.8:3.6),th.bass,t,cur>=4?0.17:0.21,undefined,true)                  // bass
 if(kick&&p%4===0){tn(130,0.2,'sine',t,0.5,42,true)}                                                             // kick
 if(hat&&p%4===2)nz(0.05,t,0.12,7500,undefined,1,true)                                                           // hat
 if(cur>=5&&p%8===4)nz(0.12,t,0.16,2500,undefined,1.5,true)                                                      // snare-ish
 const h=((s*2654435761)>>>0)%100
 if(h<dens*100&&(p%2===0||cur>=4)){
  const idx=(s*5+bar*3)%th.scale.length,oct=(p%8<4?2:4)
  tn(rootF(th,rs+th.scale[idx])*oct/2,sd*1.6,th.wave,t,0.095+0.03*inten,undefined,true)
 }
}
const tick=()=>{
 if(!ac||ac.state!=='running'||cur<0)return
 guard(()=>{
  const th=THEMES[cur],sd=60/th.bpm/4
  if(next<ac!.currentTime)next=ac!.currentTime+0.06
  while(next<ac!.currentTime+0.2){play(th,step,next,sd);next+=sd;step++}
 })
}
export const music={
 start:(id:number)=>{
  const k=Math.max(0,Math.min(6,id))
  if(k===cur&&timer)return
  cur=k;step=0;next=0;inten=0
  guard(()=>ctx())
  if(!timer)timer=setInterval(tick,50)
 },
 stop:()=>{cur=-1;if(timer){clearInterval(timer);timer=0}},
 duck:(on:boolean)=>{ducked=on;if(ac)musBus.gain.setTargetAtTime(musOn?(on?0.15:0.5):0,ac.currentTime,0.05)},
 intensity:(x:number)=>{inten=Math.max(0,Math.min(1,x))}
}

/* ------------------------------------------------------------- settings -- */
export const audio={
 unlock:()=>guard(()=>{ctx()}),
 isSfx:()=>sfxOn,isMusic:()=>musOn,
 toggleSfx:()=>{sfxOn=!sfxOn;wr('qmr-sfx',sfxOn);if(ac)sfxBus.gain.value=sfxOn?1:0;return sfxOn},
 toggleMusic:()=>{musOn=!musOn;wr('qmr-mus',musOn);if(ac)musBus.gain.setTargetAtTime(musOn?(ducked?0.15:0.5):0,ac.currentTime,0.05);return musOn}
}
