const status = document.getElementById('status');
fetch('https://meta-voice-worker.onrender.com/', { mode: 'cors' })
  .then(r => {
    if (!r.ok) throw new Error('offline');
    status.classList.add('live');
    status.innerHTML = '<span></span> Bot online';
  })
  .catch(() => {
    status.classList.remove('live');
    status.innerHTML = '<span></span> Bot status unavailable';
  });