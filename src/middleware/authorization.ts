import {   Response, NextFunction } from 'express';
import knex from 'knex';
import { ExtendedRequest } from '../types/extendedRequest';

export function authorization(req: ExtendedRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
  const reqParamUserId = parseInt(req.params.userId, 10);

  if (userId !== reqParamUserId) {
    return res.status(403).json({ error: 'Forbidden: You do not have access to this resource' });
  }

  next();
}

export async function  adminAuthorization(req: ExtendedRequest, res: Response, next: NextFunction) {
  const userId = req.userId;
 
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await knex('users')
    .select('is_admin')
    .where('id', userId)
    .first();

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.is_admin) {
    return res.status(403).json({ error: 'Access denied. You are not an admin.' });
  }
  
  next();
}

