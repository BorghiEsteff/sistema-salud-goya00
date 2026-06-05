document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(sessionStorage.getItem('usuario'));
  if (!user || user.rol !== 'secretaria') {
    window.location.href = 'index.html';
    return;
  }

  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha-filtro').value = hoy;
  document.getElementById('fecha-filtro').addEventListener('change', cargarAgenda);
  cargarAgenda();
});

async function cargarAgenda() {
  const fecha = document.getElementById('fecha-filtro').value;
  const tbody = document.getElementById('tabla-agenda');
  try {
    const data = await api.get(`/turnos?fecha=${fecha}`);
    tbody.innerHTML = '';
    if(data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No hay turnos para este día.</td></tr>';
      return;
    }
    data.forEach(turno => {
      tbody.innerHTML += `
        <tr>
          <td>${turno.hora_inicio.substr(0,5)}</td>
          <td><span class="badge ${turno.estado}">${turno.estado}</span></td>
          <td>
            ${turno.estado === 'solicitado' ? `
              <button onclick="cambiarEstado('${turno.id}', 'confirmado')" style="color:var(--primary-color);background:none;border:none;cursor:pointer;font-weight:bold;">Confirmar</button>
            ` : '-'}
            ${(turno.estado === 'solicitado' || turno.estado === 'confirmado') ? `
              <button onclick="cancelarTurno('${turno.id}')" style="color:var(--danger-color);background:none;border:none;cursor:pointer;font-weight:bold;margin-left:10px;">Cancelar</button>
            ` : ''}
          </td>
        </tr>
      `;
    });
  } catch (err) { alert(err.message); }
}

async function cambiarEstado(id, nuevoEstado) {
  if(confirm(`¿Marcar este turno como ${nuevoEstado}?`)) {
    try {
      await api.put(`/turnos/${id}/estado`, { estado: nuevoEstado });
      cargarAgenda();
    } catch(err) { alert(err.message); }
  }
}

async function cancelarTurno(id) {
  const motivo = prompt('Motivo de cancelación:');
  if(motivo !== null) {
    try {
      await api.put(`/turnos/${id}/cancelar`, { motivo_cancelacion: motivo });
      cargarAgenda();
    } catch(err) { alert(err.message); }
  }
}
