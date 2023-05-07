import {   Response, NextFunction } from 'express';
import { ExtendedRequest } from '../types/extendedRequest';

export function authorization(req: ExtendedRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
  const reqParamUserId = parseInt(req.params.userId, 10);

  if (userId !== reqParamUserId) {
    return res.status(403).json({ error: 'Forbidden: You do not have access to this resource' });
  }

  next();
}
