import prisma from '../config/prisma';
import type { User as PrismaUser } from "../generated/prisma";
import type { Usuario, Rol, GetUsuariosResponse, GetUsuarioRequest, GetUsuarioResponse, PostUsuarioRequest, PostUsuarioResponse, PutUsuarioRequest, PutUsuarioResponse, DeleteUsuarioRequest, DeleteUsuarioResponse } from '../types/interfacesCCLF';
import type { $Enums} from "../generated/prisma"


// mapeo de PrsimaUser a Usuariio
const toUsuario = (u: PrismaUser): Usuario => ({
    idUsuario: u.id,
    username: u.username,
    password: u.password,     
    rol: u.role as unknown as Rol,
});

// obtener todos los usuaruarios
export async function getAllUsers(): Promise<GetUsuariosResponse> {
    const usuarios = await prisma.user.findMany({
        orderBy: { id: 'asc' },
    });
    return { usuarios: usuarios.map(toUsuario), total: usuarios.length };
}

//  obtener usuario por username
export async function getUserByUsername(request: GetUsuarioRequest): Promise<GetUsuarioResponse> {
    const user = await prisma.user.findUnique({ where: { username: request.username } });
    return user ? { usuario: toUsuario(user) } : { usuario: null, message: 'Usuario no encontrado' };
}

// crear ususario
export async function createUser( req: PostUsuarioRequest): Promise<PostUsuarioResponse> {
    try {
        const created = await prisma.user.create({
            data: {
                username: req.username,
                password: req.password,
                role: req.rol as unknown as $Enums.Role,
            },
        });
        return { usuario: toUsuario(created), message: 'Usuario creado con éxito' };
    } catch (e: any) {
        if (e.code === 'P2002') return { usuario: null, message: 'El username ya existe' };
        throw e;
    }
}

// actualizar usuario
export async function updateUser( usernameActual: string, req: PutUsuarioRequest ): Promise<PutUsuarioResponse> {
    try {
        await prisma.user.update({
            where: { username: usernameActual },
            data: {
                username: req.username,
                password: req.password,
                role: req.rol as unknown as $Enums.Role,
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
        await prisma.user.delete({ where: { username: req.username } });
        return { message: 'Usuario eliminado con éxito' };
    } catch (e: any) {
        if (e.code === 'P2025') return { message: 'Usuario no encontrado' };
        throw e;
    }
}