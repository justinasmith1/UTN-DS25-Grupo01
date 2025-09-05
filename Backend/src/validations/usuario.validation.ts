import {email, z} from 'zod';

export const createUsuarioSchema = z.object({
    username: z.string().min(1, 'El nombre de usuario es obligatorio').max(30, 'El nombre de usuario no puede exceder los 30 caracteres').trim(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').trim(),
    rol: z.enum(['ADMINISTRADOR', 'INMOBILIARIA', 'GESTOR', 'TECNICO']),
    email: z.string().email('El correo electrónico no es válido').max(100, 'El correo electrónico no puede exceder los 100 caracteres').trim(),
});

export const updateUsuarioSchema = createUsuarioSchema.partial();

export const getUsuarioSchema = z.object({
    id: z.coerce.number().int('El ID del usuario debe ser un número entero').positive('El ID del usuario debe ser un número positivo'),
});                     

export const deleteUsuarioSchema = getUsuarioSchema;

export const queryUsuarioSchema = z.object({
    username: z.string().min(1, 'El nombre de usuario es obligatorio').max(30, 'El nombre de usuario no puede exceder los 30 caracteres').trim().optional(),
    rol: z.enum(['ADMINISTRADOR', 'INMOBILIARIA', 'GESTOR', 'TECNICO']).optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').trim().optional(),
    email: z.string().email('El correo electrónico no es válido').max(100, 'El correo electrónico no puede exceder los 100 caracteres').trim().optional(),
});    


