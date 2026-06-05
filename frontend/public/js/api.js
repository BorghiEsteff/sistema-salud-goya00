// Wrapper centralizado para las peticiones al backend
// REGLA CRÍTICA #7: Toda llamada a la API debe pasar por aquí

const API_URL = 'http://localhost:3000/api';

async function apiCall(endpoint, method = 'GET', body = null) {
  // REGLA CRÍTICA #6: Usamos sessionStorage para que el token se borre al cerrar la pestaña
  const token = sessionStorage.getItem('token');

  const options = {
    method,
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  if (body) {
    if (body instanceof FormData) {
      // Si es FormData (ej. subida de archivos), el navegador setea automáticamente el Content-Type y boundary
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }

  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);

    if (res.status === 401 || res.status === 403) {
      // Si el token expira o no tiene permisos, cerrar sesión forzosamente
      console.warn('Acceso denegado o sesión expirada.');
      sessionStorage.clear();
      window.location.href = 'index.html';
      return;
    }

    if (!res.ok) {
      // Capturar error devuelto por el backend
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${res.status}: Fallo en la comunicación con el servidor`);
    }

    // Algunas respuestas (ej. un DELETE exitoso) pueden no devolver JSON
    const text = await res.text();
    return text ? JSON.parse(text) : null;

  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error.message);
    throw error;
  }
}

// Interfaz pública para ser usada en los controladores del frontend
window.api = {
  get:    (endpoint)        => apiCall(endpoint, 'GET'),
  post:   (endpoint, body)  => apiCall(endpoint, 'POST', body),
  put:    (endpoint, body)  => apiCall(endpoint, 'PUT', body),
  delete: (endpoint)        => apiCall(endpoint, 'DELETE'),
};

// Función global para cerrar sesión (usada en todos los dashboards)
window.logout = () => {
  sessionStorage.clear();
  window.location.href = 'index.html';
};
