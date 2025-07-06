# Frontend

Se implementan las paginas de Mapa, Dashboard, User y Detalle completo de un Lote mediante las tecnologias de React 19.1.0 y React-Bootstrap 
como libreria UI seleccionada.
Se emplea una estructura profesional de archivos organizada en carpetas separadas para componentes, pages y lib para datos de simulacion.
Se utiliza React router configurado utilizando rutas anidadas, donde Map.jsx y Dashboard.jsx son manejadas por la route padre Layout.jsx.
En esta etapa no se utilizan conexiones con APIs.

## Detalle de elementos
- En la pagina de Mapa (Map.jsx) se visualiza el mapa donde se puede seleccionar un lote, donde se pueden realizar ciertas acciones sobre este como visualizar la informacion asociada.
- En la pagina de Dashboard se visualiza una vista centrada en la gestion de los lotes y su informacion, donde se detalla un listado de todos ellos junto a accesos directos para la modificacion, eliminacion del mismo o consulta de sus datos, utilizando formularios.
- Los formularios utilizados presentan un modo de creacion y edicion en cuanto se necesite dicha funcionalidad, estos mismos hacen uso de efectos para inicializarse cuando se cambie de "modo".
- En el componente Layout se invocan a los componentes comunes a todas las paginas junto variables de estado globales para la informacion de los lotes y guardado de filtros a aplicar, ademas de manejadores para los componentes (utilizados para mostrar u ocultar el componente cuando corresponda).
