document.addEventListener('DOMContentLoaded', () => {
  const btnNotificaciones = document.getElementById('btn-notificaciones');
  const dropdown = document.getElementById('notificaciones-dropdown');
  const badge = document.getElementById('notificaciones-badge');
  const lista = document.getElementById('notificaciones-lista');
  const btnMarcarTodas = document.getElementById('btn-marcar-todas-leidas');

  // Toggle dropdown
  btnNotificaciones.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    if (dropdown.style.display === 'block') {
      cargarNotificaciones();
    }
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.notificaciones-container')) {
      dropdown.style.display = 'none';
    }
  });

  btnMarcarTodas.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await apiFetch('/api/notificaciones/marcar-todas-leidas', 'PUT');
      actualizarBadge();
      cargarNotificaciones();
    } catch (err) {
      console.error('Error al marcar leídas', err);
    }
  });

  async function actualizarBadge() {
    try {
      const res = await apiFetch('/api/notificaciones/no-leidas/count');
      if (res.count > 0) {
        badge.innerText = res.count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    } catch (err) {
      console.error('Error badge:', err);
    }
  }

  async function cargarNotificaciones() {
    try {
      const notifs = await apiFetch('/api/notificaciones');
      lista.innerHTML = '';
      if (notifs.length === 0) {
        lista.innerHTML = '<p style="text-align: center; color: var(--text-secondary); font-size: 0.9rem;">No hay notificaciones</p>';
        return;
      }

      notifs.forEach(n => {
        const item = document.createElement('div');
        item.style.padding = '10px';
        item.style.borderBottom = '1px solid var(--border-color)';
        item.style.backgroundColor = n.leida ? 'transparent' : 'rgba(37, 99, 235, 0.05)';
        item.style.cursor = 'pointer';
        
        item.innerHTML = `
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">${n.titulo}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px;">${n.mensaje}</div>
          <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 5px; text-align: right;">${new Date(n.creado_en).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</div>
        `;

        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!n.leida) {
            await apiFetch(`/api/notificaciones/${n.id}/leida`, 'PUT');
            actualizarBadge();
            n.leida = true;
            item.style.backgroundColor = 'transparent';
          }
        });

        lista.appendChild(item);
      });
    } catch (err) {
      console.error('Error al cargar notificaciones', err);
      lista.innerHTML = '<p style="text-align: center; color: var(--danger-color); font-size: 0.9rem;">Error al cargar</p>';
    }
  }

  // Inicializar si el usuario está logueado
  if (sessionStorage.getItem('token')) {
    actualizarBadge();
    setInterval(actualizarBadge, 60000); // Polling cada 1 min
  }
});
