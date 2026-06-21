# Sistema de Gestión Médica – Salud Goya
### Documentación del Proyecto

---

# SECCIÓN 1 – PRD (Product Requirements Document)

## 1.1 Visión del Producto

Salud Goya es una plataforma digital integral diseñada para la gestión de turnos médicos, historias clínicas y administración de centros de salud. El sistema está compuesto por una aplicación **web** responsiva conectada a un backend mediante una **API REST**, optimizando la comunicación entre pacientes, médicos y la administración del centro médico.

## 1.2 Usuarios Objetivo

| Rol | Descripción |
|---|---|
| **Paciente** | Usuario principal. Puede registrarse, solicitar turnos, y consultar su historia clínica. |
| **Médico** | Profesional de la salud. Puede ver su agenda de turnos, cargar diagnósticos, recetas y subir archivos adjuntos. |
| **Secretaría** | Perfil administrativo intermedio para gestión rápida de turnos (opcional/escalabilidad). |
| **Administrador** | Gestiona altas/bajas de especialidades, médicos, pacientes, suspensiones y visualiza los logs de auditoría. |

## 1.3 Alcance del Producto

### Módulos Funcionales

| ID | Módulo |
|---|---|
| M1 | Autenticación y Perfiles (Login, Registro, JWT) |
| M2 | Gestión de Especialidades y Médicos (Admin) |
| M3 | Sistema de Turnos (Reserva, Cancelación, Reprogramación) |
| M4 | Historias Clínicas Electrónicas (HCE) y Archivos Adjuntos |
| M5 | Panel de Auditoría y Control de Suspensiones |
| M6 | Pagos Online (Integración con MercadoPago) |
| M7 | Panel de Informes y KPIs |

## 1.4 Requerimientos Funcionales

| ID | Descripción | Prioridad |
|---|---|---|
| RF-01 | Registro de pacientes con validación de DNI y Email. | Alta |
| RF-02 | Inicio de sesión seguro con encriptación de contraseñas. | Alta |
| RF-03 | El paciente debe poder buscar médicos por especialidad y reservar un turno. | Alta |
| RF-04 | El paciente puede cancelar turnos. Excesivas ausencias generan suspensión automática. | Media |
| RF-05 | El médico debe poder visualizar sus turnos confirmados del día/semana. | Alta |
| RF-06 | El médico debe poder redactar la evolución en la historia clínica. | Alta |
| RF-07 | El médico puede subir archivos adjuntos (recetas, estudios) a la nube (Cloudinary). | Alta |
| RF-08 | El Admin puede crear, activar/inactivar y eliminar físicamente pacientes/médicos/especialidades. | Alta |
| RF-09 | El Admin tiene acceso a un log de auditoría inmutable de todas las acciones del sistema. | Alta |
| RF-10 | El Médico o Admin pueden configurar modalidad de pago (presencial o prepago) y precio de consulta. | Media |
| RF-11 | El Paciente debe pagar vía MercadoPago para confirmar turnos de modalidad prepago (salvo que tenga obra social). | Media |
| RF-12 | El Admin puede ver un panel de Informes con gráficos de turnos y recaudación. | Baja |

## 1.5 Requerimientos No Funcionales

| ID | Descripción |
|---|---|
| RNF-01 | La interfaz web debe ser **responsive** (adaptable a móviles y escritorio). |
| RNF-02 | El backend debe desarrollarse en **Node.js** con el framework **Express**. |
| RNF-03 | La base de datos debe ser relacional, utilizando **PostgreSQL**. |
| RNF-04 | La seguridad de las rutas debe gestionarse mediante **JWT** (JSON Web Tokens). |
| RNF-05 | Las contraseñas deben estar encriptadas con **bcrypt**. |
| RNF-06 | Subida de archivos gestionada por **Multer** y almacenada externamente en **Cloudinary**. |

---

# SECCIÓN 2 – TRD (Technical Requirements Document)

## 2.1 Stack Tecnológico

### Frontend
- **Lenguajes:** HTML5, CSS3, JavaScript (ES6+) Vanilla.
- **Comunicación:** `fetch` API.
- **Variables de Entorno:** Configuración dinámica de la URL del backend mediante `window.ENV_API_URL` para facilitar despliegues en plataformas como Vercel.
- **Librerías Externas:** MercadoPago SDK (vía CDN), Chart.js (vía CDN para informes). Excepción al uso de "cero librerías" justificada por la complejidad gráfica y la seguridad del checkout de pagos.
- **UI/UX:** CSS nativo (Variables, Flexbox, Grid), sin frameworks pesados para máxima performance. Reemplazo de alertas nativas del navegador por un sistema de notificaciones custom (`visualConfirm`, `showGlobalError`).

### Backend
- **Entorno:** Node.js.
- **Framework:** Express.js.
- **Base de Datos:** PostgreSQL.
- **Librerías Clave:** `pg` (driver BD), `jsonwebtoken` (Auth), `bcryptjs` (Seguridad), `multer` + `cloudinary` (Archivos), `mercadopago` (Procesamiento de pagos y reembolsos).

## 2.2 Arquitectura del Sistema

```
┌─────────────────────┐       
│   Cliente Web       │       
│  (HTML/CSS/JS)      │       
└────────┬────────────┘       
         │  HTTP / JSON (REST)
         ▼                              
┌────────────────────────────────────────────────────┐
│              API REST – Node.js / Express          │
│          (Rutas → Controladores → Queries BD)      │
└──────────────────────────┬─────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │   PostgreSQL    │
                  │  (Base de Datos)│
                  └─────────────────┘
```

## 2.3 Estructura del Proyecto

```
salud-goya/
├── backend/
│   ├── src/
│   │   ├── config/ (db.js, cloudinary.js)
│   │   ├── controllers/ (auth, admin, medicos, turnos, pagos, informes, etc.)
│   │   ├── middleware/ (auth.js, roles.js, upload.js)
│   │   ├── routes/ (endpoints de la API)
│   │   ├── services/ (disponibilidad.service, pagos.service.js)
│   │   └── app.js
│   ├── sql/ (scripts de creación de BD)
│   └── index.js (Punto de entrada)
├── frontend/
│   └── public/
│       ├── css/
│       ├── js/ (api.js, admin.js, medico.js, paciente.js, secretaria.js, informes.js)
│       └── *.html (Vistas, checkout-pago.html, pago-exitoso.html)
└── package.json
```

## 2.4 Endpoints de la API REST (Actualizado)

| Método | Endpoint | Descripción | Acceso |
|---|---|---|---|
| **Admin** | `/api/admin` | | |
| `GET` | `/api/admin/especialidades` | Listar especialidades (vista administrativa) | Admin |
| `POST` | `/api/admin/especialidades` | Crear nueva especialidad | Admin |
| `POST` | `/api/admin/especialidades/limpiar-vacias` | Eliminar físicamente especialidades sin médicos | Admin |
| `DELETE` | `/api/admin/especialidades/:id` | Eliminar especialidad por ID | Admin |
| `GET` | `/api/admin/medicos` | Listar todos los médicos | Admin |
| `POST` | `/api/admin/medicos` | Crear nuevo perfil médico | Admin |
| `PUT` | `/api/admin/medicos/:id` | Actualizar médico (precio y modalidad de pago) | Admin |
| `PUT` | `/api/admin/medicos/:id/estado` | Activar o inactivar médico | Admin |
| `PUT` | `/api/admin/pacientes/:id/estado` | Activar o inactivar paciente | Admin |
| `PUT` | `/api/admin/pacientes/:id/levantar-suspension`| Levantar suspensión automática de un paciente | Admin |
| `DELETE` | `/api/admin/pacientes/:id` | Eliminar paciente del sistema | Admin |
| `GET` | `/api/admin/auditoria` | Ver logs de auditoría (soporta `?page` y `?limit`) | Admin |
| `GET` | `/api/admin/auditoria/exportar` | Descargar logs de auditoría en formato CSV | Admin |
| `GET` | `/api/admin/secretarias` | Listar perfiles de secretaría | Admin |
| `POST` | `/api/admin/secretarias` | Crear nuevo perfil de secretaría | Admin |
| `PUT` | `/api/admin/secretarias/:id/estado` | Activar o inactivar secretaría | Admin |
| `GET` | `/api/admin/informes/resumen` | Estadísticas generales y totales | Admin |
| `GET` | `/api/admin/informes/pagos` | Serie temporal de pagos | Admin |
| `GET` | `/api/admin/informes/turnos-por-estado` | Agrupación de turnos por estado | Admin |
| **Auth** | `/api/auth` | | |
| `POST` | `/api/auth/login` | Autenticación y generación de JWT | Público |
| **Archivos** | `/api/archivos` | | |
| `POST` | `/api/archivos/subir` | Subir PDF/Imagen a Cloudinary | Admin, Sec, Médico |
| `GET` | `/api/archivos/paciente/:id` | Ver archivos adjuntos de un paciente | Admin, Sec, Médico, Paciente |
| **Historias** | `/api/historias` | | |
| `POST` | `/api/historias` | Cargar evolución médica a un turno | Médico, Admin |
| `GET` | `/api/historias/paciente/:id` | Ver historial completo de un paciente | Admin, Médico, Paciente |
| **Médicos** | `/api/medicos` | | |
| `GET` | `/api/medicos/me` | Ver perfil del médico autenticado | Médico |
| `GET` | `/api/medicos/me/agenda` | Obtener agenda de turnos asignados | Médico |
| **Pacientes** | `/api/pacientes` | | |
| `POST` | `/api/pacientes/registro` | Auto-registro público de pacientes | Público |
| `GET` | `/api/pacientes/me` | Ver perfil del paciente autenticado | Paciente |
| `PUT` | `/api/pacientes/me` | Actualizar perfil propio | Paciente |
| `GET` | `/api/pacientes` | Listar todos los pacientes | Admin, Sec |
| `GET` | `/api/pacientes/:id` | Ver perfil de paciente por ID | Admin, Sec |
| `PUT` | `/api/pacientes/:id` | Actualizar perfil de paciente por ID | Admin, Sec |
| **Pagos** | `/api/pagos` | | |
| `POST` | `/api/pagos/crear-preferencia` | Generar link de pago MP | Paciente |
| `POST` | `/api/pagos/webhook` | Webhook asíncrono para MercadoPago | Sistema MP |
| **Público** | `/api/public` | | |
| `GET` | `/api/public/especialidades` | Listar especialidades para combos | Público |
| `GET` | `/api/public/medicos` | Listar médicos para combos | Público |
| **Turnos** | `/api/turnos` | | |
| `GET` | `/api/turnos/disponibilidad` | Consultar slots horarios libres | Público |
| `GET` | `/api/turnos` | Listar turnos (filtra por rol automáticamente) | Admin, Sec, Médico, Paciente |
| `POST` | `/api/turnos` | Reservar nuevo turno | Admin, Sec, Paciente |
| `PUT` | `/api/turnos/:id/cancelar` | Cancelar turno existente | Admin, Sec, Médico, Paciente |
| `PUT` | `/api/turnos/:id/estado` | Transicionar estado (ej. Confirmado -> Atendido) | Admin, Sec, Médico |

---

# SECCIÓN 3 – Diseño UI/UX

## 3.1 Principios de Diseño
- **Mobile First y Accesibilidad:** Componentes diseñados para colapsar suavemente en pantallas pequeñas, con navegación 100% por teclado (`focus-visible`) y soporte para ajuste dinámico de tamaño de fuente.
- **Minimalismo y Esquema Claro (Modo Salud):** Uso de fondos claros y limpios (`#F8FAFC`, `#FFFFFF`) con estilo "glassmorphism", sombras suaves y acentos vibrantes para llamar la atención a las acciones primarias (Primary Buttons).
- **Feedback visual:** Uso exclusivo de notificaciones dinámicas (toasts) y modales custom (`visualConfirm`, `showGlobalError`) para advertencias y errores, eliminando el uso intrusivo de `alert()` o `prompt()` nativos del navegador. Cambios de color semánticos (rojo para peligro, verde para éxito, menta para acentos). Modales rediseñados tipo tarjeta central con desenfoque de fondo.

## 3.2 Paleta de Colores (Actualizada al Modo Salud)
*Nota: Los nombres originales de variables oscuras se mantuvieron por retrocompatibilidad con el código JS, pero sus valores fueron actualizados al nuevo esquema claro.*

| Token | Valor | Uso |
|---|---|---|
| `--background-dark` | `#F8FAFC` | Fondo principal de la aplicación (claro) |
| `--surface-dark` | `#FFFFFF` | Tarjetas, formularios y modales (blanco) |
| `--primary-color` | `#2563EB` | Botones principales, enlaces |
| `--secondary-color` | `#0EA5A4` | Acentos secundarios |
| `--accent-color` | `#14B8A6` | Detalles y tokens activos |
| `--danger-color` | `#EF4444` | Acciones destructivas (Eliminar, Inactivar) |
| `--success-color` | `#22C55E` | Confirmaciones y estados Activos |
| `--warning-color` | `#F59E0B` | Advertencias |
| `--text-primary` | `#1E293B` | Texto principal oscuro |
| `--text-secondary` | `#64748B` | Texto secundario o etiquetas |

## 3.3 Flujo de Navegación
El sistema se encuentra dividido en dos portales independientes para mejorar la seguridad y la experiencia de usuario:

**Portal Público (`portal.html`) - Acceso exclusivo Pacientes**
```
Portal de Pacientes
  ├─► Registro de nuevo usuario
  └─► Login de Paciente
        └─► Dashboard Paciente (Ver Turnos, Nueva Reserva, Consultar HCE)
```

**Portal Interno (`index.html`) - Acceso exclusivo Staff (Médico, Admin, Secretaría)**
```
Portal Interno (Staff)
  └─► Login Administrativo/Profesional
        ├─► Dashboard Médico (Agenda Diaria, Carga de Evoluciones, Subida de Archivos)
        ├─► Dashboard Secretaría (Gestión Rápida de Turnos)
        └─► Dashboard Admin (CRUD de Especialidades, Médicos, Pacientes, Auditoría)
```

---

# SECCIÓN 4 – AppFlow (Flujos de la Aplicación)

## 4.1 Flujo: Gestión Administrativa (Ej. Especialidades)
1. El Admin ingresa a la pestaña "Especialidades".
2. Presiona "Nueva Especialidad" (abre modal).
3. Ingresa datos y se hace un `POST /api/admin/especialidades`.
4. El backend inserta en BD y lanza un **Trigger** que guarda la acción en `logs_auditoria`.
5. El Admin puede inactivar o **Limpiar Vacías** (eliminación física) limpiando primero las dependencias de FK.

## 4.2 Flujo: Reserva de Turnos
1. El paciente entra a "Solicitar Turno".
2. Selecciona la especialidad (`GET /api/public/especialidades`).
3. Elige al médico disponible.
4. Elige una fecha y horario.
5. `POST /api/turnos`. El backend valida que el paciente no esté suspendido y que el horario esté libre. Se crea el registro.

## 4.3 Flujo: Historia Clínica y Archivos
1. El médico atiende el turno. (Los turnos muestran acciones de Atendido, Ausente y Cancelar que cambian el estado dinámicamente).
2. Hace clic en el nombre del paciente para abrir el modal visor del historial (`visor-historial-modal`).
3. El backend verifica estrictamente por motivos de seguridad que el médico logueado tenga un turno (`solicitado`, `confirmado` o `atendido`) con el paciente antes de retornar los datos, y bloquea el acceso a perfiles administrativos (Secretaría).
4. El médico redacta la evolución o selecciona múltiples archivos PDF.
5. El frontend itera los archivos y realiza llamadas secuenciales `fetch` enviándolos vía `FormData` junto al `turno_id` y `paciente_id`.
6. El middleware de `multer` captura el archivo, se sube a la API de **Cloudinary** y se guarda el registro de la URL en la tabla `archivos_adjuntos` de Supabase.
7. El paciente, al ingresar a su portal, consulta su historial y visualiza los enlaces directos de descarga provistos por Cloudinary.

---

# SECCIÓN 5 – Esquema del BackEnd

## 5.1 Arquitectura (Express + PostgreSQL)
El backend está estructurado con una clara separación de responsabilidades:
- **Index.js / App.js:** Configuración del servidor, CORS, y montado de rutas.
- **Rutas (Routes):** Reciben las peticiones HTTP y las delegan al controlador correspondiente, aplicando middlewares de seguridad previamente.
- **Controladores (Controllers):** Extraen parámetros (`req.body`, `req.params`), ejecutan las consultas directas usando el pool de la BD (`db.query`) y retornan las respuestas JSON.
- **Base de Datos (SQL):** Tablas fuertemente relacionales protegidas por triggers (ej. validación de solapamiento de turnos, generación automática de auditoría).

## 5.2 Middlewares Clave
- `verificarToken`: Valida que el JWT enviado en los Headers (`Authorization: Bearer <token>`) sea genuino y no haya expirado. Modifica el objeto `req.usuario` para uso posterior.
- `verificarRol(['admin'])`: Bloquea el acceso si el rol decodificado del JWT no coincide con el requerido.
- `upload.single('archivo')`: Intercepta `multipart/form-data` para posibilitar el pasaje a Cloudinary.

## 5.3 Modelo de Base de Datos Resumido (Tablas)
- `usuarios`: Credenciales de acceso y rol.
- `pacientes` / `medicos`: Perfiles extendidos. Medicos incluyen `precio_consulta` y `modalidad_pago`.
- `especialidades`: Áreas médicas.
- `turnos`: Relaciona paciente, médico, fecha y estado. Incluye `estado_pago`.
- `historia_clinica`: Evoluciones médicas ligadas a un turno y paciente.
- `archivos_adjuntos`: URLs de recursos subidos a la nube.
- `pagos`: Tracking financiero y metadatos de MercadoPago (payment_id, monto, moneda).
- `logs_auditoria`: Registro automático e inmutable de cambios en la BD.

---

# SECCIÓN 6 – Evolución y Últimas Implementaciones

## 6.1 Separación de Portales (Público e Interno)
Para asegurar que los pacientes no interactúen con la interfaz administrativa y viceversa, se implementó una estricta separación de puntos de entrada:
- **`portal.html`**: Destinado únicamente a los pacientes. Contiene el formulario de Registro y de Login. El JWT es validado y rechaza cualquier acceso que no sea de rol `paciente`.
- **`index.html`**: Destinado al staff interno (Médicos, Administradores, Secretarías). Rechaza accesos de usuarios tipo `paciente`.
- *Nota sobre Subdominios:* La configuración a nivel de subdominios a través de `vercel.json` o servidores web está planificada como pendiente para la fase final de deploy. Actualmente ambos portales coexisten bajo el mismo dominio principal, usando diferentes URLs de archivo para aislar la navegación.

## 6.2 Mejoras en el Panel de Administrador
Se implementaron controles avanzados en el dashboard administrativo para facilitar la moderación:
- **Activación / Inactivación de Entidades:** Capacidad para suspender y reactivar perfiles de médicos y pacientes. En el caso de los pacientes, también permite levantar las suspensiones automáticas generadas por inasistencias a turnos.
- **Limpieza de Especialidades Vacías:** Acción masiva (bulk delete) que permite al administrador eliminar físicamente aquellas especialidades inhabilitadas que ya no tengan médicos ni turnos asociados.
- **Filtros en Auditoría:** El log inmutable de auditoría ahora soporta consultas acotadas por rango de fecha (`fecha_desde` y `fecha_hasta`) para un mejor rastreo de las acciones administrativas.

## 6.3 Flujos de Sprins Completados (1 a 5)
1. **Arquitectura y Seguridad**: BD en PostgreSQL (Supabase), roles y JWT.
2. **Dashboards y Máquina de Estados**: CRUDs y transición de estados de turnos con suspensión automática de pacientes ausentes.
3. **Historias Clínicas**: Carga de evoluciones médicas y reportes.
4. **Carga de Archivos Adjuntos**: Integración con Multer y Cloudinary para recetas/estudios en PDF e Imágenes.
5. **Separación de Portales**: Refactor del frontend para independizar la experiencia de Pacientes del Staff Médico.

## 6.4 Rediseño Visual y UI/UX (Modo Salud)
Se llevó a cabo una modernización completa de la interfaz sin alterar la lógica interna de Javascript ni el backend.
- **Sprint 1 (Design Tokens):** Migración total desde un esquema oscuro hacia un esquema "Salud" (fondo claro, textos oscuros, acentos en azul y menta).
- **Sprint 2 (Formularios):** Estandarización de inputs (`.form-control`) y botones (`.btn`).
- **Sprint 3 (Layout y Cards):** Reestructuración de todos los dashboards con diseño basado en tarjetas (cards), uso de sidebar con iconos y tablas responsivas.
- **Sprint 4 (Modales y Alertas):** Adopción de "glassmorphism" en modales y creación de clases para validación visual de errores y toasts.
- **Sprint 5 (Accesibilidad y Responsive):** Implementación de control dinámico de tamaño de fuente, diseño adaptativo real en mobile, focus-visible para navegación por teclado e indicadores de carga (`spinner`) integrados dinámicamente.

## 6.5 Mejoras Funcionales — Grupo B (Sprints 6 a 9)

Se implementó un segundo ciclo de mejoras centrado en funcionalidades del sistema, sin alterar la lógica de negocio existente.

### Sprint 6 — Configuración de Subdominios para Vercel
Se creó el archivo `vercel.json` en la raíz del proyecto para separar el acceso a los dos portales a nivel de infraestructura en el despliegue en Vercel:
- El subdominio `staff.*` redirige a `index.html` (portal interno de médicos, secretaría y admin).
- El dominio raíz (`/`) redirige a `portal.html` (portal de pacientes).
- Las rutas `/api/*` se dirigen al servidor Node.js (`backend/index.js`).

**Archivos modificados:** `vercel.json` *(nuevo)*.

---

### Sprint 7 — Activación Real del Rol Secretaría
Se completó la funcionalidad del Dashboard de Secretaría, que hasta este sprint sólo tenía una interfaz parcial.

**Backend:**
- `turnos.controller.js` → El endpoint `GET /api/turnos` fue actualizado con `JOIN` a las tablas `pacientes`, `medicos` y `especialidades`. Ahora la respuesta incluye los campos `paciente_nombre`, `paciente_apellido`, `medico_nombre`, `medico_apellido` y `especialidad_nombre` sin necesidad de hacer consultas adicionales desde el frontend.

**Frontend:**
- `dashboard-secretaria.html` → Se añadieron las columnas "Paciente" y "Médico" a la tabla de agenda. Se incorporaron los contenedores de modales (confirmación visual y cancelación de turno).
- `secretaria.js` → Eliminación completa de las llamadas nativas `alert()` y `prompt()`. Reemplazadas por:
  - `showGlobalError(message, type)`: notificación tipo toast no bloqueante.
  - `visualConfirm(titulo, mensaje)`: modal de confirmación visual asíncrono (basado en `Promise`).
  - Modal dedicado para ingresar el motivo de cancelación de turno.

**Archivos modificados:** `turnos.controller.js`, `dashboard-secretaria.html`, `secretaria.js`.

---

### Sprint 8 — Paginación en Listados Extensos
Se incorporó paginación opcional con `LIMIT` / `OFFSET` en los tres endpoints de listado principales. La implementación es **retrocompatible**: si no se envía `?page=N`, el endpoint retorna el array completo (comportamiento anterior). Si se envía `?page=N&limit=N`, retorna el objeto `{ data: [], total, page, pages }`.

**Backend:**
- `pacientes.controller.js` → `getAllPacientes` acepta `?page` y `?limit`.
- `admin.controller.js` → `getAuditoria` acepta `?page` y `?limit`. El conteo total se calcula sobre la subquery con filtros de fecha aplicados.
- `turnos.controller.js` → `getTurnos` acepta `?page` y `?limit`. El conteo total respeta los filtros de rol y fecha activos.

**Frontend (`admin.js`):**
- `cargarPacientes(page)` y `cargarAuditoria(page)` ahora aceptan número de página.
- Se añadió la función utilitaria `renderPaginacion(containerId, currentPage, totalPages, fetchFn)` que genera dinámicamente los botones "Anterior", indicador "Página X de Y" y "Siguiente".
- Los contenedores `<div id="paginacion-pacientes">` y `<div id="paginacion-auditoria">` fueron añadidos al HTML debajo de cada tabla.
- Las acciones sobre filas (levantar suspensión, toggle de estado, eliminar) recuerdan la página actual y la recargan al volver.

**Archivos modificados:** `pacientes.controller.js`, `admin.controller.js`, `turnos.controller.js`, `dashboard-admin.html`, `admin.js`.

---

### Sprint 9 — Exportación de Logs de Auditoría a CSV
Se habilitó la descarga de un reporte histórico del log de auditoría en formato CSV, compatible con Microsoft Excel y LibreOffice Calc.

**Backend:**
- `admin.controller.js` → Nueva función `exportarAuditoriaCSV`. Ejecuta la misma query que `getAuditoria` (con los mismos filtros opcionales de fecha), construye el CSV en memoria con escapado correcto de caracteres especiales (comas, comillas, saltos de línea) e incluye un **BOM UTF-8** (`\uFEFF`) para que Excel reconozca la codificación correctamente.
  - Cabeceras: `ID`, `Fecha y Hora`, `Admin`, `Accion`, `Tabla`, `Campo`, `Valor Anterior`, `Valor Nuevo`, `IP`, `Nombre Afectado`.
  - El archivo se nombra automáticamente `auditoria_YYYY-MM-DD.csv`.
- `admin.routes.js` → Nueva ruta `GET /api/admin/auditoria/exportar` (registrada antes de la ruta base `/auditoria`).

**Frontend:**
- `dashboard-admin.html` → Se añadió el botón **⬇ Exportar CSV** junto a los filtros de fecha en el panel de Auditoría.
- `admin.js` → Handler del botón: realiza un `fetch` autenticado con el token de `sessionStorage`, recibe el `Blob` CSV, crea una URL temporal (`URL.createObjectURL`) y la asigna a un `<a>` invisible para forzar la descarga. Los filtros de fecha activos al momento de la descarga son respetados.

**Archivos modificados:** `admin.controller.js`, `admin.routes.js`, `dashboard-admin.html`, `admin.js`.

---

### Sprint 10 — Ajustes de Despliegue y Configuración de CORS
Se resolvieron problemas de compatibilidad en el entorno de producción relacionados con las políticas de CORS (Cross-Origin Resource Sharing) que bloqueaban las peticiones de inicio de sesión desde el frontend alojado en Vercel hacia el backend en Render.

**Backend:**
- `app.js` → Se actualizó la configuración del middleware `cors`. Anteriormente restringía el acceso a un único origen basado en la variable de entorno `FRONTEND_URL`. Ahora se reescribió para aceptar una lista de múltiples orígenes autorizados, incluyendo dominios secundarios (`sistema-salud-goya00.vercel.app`) y entornos de desarrollo local (`localhost`, `127.0.0.1`). Esto flexibiliza el despliegue y evita bloqueos de preflight options sin comprometer la seguridad general.

**Archivos modificados:** `app.js`.

---

### Sprint 11 — Gestión de Secretarías en Panel Admin
Se implementó el CRUD completo para gestionar perfiles de Secretaría desde el Dashboard del Administrador, cerrando el flujo operativo que antes requería inyección SQL manual.
- **Backend:** Nuevos endpoints protegidos en `/api/admin/secretarias` (GET, POST, PUT) con registro en `logs_auditoria`.
- **Frontend:** Nueva pestaña "Secretarías" en el panel. Creación de cuenta con generación y muestra de contraseña temporal compartiendo el modal seguro existente.

**Archivos modificados:** `admin.controller.js`, `admin.routes.js`, `dashboard-admin.html`, `admin.js`.

---

### Sprint 12 — Preparación de Infraestructura y SDK de Pagos
Se sentaron las bases para la integración financiera con MercadoPago SDK.
- **Backend:** Adición del SDK de MP (`mercadopago`), migración de BD añadiendo campos `modalidad_pago`, `precio_consulta` a médicos; y `estado_pago` a turnos. Creación de tabla `pagos`. Middleware de `express.raw` para validar webhooks de MP (HMAC-SHA256).

**Archivos modificados:** `app.js` (middleware raw), ejecución de scripts SQL.

---

### Sprint 13 — Lógica de Reserva Condicionada y Checkout
Se reescribió el flujo de `reservarTurno` para generar pagos pendientes y preferencias de MP.
- **Backend:** `pagos.controller.js` con método `crearPreferencia` y `webhook`. Si el paciente no tiene obra social y el médico es prepago, se inserta pago 'pendiente'.
- **Frontend:** Flujo del paciente incluye redirección al checkout vía SDK en `checkout-pago.html` y callbacks en `pago-exitoso.html`.

**Archivos modificados:** `turnos.controller.js`, `pagos.controller.js`, `pagos.routes.js`, `checkout-pago.html`, `pago-exitoso.html`, `pago-fallido.html`, `pago-pendiente.html`, `paciente.js`.

---

### Sprint 14 — Módulo de Pagos (Backoffice)
Habilitación a la secretaría y administradores de ver la trazabilidad y cancelar con reembolsos.
- **Backend:** `cancelarTurno` implementa reembolso automático si el `estado_pago` es 'pagado'.
- **Frontend:** Vista de Secretaría mejorada con columna "Pago", filtrado por estado de pago y alertas de reembolso en cancelación. Vista de Admin mejorada con modal "Editar Médico" para fijar precios y modalidad de cobro.

**Archivos modificados:** `turnos.controller.js`, `pagos.service.js`, `admin.controller.js`, `admin.routes.js`, `dashboard-secretaria.html`, `secretaria.js`, `dashboard-admin.html`, `admin.js`.

---

### Sprint 15 — Panel de Informes (Chart.js)
Incorporación de un motor de reportes básicos.
- **Backend:** Endpoints agregados en `/api/admin/informes` para series temporales y agrupación de estados.
- **Frontend:** Inclusión de `chart.min.js`. Gráficos de torta (turnos por estado) y barras (pagos) en el Panel de Administración.

**Archivos modificados:** `informes.controller.js`, `informes.routes.js`, `app.js`, `dashboard-admin.html`, `informes.js`.


