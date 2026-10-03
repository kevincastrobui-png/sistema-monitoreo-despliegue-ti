# Despliegue IT - Control Corporativo

## Archivos
- `index.html`: estructura de la interfaz.
- `styles.css`: diseño visual y temas.
- `script.js`: lógica, validaciones, almacenamiento, monitoreo y gráficas.

## Uso
1. Mantenga los tres archivos dentro de la misma carpeta.
2. Abra `index.html` en un navegador moderno.
3. Se requiere conexión a Internet para cargar Chart.js desde CDN.
4. Los registros se guardan en `localStorage` del navegador.

## Nota de seguridad
La versión pública no contiene contraseñas, claves ni credenciales reales.
El modo administrador funciona como una demostración local para permitir la revisión
de las funciones de edición y eliminación del prototipo. No debe considerarse un
mecanismo de autenticación para producción. En una implementación real, la
autenticación y autorización deben gestionarse desde un servidor/backend.

## Bucle de procesamiento
La vista de Monitoreo incorpora un procesamiento mediante bucles `for` en JavaScript.
El primer bucle recorre los registros del periodo seleccionado y acumula cantidades por
modelo y estado; el segundo bucle construye dinámicamente las filas del resumen mostrado
en pantalla. Esto permite que la tabla se actualice automáticamente cuando se agregan,
modifican o filtran registros.
