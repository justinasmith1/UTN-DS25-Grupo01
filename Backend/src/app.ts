import express from 'express';
import { lotesRoutes } from './routes/lote.routes';

import { logRequest } from './middlewares/logger.middleware';
import { handleError } from './middlewares/error.middleware';
import cors from 'cors';
import { usuarioRoutes } from './routes/usuario.routes';
import { reservaRoutes } from './routes/reserva.routes';
import {inmobRoutes} from './routes/inmobiliaria.routes';
import {ventaRoutes} from "./routes/ventas.routes"

const app = express();
const PORT = 3000;

app.use(cors({
  origin: '*', // Permitir todas las solicitudes CORS
}));

// Middlewares globlales
app.use(express.json());
app.use(logRequest);

// Error handling middleware
app.use(handleError);

app.use('/api/lotes', lotesRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/reservas", reservaRoutes);
app.use("/api/inmobiliarias", inmobRoutes)
app.use("/api/ventas", ventaRoutes)

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
