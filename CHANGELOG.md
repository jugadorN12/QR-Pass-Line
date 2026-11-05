# REGISTRO DE CAMBIOS (CHANGELOG)

## [2026-11-05]
### Agregado
- **Arquitectura de Personalización Multi-Cliente (Theming Dinámico):**
  - Soporte de identidad visual por local sin duplicación de código ni creación de archivos HTML extras.
  - Paleta de colores personalizable en "Configuración del Local" con selector libre y presets rápidos: JOSEO Terrace (naranja neón / noche oscura), Cubano (azul medianoche original), Violeta Neón, y Verde Esmeralda.
  - Vista previa en tiempo real inmediata al seleccionar colores sin necesidad de guardar primero.
- **Rediseño Nocturno para Boliches (RoleSelectionPage):**
  - Fondo de noche profunda carbón/obsidiana (`#09080e`).
  - Tarjetas flotantes oscuras de grafito (`#14131b`) con bordes milimétricos y sombras 3D que eliminan los bloques blancos discordantes.
  - Botones de rol interactivos con efecto resplandor neón (`glow`) en el color de la marca del local al interactuar.
  - Selector de establecimiento y badges de estado integrados en la cabecera.

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
