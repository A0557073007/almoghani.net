/*
  ضع روابط حساباتك هنا فقط. إذا تركت الرابط فارغًا سيتم تعطيل الزر تلقائيًا.
  مثال واتساب: https://wa.me/9665XXXXXXXX
  مثال بريد: mailto:name@almoghani.net
*/
const socialLinks = {
  whatsapp: "https://wa.me/966557073007",
  x: "https://x.com/op430",
  instagram: "",
  youtube: "",
  email: "mailto:Ahmed@almoghani.net"
};

document.querySelectorAll('.social-card[data-key]').forEach(card => {
  const key = card.dataset.key;
  const link = socialLinks[key];
  if (!link) {
    card.classList.add('disabled');
    card.setAttribute('aria-disabled', 'true');
    card.removeAttribute('target');
    card.href = '#';
  } else {
    card.href = link;
    if (!link.startsWith('mailto:')) {
      card.target = '_blank';
      card.rel = 'noopener';
    }
  }
});
