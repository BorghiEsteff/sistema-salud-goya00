document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(sessionStorage.getItem('usuario'));
  if (!user || user.rol !== 'medico') {
    window.location.href = 'index.html';
    return;
  }

  try {
    const perfil = await api.get('/medicos/me');
    document.getElementById('medico-nombre-span').innerText = 'Dr. ' + perfil.nombre + ' ' + perfil.apellido;
    document.getElementById('medico-matricula-span').innerText = 'Mat: ' + perfil.matricula;
  } catch(e) { console.error(e); }

  // Establecer fecha de hoy
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha-filtro').value = hoy;
  document.getElementById('fecha-filtro').addEventListener('change', cargarAgenda);
  cargarAgenda();
});

async function cargarAgenda() {
  const fecha = document.getElementById('fecha-filtro').value;
  const tbody = document.getElementById('tabla-agenda');
  try {
    const data = await api.get(`/medicos/me/agenda?fecha=${fecha}`);
    tbody.innerHTML = '';
    if(data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No hay turnos para este día.</td></tr>';
      return;
    }
    data.forEach(turno => {
      tbody.innerHTML += `
        <tr>
          <td>${turno.hora_inicio.substr(0,5)}</td>
          <td>${turno.paciente_nombre} ${turno.paciente_apellido}</td>
          <td>${turno.dni}</td>
          <td><span class="badge ${turno.estado}">${turno.estado}</span></td>
          <td>
            ${turno.estado === 'confirmado' ? `
              <button onclick="marcarAtendido('${turno.id}', '${turno.paciente_id}')" style="color:var(--secondary-color);background:none;border:none;cursor:pointer;font-weight:bold;margin-right:10px;">✔ Atendido</button>
              <button onclick="cambiarEstado('${turno.id}', 'ausente')" style="color:var(--danger-color);background:none;border:none;cursor:pointer;font-weight:bold;">✖ Ausente</button>
            ` : '-'}
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

// LÓGICA DE HISTORIA CLÍNICA Y ARCHIVOS (Sprint 3)
const modal = document.getElementById('historia-modal');
const form = document.getElementById('historia-form');
const btnCerrar = document.getElementById('btn-cerrar-modal');
const alertDiv = document.getElementById('modal-alert');

btnCerrar.onclick = () => modal.classList.add('hidden');

// Al hacer clic en "Atendido"
async function marcarAtendido(turnoId, pacienteId) {
  if(!confirm('¿El paciente se encuentra presente y listo para ser atendido?')) return;
  
  try {
    // 1. Cambiar el estado en la base de datos (Regla Maestra)
    await api.put(`/turnos/${turnoId}/estado`, { estado: 'atendido' });
    cargarAgenda(); // Refrescar visualmente la tabla
    
    // 2. Abrir Modal para la Historia
    document.getElementById('hc-turno-id').value = turnoId;
    document.getElementById('hc-paciente-id').value = pacienteId;
    form.reset();
    alertDiv.classList.add('hidden');
    modal.classList.remove('hidden');
    
  } catch(err) { alert(err.message); }
}

// Envío del formulario del Modal
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btnGuardar = document.getElementById('btn-guardar-hc');
  btnGuardar.disabled = true;
  btnGuardar.innerText = 'Guardando...';
  
  try {
    const turno_id = document.getElementById('hc-turno-id').value;
    const paciente_id = document.getElementById('hc-paciente-id').value;
    
    // 1. Crear Historia Clínica (JSON)
    const historia = await api.post('/historias', {
      turno_id,
      diagnostico: document.getElementById('hc-diagnostico').value,
      indicaciones: document.getElementById('hc-indicaciones').value,
      observaciones: document.getElementById('hc-observaciones').value,
      proxima_consulta: document.getElementById('hc-proxima-consulta').value
    });
    
    // 2. Si hay archivo, subirlo a Cloudinary (FormData)
    const fileInput = document.getElementById('hc-archivo');
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('paciente_id', paciente_id);
      formData.append('turno_id', turno_id);
      formData.append('historia_id', historia.id);
      formData.append('tipo_archivo', file.type.includes('pdf') ? 'receta' : 'imagen');
      
      btnGuardar.innerText = 'Subiendo adjunto a Cloudinary...';
      await api.post('/archivos/subir', formData);
    }
    
    modal.classList.add('hidden');
    alert('¡Historia Clínica guardada exitosamente!');
    
  } catch(err) {
    alertDiv.textContent = err.message;
    alertDiv.classList.remove('hidden');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerText = 'Guardar Historia y Adjuntos';
  }
});
