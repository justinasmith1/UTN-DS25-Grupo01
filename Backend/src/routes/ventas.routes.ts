import { Router } from 'express';
import * as ventaController from '../controllers/venta.controller';
import { validate, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { z } from 'zod';
import { createVentaSchema, updateVentaSchema, getVentaSchema, deleteVentaSchema, queryVentaSchema } from '../validations/venta.validation';

const router = Router();

// GET /api/ventas
router.get('/', ventaController.obtenerTodos);

// GET /api/ventas/:id
router.get('/:id',validateParams(getVentaSchema), ventaController.obtenerVentaPorId);

// POST /api/ventas
router.post('/', validate(createVentaSchema), ventaController.crearVenta);

// PUT /api/ventas/:id
router.put('/:id', validateParams(updateVentaSchema), ventaController.actualizarVenta);

// DELETE /api/ventas/:id
router.delete('/:id', validateParams(deleteVentaSchema), ventaController.eliminarVenta);

export const ventaRoutes = router;