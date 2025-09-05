import { Router } from 'express';
import * as loteController from '../controllers/lote.controller';
import { validate, validateParams } from '../middlewares/validation.middleware';
import { createLoteSchema, updateLoteSchema, getLoteSchema, deleteLoteSchema, queryLoteSchema } from '../validations/lote.validation';

const router = Router();

// GET /api/lotes
router.get('/', loteController.obtenerTodos);

// GET /api/lotes/:id
router.get('/:id', validateParams(getLoteSchema), loteController.obtenerLotePorId);

// POST /api/lotes
router.post('/', validate(createLoteSchema), loteController.crearLote);

// PUT /api/lotes/:id
router.put('/:id', validate(updateLoteSchema), loteController.actualizarLote);

// DELETE /api/lotes/:id
router.delete('/:id', validateParams(deleteLoteSchema), loteController.eliminarLote);

export const loteRoutes = router;
