document.addEventListener('DOMContentLoaded', () => {
  // Theme initialization
  const html = document.documentElement;
  const savedTheme = localStorage.getItem('portfolio_theme');
  if (savedTheme === 'light') {
    html.setAttribute('data-theme', 'light');
  }

  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');
  const errorMessage = document.getElementById('error-message');
  const lockoutMessage = document.getElementById('lockout-message');
  const countdownEl = document.getElementById('countdown');

  let countdownTimer = null;

  // Check auth status
  fetch('/api/auth/status')
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        window.location.href = '/admin';
      }
    })
    .catch(() => {
      // Ignore errors, stay on login page
    });

  // Password toggle
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      if (type === 'text') {
        togglePasswordBtn.innerHTML = '<svg viewBox="0 0 24 24" class="eye-off-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>';
      } else {
        togglePasswordBtn.innerHTML = '<svg viewBox="0 0 24 24" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
    });
  }

  function startCountdown(seconds) {
    lockoutMessage.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    submitBtn.disabled = true;
    
    let timeLeft = seconds;
    countdownEl.textContent = timeLeft;
    
    if (countdownTimer) clearInterval(countdownTimer);
    
    countdownTimer = setInterval(() => {
      timeLeft--;
      countdownEl.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(countdownTimer);
        lockoutMessage.classList.add('hidden');
        submitBtn.disabled = false;
      }
    }, 1000);
  }

  // Handle submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      
      if (!username || !password) return;
      
      // Reset states
      errorMessage.classList.add('hidden');
      lockoutMessage.classList.add('hidden');
      
      // Loading state
      btnText.classList.add('hidden');
      spinner.classList.remove('hidden');
      submitBtn.disabled = true;
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
          window.location.href = '/admin';
        } else if (response.status === 401) {
          errorMessage.textContent = 'Invalid credentials';
          errorMessage.classList.remove('hidden');
        } else if (response.status === 429) {
          startCountdown(30);
        } else {
          errorMessage.textContent = 'An error occurred. Please try again.';
          errorMessage.classList.remove('hidden');
        }
      } catch (err) {
        errorMessage.textContent = 'Network error. Check your connection.';
        errorMessage.classList.remove('hidden');
      } finally {
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
        if (lockoutMessage.classList.contains('hidden')) {
          submitBtn.disabled = false;
        }
      }
    });
  }
});
