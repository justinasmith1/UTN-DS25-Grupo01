# 📂 Backend - Club de Campo La Federala

Este directorio contiene la parte **Backend** del sistema de gestión del Club de Campo *La Federala*.  
Se implementa con **Node.js + TypeScript + Prisma ORM**, siguiendo una arquitectura modular y escalable.

---

## 🗂️ Estructura de carpetas

### `documents/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/documents]
Carpeta utilizada para almacenar documentos de referencia relacionados al proyecto.
- `MetodosDashboard.jpeg` / `MetodosSidePanel.jpeg`: capturas de interfaz y propuestas de diseño.
- `RelevamientoAPIs-Backend.pdf`: documento de relevamiento de APIs.

---

### `prisma/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/prisma]
Contiene todo lo relacionado con **Prisma ORM**:
- `schema.prisma`: definición del modelo de datos y las relaciones.
- `migrations/`: historial de migraciones generadas por Prisma.

---

### `src/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/src]
Código fuente del backend. Aquí se concentra toda la lógica de negocio y configuración.

#### `config/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/src/config]
- `prisma.ts`: inicializa y exporta la conexión de **Prisma Client** para ser reutilizada en los servicios.

#### `controllers/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/src/controllers]
Controladores que reciben las solicitudes HTTP y delegan la lógica al servicio correspondiente.  
Ejemplos:
- `inmobiliaria.controller.ts`
- `lote.controller.ts`
- `reserva.controller.ts`
- `usuario.controller.ts`
- `venta.controller.ts`


#### `middlewares/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/src/middlewares]
Funciones intermedias que se ejecutan antes o después de los controladores:
- `error.middleware.ts`: manejo centralizado de errores.
- `logger.middleware.ts`: registro de peticiones.
- `validation.middleware.ts`: validación de datos entrantes.

#### `routes/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/src/routes]
Definición de las rutas de la API y su asociación con los controladores:
- `inmobiliaria.routes.ts`
- `lote.routes.ts`
- `reserva.routes.ts`
- `usuario.routes.ts`
- `ventas.routes.ts`

#### `services/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/src/services]
Implementación de la lógica de negocio y acceso a datos mediante Prisma.  
Ejemplos:
- `inmobiliaria.service.ts`
- `lote.service.ts`
- `reserva.service.ts`
- `usuario.service.ts`
- `venta.service.ts`

#### `types/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/src/types]
Definiciones de tipos y contratos de datos en **TypeScript**.
- `interfacesCCLF.d.ts`: interfaces compartidas dentro del backend.

#### `validations/` [https://github.com/justinasmith1/UTN-DS25-Grupo01/tree/main/Backend/src/validations]
Esquemas de validación (generalmente con **Zod** o librerías similares) para garantizar datos correctos antes de pasar al servicio.
- `inmobiliaria.validation.ts`
- `lote.validation.ts`
- `reserva.validation.ts`
- `usuario.validation.ts`
- `venta.validation.ts`

---

### `app.ts`
Punto de entrada principal del backend.  
Configura middlewares, rutas y levanta el servidor.

---

## 🚀 Flujo general de la aplicación
1. El **usuario** hace una petición HTTP → `routes/`.
2. La ruta invoca el **controller** correspondiente.
3. El controller delega la lógica al **service**.
4. El service interactúa con **Prisma Client** (`config/prisma.ts`) y devuelve los datos.
5. El **middleware** se encarga de validar, loggear o manejar errores según corresponda.

---

## Grupo 01 - Desarrollo de Software - S33
Egüen Agustina, Pascucci Agostina, Perez Nicolas, Smith Justina, Talavera Santiago