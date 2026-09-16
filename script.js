const menuButton = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
const yearElement = document.getElementById('year');

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

if (menuButton && nav) {
  const mobileQuery = window.matchMedia('(max-width: 760px)');
  const navLinks = nav.querySelectorAll('a');

  const setLinksTabbable = (isTabbable) => {
    navLinks.forEach((link) => {
      if (isTabbable) {
        link.removeAttribute('tabindex');
      } else {
        link.setAttribute('tabindex', '-1');
      }
    });
  };

  const syncMenuState = () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';

    if (mobileQuery.matches) {
      menuButton.setAttribute('aria-hidden', 'false');
      menuButton.removeAttribute('tabindex');
      nav.setAttribute('aria-hidden', String(!expanded));
      nav.classList.toggle('open', expanded);
      setLinksTabbable(expanded);
      return;
    }

    nav.classList.remove('open');
    nav.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('tabindex', '-1');
    setLinksTabbable(true);
  };

  menuButton.addEventListener('click', () => {
    if (!mobileQuery.matches) return;

    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    syncMenuState();
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (!mobileQuery.matches) return;

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
