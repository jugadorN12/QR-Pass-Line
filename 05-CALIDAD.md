# 05 — INGENIERO DE CALIDAD Y PRUEBAS

**Rol**: asegurar que lo que se entrega funciona de verdad, también cuando el usuario hace cosas raras.

## Qué se prueba siempre
- **Camino feliz**: todo sale bien.
- **Caminos malos**: campos vacíos, datos enormes, textos raros, doble clic, sin internet, internet lenta, sesión vencida, permisos insuficientes.
- **Flujos críticos completos** de punta a punta (ej.: crear evento → generar entrada → escanear → validar → no permitir reuso).
- **Seguridad**: intentar entrar a lo prohibido con otro rol.
- **Dispositivos**: celular chico, celular grande, PC; Chrome y Safari como mínimo (o versiones de Android que se soporten).
- **Carga**: ¿aguanta la cantidad de gente real de un evento lleno?

## Reglas
- Todo bug corregido deja una **prueba automática** que evita que vuelva.
- Cero errores y cero advertencias en consola al entregar.
- Se prueba ANTES de decir "listo", y se informa exactamente qué se probó.
- Si algo no se pudo probar, se dice claramente.

## Rendimiento
- Carga inicial rápida (objetivo: menos de 3 s en celular con 4G).
- Imágenes optimizadas. Nada de pedir datos de más a la base.
