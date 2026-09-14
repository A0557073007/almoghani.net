const canvas=document.getElementById('particles');
const ctx=canvas.getContext('2d');
let dots=[],mouse={x:innerWidth/2,y:innerHeight/2};
function reset(){
  const dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;
  canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  dots=Array.from({length:Math.min(70,Math.floor(innerWidth*innerHeight/18000))},()=>({
    x:Math.random()*innerWidth,y:Math.random()*innerHeight,
    vx:(Math.random()-.5)*.18,vy:(Math.random()-.5)*.18,r:Math.random()*1.6+.4
  }));
}
function loop(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  for(let i=0;i<dots.length;i++){
    const p=dots[i];p.x+=p.vx;p.y+=p.vy;
    if(p.x<0||p.x>innerWidth)p.vx*=-1;if(p.y<0||p.y>innerHeight)p.vy*=-1;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(129,105,56,.32)';ctx.fill();
    for(let j=i+1;j<dots.length;j++){
      const q=dots[j],d=Math.hypot(p.x-q.x,p.y-q.y);
      if(d<95){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle=`rgba(150,125,72,${(1-d/95)*.06})`;ctx.stroke()}
    }
  }
  requestAnimationFrame(loop)
}
addEventListener('resize',reset);reset();loop();

const glow=document.getElementById('cursorGlow');
addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'});

const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));

document.querySelectorAll('.tilt-card').forEach(card=>{
  card.addEventListener('mousemove',e=>{
    if(innerWidth<900)return;
    const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    card.style.transform=`perspective(1000px) rotateX(${-y*6}deg) rotateY(${x*8}deg) translateY(-3px)`
  });
  card.addEventListener('mouseleave',()=>card.style.transform='')
});

document.querySelectorAll('.magnetic').forEach(el=>{
  el.addEventListener('mousemove',e=>{
    if(innerWidth<900)return;
    const r=el.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;
    el.style.transform=`translate(${x*.12}px,${y*.12}px)`
  });
  el.addEventListener('mouseleave',()=>el.style.transform='')
});

const menu=document.getElementById('menuBtn'),links=document.getElementById('navLinks');
menu.addEventListener('click',()=>links.classList.toggle('open'));
links.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('open')));

document.querySelectorAll('.filter').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const f=btn.dataset.filter;
    document.querySelectorAll('.work-card').forEach(card=>{
      card.classList.toggle('hide',f!=='all'&&card.dataset.cat!==f)
    })
  })
});

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const id=a.getAttribute('href');
    const target=document.querySelector(id);
    if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'})}
  })
});
