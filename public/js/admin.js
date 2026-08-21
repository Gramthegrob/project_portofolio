document.addEventListener('DOMContentLoaded', () => {
  // Theme initialization
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('portfolio_theme');
  if (savedTheme === 'light') {
    html.setAttribute('data-theme', 'light');
  }

  // Check auth status
  fetch('/api/auth/status')
    .then(res => res.json())
    .then(data => {
      if (!data.authenticated) {
        window.location.href = '/login';
        return;
      }
      const usernameEl = document.getElementById('admin-username');
      if (usernameEl && data.user) {
        usernameEl.textContent = data.user.username;
      }
    })
    .catch(() => {
      window.location.href = '/login';
    });

  // Handle logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
      } catch (err) {
        console.error('Logout failed', err);
        window.location.href = '/login';
      }
    });
  }
});
