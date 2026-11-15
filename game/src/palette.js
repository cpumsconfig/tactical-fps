export const C={ink:0xe9e6db,amber:0xff8845,amberHot:0xffc071,cobalt:0x47b9d1,cobaltHot:0x80eff0,steel:0x263238,wall:0x353c3a,floor:0x202727,molten:0xff4e20};
export const ARENA={x:42,z:58,halfX:21,halfZ:29};
export function rng(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
