# PROYECTO: QR Pass Line

## 1. Objetivo en una frase
Plataforma web/PWA para boliches y eventos que gestiona la asignación de cupones a RRPPs, la emisión de entradas QR personalizadas y la validación en tiempo real en la puerta de acceso.

## 2. Usuarios y Roles
- **Master Admin (`simplemente_anibal@hotmail.com`):** Control total de la plataforma, locales, organizadores y configuración global.
- **Admin / Organizador:** Crea eventos, administra el catálogo de cupones, define limitaciones por RRPP y consulta informes de ventas y canjes.
- **RRPP / Vendedor:** Emite entradas con QR a clientes dentro de su cupo asignado y fechas vigentes.
- **Canjeador / Personal de puerta:** Escanea y valida los códigos QR en boletería/acceso en vivo.

## 3. Alcance de Funciones
### Obligatorias (v1 - Actual)
- Autenticación con Firebase Auth.
- Gestión de eventos, locales (venues) y catálogo de cupones.
- Asignación de limitaciones semanales a vendedores (cupo, fechas, días válidos).
- Emisión de entradas con QR único e intransferible (individuales y multi-cupón damas/caballeros).
- Canje en puerta con validación de horarios, tolerancias y excepciones.
- Informes de canje y lecturas en tiempo real.

### Deseables (v2 - Próximas mejoras)
- Modo ráfaga continuo en puerta optimizado para eventos de +1.500 personas.
- Soporte nativo para pistolas lectoras QR Bluetooth (modo teclado).
- Endurecimiento de reglas de Firestore por rol y eliminación de contraseñas temporales en texto plano.
- Filtrado de tickets por evento/fecha activa para reducir consumo de memoria y costos en Firestore.

## 4. Riesgos y Supuestos
- **Conectividad en puerta:** Con más de 1.000 personas, la red 4G se satura; la app debe responder desde caché local.
- **Crecimiento de base de datos:** La descarga de todos los tickets históricos sin filtro saturará la memoria del celular en pocos meses.

