const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
const year = document.getElementById('year');

if (year) {
  year.textContent = new Date().getFullYear();
}

if (menuBtn && nav) {
  const openLabel = 'فتح القائمة';
  const closeLabel = 'إغلاق القائمة';
  const mobileQuery = window.matchMedia('(max-width: 900px)');

  const setMenuState = (isOpen) => {
    nav.classList.toggle('open', isOpen);
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menuBtn.setAttribute('aria-label', isOpen ? closeLabel : openLabel);
    nav.hidden = mobileQuery.matches ? !isOpen : false;
  };

  const syncForViewport = () => {
    if (!mobileQuery.matches) {
      setMenuState(false);
      return;
    }
    setMenuState(nav.classList.contains('open'));
  };

  menuBtn.addEventListener('click', () => {
    setMenuState(!nav.classList.contains('open'));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      setMenuState(false);
    });
  });

  syncForViewport();
  mobileQuery.addEventListener('change', syncForViewport);
}
