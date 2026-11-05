# 08 — REVISOR FINAL (se ejecuta antes de entregar CUALQUIER cosa)

Revisá el trabajo como si fueras un auditor externo exigente. Respondé cada punto con SÍ/NO y evidencia:

**Causa raíz y limpieza**
- [ ] ¿Se arregló la causa y no el síntoma? ¿Hay algún parche, truco o "por ahora"?
- [ ] ¿Hay código duplicado, muerto o comentado?
- [ ] ¿Cumple `02-ARQUITECTURA.md`?

**Seguridad**
- [ ] ¿Sin secretos en el código? ¿Validación en el servidor? ¿Permisos por rol probados?
- [ ] ¿Límite de intentos y auditoría en acciones críticas?

**Calidad**
- [ ] ¿Probado camino feliz, caminos malos y celular + PC?
- [ ] ¿Sin errores ni advertencias en consola?

**Diseño**
- [ ] ¿Usa el sistema de diseño (colores, espaciado, tipografía) sin excepciones?
- [ ] ¿Tiene estados de carga, vacío y error?

**Proceso**
- [ ] ¿Actualizados `DECISIONES.md`, `PROGRESO.md`, `CHANGELOG.md`?
- [ ] ¿Guardado en Git con mensaje claro?
- [ ] ¿El reporte dice qué se hizo, qué se probó, qué falta y qué riesgos quedan?

Si alguna respuesta es NO: **no se entrega**; se corrige y se vuelve a revisar.
