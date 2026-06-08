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
  tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
  try {
    const data = await api.get('/admin/especialidades');
    tbody.innerHTML = '';
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
    });
  } catch (err) { alert(err.message); }
}

async function borrarEspecialidad(id) {
  if(confirm('¿Borrar especialidad?')) {
    try { await api.delete(`/admin/especialidades/${id}`); cargarEspecialidades(); } 
    catch(err) { alert(err.message); }
  }
}

async function cargarMedicos() {
  const tbody = document.getElementById('tabla-medicos');
  try {
    const data = await api.get('/admin/medicos');
    tbody.innerHTML = '';
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
          <td><button onclick="toggleMedicoStatus('${med.id}', ${!med.activo})" style="color:${actionColor};background:none;border:none;cursor:pointer;font-weight:bold;">${actionText}</button></td>
        </tr>
      `;
    });
  } catch (err) { alert(err.message); }
}

async function cargarPacientes() {
  const tbody = document.getElementById('tabla-pacientes');
  try {
    const data = await api.get('/pacientes');
    tbody.innerHTML = '';
    data.forEach(pac => {
      let badgeText = 'ACTIVO';
      let badgeClass = 'activo';
      if(pac.estado_cuenta === 'suspendido') { badgeText = 'SUSPENDIDO'; badgeClass = 'suspendido'; }
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
          <td>${pac.nombre} ${pac.apellido}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    });
  } catch (err) { alert(err.message); }
}

async function levantarSuspension(id) {
  if(confirm('¿Levantar suspensión de este paciente?')) {
    try { await api.put(`/admin/pacientes/${id}/levantar-suspension`); cargarPacientes(); } 
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

async function togglePacienteStatus(id, newStatus) {
  if(confirm(`¿Deseas ${newStatus ? 'activar' : 'inactivar'} a este paciente?`)) {
    try {
      await api.put(`/admin/pacientes/${id}/estado`, { activo: newStatus });
      cargarPacientes();
    } catch(err) { alert(err.message); }
  }
}

async function eliminarPacienteFisico(id) {
  if (confirm('¡PELIGRO! ¿Estás totalmente seguro de que deseas ELIMINAR FÍSICAMENTE a este paciente y a su usuario asociado? Esto borrará sus turnos e historia clínica para siempre. No se puede deshacer.')) {
    try {
      await api.delete('/admin/pacientes/' + id);
      cargarPacientes();
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
    
    // Mostrar la contraseña una única vez
    alert('¡Médico creado exitosamente!\\n\\nLa contraseña temporal es: ' + randomPass + '\\n\\nPor favor, copie esta contraseña y entréguesela al médico. Solo se mostrará esta vez.');
  } catch(err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Generar y Guardar';
  }
});

// --- AUDITORÍA ---
async function cargarAuditoria() {
  const tbody = document.getElementById('tabla-auditoria');
  const desde = document.getElementById('filtro-auditoria-desde').value;
  const hasta = document.getElementById('filtro-auditoria-hasta').value;
  
  if (desde && hasta && new Date(desde) > new Date(hasta)) {
    alert("La fecha 'Desde' no puede ser mayor que la fecha 'Hasta'.");
    return;
  }
  
  let url = '/admin/auditoria?';
  if (desde) url += 'fecha_desde=' + desde + '&';
  if (hasta) url += 'fecha_hasta=' + hasta;
  
  tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
  try {
    const data = await api.get(url);
    tbody.innerHTML = '';
    if(data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No hay logs en este rango de fechas.</td></tr>';
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
  } catch(err) { alert(err.message); }
}

document.getElementById('btn-filtrar-auditoria').addEventListener('click', cargarAuditoria);
document.getElementById('btn-limpiar-auditoria').addEventListener('click', () => {
  document.getElementById('filtro-auditoria-desde').value = '';
  document.getElementById('filtro-auditoria-hasta').value = '';
  cargarAuditoria();
});
