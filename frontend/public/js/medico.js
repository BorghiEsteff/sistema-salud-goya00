// Función para mostrar errores
function showGlobalError(message, type = 'error') {
  const alertDiv = document.getElementById('dashboard-global-error');
  alertDiv.textContent = message;
  alertDiv.className = `alert ${type}`; // quita hidden y pone clase de color
  
  // Auto ocultar después de 4 segundos
  setTimeout(() => {
    alertDiv.classList.add('hidden');
  }, 4000);
}

// Utilidad para reemplazo de confirm()
function visualConfirm(titulo, mensaje) {
  return new Promise((resolve) => {
    const modalConfirm = document.getElementById('confirmar-modal');
    document.getElementById('confirmar-titulo').innerText = titulo;
    document.getElementById('confirmar-mensaje').innerText = mensaje;
    
    const btnAceptar = document.getElementById('btn-confirmar-aceptar');
    const btnCancelar = document.getElementById('btn-confirmar-cancelar');
    
    btnAceptar.onclick = () => {
      modalConfirm.classList.add('hidden');
      resolve(true);
    };
    
    btnCancelar.onclick = () => {
      modalConfirm.classList.add('hidden');
      resolve(false);
    };
    
    modalConfirm.classList.remove('hidden');
  });
}

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
  } catch(e) { showGlobalError(e.message || 'Error al cargar perfil'); }

  // Establecer fecha de hoy
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha-filtro').value = hoy;
  document.getElementById('fecha-filtro').addEventListener('change', cargarAgenda);
  
  document.getElementById('nav-agenda').onclick = (e) => switchTab(e, 'section-agenda', cargarAgenda);
  document.getElementById('nav-avisos').onclick = (e) => switchTab(e, 'section-avisos', cargarAvisos);
  document.getElementById('nav-perfil').onclick = (e) => switchTab(e, 'section-perfil', cargarMiPerfil);

  cargarAgenda();
});

function switchTab(event, sectionId, loadDataFunc) {
  event.preventDefault();
  document.querySelectorAll('.main-content > section').forEach(s => s.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  event.target.classList.add('active');
  if (loadDataFunc) loadDataFunc();
}

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
      // Modulo 2 Prep: Nombre clicable para historial
      const nombreClicable = `<a href="#" onclick="abrirHistorial('${turno.paciente_id}')" style="color:var(--primary-color); font-weight:bold; text-decoration:underline;">${turno.paciente_nombre} ${turno.paciente_apellido}</a>`;

      let acciones = '-';
      if (turno.estado === 'confirmado') {
        acciones = `
          <button onclick="marcarAtendido('${turno.id}', '${turno.paciente_id}')" style="color:var(--secondary-color);background:none;border:none;cursor:pointer;font-weight:bold;margin-right:10px;">✔ Atendido</button>
          <button onclick="cambiarEstado('${turno.id}', 'ausente')" style="color:var(--danger-color);background:none;border:none;cursor:pointer;font-weight:bold;margin-right:10px;">✖ Ausente</button>
          <button onclick="cancelarTurno('${turno.id}')" style="color:var(--text-secondary);background:none;border:none;cursor:pointer;font-weight:bold;">Cancelar</button>
        `;
      } else if (turno.estado === 'solicitado') {
        acciones = `
          <span style="font-size:0.8rem;color:var(--text-secondary);display:block;margin-bottom:5px;">Falta Pago</span>
          <button onclick="cambiarEstado('${turno.id}', 'confirmado')" style="color:var(--success-color);background:none;border:none;cursor:pointer;font-weight:bold;margin-right:10px;">Aceptar Manualmente</button>
          <button onclick="cancelarTurno('${turno.id}')" style="color:var(--text-secondary);background:none;border:none;cursor:pointer;font-weight:bold;">Cancelar</button>
        `;
      }

      tbody.innerHTML += `
        <tr>
          <td>${turno.hora_inicio.substr(0,5)}</td>
          <td>${nombreClicable}</td>
          <td>${turno.dni}</td>
          <td><span class="badge ${turno.estado}">${turno.estado}</span></td>
          <td>${acciones}</td>
        </tr>
      `;
    });
  } catch (err) { showGlobalError(err.message || 'Error al cargar la agenda'); }
}

async function cambiarEstado(id, nuevoEstado) {
  const confirmado = await visualConfirm(
    'Confirmar Acción', 
    `¿Marcar este turno como ${nuevoEstado}?`
  );
  if (confirmado) {
    try {
      await api.put(`/turnos/${id}/estado`, { estado: nuevoEstado });
      showGlobalError(`Turno marcado como ${nuevoEstado} exitosamente`, 'success');
      cargarAgenda();
    } catch(err) { showGlobalError(err.message || 'Error al cambiar estado'); }
  }
}

// Abrir modal de cancelación
function cancelarTurno(id) {
  document.getElementById('cancelar-turno-id').value = id;
  document.getElementById('cancelar-motivo').value = '';
  document.getElementById('cancelar-modal').classList.remove('hidden');
}

// Envío del modal de cancelación
document.getElementById('cancelar-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('cancelar-turno-id').value;
  const motivo = document.getElementById('cancelar-motivo').value;
  
  try {
    await api.put(`/turnos/${id}/cancelar`, { motivo_cancelacion: motivo });
    document.getElementById('cancelar-modal').classList.add('hidden');
    showGlobalError('Turno cancelado exitosamente', 'success');
    cargarAgenda();
  } catch(err) { showGlobalError(err.message || 'Error al cancelar turno'); }
});

let pacienteSeleccionadoParaHistorial = null;
let turnoSeleccionadoParaHistorial = null;

// Llama al GET de historias y abre el modal
async function abrirHistorial(pacienteId, turnoId) {
  pacienteSeleccionadoParaHistorial = pacienteId;
  turnoSeleccionadoParaHistorial = turnoId;
  
  // Limpiar la vista
  document.getElementById('historial-contenido').innerHTML = '<div class="spinner"></div> Cargando...';
  document.getElementById('archivos-lista').innerHTML = '';
  document.getElementById('upload-pdf-input').value = '';
  document.getElementById('visor-historial-modal').classList.remove('hidden');

  try {
    // 1. Cargar el texto de las historias
    const historias = await api.get(`/historias/paciente/${pacienteId}`);
    let htmlHistorias = '';
    
    if (historias.length === 0) {
      htmlHistorias = '<p style="color:var(--text-secondary)">No hay historias registradas.</p>';
    } else {
      historias.forEach(h => {
        htmlHistorias += `
          <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px; font-size: 0.9rem;">
            <strong style="color:var(--primary-color)">${h.fecha_turno.split('T')[0]} - Dr. ${h.medico_apellido}</strong><br>
            <span style="color:var(--text-secondary)">Dx:</span> ${h.diagnostico}<br>
            <span style="color:var(--text-secondary)">Ind:</span> ${h.indicaciones || '-'}
          </div>
        `;
      });
    }
    document.getElementById('historial-contenido').innerHTML = htmlHistorias;

    // 2. Cargar la lista de PDFs
    await recargarArchivos(pacienteId);

  } catch (err) {
    document.getElementById('historial-contenido').innerHTML = `<span style="color:var(--danger-color)">${err.message}</span>`;
  }
}

// Función auxiliar para recuperar los archivos y pintarlos
async function recargarArchivos(pacienteId) {
  try {
    const archivos = await api.get(`/archivos/paciente/${pacienteId}`);
    const lista = document.getElementById('archivos-lista');
    lista.innerHTML = '';
    
    if (archivos.length === 0) {
      lista.innerHTML = '<li style="color:var(--text-secondary); font-size:0.9rem;">No hay PDFs adjuntos.</li>';
      return;
    }
    
    archivos.forEach(a => {
      lista.innerHTML += `
        <li style="margin-bottom: 8px;">
          <a href="${a.url_cloudinary}" target="_blank" style="color: var(--secondary-color); text-decoration: none; font-weight: 600;">
            📄 ${a.nombre_archivo}
          </a>
          <br><span style="font-size: 0.75rem; color: var(--text-secondary);">${a.creado_en.split('T')[0]}</span>
        </li>
      `;
    });
  } catch(err) {
    showGlobalError('Error al cargar PDFs: ' + err.message);
  }
}

// Lógica de Subida Iterativa de Archivos
document.getElementById('btn-subir-pdfs')?.addEventListener('click', async () => {
  if (!pacienteSeleccionadoParaHistorial || !turnoSeleccionadoParaHistorial) return;
  
  const fileInput = document.getElementById('upload-pdf-input');
  const files = fileInput.files;
  
  if (files.length === 0) {
    showGlobalError('Por favor selecciona al menos un archivo PDF.', 'error');
    return;
  }

  const btnSubir = document.getElementById('btn-subir-pdfs');
  btnSubir.disabled = true;
  btnSubir.innerText = 'Subiendo...';

  try {
    // Enviamos POST por cada archivo de forma secuencial usando api.post
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('archivo', files[i]);
      formData.append('paciente_id', pacienteSeleccionadoParaHistorial);
      formData.append('turno_id', turnoSeleccionadoParaHistorial);
      formData.append('tipo_archivo', 'documento_pdf');
      
      await api.post('/archivos/subir', formData);
    }
    
    showGlobalError('Todos los archivos se subieron con éxito.', 'success');
    fileInput.value = ''; // Limpiar input
    
    // Refrescar lista de PDFs
    await recargarArchivos(pacienteSeleccionadoParaHistorial);
    
  } catch(err) {
    showGlobalError('Hubo un error subiendo archivos: ' + err.message);
  } finally {
    btnSubir.disabled = false;
    btnSubir.innerText = 'Subir PDFs';
  }
});

// LÓGICA DE HISTORIA CLÍNICA Y ARCHIVOS (Sprint 3)
const modal = document.getElementById('historia-modal');
const form = document.getElementById('historia-form');
const btnCerrar = document.getElementById('btn-cerrar-modal');
const alertDiv = document.getElementById('modal-alert');

btnCerrar.onclick = () => modal.classList.add('hidden');

// Al hacer clic en "Atendido"
async function marcarAtendido(turnoId, pacienteId) {
  const confirmado = await visualConfirm(
    'Marcar Atendido', 
    '¿El paciente se encuentra presente y listo para ser atendido?'
  );
  if (!confirmado) return;
  
  try {
    // 1. Cambiar el estado en la base de datos (Regla Maestra)
    await api.put(`/turnos/${turnoId}/estado`, { estado: 'atendido' });
    showGlobalError('Estado actualizado. Por favor cargue la historia clínica.', 'success');
    cargarAgenda(); // Refrescar visualmente la tabla
    
    // 2. Abrir Modal para la Historia
    document.getElementById('hc-turno-id').value = turnoId;
    document.getElementById('hc-paciente-id').value = pacienteId;
    form.reset();
    alertDiv.classList.add('hidden');
    modal.classList.remove('hidden');
    
  } catch(err) { showGlobalError(err.message || 'Error al marcar como atendido'); }
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
    showGlobalError('¡Historia Clínica guardada exitosamente!', 'success');
    
  } catch(err) {
    alertDiv.textContent = err.message;
    alertDiv.classList.remove('hidden');
  } finally {
    btnGuardar.disabled = false;
    btnGuardar.innerText = 'Guardar Historia y Adjuntos';
  }
});

// LÓGICA DE MI PERFIL
async function cargarMiPerfil() {
  try {
    const perfil = await api.get('/medicos/me');
    document.getElementById('perfil-telefono').value = perfil.telefono || '';
    document.getElementById('perfil-precio').value = perfil.precio_consulta || '';
    document.getElementById('perfil-modalidad').value = perfil.modalidad_pago || 'on_site';
  } catch(e) {
    showGlobalError('Error al cargar perfil');
  }
}

document.getElementById('form-perfil')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-guardar-perfil');
  btn.disabled = true;
  btn.innerText = 'Guardando...';
  
  try {
    await api.put('/medicos/me', {
      telefono: document.getElementById('perfil-telefono').value,
      precio_consulta: document.getElementById('perfil-precio').value,
      modalidad_pago: document.getElementById('perfil-modalidad').value
    });
    showGlobalError('Perfil actualizado correctamente', 'success');
  } catch (err) {
    showGlobalError(err.message || 'Error al guardar perfil');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Guardar Cambios';
  }
});

// LÓGICA DE AVISOS
async function cargarAvisos() {
  try {
    const perfil = await api.get('/medicos/me');
    const container = document.getElementById('aviso-actual-container');
    
    if (perfil.ausente_desde && perfil.ausente_hasta) {
      document.getElementById('span-aviso-desde').innerText = perfil.ausente_desde.substr(0, 10);
      document.getElementById('span-aviso-hasta').innerText = perfil.ausente_hasta.substr(0, 10);
      document.getElementById('span-aviso-motivo').innerText = perfil.motivo_ausencia || 'No especificado';
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  } catch(e) {
    showGlobalError('Error al cargar avisos');
  }
}

document.getElementById('form-avisos')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-guardar-aviso');
  btn.disabled = true;
  btn.innerText = 'Registrando...';
  
  try {
    await api.post('/medicos/me/avisos', {
      ausente_desde: document.getElementById('aviso-desde').value,
      ausente_hasta: document.getElementById('aviso-hasta').value,
      motivo_ausencia: document.getElementById('aviso-motivo').value
    });
    showGlobalError('Aviso de ausencia registrado exitosamente', 'success');
    cargarAvisos(); // Refrescar vista
    document.getElementById('form-avisos').reset();
  } catch (err) {
    showGlobalError(err.message || 'Error al registrar aviso');
  } finally {
    btn.disabled = false;
    btn.innerText = 'Registrar Ausencia';
  }
});

document.getElementById('btn-cancelar-aviso')?.addEventListener('click', async () => {
  const confirmado = await visualConfirm(
    'Cancelar Ausencia', 
    '¿Estás seguro de que deseas cancelar tu aviso de ausencia actual? Tu agenda volverá a estar disponible para recibir turnos.'
  );
  
  if (confirmado) {
    const btn = document.getElementById('btn-cancelar-aviso');
    btn.disabled = true;
    btn.innerText = 'Cancelando...';
    
    try {
      await api.delete('/medicos/me/avisos');
      showGlobalError('Ausencia cancelada correctamente.', 'success');
      cargarAvisos(); // Refrescar vista
    } catch (err) {
      showGlobalError(err.message || 'Error al cancelar ausencia');
      btn.disabled = false;
      btn.innerText = '✖ Cancelar Ausencia';
    }
  }
});

