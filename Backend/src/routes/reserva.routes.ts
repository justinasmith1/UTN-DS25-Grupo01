// src/routes/reserva.routes.ts
import { Router } from 'express';
import * as reservaController from '../controllers/reserva.controller';
import { validate, validateParams, validateQuery } from '../middlewares/validation.middleware';

import {
  createReservaSchema,
  updateReservaSchema,
  getReservaParamsSchema,
  queryReservasSchema
} from '../validations/reserva.validation';

// Creo una instancia del router de Express
const router = Router();


// ==============================
// Definicion de rutas para reservas
// ==============================

// Obtener todas las reservas
router.get('/', validateQuery(queryReservasSchema), reservaController.getAllReservasController);

// Obtener una reserva por su ID
router.get('/:id',validateParams(getReservaParamsSchema, { idReserva: 'id' }), reservaController.getReservaByIdController);

// Crear una nueva reserva
router.post('/',validate(createReservaSchema),reservaController.createReservaController);

// Actualizar una reserva existente
router.put('/:id',validateParams(getReservaParamsSchema, { idReserva: 'id' }), validate(updateReservaSchema),reservaController.updateReservaController);

// Eliminar una reserva
router.delete('/:id',validateParams(getReservaParamsSchema, { idReserva: 'id' }),reservaController.deleteReservaController);

export const reservaRoutes = router;