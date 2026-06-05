# Resumen General del Proyecto "Salud Goya"

Este documento contiene un historial consolidado de todo lo que se ha construido en el sistema hasta la fecha, detallado por Sprints.

---

## 🏆 Sprint 1: Arquitectura Base y Seguridad Autenticada
En nuestra primera fase nos concentramos en los cimientos del sistema. Nos aseguramos de que nadie no autorizado pudiera entrar a nuestra casa.

### 1. Base de Datos en Supabase (PostgreSQL)
- Diseñamos el esquema relacional (`01_schema.sql`) con las tablas troncales: `usuarios`, `pacientes`, `medicos`, `especialidades`, `turnos` e `historias_clinicas`.
- Implementamos restricciones avanzadas en la base de datos (`02_constraints.sql`) y encriptación nativa para la información clave.

### 2. Backend Base (Node.js + Express)
- Inicializamos el proyecto, instalamos librerías (Cors, Helmet) y organizamos la arquitectura en carpetas (`controllers`, `routes`, `middleware`, `services`).
- Implementamos el conector robusto a PostgreSQL (`db.js`) usando variables de entorno `.env`.

### 3. Autenticación, JWT y Login
- Creamos el controlador `auth.controller.js`.
- El sistema es capaz de recibir un correo y contraseña, validarlo usando hashes ultra-seguros (`bcrypt`), y emitir un Token JWT blindado.
- (Bugfix Crítico posterior): Aseguramos que el JWT guardara no solo el ID genérico de usuario, sino también su ID específico (`paciente_id` o `medico_id`) para evitar múltiples consultas a la base de datos a futuro.

### 4. Interfaz Base
- Creamos la estructura inicial del Frontend (`salud-goya/frontend`).
- Se desarrolló la pantalla de inicio de sesión (`index.html`) conectada a la API, que captura los errores, maneja el *sessionStorage* y redirige al panel según el rol del usuario que hizo login.

---

## 🏆 Sprint 2: Motor Central y Dashboards Visuales
En nuestra segunda fase construimos toda la lógica de negocio subyacente y las interfaces gráficas con las que los usuarios van a trabajar.

### 1. Backend Robusto y CRUDs
- **Admin API**: Rutas protegidas (`/api/admin/*`) exclusivas para que el Administrador gestione Especialidades, Médicos y pueda levantar suspensiones a los pacientes.
- **Pacientes API**: Control total sobre el CRUD de los pacientes asegurando unicidad del DNI y correos.
- **Médicos API**: El endpoint `/api/medicos/me/agenda` que aísla la agenda para cada médico específico.

### 2. Máquina de Estados de Turnos
- Implementamos la compleja máquina de estados que rige las reservas: `solicitado` -> `confirmado` -> `atendido`/`ausente`/`cancelado`. 
- Implementamos bloqueos a nivel de base de datos (`fn_validar_transicion_estado`) para imposibilitar corrupciones de información (por ejemplo, evitar pasar directo de solicitado a atendido).

### 3. Motor de Suspensión Automática
- El backend fue programado para castigar de manera automática a pacientes (15 días de suspensión sin poder reservar turnos nuevos) apenas alcanzan 2 faltas (`estado = ausente`).

### 4. Frontend Premium
Implementamos una suite de interfaces unificadas que respetan una paleta de colores curada y tipografías modernas.

- **`api.js`**: Un *wrapper* centralizado que inyecta automáticamente el token JWT a todas las peticiones y detecta si la sesión expiró.
- **Dashboard Administrador**: Panel de control general donde se pueden visualizar Especialidades, listado de Médicos, y las cuentas de Pacientes.
- **Dashboard Secretaría**: Unificada vista de los turnos diarios con el poder de confirmar o cancelar turnos en el acto.
- **Dashboard Médico**: Un panel limpio donde el profesional ve únicamente su nómina del día y tiene los botones rápidos para dar por Atendido o declarar como Ausente a un paciente.
- **Dashboard Paciente**: Visualización de su historial y alerta visual roja en caso de haber sido suspendido por inasistencias.

### 5. Suite de Testing Automatizado
Diseñamos un **Script End-to-End (`test_sprint2.js`)** que prueba automáticamente el motor:
- **Superposición**: Probado y bloqueado exitosamente. Dos pacientes no pueden ocupar la misma franja.
- **Falsas Transiciones**: Falla rotunda de la base de datos al intentar vulnerar la máquina de estados.
- **Castigos Efectivos**: Forzamos dos ausencias, el sistema reaccionó y bloqueó las futuras reservas con código 403.

---

> El sistema se encuentra 100% estable y el esqueleto relacional y lógico ya corre por sí mismo. El próximo paso (Sprint 3) abarcará Historias Clínicas y reportes visuales estadísticos.
