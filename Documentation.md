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
- **UI/UX:** CSS nativo (Variables, Flexbox, Grid), sin frameworks pesados para máxima performance.

### Backend
- **Entorno:** Node.js.
- **Framework:** Express.js.
- **Base de Datos:** PostgreSQL.
- **Librerías Clave:** `pg` (driver BD), `jsonwebtoken` (Auth), `bcryptjs` (Seguridad), `multer` + `cloudinary` (Archivos).

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
│   │   ├── controllers/ (auth, admin, medicos, etc.)
│   │   ├── middleware/ (auth.js, roles.js, upload.js)
│   │   ├── routes/ (endpoints de la API)
│   │   ├── services/ (lógica de negocio extra)
│   │   └── app.js
│   ├── sql/ (scripts de creación de BD)
│   └── index.js (Punto de entrada)
├── frontend/
│   └── public/
│       ├── css/
│       ├── js/ (api.js, admin.js, medico.js, paciente.js)
│       └── *.html (Vistas)
└── package.json
```

## 2.4 Endpoints de la API REST (Resumen)

| Método | Endpoint | Descripción | Acceso |
|---|---|---|---|
| POST | `/api/auth/login` | Autenticación | Público |
| POST | `/api/auth/registro` | Alta de pacientes | Público |
| GET | `/api/admin/auditoria` | Ver logs del sistema | Admin |
| GET | `/api/turnos/mis-turnos` | Lista de turnos | Paciente/Médico |
| POST | `/api/turnos` | Reserva un turno | Paciente |
| POST | `/api/archivos` | Subida de estudios/recetas | Médico |
| GET | `/api/historias/:id` | Ver historial de paciente | Paciente/Médico |

---

# SECCIÓN 3 – Diseño UI/UX

## 3.1 Principios de Diseño
- **Mobile First:** Componentes diseñados para colapsar suavemente en pantallas pequeñas.
- **Minimalismo y Contraste:** Uso de fondos oscuros (Dark Mode nativo/opcional) con acentos vibrantes para llamar la atención a las acciones primarias (Primary Buttons).
- **Feedback visual:** Alertas, modales, y cambios de color (rojo para peligro, verde para éxito) en botones de acción.

## 3.2 Paleta de Colores
| Token | Valor | Uso |
|---|---|---|
| `--bg-dark` | `#0f172a` | Fondo principal de la aplicación |
| `--surface-dark` | `#1e293b` | Tarjetas, formularios y modales |
| `--primary-color` | `#3b82f6` | Botones principales, enlaces |
| `--danger-color` | `#ef4444` | Acciones destructivas (Eliminar, Inactivar) |
| `--success-color` | `#10b981` | Confirmaciones y estados Activos |
| `--text-primary` | `#f8fafc` | Texto principal |

## 3.3 Flujo de Navegación
```
Landing / Login 
  ├─► Registro
  └─► [Autenticación]
        ├─► Dashboard Paciente (Ver Turnos, Nueva Reserva, HCE)
        ├─► Dashboard Médico (Agenda Diaria, Carga de HCE, Subida de Archivos)
        └─► Dashboard Admin (Especialidades, Médicos, Pacientes, Auditoría)
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
1. El médico atiende el turno.
2. Ingresa a "Cargar Evolución".
3. Escribe diagnóstico y receta (`POST /api/historias`).
4. Sube un archivo PDF o JPG.
5. El middleware de `multer` captura el archivo en memoria, lo sube a la API de **Cloudinary**.
6. Cloudinary devuelve una URL pública que se guarda en la tabla `archivos_adjuntos` de la BD.

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
- `pacientes` / `medicos`: Perfiles extendidos asociados a un `usuario_id`.
- `especialidades`: Áreas médicas.
- `turnos`: Relaciona paciente, médico, fecha y estado.
- `historia_clinica`: Evoluciones médicas ligadas a un turno y paciente.
- `archivos_adjuntos`: URLs de recursos subidos a la nube.
- `logs_auditoria`: Registro automático e inmutable de cambios en la BD.
