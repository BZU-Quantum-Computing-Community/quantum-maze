import type {Level} from './levels'
export interface Entry{name:string;score:number;time:number;level:number;mode:string;date:number}
const K='qmr-scores-v2'
export const loadScores=():Entry[]=>{try{const a=JSON.parse(localStorage.getItem(K)||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
export const addScore=(e:Entry):number=>{const a=[...loadScores(),e].sort((x,y)=>y.score-x.score||x.time-y.time).slice(0,20);try{localStorage.setItem(K,JSON.stringify(a))}catch{};return a.indexOf(e)}
export const clearScores=()=>{try{localStorage.removeItem(K)}catch{}}

/* ---------- SCORING (same formula everywhere in the game) ----------
   BASE     = level.points            (harder level = more points)
   SPEED    = up to +50% of BASE: full bonus until the level's PAR time, then it
              shrinks linearly and reaches 0 at 4 x PAR
   CLEAN    = +10% of BASE if you never bumped into the locked exit
   BUMPS    = -5% of BASE for every bump into the locked exit            */
export interface Breakdown{base:number;speed:number;speedMax:number;clean:number;penalty:number;bumps:number;total:number;max:number}
export const calcScore=(l:Level,time:number,bumps:number):Breakdown=>{
 const base=l.points,speedMax=Math.round(base*0.5),f=Math.max(0,Math.min(1,(4*l.par-time)/(3*l.par)))
 const speed=Math.round(speedMax*f),cleanMax=Math.round(base*0.1),clean=bumps===0?cleanMax:0,penalty=bumps*Math.round(base*0.05)
 return{base,speed,speedMax,clean,penalty,bumps,total:Math.max(0,base+speed+clean-penalty),max:base+speedMax+cleanMax}
}
export const stars=(d:number)=>'★'.repeat(Math.min(d,5))+'☆'.repeat(Math.max(0,5-d))
export const DIFF=['','EASY','EASY+','MEDIUM','HARD','VERY HARD','EXTREME']
