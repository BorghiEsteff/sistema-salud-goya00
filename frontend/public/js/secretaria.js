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
          <td>${turno.paciente_nombre} ${turno.paciente_apellido}</td>
          <td>${turno.medico_nombre} ${turno.medico_apellido}</td>
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
  } catch (err) { showGlobalError(err.message); }
}

function showGlobalError(message, type = 'error') {
  const alert = document.getElementById('global-alert');
  alert.textContent = message;
  alert.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
  alert.classList.remove('hidden');
  setTimeout(() => alert.classList.add('hidden'), 5000);
}

function visualConfirm(titulo, mensaje) {
  return new Promise((resolve) => {
    document.getElementById('confirm-title').textContent = titulo;
    document.getElementById('confirm-message').textContent = mensaje || '¿Estás seguro?';
    const modal = document.getElementById('confirm-modal');
    modal.classList.remove('hidden');
    
    document.getElementById('confirm-btn-ok').onclick = () => {
      modal.classList.add('hidden');
      resolve(true);
    };
    document.getElementById('confirm-btn-cancel').onclick = () => {
      modal.classList.add('hidden');
      resolve(false);
    };
  });
}

async function cambiarEstado(id, nuevoEstado) {
  const confirmado = await visualConfirm(`Confirmar cambio`, `¿Desea marcar este turno como ${nuevoEstado}?`);
  if(confirmado) {
    try {
      await api.put(`/turnos/${id}/estado`, { estado: nuevoEstado });
      showGlobalError(`Turno marcado como ${nuevoEstado}`, 'success');
      cargarAgenda();
    } catch(err) { showGlobalError(err.message); }
  }
}

let turnoACancelar = null;

function cancelarTurno(id) {
  turnoACancelar = id;
  document.getElementById('motivo-cancelacion-input').value = '';
  document.getElementById('cancelar-modal').classList.remove('hidden');
}

function cerrarModalCancelar() {
  document.getElementById('cancelar-modal').classList.add('hidden');
  turnoACancelar = null;
}

async function confirmarCancelacion() {
  const motivo = document.getElementById('motivo-cancelacion-input').value.trim();
  if(!motivo) return showGlobalError('Debe ingresar un motivo de cancelación.');
  
  try {
    await api.put(`/turnos/${turnoACancelar}/cancelar`, { motivo_cancelacion: motivo });
    showGlobalError('Turno cancelado exitosamente.', 'success');
    cerrarModalCancelar();
    cargarAgenda();
  } catch(err) { showGlobalError(err.message); }
}
