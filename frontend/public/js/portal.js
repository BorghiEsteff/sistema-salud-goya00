document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registroForm = document.getElementById('registro-form');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registroForm) {
    registroForm.addEventListener('submit', handleRegistro);
  }
});

// Función auxiliar para limpiar errores
function clearErrors(formId) {
  const form = document.getElementById(formId);
  const errorSpans = form.querySelectorAll('.field-error');
  errorSpans.forEach(span => span.textContent = '');
  
  const globalError = document.getElementById(`${formId.split('-')[0]}-global-error`);
  if (globalError) {
    globalError.textContent = '';
    globalError.classList.add('hidden');
  }
}

// Función auxiliar para mostrar error global
function showGlobalError(formPrefix, message) {
  const globalError = document.getElementById(`${formPrefix}-global-error`);
  if (globalError) {
    globalError.textContent = message;
    globalError.classList.remove('hidden');
  }
}

// Función auxiliar para decodificar JWT
function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error al decodificar token", error);
    return null;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  clearErrors('login-form');

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await window.api.post('/auth/login', { email, password });
    
    if (res && res.token) {
      const decoded = decodeJWT(res.token);
      
      if (decoded && decoded.rol === 'paciente') {
        sessionStorage.setItem('token', res.token);
        window.location.href = 'dashboard-paciente.html';
      } else {
        showGlobalError('login', 'Este portal es exclusivo para pacientes. Accedé al portal interno.');
      }
    }
  } catch (error) {
    showGlobalError('login', error.message || 'Error al iniciar sesión');
  }
}

async function handleRegistro(e) {
  e.preventDefault();
  clearErrors('registro-form');

  const nombre = document.getElementById('reg-nombre').value.trim();
  const apellido = document.getElementById('reg-apellido').value.trim();
  const dni = document.getElementById('reg-dni').value.trim();
  const fechaNacimiento = document.getElementById('reg-fecha').value;
  const telefono = document.getElementById('reg-telefono').value.trim();
  const direccion = document.getElementById('reg-direccion').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('reg-password-confirm').value;

  if (password !== confirmPassword) {
    document.getElementById('error-reg-password-confirm').textContent = 'Las contraseñas no coinciden';
    return;
  }

  const payload = {
    nombre,
    apellido,
    dni,
    fecha_nacimiento: fechaNacimiento,
    telefono,
    direccion,
    email,
    password
  };

  try {
    await window.api.post('/pacientes/registro', payload);
    
    // Auto-login post registro exitoso
    const res = await window.api.post('/auth/login', { email, password });
    if (res && res.token) {
      const decoded = decodeJWT(res.token);
      if (decoded && decoded.rol === 'paciente') {
        sessionStorage.setItem('token', res.token);
        window.location.href = 'dashboard-paciente.html';
      } else {
        showGlobalError('registro', 'Error inesperado de autenticación. Intentá ingresar manualmente.');
      }
    }

  } catch (error) {
    showGlobalError('registro', error.message || 'Error al registrar el paciente');
  }
}
