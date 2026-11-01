import { AppError } from '../services/errors.js';
import { logger } from '../services/logger.js';
import { env } from '../config/bootstrap.js';
export function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) {
    let statusCode = err instanceof AppError ? err.statusCode : 500;
    let message = err?.message || 'Internal server error';
    // Handle Prisma record not found (P2025) cleanly
    if (err?.code === 'P2025') {
        statusCode = 404;
        message = 'Requested record was not found or has been deleted';
    }
    // Distinguish client errors (4xx) from real server crashes (5xx)
    if (statusCode < 500) {
        logger.warn('server', `Client request rejected (${statusCode}) on ${req.method} ${req.originalUrl}: ${message}`);
    }
    else {
        logger.error('server', `Unhandled server error on ${req.method} ${req.originalUrl}: ${message}`, {
            stack: env.NODE_ENV === 'development' ? err?.stack : undefined,
        });
    }
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(env.NODE_ENV === 'development' ? { stack: err?.stack } : {}),
    });
}
//# sourceMappingURL=errorHandler.js.map