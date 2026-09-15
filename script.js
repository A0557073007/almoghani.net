document.getElementById("year").textContent=new Date().getFullYear();
const buttons=[...document.querySelectorAll(".filters button")], items=[...document.querySelectorAll(".item")];
buttons.forEach(b=>b.onclick=()=>{buttons.forEach(x=>x.classList.remove("active"));b.classList.add("active");let f=b.dataset.filter;items.forEach(x=>x.classList.toggle("hidden",f!=="all"&&x.dataset.kind!==f));});
const c=document.getElementById("particles"),x=c.getContext("2d");let ps=[];
function size(){c.width=innerWidth;c.height=innerHeight;ps=Array.from({length:Math.min(55,Math.floor(innerWidth/18))},()=>({x:Math.random()*c.width,y:Math.random()*c.height,r:Math.random()*1.7+.4,v:Math.random()*.25+.08}))}size();addEventListener("resize",size);
(function draw(){x.clearRect(0,0,c.width,c.height);x.fillStyle="rgba(71,116,139,.28)";ps.forEach(p=>{p.y-=p.v;if(p.y<0)p.y=c.height;x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill()});requestAnimationFrame(draw)})();