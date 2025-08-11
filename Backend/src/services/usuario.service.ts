import { Usuario, GetUsuariosResponse, GetUsuarioRequest, GetUsuarioResponse, PostUsuarioRequest, PostUsuarioResponse, PutUsuarioRequest, PutUsuarioResponse
, DeleteUsuarioRequest, DeleteUsuarioResponse, Rol} from '../types/interfacesCCLF'; 

let usuarios: Usuario[] = [
    {
        idUsuario: 1,
        username: "MarianoPerez",
        password: "admin123",
        rol: "Administrador" as Rol
    },
    {
        idUsuario: 2,
        username: "JulioGomez",
        password: "gestor123",
        rol: "Gestor" as Rol
    },
    {
        idUsuario: 3,
        username: "AndinolfiInmobiliaria",
        password: "inmo123",
        rol: "Inmobiliaria" as Rol
    },
    {
        idUsuario: 4,
        username: "MirandaSuarez",
        password: "tecnico123",
        rol: "Tecnico;" as Rol
    }
];

export async function getAllUsuarios(): Promise<GetUsuariosResponse> {
    return { usuarios, total: usuarios.length };
}

export async function getUsuarioByUsername(request: GetUsuarioRequest): Promise<GetUsuarioResponse> {
    const usuario = usuarios.find(u => u.username === request.username) || null;
    if (!usuario) {
        return { usuario: null, message: 'Usuario no encontrado' };
    }
    return { usuario };
}

export async function createUsuario(data: PostUsuarioRequest): Promise<PostUsuarioResponse> {
    if (usuarios.some(u => u.username === data.username)) {
        return { usuario: null, message: 'El username ya existe' };
    }

    const nuevoUsuario: Usuario = {
        idUsuario: usuarios.length ? Math.max(...usuarios.map(u => u.idUsuario)) + 1 : 1,
        ...data
    };

    usuarios.push(nuevoUsuario);
    return { usuario: nuevoUsuario, message: 'Usuario creado exitosamente' };
}

export async function updateUsuario(username: string, data: PutUsuarioRequest): Promise<PutUsuarioResponse> {
    const index = usuarios.findIndex(u => u.username === username);
    if (index === -1) {
        return { message: 'Usuario no encontrado' };
    }
    usuarios[index] = { ...usuarios[index], ...data };
    return { message: 'Usuario actualizado exitosamente' };
}

export async function deleteUsuario(username: string): Promise<DeleteUsuarioResponse> {
    const index = usuarios.findIndex(u => u.username === username);
    if (index === -1) {
        return { message: 'Usuario no encontrado' };
    }
    usuarios.splice(index, 1);
    return { message: 'Usuario eliminado exitosamente' };
}