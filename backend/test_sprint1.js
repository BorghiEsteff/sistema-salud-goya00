require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const pool = require('./src/config/db');

const server = http.createServer(app);

async function runTests() {
  server.listen(4005, async () => {
    console.log('\n--- INICIANDO VERIFICACIONES DEL SPRINT 1 ---\n');
    let errors = 0;
    
    // Native fetch is available in Node 18+
    const api = async (path, opts) => {
      return fetch(`http://localhost:4005/api${path}`, opts);
    };

    try {
      // 1. Verificación en BD: Contraseña hasheada
      const dbRes = await pool.query("SELECT password_hash FROM usuarios WHERE email = 'admin@saludgoya.com'");
      const hash = dbRes.rows[0].password_hash;
      if (hash && hash.startsWith('$2a$')) {
        console.log('✅ Verificación BD: La contraseña se almacenó hasheada con Bcrypt.');
      } else {
        console.error('❌ Verificación BD: La contraseña no parece estar hasheada.');
        errors++;
      }

      // 2. Credenciales incorrectas
      let res = await api('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@saludgoya.com', password: 'clave-equivocada' })
      });
      if (res.status === 401) {
        console.log('✅ API Auth: Endpoint falla con credenciales incorrectas (401).');
      } else {
        console.error('❌ API Auth: Falló Test de malas credenciales, estado =', res.status); 
        errors++;
      }

      // 3. Login Exitoso y JWT
      res = await api('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@saludgoya.com', password: 'admin123' })
      });
      let token = null;
      if (res.status === 200) {
        const data = await res.json();
        if (data.token && data.usuario.rol === 'admin') {
          token = data.token;
          console.log('✅ API Auth: Login exitoso, devuelve JWT válido y rol correcto.');
        } else {
          console.error('❌ API Auth: Login OK pero no devolvió token válido.'); 
          errors++;
        }
      } else {
        console.error('❌ API Auth: Falló login con credenciales correctas, estado =', res.status); 
        errors++;
      }

      // 4. Ruta Protegida sin Token (Simulando ruta /health con protección, la inyectamos on the fly)
      const { verificarToken, verificarRol } = require('./src/middleware/auth');
      const { verificarRol: reqRol } = require('./src/middleware/roles');
      app.get('/api/test-protegida', verificarToken, reqRol(['admin']), (req, res) => res.json({ok: true}));
      
      let resProt = await api('/test-protegida', { method: 'GET' });
      if (resProt.status === 401) {
        console.log('✅ API Seguridad: Ruta protegida sin token devuelve 401.');
      } else {
        console.error('❌ API Seguridad: Ruta protegida sin token no fue bloqueada. Estado =', resProt.status);
        errors++;
      }

      // 5. Ruta Protegida con Rol Incorrecto
      app.get('/api/test-rol', verificarToken, reqRol(['paciente']), (req, res) => res.json({ok: true}));
      let resRol = await api('/test-rol', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resRol.status === 403) {
        console.log('✅ API Seguridad: Ruta protegida con rol incorrecto devuelve 403.');
      } else {
        console.error('❌ API Seguridad: Rol incorrecto no fue bloqueado. Estado =', resRol.status);
        errors++;
      }

      console.log('\n----------------------------------------------');
      if (errors === 0) {
        console.log('🎉 RESULTADO: TODOS LOS TESTS DEL SPRINT 1 PASARON CON ÉXITO.');
      } else {
        console.log(`⚠️ RESULTADO: Hubo ${errors} errores en las pruebas.`);
      }
      console.log('----------------------------------------------\n');

    } catch(e) {
      console.error('Error interno ejecutando tests:', e);
    } finally {
      server.close();
      await pool.end();
      process.exit(errors === 0 ? 0 : 1);
    }
  });
}

runTests();
