export interface Entry{name:string;score:number;time:number;level:number;mode:string;date:number}
const K='qmr-scores'
export const loadScores=():Entry[]=>{try{const a=JSON.parse(localStorage.getItem(K)||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
export const addScore=(e:Entry):number=>{const a=[...loadScores(),e].sort((x,y)=>y.score-x.score||x.time-y.time).slice(0,20);try{localStorage.setItem(K,JSON.stringify(a))}catch{};return a.indexOf(e)}
export const clearScores=()=>{try{localStorage.removeItem(K)}catch{}}
