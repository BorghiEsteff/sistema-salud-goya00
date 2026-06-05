document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMsg = document.getElementById('error-message');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        errorMsg.classList.add('hidden');
        const response = await window.api.post('/auth/login', { email, password });
        
        // REGLA CRÍTICA #6: Usar sessionStorage, nunca localStorage
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('usuario', JSON.stringify(response.usuario));
        
        // Redirigir según el rol
        const rol = response.usuario.rol;
        if (rol === 'admin') window.location.href = 'dashboard-admin.html';
        else if (rol === 'secretaria') window.location.href = 'dashboard-secretaria.html';
        else if (rol === 'medico') window.location.href = 'dashboard-medico.html';
        else if (rol === 'paciente') window.location.href = 'dashboard-paciente.html';
        
      } catch (error) {
        errorMsg.textContent = error.message;
        errorMsg.classList.remove('hidden');
      }
    });
  }

  const regForm = document.getElementById('registro-form');
  const errorMsgReg = document.getElementById('error-message-reg');

  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const confirmPass = document.getElementById('reg-password-confirm').value;
      
      if (password !== confirmPass) {
        errorMsgReg.textContent = 'Las contraseñas no coinciden.';
        errorMsgReg.classList.remove('hidden');
        return;
      }

      const body = {
        email,
        password,
        nombre: document.getElementById('reg-nombre').value,
        apellido: document.getElementById('reg-apellido').value,
        dni: document.getElementById('reg-dni').value,
        fecha_nacimiento: document.getElementById('reg-fecha').value,
        telefono: document.getElementById('reg-telefono').value,
        direccion: document.getElementById('reg-direccion').value || null
      };

      try {
        errorMsgReg.classList.add('hidden');
        const btnReg = document.getElementById('btn-registrar');
        btnReg.disabled = true;
        btnReg.textContent = 'Creando cuenta...';

        // 1. Registrar
        await window.api.post('/pacientes/registro', body);

        // 2. Iniciar sesión automáticamente (Encadenado)
        btnReg.textContent = 'Iniciando sesión...';
        const response = await window.api.post('/auth/login', { email, password });
        
        sessionStorage.setItem('token', response.token);
        sessionStorage.setItem('usuario', JSON.stringify(response.usuario));
        
        window.location.href = 'dashboard-paciente.html';
      } catch (error) {
        errorMsgReg.textContent = error.message;
        errorMsgReg.classList.remove('hidden');
        document.getElementById('btn-registrar').disabled = false;
        document.getElementById('btn-registrar').textContent = 'Crear Cuenta';
      }
    });
  }
});
