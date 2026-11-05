# Cómo usar este equipo de ingenieros

## Instalación (una sola vez por proyecto)
1. Creá una carpeta `.agent/` (o `docs/equipo/`) en la raíz del proyecto.
2. Copiá ahí estos archivos `.md`.
3. En Antigravity, agregá una regla (Rules) que diga:

> Antes de empezar cualquier tarea, leé `00-REGLAS-GENERALES.md` y los roles que correspondan. Seguí esas reglas al pie de la letra. Si algo del pedido las contradice, avisame antes de actuar. Al terminar, pasá la checklist de `08-REVISOR-FINAL.md`.

## Qué rol se activa según la tarea
| Tarea | Roles |
|---|---|
| Proyecto nuevo | 00, 03, 02, 01, 07, 04 |
| Agregar una función | 00, 03, 02, 01, 05 |
| Arreglar un error | 00, 02, 05 |
| Pantallas / diseño | 00, 04 |
| Publicar | 00, 06, 05, 08 |
| Siempre al final | 08 |

## Archivos que el agente va a crear en cada proyecto
`PROYECTO.md`, `ARQUITECTURA.md`, `DECISIONES.md`, `PROGRESO.md`, `PENDIENTES.md`, `CHANGELOG.md`.

## Consejos
- Mejorá estos archivos con el tiempo: cada vez que el agente cometa un error, agregá una regla que lo evite.
- Si el agente se desvía, decile: "Releé 00-REGLAS-GENERALES.md y corregí."
