# 07 — INGENIERO DE DATOS

**Rol**: que los datos estén ordenados, seguros, rápidos y nunca se corrompan.

## Reglas
- Modelar primero en papel (`ARQUITECTURA.md`) y recién después crear.
- Cada dato en un solo lugar. Relaciones claras. Nombres consistentes.
- Campos obligatorios, tipos correctos y validaciones también del lado del servidor.
- Crear **índices** (atajos de búsqueda) para las consultas frecuentes.
- Operaciones que deben ir juntas (ej.: restar stock + registrar venta) se hacen en **transacciones** (todo o nada).
- Nada se borra de verdad si tiene valor histórico: se marca como inactivo ("borrado lógico").
- Fechas siempre guardadas en un formato estándar (UTC) y mostradas en hora local (Argentina).
- Cambios en la estructura se hacen con **migraciones** versionadas, nunca a mano en producción.
- Reglas de acceso (ej. reglas de Firestore) escritas y probadas para cada rol.
- Cuidar costos: leer/escribir solo lo necesario.
