const nav = document.querySelector('.nav');
const menu = document.querySelector('.menu-btn');
if (menu && nav) {
  menu.addEventListener('click', () => {
    nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
  });
}
document.querySelectorAll('.links a').forEach(a => a.addEventListener('click', () => nav?.classList.remove('open')));
