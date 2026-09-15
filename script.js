const menu=document.getElementById('menu'),links=document.getElementById('links');
menu?.addEventListener('click',()=>links.classList.toggle('open'));
links?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('open')));

const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('show')}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(e=>observer.observe(e));

document.querySelectorAll('.tilt').forEach(card=>{
 card.addEventListener('mousemove',e=>{
  if(innerWidth<900)return;
  const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
  card.style.transform=`perspective(1000px) rotateX(${-y*5}deg) rotateY(${x*7}deg) translateY(-3px)`;
 });
 card.addEventListener('mouseleave',()=>card.style.transform='');
});

document.querySelectorAll('.filters button').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('.filters button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
 const f=btn.dataset.filter;
 document.querySelectorAll('.project').forEach(p=>p.classList.toggle('hide',f!=='all'&&p.dataset.cat!==f));
}));

const glow=document.getElementById('glow');
addEventListener('pointermove',e=>{if(glow){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'}});

const canvas=document.getElementById('particles'),ctx=canvas.getContext('2d');let pts=[];
function resize(){const d=Math.min(devicePixelRatio||1,2);canvas.width=innerWidth*d;canvas.height=innerHeight*d;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0);pts=Array.from({length:Math.min(55,Math.floor(innerWidth*innerHeight/24000))},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,vx:(Math.random()-.5)*.12,vy:(Math.random()-.5)*.12,r:Math.random()*1.4+.4}))}
function draw(){ctx.clearRect(0,0,innerWidth,innerHeight);pts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>innerWidth)p.vx*=-1;if(p.y<0||p.y>innerHeight)p.vy*=-1;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(146,113,47,.28)';ctx.fill()});requestAnimationFrame(draw)}
addEventListener('resize',resize);resize();draw();