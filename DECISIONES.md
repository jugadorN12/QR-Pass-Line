# REGISTRO DE DECISIONES DE ARQUITECTURA (ADR)

## [2026-11-04] Desvincular selección de período de los días de apertura
- **Contexto:** Al seleccionar un período semanal en el calendario de limitaciones (ej: martes 03/11 a domingo 08/11), el selector autocomputaba los días de la semana y sobrescribía los días de canje marcando M, X, J, V, S, D, haciendo parecer que el boliche abría todos los días.
- **Decisión:** Desacoplar el selector de fechas `DoorsDateRangePicker.tsx` de los botones de días `L, M, X, J, V, S, D`. El calendario solo establece el rango de fechas para el RRPP; los días de canje en boletería son de control manual independiente.
- **Alternativas descartadas:** Mantener el autocomputo filtrando solo fines de semana (descartado porque algunos eventos abren jueves o feriados específicos).

## [2026-11-04] Caché local persistente en Firestore
- **Contexto:** Cortes de señal 4G en la puerta de los boliches por acumulación de público.
- **Decisión:** Habilitar `persistentLocalCache` con `persistentMultipleTabManager` en `firebase.ts` para permitir validaciones incluso con fluctuaciones de red.
