const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");
let particles = [];
let mouse = { x: innerWidth / 2, y: innerHeight / 2 };

function resizeCanvas(){
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
  createParticles();
}
function createParticles(){
  const count = Math.min(95, Math.floor((innerWidth * innerHeight) / 14500));
  particles = Array.from({length:count},()=>({
    x:Math.random()*innerWidth,y:Math.random()*innerHeight,
    vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,
    r:Math.random()*1.7+.4
  }));
}
function animateParticles(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  particles.forEach((p,i)=>{
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0||p.x>innerWidth)p.vx*=-1;
    if(p.y<0||p.y>innerHeight)p.vy*=-1;
    const dx=mouse.x-p.x,dy=mouse.y-p.y,d=Math.hypot(dx,dy);
    if(d<140){p.x-=dx*.0007;p.y-=dy*.0007}
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle="rgba(190,205,255,.55)";ctx.fill();
    for(let j=i+1;j<particles.length;j++){
      const q=particles[j],dist=Math.hypot(p.x-q.x,p.y-q.y);
      if(dist<100){
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
        ctx.strokeStyle=`rgba(139,92,246,${(1-dist/100)*.12})`;ctx.stroke();
      }
    }
  });
  requestAnimationFrame(animateParticles);
}
addEventListener("resize",resizeCanvas);
addEventListener("mousemove",e=>{
  mouse.x=e.clientX;mouse.y=e.clientY;
  const glow=document.getElementById("cursorGlow");
  glow.style.left=e.clientX+"px";glow.style.top=e.clientY+"px";
});
resizeCanvas();animateParticles();

const observer = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add("visible")});
},{threshold:.14});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

document.querySelectorAll(".tilt-card").forEach(card=>{
  card.addEventListener("mousemove",e=>{
    if(innerWidth<900)return;
    const r=card.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    card.style.transform=`perspective(1000px) rotateX(${-y*9}deg) rotateY(${x*11}deg) translateY(-4px)`;
  });
  card.addEventListener("mouseleave",()=>card.style.transform="");
});

const scene=document.getElementById("scene");
addEventListener("mousemove",e=>{
  if(innerWidth<900)return;
  const x=(e.clientX/innerWidth-.5)*16;
  const y=(e.clientY/innerHeight-.5)*-13;
  scene.style.transform=`rotateY(${x}deg) rotateX(${y}deg)`;
});

document.querySelectorAll(".magnetic").forEach(el=>{
  el.addEventListener("mousemove",e=>{
    if(innerWidth<900)return;
    const r=el.getBoundingClientRect();
    const x=e.clientX-r.left-r.width/2;
    const y=e.clientY-r.top-r.height/2;
    el.style.transform=`translate(${x*.14}px,${y*.14}px)`;
  });
  el.addEventListener("mouseleave",()=>el.style.transform="");
});

const menuBtn=document.getElementById("menuBtn");
const navLinks=document.getElementById("navLinks");
menuBtn.addEventListener("click",()=>navLinks.classList.toggle("open"));
navLinks.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>navLinks.classList.remove("open")));

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener("click",e=>{
    const id=a.getAttribute("href");
    if(id==="#"||!document.querySelector(id))return;
    e.preventDefault();
    document.querySelector(id).scrollIntoView({behavior:"smooth",block:"start"});
  });
});
