import { Request, Response, NextFunction } from 'express';
import * as UsuarioService from '../services/usuario.service';



// Obtener todos los usuarios
export async function obtenerTodosUsuarios( req: Request, res: Response, next: NextFunction) {
    try {
        const result = await UsuarioService.getAllUsers();
        res.json({success: true,data:result});
    } catch (error) {
            next(error);
    }
}

// Obtener usuario por username
export async function obtenerUsuarioPorUsername( req: Request, res: Response, next: NextFunction) {
    try {
        const username = req.params.username;
        const result = await UsuarioService.getUserByUsername({ username });
        res.json({success: true,data:result});
    } catch (error) {
        next(error);
    }
}

// Crear usuario
export async function crearUsuario(req: Request, res: Response, next: NextFunction) {
    try {
        const usuario = await UsuarioService.createUser(req.body);
        res.status(201).json({success: true,message: "Usuario creado exitosamente",data:usuario});
    } catch (error) {
        next(error);
    }   
}
// Actualizar usuario por username
export async function actualizarUsuario(req: Request, res: Response, next: NextFunction) {
    try {
        const username = req.params.username;
        const result = await UsuarioService.updateUser(username, req.body);
        res.json({success: true,message: "Usuario actualizado exitosamente",data:result});
    } catch (error) {
        next(error);
    }
}

// Eliminar usuario por username
export async function eliminarUsuario(req: Request, res: Response, next: NextFunction) {
    console.log("Llega a controller")
    try {
        const username: string = req.params.username;
        const deleteRequest = { username: username }; 
        const result = await UsuarioService.deleteUser(deleteRequest);
        res.json({success: true,message: "Usuario eliminado exitosamente",data:result});
    } catch (error) {
        next(error);
    }
}

