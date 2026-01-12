// server.ts
import app  from './app';
import cron from 'node-cron';
import { runExpirations } from './jobs/runExpirations';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);

    // Cron job: Ejecutar expiraciones cada hora
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Ejecutando verificación de expiraciones...');
        try {
            await runExpirations();
        } catch (error) {
            console.error('[CRON] Error en job de expiraciones:', error);
        }
    });
    console.log('[CRON] Scheduler iniciado: Verificación de expiraciones programada cada hora (0 * * * *)');
});