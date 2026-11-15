export class Input{
 constructor(el){this.keys={};this.dx=0;this.dy=0;this.locked=false;this.down=false;window.addEventListener('keydown',e=>{this.keys[e.code]=true;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault()});window.addEventListener('keyup',e=>this.keys[e.code]=false);window.addEventListener('mousemove',e=>{if(this.locked){this.dx+=e.movementX;this.dy+=e.movementY}});window.addEventListener('mousedown',()=>this.down=true);window.addEventListener('mouseup',()=>this.down=false);document.addEventListener('pointerlockchange',()=>this.locked=document.pointerLockElement===el);this.el=el}
 lock(){this.el.requestPointerLock?.()} consume(){const v=[this.dx,this.dy];this.dx=this.dy=0;return v}
}
