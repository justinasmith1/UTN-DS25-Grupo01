import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { LoginRequest, LoginResponse } from '../types/auth.types';
import { Role } from '../generated/prisma';

type JWTPayload = { 
    sub: number;
    email: string; 
    role: Role;
};

export async function login(data: LoginRequest): Promise<LoginResponse> {
  // 1. Buscar usuario
  const user = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (!user) {
    const error = new Error('Credenciales inválidas') as any;
    error.statusCode = 401;
    throw error;
  }

  // 2. Verificar password
  const validPassword = await bcrypt.compare(data.password, user.password);
  if (!validPassword) {
    const error = new Error('Credenciales inválidas') as any;
    error.statusCode = 401;
    throw error;
  }

  // 3. Generar JWT
    const JWT_SECRET = process.env.JWT_SECRET as Secret | undefined;
  if (!JWT_SECRET) {
    throw new Error('Falta JWT_SECRET en .env');
  }
  const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '2h';

  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    // No agrego el name asi queda mas chico, supuestamente es una buena practica
    role: user.role as Role,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: EXPIRES_IN } as SignOptions);
  // 4. Retornar sin password
  const { password: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    token,
  };
}
