const menuButton = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
const yearElement = document.getElementById('year');

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

if (menuButton && nav) {
  const mobileQuery = window.matchMedia('(max-width: 760px)');

  const syncMenuState = () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';

    if (mobileQuery.matches) {
      nav.setAttribute('aria-hidden', String(!expanded));
      nav.classList.toggle('open', expanded);
      return;
    }

    nav.classList.remove('open');
    nav.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'false');
  };

  menuButton.addEventListener('click', () => {
    if (!mobileQuery.matches) return;

    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    syncMenuState();
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
      syncMenuState();
    });
  });

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', syncMenuState);
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(syncMenuState);
  }
  syncMenuState();
}
