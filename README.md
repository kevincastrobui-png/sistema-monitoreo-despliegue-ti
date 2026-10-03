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
La contraseña administrativa está incluida en JavaScript del lado del cliente.
Esto es válido para demostración o uso local, pero no para un entorno corporativo
con requisitos reales de seguridad. En producción, la autenticación debe hacerse
desde un servidor/backend.
