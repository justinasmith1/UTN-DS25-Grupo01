import { RequestHandler } from 'express';
import { login as loginService } from '../services/auth.service';
import { LoginRequest } from '../types/auth.types';

export const login: RequestHandler = async (req, res, next) => {
  try {
    const data = await loginService(req.body as LoginRequest);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};
