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
      document.getElementById('nav-reservar').style.display = 'none';
    } else if (perfil.estado_cuenta !== 'activo') {
      msgBox.style.display = 'block';
      msgBox.innerText = `Atención: Tu cuenta está en estado ${perfil.estado_cuenta.toUpperCase()}. No podrás reservar turnos nuevos.`;
      // Ocultar botón de reservar turno
      document.getElementById('nav-reservar').style.display = 'none';
    }
  } catch(e) { console.error(e); }

  document.getElementById('nav-mis-turnos').onclick = (e) => switchTab(e, 'section-mis-turnos', cargarMisTurnos);
  document.getElementById('nav-historia').onclick = (e) => switchTab(e, 'section-historia', cargarHistoriaClinica);
  document.getElementById('nav-reservar').onclick = (e) => switchTab(e, 'section-reservar', inicializarReserva);
  document.getElementById('nav-perfil').onclick = (e) => switchTab(e, 'section-perfil', cargarMiPerfil);
  
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
  const container = document.getElementById('contenedor-mis-turnos');
  try {
    const data = await api.get('/turnos');
    container.innerHTML = '';
    if(data.length === 0) {
      container.innerHTML = '<p style="color:var(--text-secondary); width: 100%; text-align: center;">No tienes turnos registrados.</p>';
      return;
    }
    data.forEach(turno => {
      const isCancelable = turno.estado === 'solicitado' || turno.estado === 'confirmado';
      let actionHtml = isCancelable ? 
        `<button onclick="cancelarMiTurno('${turno.id}')" style="color:var(--danger-color);background:none;border:none;cursor:pointer;font-weight:bold;margin-top:10px; margin-right: 15px;">✖ Cancelar Turno</button>` : '';
        
      if (turno.estado_pago === 'pendiente') {
        actionHtml += `<button onclick="pagarMiTurno('${turno.id}', this)" style="color:white; background:var(--primary-color); border:none; border-radius: 5px; padding: 5px 10px; cursor:pointer; font-weight:bold; margin-top:10px;">💳 Pagar con MercadoPago</button>`;
      }
        
      container.innerHTML += `
        <div class="card" style="background:var(--surface-dark); border: 1px solid var(--border-color); padding: 15px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
              <span style="font-weight:bold; color:var(--primary-color); font-size:1.1rem;">${turno.fecha_turno.substr(0,10)}</span>
              <span class="badge ${turno.estado}">${turno.estado}</span>
            </div>
            <p style="margin: 5px 0;"><strong>Hora:</strong> ${turno.hora_inicio.substr(0,5)}</p>
            <p style="margin: 5px 0;"><strong>Médico:</strong> Dr/a. ${turno.medico_nombre} ${turno.medico_apellido}</p>
          </div>
          ${actionHtml}
        </div>
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

async function pagarMiTurno(turnoId, btnElement) {
  try {
    if (btnElement) {
      btnElement.disabled = true;
      btnElement.innerText = 'Redirigiendo...';
    }
    const pref = await api.post('/pagos/preferencia', { turno_id: turnoId });
    if (pref.initPoint) {
      window.location.href = pref.initPoint;
    } else {
      alert('No se pudo generar el link de pago');
      if (btnElement) {
        btnElement.disabled = false;
        btnElement.innerText = '💳 Pagar con MercadoPago';
      }
    }
  } catch (err) {
    alert('Error al inicializar el pago: ' + err.message);
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.innerText = '💳 Pagar con MercadoPago';
    }
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

// Lógica de Mi Perfil
async function cargarMiPerfil() {
  try {
    const perfil = await api.get('/pacientes/me');
    document.getElementById('perfil-telefono').value = perfil.telefono || '';
    document.getElementById('perfil-direccion').value = perfil.direccion || '';
    document.getElementById('perfil-obrasocial').value = perfil.obra_social || '';
  } catch (err) {
    alert('Error al cargar perfil: ' + err.message);
  }
}

document.getElementById('btn-guardar-perfil')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-guardar-perfil');
  btn.disabled = true;
  btn.innerText = 'Guardando...';
  
  const payload = {
    telefono: document.getElementById('perfil-telefono').value,
    direccion: document.getElementById('perfil-direccion').value,
    obra_social: document.getElementById('perfil-obrasocial').value
  };
  
  try {
    await api.put('/pacientes/me', payload);
    alert('¡Perfil actualizado con éxito!');
  } catch (err) {
    alert('Error al guardar perfil: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = 'Guardar Cambios';
  }
});

// ==========================================
// Módulo de Reserva de Turnos (Sprint 4)
// ==========================================
let medicosCache = [];
let horaSeleccionada = null;

async function inicializarReserva() {
  document.getElementById('reserva-especialidad').value = '';
  document.getElementById('reserva-medico').value = '';
  document.getElementById('reserva-medico').disabled = true;
  document.getElementById('dl-especialidades').innerHTML = '';
  document.getElementById('grilla-especialidades').innerHTML = '';
  try {
    const especialidades = await api.get('/public/especialidades?solo_con_medicos=true');
    let html = '';
    let grillaHtml = '';
    especialidades.forEach(e => {
      // Usamos el nombre como value para que lo vea el usuario. Luego buscamos el ID.
      html += `<option value="${e.nombre}" data-id="${e.id}"></option>`;
      grillaHtml += `<button type="button" class="btn btn-secondary btn-especialidad" data-id="${e.id}" data-nombre="${e.nombre}" onclick="seleccionarEspecialidad('${e.id}', '${e.nombre}')">${e.nombre}</button>`;
    });
    document.getElementById('dl-especialidades').innerHTML = html;
    document.getElementById('grilla-especialidades').innerHTML = grillaHtml;
  } catch(err) {
    alert('Error cargando especialidades: ' + err.message);
  }
}

window.seleccionarEspecialidad = function(id, nombre) {
  const input = document.getElementById('reserva-especialidad');
  input.value = nombre;
  input.dataset.id = id;
  input.dispatchEvent(new Event('change'));
  document.querySelectorAll('.btn-especialidad').forEach(b => b.style.background = 'rgba(255, 255, 255, 0.05)');
  document.querySelector(`.btn-especialidad[data-id="${id}"]`).style.background = 'var(--primary-color)';
};

document.getElementById('reserva-especialidad').addEventListener('change', async (e) => {
  const inputEsp = e.target;
  let espId = inputEsp.dataset.id;
  
  // Si el usuario tipeo y eligio del datalist, tenemos que buscar el data-id de esa opcion
  if (!espId) {
    const val = inputEsp.value;
    const opciones = document.querySelectorAll('#dl-especialidades option');
    for (let opt of opciones) {
      if (opt.value === val) { espId = opt.dataset.id; inputEsp.dataset.id = espId; break; }
    }
  }

  const comboMedico = document.getElementById('reserva-medico');
  const inputFecha = document.getElementById('reserva-fecha');
  const btnBuscar = document.getElementById('btn-buscar-turnos');
  
  comboMedico.disabled = true;
  comboMedico.value = '';
  comboMedico.dataset.id = '';
  inputFecha.disabled = true;
  btnBuscar.disabled = true;
  document.getElementById('contenedor-horarios').style.display = 'none';
  
  if(!espId) {
    comboMedico.placeholder = 'Primero elija especialidad';
    return;
  }
  
  comboMedico.placeholder = 'Buscando médicos...';
  document.getElementById('dl-medicos').innerHTML = '';
  document.getElementById('grilla-medicos').innerHTML = '';
  try {
    medicosCache = await api.get(`/public/medicos?especialidad_id=${espId}`);
    let html = '';
    let grillaHtml = '';
    medicosCache.forEach(m => {
      const nombreCompleto = `Dr/a. ${m.nombre} ${m.apellido}`;
      html += `<option value="${nombreCompleto}" data-id="${m.id}"></option>`;
      grillaHtml += `
        <div class="card btn-medico" data-id="${m.id}" data-nombre="${nombreCompleto}" onclick="seleccionarMedico('${m.id}', '${nombreCompleto}')" style="cursor: pointer; padding: 15px; width: 200px; text-align: center; border: 2px solid transparent; transition: all 0.2s; background: var(--surface-dark);">
          <div style="font-size: 3rem; margin-bottom: 10px;">👨‍⚕️</div>
          <strong style="color:var(--text-primary); display:block; margin-bottom:5px;">${nombreCompleto}</strong>
          <small style="color:var(--text-secondary);">Mat: ${m.matricula}</small>
        </div>
      `;
    });
    document.getElementById('dl-medicos').innerHTML = html;
    document.getElementById('grilla-medicos').innerHTML = grillaHtml;
    comboMedico.disabled = false;
    comboMedico.placeholder = 'Escriba para buscar médico...';
  } catch(err) {
    comboMedico.placeholder = 'Error al cargar';
  }
});

window.seleccionarMedico = function(id, nombreCompleto) {
  const input = document.getElementById('reserva-medico');
  input.value = nombreCompleto;
  input.dataset.id = id;
  input.dispatchEvent(new Event('change'));
  document.querySelectorAll('.btn-medico').forEach(b => {
      b.style.borderColor = 'transparent';
      b.style.background = 'var(--surface-dark)';
  });
  const selected = document.querySelector(`.btn-medico[data-id="${id}"]`);
  if(selected) {
    selected.style.borderColor = 'var(--primary-color)';
    selected.style.background = 'rgba(139, 92, 246, 0.1)';
  }
};

document.getElementById('reserva-medico').addEventListener('change', (e) => {
  const inputMed = e.target;
  let medId = inputMed.dataset.id;
  
  if (!medId) {
    const val = inputMed.value;
    const opciones = document.querySelectorAll('#dl-medicos option');
    for (let opt of opciones) {
      if (opt.value === val) { medId = opt.dataset.id; inputMed.dataset.id = medId; break; }
    }
  }

  const inputFecha = document.getElementById('reserva-fecha');
  if(medId) {
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
  const medicoId = document.getElementById('reserva-medico').dataset.id;
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
    
    data.disponibles.forEach(item => {
      const horaCorta = item.hora.substr(0, 5);
      if (item.disponible) {
        grilla.innerHTML += `<button type="button" class="btn btn-secondary btn-hora" onclick="seleccionarHora(this, '${item.hora}')">${horaCorta}</button>`;
      } else {
        grilla.innerHTML += `<button type="button" class="btn btn-hora" style="background:var(--danger-color); color:white; opacity:0.6; cursor:not-allowed;" disabled>${horaCorta}</button>`;
      }
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
    medico_id: document.getElementById('reserva-medico').dataset.id,
    especialidad_id: document.getElementById('reserva-especialidad').dataset.id,
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
