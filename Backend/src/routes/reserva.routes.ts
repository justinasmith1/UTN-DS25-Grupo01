// src/routes/reserva.routes.ts
import { Router } from 'express';
import * as reservaController from '../controllers/reserva.controller';
import { validate, validateParams } from '../middlewares/validation.middleware';
import * as v from '../validations/reserva.validation';

// Creo una instancia del router de Express
const router = Router();


// ==============================
// Definicion de rutas para reservas
// ==============================

// Obtener todas las reservas
router.get('/', reservaController.getAllReservasController);

// Obtener una reserva por su ID
router.get('/:id', validateParams(v.getReservaParamsSchema), reservaController.getReservaByIdController);

// Crear una nueva reserva
router.post('/', validate(v.createReservaSchema), reservaController.createReservaController);

// Actualizar una reserva existente
router.put('/:id', validateParams(v.getReservaParamsSchema), validate(v.updateReservaSchema), reservaController.updateReservaController);

// Eliminar una reserva
router.delete('/:id', validateParams(v.getReservaParamsSchema), reservaController.deleteReservaController);

export const reservaRoutes = router;