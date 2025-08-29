import { Router } from 'express';
import * as ventaController from '../controllers/venta.controller';
import { validate } from '../middlewares/validation.middleware';
import { createVentaSchema, updateVentaSchema, getVentaSchema, deleteVentaSchema, queryVentaSchema } from '../validations/venta.validation';

const router = Router();

// GET /api/ventas
router.get('/', validate(getVentaSchema), ventaController.obtenerTodos);

// GET /api/ventas/:id
router.get('/:id',validate(queryVentaSchema), ventaController.obtenerVentaPorId);

// POST /api/ventas
router.post('/', validate(createVentaSchema), ventaController.crearVenta);

// PUT /api/ventas/:id
router.put('/:id', validate(updateVentaSchema), ventaController.actualizarVenta);

// DELETE /api/ventas/:id
router.delete('/:id', validate(deleteVentaSchema), ventaController.eliminarVenta);

export const ventaRoutes = router;