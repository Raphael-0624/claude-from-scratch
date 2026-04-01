// static/js/main.js

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const searchToggle = document.getElementById('searchToggle');

  if (searchToggle) {
    searchToggle.addEventListener('click', () => {
      // Search functionality placeholder
      console.log('Search toggle clicked');
    });
  }

  // Add copy buttons to code blocks
  document.querySelectorAll('pre').forEach(pre => {
    const button = document.createElement('button');
    button.className = 'code-copy';
    button.textContent = 'Copy';
    button.addEventListener('click', () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent;
      navigator.clipboard.writeText(code).then(() => {
        button.textContent = 'Copied!';
        setTimeout(() => button.textContent = 'Copy', 2000);
      });
    });
    pre.style.position = 'relative';
    pre.appendChild(button);
  });
});
