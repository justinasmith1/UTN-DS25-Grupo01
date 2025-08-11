import { Router } from 'express';
import * as usuarioController from '../controllers/usuario.controller';

const router = Router();

router.get('/', usuarioController.obtenerTodosUsuarios);
router.get('/:username', usuarioController.obtenerUsuarioPorUsername);
router.post('/', usuarioController.crearUsuario);
router.put('/:username', usuarioController.actualizarUsuario);
router.delete('/:username', usuarioController.eliminarUsuario);

export const usuarioRoutes = router;