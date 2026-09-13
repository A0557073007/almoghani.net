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
