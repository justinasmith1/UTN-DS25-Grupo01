import prisma from '../config/prisma';
import type { User as PrismaUser } from "../generated/prisma";
import type { Usuario, Rol, GetUsuariosResponse, GetUsuarioRequest, GetUsuarioResponse, PostUsuarioRequest, PostUsuarioResponse, PutUsuarioRequest, PutUsuarioResponse, DeleteUsuarioRequest, DeleteUsuarioResponse } from '../types/interfacesCCLF';
import type { $Enums} from "../generated/prisma"


// mapeo de PrismaUser a Usuario
const toUsuario = (u: PrismaUser): Usuario => ({
    idUsuario: u.id,
    username: u.username,
    password: u.password,     
    rol: u.role as unknown as Rol,
    email: u.email,
});

// obtener todos los usuarios
export async function getAllUsers(): Promise<GetUsuariosResponse> {
    const usuarios = await prisma.user.findMany({
        orderBy: { id: 'asc' },
    });
    return { usuarios: usuarios.map(toUsuario), total: usuarios.length };
}

export async function getUsuarioById(id: number): Promise<Usuario> {
    const usuario = await prisma.user.findUnique({
        where: { id },
    });

    if (!usuario) {
        const error = new  Error('Usuario no encontrado');
        (error as any).statusCode = 404;
        throw error;
    }

    return toUsuario(usuario);

}

    
// crear usuario
export async function createUser( req: PostUsuarioRequest): Promise<PostUsuarioResponse> {
    try {
        const created = await prisma.user.create({
            data: {
                username: req.username,
                password: req.password,
                role: req.rol as unknown as $Enums.Role,
                email: req.email,
            },
        });
        return { usuario: toUsuario(created), message: 'Usuario creado con éxito' };
    } catch (e: any) {
        if (e.code === 'P2002') return { usuario: null, message: 'El username ya existe' };
        throw e;
    }
}

// actualizar usuario
export async function updateUser( idActual: number, req: PutUsuarioRequest ): Promise<PutUsuarioResponse> {
    try {
        await prisma.user.update({
            where: { id: idActual },
            data: {
                username: req.username,
                password: req.password,
                role: req.rol as unknown as $Enums.Role,
                email: req.email,
            },
        });
        return { message: 'Usuario actualizado con éxito' };
    } catch (e: any) {
        if (e.code === 'P2025') return { message: 'Usuario no encontrado' };
        throw e;
    }
}

// eliminar usuario
export async function deleteUser( req: DeleteUsuarioRequest ): Promise<DeleteUsuarioResponse> {
    try {
        await prisma.user.delete({ where: { id: req.idUsuario } });
        return { message: 'Usuario eliminado con éxito' };
    } catch (e: any) {
        if (e.code === 'P2025') return { message: 'Usuario no encontrado' };
        throw e;
    }
}

