# REGISTRO DE CAMBIOS (CHANGELOG)

## [2026-11-04]
### Corregido
- **Limitaciones de Vendedores:** Se desvinculó el componente `DoorsDateRangePicker` de los botones de días semanales (`L, M, X, J, V, S, D`). Ahora, al seleccionar un rango semanal en el calendario, no se sobrescriben los días habilitados de canje en boletería.
### Infraestructura
- Despliegue de la versión actualizada a Firebase Hosting (`https://qr-pass-line.web.app`).
### Documentación
- Creación de archivos base de gobernanza y seguimiento (`PROYECTO.md`, `ARQUITECTURA.md`, `DECISIONES.md`, `PENDIENTES.md`, `PROGRESO.md`, `CHANGELOG.md`).


### Seguridad
- **Reglas de Firestore (`firestore.rules`):**
  - Eventos (`/events`): creación, edición y borrado restringido a organizadores y administradores.
  - Entradas (`/tickets`): actualización limitada a personal con rol de canjeador (incluyendo usuarios con roles dobles como vendedor + canjeador) o administradores. Borrado restringido a administradores y organizadores.
### Rendimiento
- **Optimización de memoria en AppContext (`web/src/context/AppContext.tsx`):**
  - Implementación de ventana móvil de 45 días para la sincronización en vivo de tickets, reduciendo el consumo de RAM en celulares y optimizando costos en Firestore, con fallback automático transparente para tickets anteriores.

- **Seguridad en Contraseñas:**
  - Se eliminó el almacenamiento de contraseñas en texto plano (`tempPassword`) en los documentos de usuario de Firestore.
  - Se fijaron como definitivas las contraseñas actuales de todo el personal registrado, desactivando el cambio forzado de contraseña para evitar interrupciones operativas.

- **Privacidad entre RRPPs:**
  - Aislamiento en el servidor (`firestore.rules`) y en la aplicación (`AppContext.tsx`): los RRPPs puros solo pueden ver y consultar las entradas emitidas por ellos mismos, protegiendo las estadísticas y la competencia comercial entre compañeros.
