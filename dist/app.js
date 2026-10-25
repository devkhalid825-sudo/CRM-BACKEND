import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/bootstrap.js';
import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { providerRoutes, keyRoutes } from './modules/providers/routes.js';
import { consoleRoutes } from './modules/console/routes.js';
import { geoRoutes } from './modules/geo/routes.js';
import { categoryRoutes } from './modules/categories/routes.js';
import { finderRoutes } from './modules/finder/routes.js';
import { leadRoutes } from './modules/leads/routes.js';
import { timelineRoutes } from './modules/timeline/routes.js';
import { chatRoutes } from './modules/chat/routes.js';
import { errorHandler } from './middleware/errorHandler.js';
export const app = express();
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: false,
}));
const allowedOrigins = [
    env.CLIENT_ORIGIN,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://muhammadkhalid.work.gd',
    'https://muhammadkhalid.work.gd',
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1') ||
            origin.includes('muhammadkhalid.work.gd')) {
            return callback(null, true);
        }
        // Permissive fallback for other origins
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
// Mount modules (Phase 1, Phase 2 & Phase 3)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/console', consoleRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/finder', finderRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/leads', timelineRoutes);
app.use('/api', chatRoutes);
// Global Error Handler
app.use(errorHandler);
//# sourceMappingURL=app.js.map