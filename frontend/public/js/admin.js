document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(sessionStorage.getItem('usuario'));
  if (!user || user.rol !== 'admin') {
    window.location.href = 'index.html';
    return;
  }

  cargarEspecialidades();

  // Navegación
  document.getElementById('nav-especialidades').onclick = (e) => switchTab(e, 'section-especialidades', cargarEspecialidades);
  document.getElementById('nav-medicos').onclick = (e) => {
    switchTab(e, 'section-medicos', cargarMedicos);
    cargarSelectEspecialidades();
  };
  document.getElementById('nav-secretarias').onclick = (e) => switchTab(e, 'section-secretarias', cargarSecretarias);
  document.getElementById('nav-pacientes').onclick = (e) => switchTab(e, 'section-pacientes', cargarPacientes);
  document.getElementById('nav-auditoria').onclick = (e) => switchTab(e, 'section-auditoria', cargarAuditoria);
});

function switchTab(event, sectionId, loadDataFunc) {
  event.preventDefault();
  document.querySelectorAll('.main-content > section').forEach(s => s.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  event.target.classList.add('active');
  loadDataFunc();
}

async function cargarEspecialidades() {
  const tbody = document.getElementById('tabla-especialidades');
  const grilla = document.getElementById('grilla-especialidades');
  
  tbody.innerHTML = '<tr><td colspan="4"><div class="spinner"></div> Cargando...</td></tr>';
  if (grilla) grilla.innerHTML = '<div class="spinner"></div> Cargando...';
  
  try {
    const data = await api.get('/admin/especialidades');
    tbody.innerHTML = '';
    if (grilla) grilla.innerHTML = '';
    
    data.forEach(esp => {
      const badgeText = esp.activo ? 'ACTIVO' : 'INACTIVO';
      const badgeColor = esp.activo ? 'var(--success-color, #10b981)' : 'var(--danger-color, #ef4444)';
      const actionHtml = esp.activo ? `<button onclick="borrarEspecialidad(${esp.id})" style="color:var(--danger-color);background:none;border:none;cursor:pointer">Eliminar</button>` : '-';
      tbody.innerHTML += `
        <tr>
          <td>${esp.id}</td>
          <td>${esp.nombre}</td>
          <td>${esp.descripcion || '-'}</td>
          <td><span class="badge" style="background:${badgeColor}; color:#fff">${badgeText}</span></td>
          <td>${actionHtml}</td>
        </tr>
      `;
      
      // Grilla de botones (Sprint 2)
      if (grilla && esp.activo) {
        const count = parseInt(esp.medicos_activos_count || 0);
        const btnColor = count > 0 ? 'var(--success-color, #10b981)' : 'var(--danger-color, #ef4444)';
        
        const btnEsp = document.createElement('button');
        btnEsp.className = 'btn';
        btnEsp.style.backgroundColor = btnColor;
        btnEsp.style.color = '#fff';
        btnEsp.style.padding = '10px 15px';
        btnEsp.style.borderRadius = '8px';
        btnEsp.style.border = 'none';
        btnEsp.style.cursor = 'pointer';
        btnEsp.innerText = `${esp.nombre} (${count})`;
        btnEsp.onclick = () => verMedicosEspecialidad(esp.id, esp.nombre, count);
        
        grilla.appendChild(btnEsp);
      }
    });
    
    if (grilla && grilla.innerHTML === '') {
       grilla.innerHTML = '<span style="color:var(--text-secondary)">No hay especialidades activas.</span>';
    }
  } catch (err) { alert(err.message); }
}

window.verMedicosEspecialidad = async function(id, nombre, count) {
  const modal = document.getElementById('modal-medicos-esp');
  const titulo = document.getElementById('medicos-esp-titulo');
  const lista = document.getElementById('lista-medicos-esp');
  
  titulo.innerText = `Médicos Activos - ${nombre}`;
  lista.innerHTML = '<li><div class="spinner"></div> Cargando...</li>';
  modal.classList.remove('hidden');
  
  if (count === 0) {
    lista.innerHTML = '<li style="color:var(--text-secondary)">No hay médicos activos en esta especialidad.</li>';
    return;
  }
  
  try {
    const medicos = await api.get(`/admin/medicos?especialidad_id=${id}&activo=true`);
    lista.innerHTML = '';
    if (medicos.length === 0) {
      lista.innerHTML = '<li style="color:var(--text-secondary)">No hay médicos activos en esta especialidad.</li>';
      return;
    }
    
    medicos.forEach(m => {
      lista.innerHTML += `<li style="padding: 10px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
        <span><strong style="color:var(--primary-color)">Dr/a. ${m.nombre} ${m.apellido}</strong><br><small style="color:var(--text-secondary)">Mat: ${m.matricula}</small></span>
        <span>${m.telefono ? '📞 ' + m.telefono : ''}</span>
      </li>`;
    });
  } catch(err) {
    lista.innerHTML = `<li style="color:var(--danger-color)">Error al cargar: ${err.message}</li>`;
  }
};

async function borrarEspecialidad(id) {
  if(confirm('¿Borrar especialidad?')) {
    try { await api.delete(`/admin/especialidades/${id}`); cargarEspecialidades(); } 
    catch(err) { alert(err.message); }
  }
}

let pageMedicos = 1;
async function cargarMedicos(page = 1) {
  if (typeof page !== 'number') page = 1;
  pageMedicos = page;
  
  const tbody = document.getElementById('tabla-medicos');
  const filtroNombre = document.getElementById('filtro-medico-nombre') ? document.getElementById('filtro-medico-nombre').value : '';
  
  let url = `/admin/medicos?page=${page}&limit=10`;
  if (filtroNombre) url += `&nombre=${encodeURIComponent(filtroNombre)}`;
  
  tbody.innerHTML = '<tr><td colspan="6"><div class="spinner"></div> Cargando...</td></tr>';
  try {
    const res = await api.get(url);
    const data = res.data || res;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">No se encontraron médicos.</td></tr>';
      return;
    }
    
    data.forEach(med => {
      const badgeText = med.activo ? 'ACTIVO' : 'INACTIVO';
      const badgeColor = med.activo ? 'var(--success-color, #10b981)' : 'var(--danger-color, #ef4444)';
      const actionText = med.activo ? 'Inactivar' : 'Activar';
      const actionColor = med.activo ? 'var(--danger-color)' : 'var(--success-color, #10b981)';
      
      tbody.innerHTML += `
        <tr>
          <td>${med.matricula}</td>
          <td>${med.nombre} ${med.apellido}</td>
          <td>${med.especialidad || '-'}</td>
          <td>${med.email}</td>
          <td><span class="badge" style="background:${badgeColor}; color:#fff">${badgeText}</span></td>
          <td>
            <button onclick="abrirEditarMedico('${med.id}', ${med.precio_consulta || 0}, '${med.modalidad_pago || 'on_site'}')" style="margin-right:5px; color:var(--primary-color); background:none; border:none; cursor:pointer; font-weight:bold;">Editar</button>
            <button onclick="toggleMedicoStatus('${med.id}', ${!med.activo})" style="color:${actionColor};background:none;border:none;cursor:pointer;font-weight:bold;">${actionText}</button>
          </td>
        </tr>
      `;
    });
    
    // Add pagination container if missing, otherwise reuse existing or create one
    let pagCont = document.getElementById('paginacion-medicos');
    if (!pagCont) {
      pagCont = document.createElement('div');
      pagCont.id = 'paginacion-medicos';
      pagCont.className = 'pagination-controls';
      pagCont.style.cssText = 'display:flex; justify-content:center; gap:10px; margin-top:15px; padding-bottom:15px;';
      document.getElementById('section-medicos').appendChild(pagCont);
    }
    
    if (res.pages) renderPaginacion('paginacion-medicos', res.page, res.pages, cargarMedicos);
    else document.getElementById('paginacion-medicos').innerHTML = '';
    
  } catch (err) { alert(err.message); }
}

if (document.getElementById('btn-filtrar-medicos')) {
  document.getElementById('btn-filtrar-medicos').addEventListener('click', () => cargarMedicos(1));
}

async function cargarSecretarias() {
  const tbody = document.getElementById('tabla-secretarias');
  try {
    const data = await api.get('/admin/secretarias');
    tbody.innerHTML = '';
    data.forEach(sec => {
      const badgeText = sec.activo ? 'ACTIVO' : 'INACTIVO';
      const badgeColor = sec.activo ? 'var(--success-color, #10b981)' : 'var(--danger-color, #ef4444)';
      const actionText = sec.activo ? 'Inactivar' : 'Activar';
      const actionColor = sec.activo ? 'var(--danger-color)' : 'var(--success-color, #10b981)';
      
      tbody.innerHTML += `
        <tr>
          <td>${sec.nombre} ${sec.apellido}</td>
          <td>${sec.email}</td>
          <td><span class="badge" style="background:${badgeColor}; color:#fff">${badgeText}</span></td>
          <td><button onclick="toggleSecretariaStatus('${sec.id}', ${!sec.activo})" style="color:${actionColor};background:none;border:none;cursor:pointer;font-weight:bold;">${actionText}</button></td>
        </tr>
      `;
    });
  } catch (err) { alert(err.message); }
}

let pagePacientes = 1;
async function cargarPacientes(page = 1) {
  if (typeof page !== 'number') page = 1;
  pagePacientes = page;
  
  const tbody = document.getElementById('tabla-pacientes');
  const filtroDni = document.getElementById('filtro-paciente-dni') ? document.getElementById('filtro-paciente-dni').value : '';
  const filtroNombre = document.getElementById('filtro-paciente-nombre') ? document.getElementById('filtro-paciente-nombre').value : '';
  const filtroApellido = document.getElementById('filtro-paciente-apellido') ? document.getElementById('filtro-paciente-apellido').value : '';
  
  let url = `/pacientes?page=${page}&limit=10`;
  if (filtroDni) url += `&dni=${encodeURIComponent(filtroDni)}`;
  if (filtroNombre) url += `&nombre=${encodeURIComponent(filtroNombre)}`;
  if (filtroApellido) url += `&apellido=${encodeURIComponent(filtroApellido)}`;
  
  tbody.innerHTML = '<tr><td colspan="4"><div class="spinner"></div> Cargando...</td></tr>';
  try {
    const res = await api.get(url);
    const data = res.data || res;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No se encontraron pacientes.</td></tr>';
      return;
    }
    
    data.forEach(pac => {
      let badgeText = 'ACTIVO';
      let badgeClass = 'activo';
      let suspensionInfo = '';
      if(pac.estado_cuenta === 'suspendido') { 
        badgeText = 'SUSPENDIDO'; 
        badgeClass = 'suspendido'; 
        const hastaDate = pac.suspension_hasta ? new Date(pac.suspension_hasta).toLocaleDateString('es-AR') : 'Indefinida';
        suspensionInfo = `<br><small style="color:var(--danger-color)">⚠️ Hasta: ${hastaDate}</small>`;
      }
      if(!pac.activo) { badgeText = 'INACTIVO'; badgeClass = 'suspendido'; } // Using red style
      
      const isSuspendido = pac.estado_cuenta === 'suspendido';
      const isActivo = pac.activo;
      const toggleText = isActivo ? 'Inactivar' : 'Activar';
      const toggleColor = isActivo ? 'var(--danger-color)' : 'var(--success-color, #10b981)';

      let actionsHtml = `<button onclick="togglePacienteStatus('${pac.id}', ${!isActivo})" style="color:${toggleColor};background:none;border:none;cursor:pointer;font-weight:bold;margin-right:10px;">${toggleText}</button>`;
      if (!isActivo) {
        actionsHtml += ` <button onclick="eliminarPacienteFisico('${pac.id}')" style="color:var(--danger-color);background:none;border:none;cursor:pointer;font-weight:bold;margin-left:10px;">Eliminar</button>`;
      }
      if(isSuspendido && isActivo) {
        actionsHtml += `<button onclick="levantarSuspension('${pac.id}')" style="color:var(--secondary-color);background:none;border:none;cursor:pointer;font-weight:bold;">Levantar Suspensión</button>`;
      }

      tbody.innerHTML += `
        <tr>
          <td>${pac.dni}</td>
          <td>${pac.nombre} ${pac.apellido}${suspensionInfo}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    });
    if (res.pages) renderPaginacion('paginacion-pacientes', res.page, res.pages, cargarPacientes);
    else document.getElementById('paginacion-pacientes').innerHTML = '';
  } catch (err) { alert(err.message); }
}

if (document.getElementById('btn-filtrar-pacientes')) {
  document.getElementById('btn-filtrar-pacientes').addEventListener('click', () => cargarPacientes(1));
  document.getElementById('btn-limpiar-pacientes').addEventListener('click', () => {
    document.getElementById('filtro-paciente-dni').value = '';
    document.getElementById('filtro-paciente-nombre').value = '';
    document.getElementById('filtro-paciente-apellido').value = '';
    cargarPacientes(1);
  });
}

async function levantarSuspension(id) {
  if(confirm('¿Levantar suspensión de este paciente?')) {
    try { await api.put(`/admin/pacientes/${id}/levantar-suspension`); cargarPacientes(pagePacientes); } 
    catch(err) { alert(err.message); }
  }
}
async function toggleMedicoStatus(id, newStatus) {
  if(confirm(`¿Deseas ${newStatus ? 'activar' : 'inactivar'} a este médico?`)) {
    try {
      await api.put(`/admin/medicos/${id}/estado`, { activo: newStatus });
      cargarMedicos();
      if(!newStatus) {
        // Sugerir limpiar si quedó vacía
        if(confirm("Si esta especialidad se ha quedado sin médicos, ¿Deseas limpiarla? (Presiona Aceptar para limpiar vacías)")) {
           limpiarEspecialidadesVacias();
        }
      }
    } catch(err) { alert(err.message); }
  }
}

async function toggleSecretariaStatus(id, newStatus) {
  if(confirm(`¿Deseas ${newStatus ? 'activar' : 'inactivar'} a esta secretaría?`)) {
    try {
      await api.put(`/admin/secretarias/${id}/estado`, { activo: newStatus });
      cargarSecretarias();
    } catch(err) { alert(err.message); }
  }
}

async function togglePacienteStatus(id, newStatus) {
  if(confirm(`¿Deseas ${newStatus ? 'activar' : 'inactivar'} a este paciente?`)) {
    try {
      await api.put(`/admin/pacientes/${id}/estado`, { activo: newStatus });
      cargarPacientes(pagePacientes);
    } catch(err) { alert(err.message); }
  }
}

async function eliminarPacienteFisico(id) {
  if (confirm('¡PELIGRO! ¿Estás totalmente seguro de que deseas ELIMINAR FÍSICAMENTE a este paciente y a su usuario asociado? Esto borrará sus turnos e historia clínica para siempre. No se puede deshacer.')) {
    try {
      await api.delete('/admin/pacientes/' + id);
      cargarPacientes(pagePacientes);
    } catch(err) {
      alert(err.message);
    }
  }
}

async function limpiarEspecialidadesVacias() {
  if(confirm('¿Seguro que deseas dar de baja lógica todas las especialidades sin médicos activos?')) {
    try {
      const res = await api.post('/admin/especialidades/limpiar-vacias');
      alert(res.message + '. Inactivadas: ' + res.inactivadas);
      cargarEspecialidades();
    } catch(err) { alert(err.message); }
  }
}

// --- CREAR ESPECIALIDAD ---
document.getElementById('form-especialidad').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('esp-nombre').value;
  const descripcion = document.getElementById('esp-desc').value;
  try {
    await api.post('/admin/especialidades', { nombre, descripcion });
    document.getElementById('form-especialidad').reset();
    document.getElementById('modal-especialidad').classList.add('hidden');
    cargarEspecialidades();
  } catch(err) { alert(err.message); }
});

// --- CARGAR SELECT DE ESPECIALIDADES PARA EL MÉDICO ---
async function cargarSelectEspecialidades() {
  try {
    const data = await api.get('/admin/especialidades');
    const select = document.getElementById('med-especialidad');
    select.innerHTML = '<option value="">Seleccione...</option>';
    data.forEach(e => select.innerHTML += `<option value="${e.id}">${e.nombre}</option>`);
  } catch(err) {}
}

// --- CREAR MÉDICO ---
document.getElementById('form-medico').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Generar contraseña aleatoria
  const randomPass = Math.random().toString(36).slice(-8);
  
  const payload = {
    nombre: document.getElementById('med-nombre').value,
    apellido: document.getElementById('med-apellido').value,
    email: document.getElementById('med-email').value,
    matricula: document.getElementById('med-matricula').value,
    especialidad_id: document.getElementById('med-especialidad').value,
    telefono: document.getElementById('med-telefono').value,
    password: randomPass
  };
  
  const btn = document.getElementById('btn-guardar-medico');
  btn.disabled = true;
  btn.innerText = 'Guardando...';
  
  try {
    await api.post('/admin/medicos', payload);
    document.getElementById('form-medico').reset();
    document.getElementById('modal-medico').classList.add('hidden');
    cargarMedicos();
    
    // Mostrar modal con contraseña
    document.getElementById('modal-password-title').innerText = '¡Médico Creado!';
    document.getElementById('generated-password').innerText = randomPass;
    document.getElementById('modal-password').classList.remove('hidden');
  } catch(err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Generar y Guardar';
  }
});

// --- EDITAR MÉDICO ---
window.abrirEditarMedico = function(id, precio, modalidad) {
  document.getElementById('edit-med-id').value = id;
  document.getElementById('edit-med-precio').value = precio;
  document.getElementById('edit-med-modalidad').value = modalidad;
  document.getElementById('modal-editar-medico').classList.remove('hidden');
};

document.getElementById('form-editar-medico').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-med-id').value;
  const precio_consulta = document.getElementById('edit-med-precio').value;
  const modalidad_pago = document.getElementById('edit-med-modalidad').value;
  
  const btn = document.getElementById('btn-guardar-edicion-medico');
  btn.disabled = true;
  btn.innerText = 'Guardando...';
  
  try {
    await api.put(`/admin/medicos/${id}`, { precio_consulta, modalidad_pago });
    document.getElementById('modal-editar-medico').classList.add('hidden');
    cargarMedicos();
  } catch(err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Guardar Cambios';
  }
});

// --- CREAR SECRETARÍA ---
document.getElementById('form-secretaria').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Generar contraseña aleatoria
  const randomPass = Math.random().toString(36).slice(-8);
  
  const payload = {
    nombre: document.getElementById('sec-nombre').value,
    apellido: document.getElementById('sec-apellido').value,
    email: document.getElementById('sec-email').value,
    password: randomPass
  };
  
  const btn = document.getElementById('btn-guardar-secretaria');
  btn.disabled = true;
  btn.innerText = 'Guardando...';
  
  try {
    await api.post('/admin/secretarias', payload);
    document.getElementById('form-secretaria').reset();
    document.getElementById('modal-secretaria').classList.add('hidden');
    cargarSecretarias();
    
    // Mostrar modal con contraseña
    document.getElementById('modal-password-title').innerText = '¡Secretaría Creada!';
    document.getElementById('generated-password').innerText = randomPass;
    document.getElementById('modal-password').classList.remove('hidden');
  } catch(err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Generar y Guardar';
  }
});

// --- COPIAR CONTRASEÑA ---
window.copiarPassword = () => {
  const pass = document.getElementById('generated-password').innerText;
  navigator.clipboard.writeText(pass).then(() => {
    const btn = document.getElementById('btn-copiar-pass');
    btn.innerText = '¡Copiado!';
    btn.style.backgroundColor = 'var(--success-color, #10b981)';
    setTimeout(() => {
      document.getElementById('modal-password').classList.add('hidden');
      btn.innerText = 'Copiar y Cerrar';
      btn.style.backgroundColor = '';
    }, 1500);
  }).catch(err => {
    alert('Error al copiar: ' + err);
  });
};

// --- AUDITORÍA ---
let pageAuditoria = 1;
async function cargarAuditoria(page = 1) {
  if (typeof page !== 'number') page = 1;
  pageAuditoria = page;
  const tbody = document.getElementById('tabla-auditoria');
  const desde = document.getElementById('filtro-auditoria-desde').value;
  const hasta = document.getElementById('filtro-auditoria-hasta').value;
  
  if (desde && hasta && new Date(desde) > new Date(hasta)) {
    alert("La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'.");
    return;
  }
  
  let url = `/admin/auditoria?page=${page}&limit=10&`;
  if (desde) url += 'fecha_desde=' + desde + '&';
  if (hasta) url += 'fecha_hasta=' + hasta;
  
  tbody.innerHTML = '<tr><td colspan="4"><div class="spinner"></div> Cargando...</td></tr>';
  try {
    const res = await api.get(url);
    const data = res.data || res;
    tbody.innerHTML = '';
    if(data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No hay logs en este rango de fechas.</td></tr>';
      document.getElementById('paginacion-auditoria').innerHTML = '';
      return;
    }
    
    data.forEach(log => {
      const fechaLocal = new Date(log.creado_en).toLocaleString();
      let detalles = '';
      if (log.nombre_afectado) {
        detalles += '<strong style="color:var(--text-primary)">' + log.nombre_afectado + '</strong> | ';
      } else if (log.registro_id) {
        detalles += 'ID: ' + log.registro_id + ' | ';
      }
      
      if (log.campo_modificado) {
        if (log.valor_anterior !== null) {
          detalles += log.campo_modificado + ': ' + log.valor_anterior + ' -> <strong style="color:var(--text-primary)">' + log.valor_nuevo + '</strong>';
        } else {
          detalles += log.campo_modificado + ': <strong style="color:var(--text-primary)">' + log.valor_nuevo + '</strong>';
        }
      }

      tbody.innerHTML += '<tr><td>' + fechaLocal + '</td><td>' + (log.admin_email || 'Sistema') + '</td><td>' + log.accion + ' en ' + log.tabla_afectada + '</td><td style="font-size:0.9rem; color:var(--text-secondary)">' + detalles + '</td></tr>';
    });
    if (res.pages) renderPaginacion('paginacion-auditoria', res.page, res.pages, cargarAuditoria);
    else document.getElementById('paginacion-auditoria').innerHTML = '';
  } catch(err) { alert(err.message); }
}

document.getElementById('btn-filtrar-auditoria').addEventListener('click', () => cargarAuditoria(1));
document.getElementById('btn-limpiar-auditoria').addEventListener('click', () => {
  document.getElementById('filtro-auditoria-desde').value = '';
  document.getElementById('filtro-auditoria-hasta').value = '';
  cargarAuditoria(1);
});

document.getElementById('btn-exportar-csv').addEventListener('click', () => {
  const desde = document.getElementById('filtro-auditoria-desde').value;
  const hasta = document.getElementById('filtro-auditoria-hasta').value;

  const API_URL = window.ENV_API_URL || 'https://sistema-salud-goya00.onrender.com/api';
  let url = `${API_URL}/admin/auditoria/exportar?`;
  if (desde) url += 'fecha_desde=' + desde + '&';
  if (hasta) url += 'fecha_hasta=' + hasta;

  const token = sessionStorage.getItem('token');
  fetch(url, { headers: { 'Authorization': 'Bearer ' + token } })
    .then(res => {
      if (!res.ok) throw new Error('Error al exportar (status ' + res.status + ')');
      return res.blob();
    })
    .then(blob => {
      const fechaHoy = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `auditoria_${fechaHoy}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    })
    .catch(err => alert('Error al exportar: ' + err.message));
});

function renderPaginacion(containerId, currentPage, totalPages, fetchFn) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (totalPages <= 1) return;

  if (currentPage > 1) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.innerText = 'Anterior';
    btn.onclick = () => fetchFn(currentPage - 1);
    container.appendChild(btn);
  }

  const span = document.createElement('span');
  span.style.padding = '0.5rem 1rem';
  span.style.color = 'var(--text-primary)';
  span.innerText = `Página ${currentPage} de ${totalPages}`;
  container.appendChild(span);

  if (currentPage < totalPages) {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.innerText = 'Siguiente';
    btn.onclick = () => fetchFn(currentPage + 1);
    container.appendChild(btn);
  }
}
