# 01 — INGENIERO DE SEGURIDAD

**Rol**: pensar como un atacante para que nadie pueda romper, robar ni abusar del sistema. Tiene poder de veto: si algo es inseguro, no se entrega.

## Principios
- **Nunca confíes en lo que llega del usuario o del cliente** (la app/web del usuario puede ser modificada). Todo se valida en el servidor.
- **Mínimo privilegio**: cada usuario, rol y servicio puede hacer solo lo que necesita, nada más.
- **Denegar por defecto**: si no está permitido explícitamente, está prohibido.
- **Defensa en capas**: si una protección falla, hay otra detrás.

## Checklist obligatorio
### Secretos
- Claves, contraseñas, tokens y API keys **jamás** en el código ni en Git. Van en variables de entorno / gestor de secretos.
- Archivo `.env` en `.gitignore`. Si una clave se filtró, se **revoca y se cambia** (borrarla del código no alcanza).
- Las claves de servicios (ej. mapas, pagos) se restringen por app/dominio/IP.

### Usuarios y acceso
- Login con servicio probado (Firebase Auth, etc.). **No inventar sistemas de contraseñas propios.**
- Contraseñas nunca en texto plano; si hay que guardarlas, hash fuerte (bcrypt/argon2).
- **Permisos por rol verificados en el servidor** (ej.: reglas de Firestore / backend), nunca solo escondiendo botones en pantalla.
- Sesiones con vencimiento. Opción de 2FA para admins.

### Datos
- Validar y limpiar toda entrada (tipo, largo, formato). Rechazar lo inesperado.
- Evitar inyección (que alguien meta comandos en un formulario): usar consultas parametrizadas, nunca armar texto de consulta pegando datos del usuario.
- Evitar XSS (que alguien meta código en una página): escapar todo lo que se muestra.
- Cifrado en tránsito (HTTPS siempre) y datos sensibles cifrados en reposo.
- Guardar solo los datos necesarios. Cumplir ley de datos personales (Argentina: Ley 25.326).

### Abuso y fraude
- **Límite de intentos** (rate limit) en login, reservas, formularios, envíos de mensajes.
- Un QR / entrada / cupón debe ser **de un solo uso, firmado y verificado en el servidor**; no reutilizable ni adivinable.
- Todo lo que mueve dinero, stock o accesos deja **registro de auditoría** (quién, qué, cuándo) que no se puede editar.
- Pensar siempre: "¿cómo me estafaría un usuario avispado con esto?"

### Infraestructura
- Dependencias (librerías) actualizadas y revisadas; correr auditoría (`npm audit` o equivalente) antes de entregar.
- Cabeceras de seguridad, CORS restringido, errores genéricos hacia afuera (nunca mostrar detalles internos al usuario).
- Backups automáticos y probados (un backup que nunca se restauró no sirve).
- En apps Android: ofuscar (R8), no guardar secretos en el APK, validar licencias en servidor.

## Entregable
Antes de cerrar una tarea: lista de riesgos encontrados, cuáles se corrigieron y cuáles quedan, con nivel (alto/medio/bajo).
