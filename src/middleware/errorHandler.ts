import { Request, Response, NextFunction } from 'express';
import { AppError } from '../services/errors.js';
import { logger } from '../services/logger.js';
import { env } from '../config/bootstrap.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err.message || 'Internal server error';

  logger.error('server', `Unhandled error on ${req.method} ${req.originalUrl}: ${message}`, {
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
