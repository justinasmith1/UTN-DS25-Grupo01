import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller';
import { validate, validateParams, validateQuery } from '../middlewares/validation.middleware';
import { z } from 'zod';
import { createUsuarioSchema, updateUsuarioSchema, updateUsuarioWithParamsSchema, getUsuarioSchema, deleteUsuarioSchema, queryUsuarioSchema } from '../validations/usuario.validation';

const router = Router();

// GET /api/Usuarios
router.get('/', usuarioController.obtenerTodosUsuarios);

// GET /api/Usuarios/:id
router.get('/:id',validateParams(getUsuarioSchema), usuarioController.obtenerUsuarioPorId);

// POST /api/Usuarios
router.post('/', validate(createUsuarioSchema), usuarioController.crearUsuario);

// PUT /api/Usuarios/:id
router.put('/:id', validateParams(updateUsuarioWithParamsSchema), usuarioController.actualizarUsuario);

// DELETE /api/Usuarios/:id
router.delete('/:id',validateParams(deleteUsuarioSchema),  usuarioController.eliminarUsuario);

export const usuarioRoutes = router;