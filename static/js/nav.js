// static/js/nav.js

// Highlight current chapter in sidebar
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const currentPath = window.location.pathname;
  const links = sidebar.querySelectorAll('a');

  links.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.parentElement.classList.add('active');
      // Scroll into view
      link.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
});
