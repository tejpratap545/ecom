import {   Response, NextFunction } from 'express';
import { ExtendedRequest } from '../types/extendedRequest';  
import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: number;
  iat: number;
  exp: number;
}

export function authMiddleware(req: ExtendedRequest, res: Response, next: NextFunction) {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const token = authorization.replace('Bearer', '').trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret_key') as TokenPayload;

    req.userId = payload.id;

    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
