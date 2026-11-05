# PENDIENTES Y OPORTUNIDADES DE MEJORA

## 1. Seguridad (Alta prioridad)
- [ ] **Endurecer reglas de Firestore (`firestore.rules`):**
  - Actualmente cualquier usuario autenticado (incluso un RRPP) puede actualizar o eliminar documentos en `/tickets` y `/events`.
  - Solo los roles `canjeador`, `admin` y `organizador` deben poder actualizar el estado de canje de un ticket.
- [ ] **Eliminar almacenamiento de contraseñas temporales en texto plano:**
  - En `AppContext.tsx` se guarda el campo `tempPassword` en el documento del usuario en Firestore. Como las reglas permiten leer `/users` a cualquier usuario autenticado, cualquier vendedor podría leer contraseñas ajenas.
- [ ] **Remover correo hardcodeado en reglas:**
  - En `firestore.rules` está escrito fijo `simplemente_anibal@hotmail.com`. Debería gestionarse mediante Custom Claims de Firebase Auth o roles en base de datos.

## 2. Rendimiento y Carga en Puerta (Media / Alta prioridad)
- [ ] **Modo Ráfaga de escaneo en puerta:**
  - Evitar pausar la cámara y mostrar modales a pantalla completa que exijan tocar "Continuar" 1.700 veces. Reemplazar por banner flotante y audio/vibración sin congelar la cámara.
- [ ] **Soporte plug-and-play para pistolas lectoras QR Bluetooth:**
  - Mantener el foco automático en el campo de entrada manual para que las pistolas físicas lean en 0,05s en total oscuridad.
- [ ] **Segmentar la descarga de tickets (`onSnapshot`):**
  - Actualmente se descargan TODOS los tickets históricos de la colección. Conforme pasen los meses, esto saturará la memoria del teléfono. Filtrar por fecha activa o evento actual.
- [ ] **Reducir framerate de la cámara (de 30 FPS a 15-20 FPS):**
  - Previene que el teléfono del canjeador levante temperatura y empiece a trabarse tras 20 minutos de escaneo continuo.

## 3. UI/UX
- [ ] **Botón de linterna (Torch) en el escáner de puerta:**
  - Para iluminar códigos impresos o enfocar pantallas con bajo brillo en veredas oscuras.
- [ ] **División de código (Code Splitting):**
  - El archivo `GatePage` y el bundle principal superan los 500 KB; cargarlo bajo demanda para acelerar el inicio en 4G.
