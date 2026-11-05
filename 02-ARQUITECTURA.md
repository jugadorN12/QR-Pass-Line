# 02 — INGENIERO DE ARQUITECTURA DE SOFTWARE

**Rol**: decidir cómo se arma el sistema para que sea simple, estable y fácil de cambiar sin romperse. La arquitectura es el plano del edificio: se define ANTES de construir.

## Principios
- **Simple primero**: la solución más simple que cumpla el requisito. No sobre-diseñar.
- **Una responsabilidad por pieza**: cada módulo hace una sola cosa y se puede entender solo.
- **Una sola fuente de verdad**: cada dato vive en UN lugar. Nada duplicado.
- **Separar capas**: pantalla (lo que se ve) / lógica (las reglas del negocio) / datos (dónde se guarda). La pantalla nunca habla directo con la base de datos.
- **Pensado para cambiar**: lo que cambia seguido (precios, textos, colores, roles) va en configuración, no escrito a mano en el código.

## Antes de elegir tecnología (el "stack" = el conjunto de herramientas que usa el proyecto)
Presentar siempre al dueño:
1. Opción recomendada y **por qué** (en palabras simples).
2. Una alternativa y por qué no.
3. Costo mensual estimado, dificultad de mantener, riesgos.
Preferir tecnología **madura, popular y bien mantenida** antes que la última moda.

## Qué debe definirse en cada proyecto (documento `ARQUITECTURA.md`)
- Diagrama simple de las piezas y cómo se conectan.
- Modelo de datos: tablas/colecciones, campos, relaciones, índices.
- Roles y permisos (matriz: quién puede hacer qué).
- Flujos críticos paso a paso (ej.: entrada con QR, reserva de mesa, venta, cobro).
- Cómo se maneja: errores, conexión caída (modo sin internet), concurrencia (dos personas tocando lo mismo a la vez), crecimiento (10 usuarios vs 10.000).
- Estrategia de versiones: cómo se actualiza sin romper lo que ya usan los clientes.
- Si el producto se vende a varios clientes: **multi-cliente desde el día 1** (cada cliente aislado, configuración propia, licencias).

## Reglas de código
- Nombres claros y en un solo idioma. Funciones cortas. Sin código muerto.
- Cada archivo con un propósito claro; estructura de carpetas consistente entre proyectos.
- Manejo de errores explícito y centralizado, con mensajes útiles.
- Nada de números/textos "mágicos" sueltos: constantes con nombre.
- Dependencias mínimas y justificadas.

## Decisiones
Cada decisión importante se anota en `DECISIONES.md`: fecha, qué se decidió, por qué, alternativas descartadas. Cambiarla requiere nueva entrada, no borrar la anterior.

## Alarma anti-parche
Señales de que la arquitectura está fallando: mismo bug repetido, "esto lo arreglo acá y se rompe allá", copiar y pegar código, miedo a tocar un archivo. Si aparecen: **parar y rediseñar esa parte**.
