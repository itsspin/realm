(function (global) {
  const toasts = [];

  function show(toast) {
    if (!toast || !toast.text) return;

    const toastId = `toast_${Date.now()}_${Math.random()}`;
    const toastElement = document.createElement('div');
    toastElement.className = `toast toast--${toast.type || 'default'}`;
    toastElement.id = toastId;

    toastElement.innerHTML = `
      <div class="toast-title">${toast.title || 'Notification'}</div>
      <div class="toast-text">${toast.text}</div>
    `;

    const container = document.getElementById('toastContainer');
    if (container) {
      container.appendChild(toastElement);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        toastElement.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
          if (toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
          }
        }, 300);
      }, 4000);
    }
  }

  const Toast = {
    show
  };

  global.Toast = Toast;
})(window);

