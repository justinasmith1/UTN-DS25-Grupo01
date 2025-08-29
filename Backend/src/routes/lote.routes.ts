import { Router } from 'express';
import * as loteController from '../controllers/lote.controller';
import { validate } from '../middlewares/validation.middleware';
import { createLoteSchema, updateLoteSchema, getLoteSchema, deleteLoteSchema, queryLoteSchema } from '../validations/lote.validation';

const router = Router();

// GET /api/lotes
router.get('/', validate(getLoteSchema), loteController.obtenerTodos);

// GET /api/lotes/:id
router.get('/:id', validate(queryLoteSchema), loteController.obtenerLotePorId);

// POST /api/lotes
router.post('/', validate(createLoteSchema), loteController.crearLote);

// PUT /api/lotes/:id
router.put('/:id', validate(updateLoteSchema), loteController.actualizarLote);

// DELETE /api/lotes/:id
router.delete('/:id', validate(deleteLoteSchema), loteController.eliminarLote);

export const loteRoutes = router;
