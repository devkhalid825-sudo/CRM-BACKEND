import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const formatted = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: formatted,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const formatted = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      res.status(400).json({
        success: false,
        error: 'Query parameter validation failed',
        details: formatted,
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
}
