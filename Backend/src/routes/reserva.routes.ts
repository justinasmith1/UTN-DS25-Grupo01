import { Router } from 'express';
import * as reservaController from '../controllers/reserva.controller';

// Creo una instancia del router de Express
const router = Router();

// ==============================
// Definicion de rutas para reservas
// ==============================

// Obtener todas las reservas
router.get('/', reservaController.getAllReservasController);

// Obtener una reserva por su ID
router.get('/:idReserva', reservaController.getReservaByIdController);

// Crear una nueva reserva
router.post('/', reservaController.createReservaController);

// Actualizar una reserva existente
router.put('/:idReserva', reservaController.updateReservaController);

// Eliminar una reserva
router.delete('/:idReserva', reservaController.deleteReservaController);

// Exporto las rutas para que puedan ser usadas en app.ts
export const reservaRoutes = router;
