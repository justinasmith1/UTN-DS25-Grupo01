import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller';
import { validate } from '../middlewares/validation.middleware';
import { createUsuarioSchema, updateUsuarioSchema, getUsuarioSchema, deleteUsuarioSchema, queryUsuarioSchema } from '../validations/usuario.validation';

const router = Router();

// GET /api/Usuarios
router.get('/', validate(getUsuarioSchema), usuarioController.obtenerTodosUsuarios);

// GET /api/Usuarios/:id
router.get('/:id',validate(queryUsuarioSchema), usuarioController.obtenerUsuarioPorUsername);

// POST /api/Usuarios
router.post('/', validate(createUsuarioSchema), usuarioController.crearUsuario);

// PUT /api/Usuarios/:id
router.put('/:id', validate(updateUsuarioSchema), usuarioController.actualizarUsuario);

// DELETE /api/Usuarios/:id
router.delete('/:id', validate(deleteUsuarioSchema), usuarioController.eliminarUsuario);

export const UsuarioRoutes = router;