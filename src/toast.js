let timeout = null;

export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.display = 'block';
  el.style.opacity = '1';
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => (el.style.display = 'none'), 300);
  }, 2000);
}
