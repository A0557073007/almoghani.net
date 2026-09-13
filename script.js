function toggleMenu(){
  const menu=document.getElementById("menu");
  const btn=document.querySelector(".menu-btn");
  menu.classList.toggle("open");
  btn.setAttribute("aria-expanded",menu.classList.contains("open"));
}
document.querySelectorAll("#menu a").forEach(a=>a.addEventListener("click",()=>{
  document.getElementById("menu").classList.remove("open");
  document.querySelector(".menu-btn").setAttribute("aria-expanded","false");
}));
document.getElementById("year").textContent=new Date().getFullYear();

const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("visible")});
},{threshold:.08});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

function toggleChat(){
  const panel=document.getElementById("chatPanel");
  const open=panel.classList.toggle("open");
  panel.setAttribute("aria-hidden", String(!open));
}
function switchChatTab(tab, btn){
  document.querySelectorAll(".chat-tab").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".chat-view").forEach(v=>v.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(tab==="wa" ? "waView" : "liveView").classList.add("active");
}
function sendWhatsApp(){
  const box=document.getElementById("waMessage");
  const text=box.value.trim();
  if(!text){ box.focus(); return; }
  const url="https://wa.me/966557073007?text="+encodeURIComponent(text);
  window.open(url,"_blank","noopener");
}
