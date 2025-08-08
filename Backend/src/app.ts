import express from 'express';
import loteRoutes from './routes/lote.routes';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api/lotes', loteRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
