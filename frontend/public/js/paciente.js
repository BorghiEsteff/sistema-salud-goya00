document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(sessionStorage.getItem('usuario'));
  if (!user || user.rol !== 'paciente') {
    window.location.href = 'index.html';
    return;
  }

  // Comprobar estado de cuenta y mostrar nombre
  try {
    const perfil = await api.get('/pacientes/me');
    document.getElementById('paciente-nombre-span').innerText = perfil.nombre + ' ' + perfil.apellido;
    document.getElementById('paciente-dni-span').innerText = 'DNI: ' + perfil.dni;
    
    const msgBox = document.getElementById('mensaje-suspension');
    if (!perfil.activo) {
      msgBox.style.display = 'block';
      msgBox.style.backgroundColor = 'var(--danger-color, #ef4444)';
      msgBox.style.color = 'white';
      msgBox.innerText = 'ATENCIÓN: Tu cuenta se encuentra INACTIVA. No tienes permisos para operar en el sistema.';
    } else if (perfil.estado_cuenta !== 'activo') {
      msgBox.style.display = 'block';
      msgBox.innerText = `Atención: Tu cuenta está en estado ${perfil.estado_cuenta.toUpperCase()}. No podrás reservar turnos nuevos.`;
    }
  } catch(e) { console.error(e); }

  document.getElementById('nav-mis-turnos').onclick = (e) => switchTab(e, 'section-mis-turnos', cargarMisTurnos);
  document.getElementById('nav-historia').onclick = (e) => switchTab(e, 'section-historia', cargarHistoriaClinica);
  document.getElementById('nav-reservar').onclick = (e) => switchTab(e, 'section-reservar', inicializarReserva);
  
  cargarMisTurnos();
});

function switchTab(event, sectionId, loadDataFunc) {
  event.preventDefault();
  document.querySelectorAll('.main-content > section').forEach(s => s.style.display = 'none');
  document.getElementById(sectionId).style.display = 'block';
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  event.target.classList.add('active');
  loadDataFunc();
}

async function cargarMisTurnos() {
  const tbody = document.getElementById('tabla-mis-turnos');
  try {
    const data = await api.get('/turnos');
    tbody.innerHTML = '';
    if(data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No tienes turnos registrados.</td></tr>';
      return;
    }
    data.forEach(turno => {
      tbody.innerHTML += `
        <tr>
          <td>${turno.fecha_turno.substr(0,10)}</td>
          <td>${turno.hora_inicio.substr(0,5)}</td>
          <td><span class="badge ${turno.estado}">${turno.estado}</span></td>
          <td>
            ${(turno.estado === 'solicitado' || turno.estado === 'confirmado') ? `
              <button onclick="cancelarMiTurno('${turno.id}')" style="color:var(--danger-color);background:none;border:none;cursor:pointer;font-weight:bold;">Cancelar</button>
            ` : '-'}
          </td>
        </tr>
      `;
    });
  } catch (err) { alert(err.message); }
}

async function cancelarMiTurno(id) {
  const motivo = prompt('Motivo de la cancelación:');
  if(motivo !== null) {
    try {
      await api.put(`/turnos/${id}/cancelar`, { motivo_cancelacion: motivo });
      cargarMisTurnos();
    } catch(err) { alert(err.message); }
  }
}

// Lógica de Historias Clínicas (Sprint 3)
async function cargarHistoriaClinica() {
  const container = document.getElementById('historia-container');
  try {
    const user = JSON.parse(sessionStorage.getItem('usuario'));
    const historias = await api.get(`/historias/paciente/${user.paciente_id}`);
    const archivos = await api.get(`/archivos/paciente/${user.paciente_id}`);
    
    container.innerHTML = '';
    
    if (historias.length === 0) {
      container.innerHTML = '<p style="color:var(--text-secondary)">No tienes historial clínico registrado.</p>';
      return;
    }
    
    historias.forEach(h => {
      // Buscar archivos asociados a esta historia
      const adjuntos = archivos.filter(a => a.historia_id === h.id);
      let adjuntosHTML = '';
      
      if (adjuntos.length > 0) {
        adjuntosHTML = '<div style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1);">';
        adjuntosHTML += '<strong>Archivos Adjuntos:</strong><br>';
        adjuntos.forEach(a => {
          const icon = a.url_cloudinary.includes('.pdf') ? '📄' : '🖼️';
          adjuntosHTML += `<a href="${a.url_cloudinary}" target="_blank" style="color:var(--primary-color); display:block; margin-top:5px; text-decoration:none;">${icon} ${a.nombre_archivo}</a>`;
        });
        adjuntosHTML += '</div>';
      }
      
      container.innerHTML += `
        <div style="background:var(--background-dark); border:1px solid rgba(255,255,255,0.05); padding:1.5rem; border-radius:0.5rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <h4 style="margin:0; color:var(--primary-color)">Consulta con Dr/a. ${h.medico_nombre} ${h.medico_apellido}</h4>
            <span style="color:var(--text-secondary); font-size:0.9rem;">${h.fecha_turno.substr(0,10)}</span>
          </div>
          <p><strong>Diagnóstico:</strong> ${h.diagnostico}</p>
          ${h.indicaciones ? `<p><strong>Indicaciones:</strong> ${h.indicaciones}</p>` : ''}
          ${h.proxima_consulta ? `<p><strong>Próxima Consulta Sugerida:</strong> ${h.proxima_consulta.substr(0,10)}</p>` : ''}
          ${adjuntosHTML}
        </div>
      `;
    });
    
  } catch(err) {
    container.innerHTML = `<p style="color:var(--danger-color)">Error al cargar historias: ${err.message}</p>`;
  }
}

// ==========================================
// Módulo de Reserva de Turnos (Sprint 4)
// ==========================================
let medicosCache = [];
let horaSeleccionada = null;

async function inicializarReserva() {
  document.getElementById('reserva-especialidad').innerHTML = '<option value="">Cargando especialidades...</option>';
  try {
    const especialidades = await api.get('/public/especialidades');
    let html = '<option value="">Seleccione especialidad</option>';
    especialidades.forEach(e => html += `<option value="${e.id}">${e.nombre}</option>`);
    document.getElementById('reserva-especialidad').innerHTML = html;
  } catch(err) {
    document.getElementById('reserva-especialidad').innerHTML = '<option value="">Error al cargar</option>';
    alert('Error cargando especialidades: ' + err.message);
  }
}

document.getElementById('reserva-especialidad').addEventListener('change', async (e) => {
  const espId = e.target.value;
  const comboMedico = document.getElementById('reserva-medico');
  const inputFecha = document.getElementById('reserva-fecha');
  const btnBuscar = document.getElementById('btn-buscar-turnos');
  
  comboMedico.disabled = true;
  inputFecha.disabled = true;
  btnBuscar.disabled = true;
  document.getElementById('contenedor-horarios').style.display = 'none';
  
  if(!espId) {
    comboMedico.innerHTML = '<option value="">Primero elija especialidad</option>';
    return;
  }
  
  comboMedico.innerHTML = '<option value="">Cargando médicos...</option>';
  try {
    medicosCache = await api.get(`/public/medicos?especialidad_id=${espId}`);
    let html = '<option value="">Seleccione médico</option>';
    medicosCache.forEach(m => html += `<option value="${m.id}">${m.nombre} ${m.apellido}</option>`);
    comboMedico.innerHTML = html;
    comboMedico.disabled = false;
  } catch(err) {
    comboMedico.innerHTML = '<option value="">Error al cargar</option>';
  }
});

document.getElementById('reserva-medico').addEventListener('change', (e) => {
  const inputFecha = document.getElementById('reserva-fecha');
  if(e.target.value) {
    inputFecha.disabled = false;
    // Poner fecha mínima hoy
    const hoy = new Date().toISOString().split('T')[0];
    inputFecha.min = hoy;
  } else {
    inputFecha.disabled = true;
    document.getElementById('btn-buscar-turnos').disabled = true;
  }
  document.getElementById('contenedor-horarios').style.display = 'none';
});

document.getElementById('reserva-fecha').addEventListener('change', (e) => {
  document.getElementById('btn-buscar-turnos').disabled = !e.target.value;
  document.getElementById('contenedor-horarios').style.display = 'none';
});

document.getElementById('btn-buscar-turnos').addEventListener('click', async () => {
  const medicoId = document.getElementById('reserva-medico').value;
  const fecha = document.getElementById('reserva-fecha').value;
  const grilla = document.getElementById('grilla-horarios');
  const btn = document.getElementById('btn-buscar-turnos');
  
  btn.innerText = 'Buscando...';
  btn.disabled = true;
  
  try {
    const data = await api.get(`/turnos/disponibilidad?medico_id=${medicoId}&fecha=${fecha}`);
    document.getElementById('contenedor-horarios').style.display = 'block';
    document.getElementById('panel-confirmacion').style.display = 'none';
    
    grilla.innerHTML = '';
    if(data.disponibles.length === 0) {
      grilla.innerHTML = '<p style="color:var(--danger-color)">No hay turnos disponibles para esta fecha.</p>';
      return;
    }
    
    data.disponibles.forEach(hora => {
      const horaCorta = hora.substr(0, 5);
      grilla.innerHTML += `<button class="btn btn-secondary btn-hora" onclick="seleccionarHora(this, '${hora}')">${horaCorta}</button>`;
    });
  } catch(err) {
    alert(err.message);
  } finally {
    btn.innerText = 'Buscar Horarios';
    btn.disabled = false;
  }
});

function seleccionarHora(btnElement, hora) {
  // Limpiar seleccion previa
  document.querySelectorAll('.btn-hora').forEach(b => {
    b.style.background = 'rgba(255, 255, 255, 0.05)';
    b.style.color = 'var(--text-primary)';
  });
  
  // Marcar seleccionado
  btnElement.style.background = 'var(--primary-color)';
  btnElement.style.color = '#fff';
  
  horaSeleccionada = hora;
  document.getElementById('panel-confirmacion').style.display = 'block';
}

document.getElementById('btn-confirmar-reserva').addEventListener('click', async () => {
  const user = JSON.parse(sessionStorage.getItem('usuario'));
  const btnConfirmar = document.getElementById('btn-confirmar-reserva');
  
  const payload = {
    paciente_id: user.paciente_id,
    medico_id: document.getElementById('reserva-medico').value,
    especialidad_id: document.getElementById('reserva-especialidad').value,
    fecha_turno: document.getElementById('reserva-fecha').value,
    hora_inicio: horaSeleccionada,
    motivo_consulta: document.getElementById('reserva-motivo').value
  };
  
  btnConfirmar.disabled = true;
  btnConfirmar.innerText = 'Confirmando...';
  
  try {
    await api.post('/turnos', payload);
    alert('¡Turno reservado exitosamente!');
    // Limpiar formulario y volver a mis turnos
    document.getElementById('form-reserva').reset();
    document.getElementById('contenedor-horarios').style.display = 'none';
    document.getElementById('nav-mis-turnos').click();
  } catch(err) {
    alert('Error al reservar: ' + err.message);
  } finally {
    btnConfirmar.disabled = false;
    btnConfirmar.innerText = 'Confirmar Reserva';
  }
});
