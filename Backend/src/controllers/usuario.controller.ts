import { Request, Response, NextFunction } from 'express';
import { Usuario, GetUsuariosResponse, GetUsuarioRequest, GetUsuarioResponse, PostUsuarioRequest, PostUsuarioResponse, PutUsuarioRequest, PutUsuarioResponse
, DeleteUsuarioRequest, DeleteUsuarioResponse, Rol} from '../types/interfacesCCLF';
import { getAllUsuarios, getUsuarioByUsername, createUsuario, updateUsuario, deleteUsuario} from '../services/usuario.service';

// Obtener todos los usuarios
export async function obtenerTodosUsuarios( req: Request, res: Response<GetUsuariosResponse>, next: NextFunction) {
    try {
        const result = await getAllUsuarios();
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

// Obtener usuario por username
export async function obtenerUsuarioPorUsername( req: Request<{ username: string }>, res: Response<GetUsuarioResponse>, next: NextFunction) {
    try {
        const username = req.params.username;
        const result = await getUsuarioByUsername({ username });
        if (result.usuario) {
            res.status(200).json(result);
        } else {
            res.status(404).json({ usuario: null, message: 'Usuario no encontrado' });
        }
    } catch (error) {
        next(error);
    }
}

// Crear usuario
export async function crearUsuario(req: Request<{}, PostUsuarioResponse, PostUsuarioRequest>, res: Response<PostUsuarioResponse>, next: NextFunction) {
    try {
        const { username, password, rol } = req.body;
        if (!username || !password || !rol) {
            return res.status(400).json({
                usuario: null,
                message: 'Faltan datos obligatorios'
            });
        }
        const result = await createUsuario(req.body);
        if (result.usuario) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        next(error);
    }
}
// Actualizar usuario por username
export async function actualizarUsuario(req: Request<{ username: string }, PutUsuarioResponse, PutUsuarioRequest>, res: Response<PutUsuarioResponse>, next: NextFunction) {
    try {
        const username = req.params.username;
        const result = await updateUsuario(username, req.body);
        if (result.message === 'Usuario actualizado exitosamente') {
            res.status(200).json(result);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        next(error);
    }
}

// Eliminar usuario por username
export async function eliminarUsuario(
    req: Request<{ username: string }>,
    res: Response<DeleteUsuarioResponse>,
    next: NextFunction
) {
    try {
        const username = req.params.username;
        const result = await deleteUsuario(username);
        if (result.message === 'Usuario eliminado exitosamente') {
            res.status(200).json(result);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        next(error);
    }
}