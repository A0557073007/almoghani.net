const canvas=document.getElementById('particles');
const ctx=canvas?.getContext('2d');
let dots=[];

function resetParticles(){
  if(!canvas||!ctx)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=innerWidth*dpr;
  canvas.height=innerHeight*dpr;
  canvas.style.width=innerWidth+'px';
  canvas.style.height=innerHeight+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  dots=Array.from({length:Math.min(60,Math.floor(innerWidth*innerHeight/22000))},()=>({
    x:Math.random()*innerWidth,
    y:Math.random()*innerHeight,
    vx:(Math.random()-.5)*.14,
    vy:(Math.random()-.5)*.14,
    r:Math.random()*1.4+.4
  }));
}
function animateParticles(){
  if(!canvas||!ctx)return;
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for(let i=0;i<dots.length;i++){
    const p=dots[i];
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<0||p.x>innerWidth)p.vx*=-1;
    if(p.y<0||p.y>innerHeight)p.vy*=-1;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle='rgba(129,105,56,.28)';
    ctx.fill();
  }
  requestAnimationFrame(animateParticles);
}
addEventListener('resize',resetParticles);
resetParticles();
animateParticles();

const glow=document.getElementById('cursorGlow');
if(glow){
  addEventListener('mousemove',e=>{
    glow.style.left=e.clientX+'px';
    glow.style.top=e.clientY+'px';
  });
}

const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting)entry.target.classList.add('visible');
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

document.querySelectorAll('.tilt-card').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    if(innerWidth<900)return;
    const r=card.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width-.5;
    const y=(e.clientY-r.top)/r.height-.5;
    card.style.transform=`perspective(1000px) rotateX(${-y*5}deg) rotateY(${x*7}deg) translateY(-3px)`;
  });
  card.addEventListener('mouseleave',()=>card.style.transform='');
});

document.querySelectorAll('.magnetic').forEach(el=>{
  el.addEventListener('mousemove',e=>{
    if(innerWidth<900)return;
    const r=el.getBoundingClientRect();
    const x=e.clientX-r.left-r.width/2;
    const y=e.clientY-r.top-r.height/2;
    el.style.transform=`translate(${x*.10}px,${y*.10}px)`;
  });
  el.addEventListener('mouseleave',()=>el.style.transform='');
});

const menu=document.getElementById('menuBtn');
const links=document.getElementById('navLinks');
if(menu&&links){
  menu.addEventListener('click',()=>links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('open')));
}

document.querySelectorAll('.filter').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const f=btn.dataset.filter;
    document.querySelectorAll('.work-card').forEach(card=>{
      card.classList.toggle('hide',f!=='all'&&card.dataset.cat!==f);
    });
  });
});

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const id=a.getAttribute('href');
    if(!id||id==='#')return;
    const target=document.querySelector(id);
    if(target){
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
});

const toast=document.getElementById('toast');
document.querySelectorAll('a[href^="javascript:void"]').forEach(a=>{
  a.addEventListener('click',()=>{
    if(!toast)return;
    toast.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer=setTimeout(()=>toast.classList.remove('show'),1800);
  });
});
