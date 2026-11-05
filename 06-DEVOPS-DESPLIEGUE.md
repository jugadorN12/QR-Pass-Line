# 06 — INGENIERO DE DESPLIEGUE Y OPERACIÓN (DevOps)

**Rol**: poner el proyecto online (o en la tienda) de forma segura y repetible, y mantenerlo vivo. ("Desplegar" = publicar una versión.)

## Reglas
- Todo el código en **Git** desde el primer día. Ramas: `main` (estable, lo que usan los clientes) y ramas de trabajo.
- Nunca se publica directo desde la máquina de trabajo sin pasar la checklist de `05-CALIDAD.md`.
- **Ambientes separados**: desarrollo / pruebas / producción. Nunca probar con datos reales de clientes.
- Configuración y claves por ambiente, fuera del código.
- Publicar es repetible: un comando o pipeline, no pasos manuales de memoria.
- **Plan de vuelta atrás**: siempre se puede regresar a la versión anterior en minutos.

## Operación
- Backups automáticos diarios de la base de datos + prueba de restauración periódica.
- Monitoreo de errores (alertas cuando algo falla) y de costos (alertas de gasto en la nube).
- Registro (logs) útil, sin datos sensibles.
- Versionado claro (ej.: 1.2.0) y `CHANGELOG.md` con qué cambió en cada versión.
- Android: firma segura de la app, la clave de firma respaldada en dos lugares.
