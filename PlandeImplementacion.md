
## Plan de Implementación: Portal Público y Portal Interno (Opción B — Subdominios)

### Contexto
El sistema actual tiene un único punto de entrada (`index.html`) que sirve a todos los roles. El objetivo es separar la experiencia en dos portales completamente independientes a nivel visual y de navegación, sin modificar el backend ni la base de datos.

---

### Reglas Obligatorias Antes de Tocar Cualquier Archivo

**Regla 1 — No tocar el backend.**
El backend no requiere ningún cambio. Los endpoints existentes, middlewares, controladores y base de datos permanecen exactamente igual. Si en algún momento del plan considerás modificar un archivo dentro de `/backend`, detenete y consultame antes.

**Regla 2 — No romper el portal interno existente.**
Los archivos `dashboard-admin.html`, `dashboard-medico.html`, `dashboard-secretaria.html` y el `index.html` actual no deben ser modificados en su lógica ni en su estética. Solo se permite agregarles un ajuste menor de redirección si fuera estrictamente necesario.

**Regla 3 — Un archivo a la vez.**
Completá y verificá cada archivo antes de pasar al siguiente. No generes todos los archivos juntos en un solo bloque.

**Regla 4 — Mostrar el plan completo antes de escribir código.**
Antes de generar cualquier línea de código, confirmá este plan conmigo. Recién cuando yo diga "aprobado" empezás a codificar.

**Regla 5 — Sin librerías nuevas.**
El portal público debe usar exactamente el mismo stack del proyecto: HTML5, CSS3 vanilla con las variables CSS ya definidas, y JavaScript ES6 puro con `fetch`. No instales ni importes ninguna librería nueva.

**Regla 6 — Reutilizar el `api.js` existente.**
Todas las llamadas al backend desde el portal público deben pasar por el `api.js` ya construido. No crear un segundo wrapper.

---

### Archivos a Crear

**1. `frontend/public/portal.html`**
- Landing page pública para pacientes
- Debe contener dos secciones en la misma página: formulario de Login y formulario de Registro
- Estética coherente con el sistema actual: dark glassmorphism, paleta de colores existente (`--bg-dark`, `--primary-color`, etc.)
- Al hacer login exitoso, verificar que el JWT decodificado tenga `rol === 'paciente'`. Si el rol es cualquier otro, rechazar el acceso con el mensaje: *"Este portal es exclusivo para pacientes. Accedé al portal interno."*
- Al hacer registro exitoso, iniciar sesión automáticamente y redirigir a `dashboard-paciente.html`
- Incluir un enlace discreto al pie de página que diga "¿Sos profesional de la salud? Accedé aquí" apuntando a `index.html`

**2. `frontend/public/js/portal.js`**
- Maneja toda la lógica de `portal.html`
- Función `handleLogin()`: llama a `POST /api/auth/login`, valida que el rol sea `paciente`, guarda el JWT en `sessionStorage`, redirige a `dashboard-paciente.html`
- Función `handleRegistro()`: llama a `POST /api/pacientes/registro`, y si es exitoso llama automáticamente a `handleLogin()` con las mismas credenciales para evitar doble formulario
- En caso de error, mostrar mensajes claros debajo del campo correspondiente, nunca usar `alert()`

**3. `frontend/vercel.json` (modificación)**
- Configurar dos rutas base:
  - El portal público (`portal.html`) como entrada del dominio principal o subdominio `pacientes`
  - El portal interno (`index.html`) como entrada del subdominio `app`
- Estructura esperada:
```json
{
  "rewrites": [
    { "source": "/portal", "destination": "/public/portal.html" },
    { "source": "/", "destination": "/public/portal.html" }
  ]
}
```
- Consultame antes de modificar este archivo porque afecta el deploy en Vercel

---

### Archivos a Modificar

**4. `frontend/public/index.html` (cambio mínimo)**
- Agregar al pie, de forma discreta, un enlace que diga "¿Sos paciente? Registrate aquí" apuntando a `portal.html`
- No modificar ningún otro elemento visual ni lógico

---

### Comportamiento Esperado del JWT por Portal

| Portal | Roles permitidos | Qué pasa si el rol no corresponde |
|--------|-----------------|----------------------------------|
| `portal.html` | Solo `paciente` | Muestra error y no redirige |
| `index.html` | `admin`, `medico`, `secretaria` | Sin cambios, funciona igual que hoy |

---

### Plan de Verificación

**Tests manuales obligatorios antes de cerrar este plan:**

1. Ingresar a `portal.html` con credenciales de un paciente real → debe redirigir a `dashboard-paciente.html`
2. Intentar ingresar a `portal.html` con credenciales de un admin → debe mostrar el mensaje de error y no redirigir
3. Registrar un paciente nuevo desde `portal.html` → debe crear la cuenta, hacer login automático y redirigir al dashboard
4. Verificar que `index.html` sigue funcionando exactamente igual para admin y médico
5. Verificar que el enlace cruzado entre portales funciona en ambas direcciones

**No se considera cerrado este plan hasta que los 5 puntos estén verificados y confirmados por vos.**

---

### Lo que NO se hace en este plan
- No se crean subdominios en Vercel todavía — eso se hace en el deploy final
- No se modifica ningún dashboard existente
- No se toca el backend
- No se agregan librerías