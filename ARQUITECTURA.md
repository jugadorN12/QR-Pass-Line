# ARQUITECTURA DEL SISTEMA

## 1. Stack Tecnológico
- **Frontend:** React 19 + TypeScript + Vite.
- **PWA:** `vite-plugin-pwa` con service worker para funcionamiento offline y cacheo de assets.
- **Backend & Base de datos:** Firebase (Authentication, Cloud Firestore, Firebase Hosting).
- **Lectura QR:** `html5-qrcode` con aceleración de hardware si el navegador lo soporta.
- **Generación QR:** `qrcode` con renderizado en Canvas HTML5.

## 2. Modelo de Datos (Firestore)
- `/users/{userId}`: Datos de perfil, roles (`admin`, `organizador`, `vendedor`, `canjeador`), `venueId`.
- `/venues/{venueId}`: Locales/establecimientos dados de alta.
- `/events/{eventId}`: Fechas/eventos, horario de apertura (`doorsOpen`), fecha y local asignado.
- `/qrCatalog/{qrId}`: Plantillas de cupones (duración, horarios damas/caballeros, imagen de fondo).
- `/limitations/{limitId}`: Cupo de cupones asignados a un RRPP para un período y días de semana específicos.
- `/tickets/{ticketId}`: Entrada generada con código único, titular, cantidad de personas, estado de canje (`redeemedAt`, `redeemedBy`).
- `/settings/{settingId}`: Configuración global del sistema.

## 3. Flujo Crítico de Operación
1. **Admin** crea Evento y asigna Limitación a RRPP (ej: 100 cupones de Damas válidos para el sábado).
2. **RRPP** entra a su panel, ingresa nombre del invitado y emite el QR.
3. Se descuenta del cupo disponible del RRPP y se genera un ticket único en `/tickets`.
4. El cliente presenta la imagen del QR en la puerta del local.
5. El **Canjeador** escanea el QR con la cámara del celular.
6. El sistema valida:
   - Que el código exista.
   - Que no haya sido canjeado antes (`redeemedAt == null`).
   - Que coincida con el local y el evento activo.
   - Que el horario de ingreso esté dentro del límite establecido (o solicita confirmación si está vencido).
7. Se actualiza el ticket en Firestore con la hora exacta y el personal que lo canjeó.

