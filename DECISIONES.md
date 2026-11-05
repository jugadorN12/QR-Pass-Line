# REGISTRO DE DECISIONES DE ARQUITECTURA (ADR)

## [2026-11-04] Desvincular selección de período de los días de apertura
- **Contexto:** Al seleccionar un período semanal en el calendario de limitaciones (ej: martes 03/11 a domingo 08/11), el selector autocomputaba los días de la semana y sobrescribía los días de canje marcando M, X, J, V, S, D, haciendo parecer que el boliche abría todos los días.
- **Decisión:** Desacoplar el selector de fechas `DoorsDateRangePicker.tsx` de los botones de días `L, M, X, J, V, S, D`. El calendario solo establece el rango de fechas para el RRPP; los días de canje en boletería son de control manual independiente.
- **Alternativas descartadas:** Mantener el autocomputo filtrando solo fines de semana (descartado porque algunos eventos abren jueves o feriados específicos).

## [2026-11-04] Caché local persistente en Firestore
- **Contexto:** Cortes de señal 4G en la puerta de los boliches por acumulación de público.
- **Decisión:** Habilitar `persistentLocalCache` con `persistentMultipleTabManager` en `firebase.ts` para permitir validaciones incluso con fluctuaciones de red.


## [2026-11-04] Endurecimiento de Reglas de Seguridad en Firestore
- **Contexto:** Las colecciones `/events` y `/tickets` permitían creación, edición y borrado a cualquier usuario autenticado, dejando expuesta la anulación o alteración de tickets y eventos por parte de RRPPs.
- **Decisión:** 
  1. Restringir `/events` para que solo organizadores y administradores (`isOrganizerOrAdmin()`) puedan crear, modificar o borrar fechas.
  2. En `/tickets`, permitir que los vendedores creen tickets (`allow create: if signedIn();`), pero restringir la actualización exclusivamente a quienes posean el rol de puerta o administración (`isCanjeador()`), soportando tanto usuarios con rol primario como con roles combinados (`'canjeador' in userDoc().roles`).
  3. El borrado de tickets se reserva exclusivamente a administradores y organizadores.
- **Alternativas descartadas:** Restringir lectura de tickets por vendedor (descartado temporalmente para no quebrar pantallas de informes y validaciones en puerta).

## [2026-11-04] Ventana móvil de sincronización de tickets (45 días)
- **Contexto:** El listener en tiempo real `onSnapshot` descargaba la totalidad de los tickets históricos de Firestore, consumiendo memoria RAM del dispositivo y aumentando lecturas innecesarias en eventos de alta concurrencia (+1.700 personas).
- **Decisión:** Limitar la escucha activa en tiempo real a tickets emitidos en los últimos 45 días (`where('issuedAt', '>=', recentCutoffIso)`), combinando en memoria cualquier ticket escaneado fuera de ventana mediante el buscador por código directo (`where('code', '==', normalizedCode)`).
- **Garantía:** Los cupones de la fecha actual y de las semanas recientes se cargan al instante; cupones más antiguos se resuelven en milisegundos bajo demanda sin bloquear la puerta.

## [2026-11-04] Eliminación de texto plano en contraseñas y desactivación de cambio forzado
- **Contexto:** Se guardaba el campo `tempPassword` en texto plano en la colección `/users` de Firestore y se marcaba `mustChangePassword: true`, lo cual exponía contraseñas y podía forzar a usuarios en producción a tener que crear claves nuevas.
- **Decisión:**
  1. Las contraseñas de todos los usuarios registrados quedan como definitivas y permanentes en Firebase Auth.
  2. Se desactiva el cartel forzado (`mustChangePassword: false`) para no interrumpir el flujo operativo de ningún RRPP ni personal de puerta.
  3. Se elimina y limpia el campo `tempPassword` de Firestore para que las contraseñas nunca queden guardadas en texto plano en la base de datos.
