const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cron = require('node-cron');
const logger = require('./utils/logger');
const config = require('./config');

// Import routes
const jobRoutes = require('./routes/jobs');
const computationRoutes = require('./routes/computation');
const healthRoutes = require('./routes/health');
const metricsRoutes = require('./routes/metrics');

// Import services
const SMPCService = require('./services/smpcService');
const BlockchainService = require('./services/blockchainService');
const NodeManager = require('./services/nodeManager');

class SMPCCoordinator {
    constructor() {
        this.app = express();
        this.server = null;
        this.redis = null;
        this.smpcService = null;
        this.blockchainService = null;
        this.nodeManager = null;
        this.isShuttingDown = false;
    }

    async initialize() {
        try {
            logger.info('Initializing SMPC Coordinator...');

            // Connect to MongoDB
            await this.connectMongoDB();

            // Connect to Redis
            await this.connectRedis();

            // Initialize services
            await this.initializeServices();

            // Setup Express middleware
            this.setupMiddleware();

            // Setup routes
            this.setupRoutes();

            // Setup error handlers
            this.setupErrorHandlers();

            // Setup scheduled tasks
            this.setupScheduledTasks();

            // Setup graceful shutdown
            this.setupGracefulShutdown();

            logger.info('SMPC Coordinator initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize SMPC Coordinator:', error);
            process.exit(1);
        }
    }

    async connectMongoDB() {
        try {
            await mongoose.connect(config.mongodb.uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            logger.info('Connected to MongoDB');
        } catch (error) {
            logger.error('MongoDB connection failed:', error);
            throw error;
        }
    }

    async connectRedis() {
        try {
            this.redis = new Redis(config.redis.url, {
                connectTimeout: 10000,
                lazyConnect: true,
                maxRetriesPerRequest: 3,
                retryDelayOnFailover: 100,
            });

            this.redis.on('connect', () => {
                logger.info('Connected to Redis');
            });

            this.redis.on('error', (error) => {
                logger.error('Redis error:', error);
            });

            await this.redis.connect();
        } catch (error) {
            logger.error('Redis connection failed:', error);
            throw error;
        }
    }

    async initializeServices() {
        try {
            // Initialize blockchain service
            this.blockchainService = new BlockchainService(config.blockchain);
            await this.blockchainService.initialize();

            // Initialize node manager
            this.nodeManager = new NodeManager(config.smpc.nodes, this.redis);
            await this.nodeManager.initialize();

            // Initialize SMPC service
            this.smpcService = new SMPCService(this.nodeManager, this.redis);
            await this.smpcService.initialize();

            logger.info('All services initialized successfully');
        } catch (error) {
            logger.error('Service initialization failed:', error);
            throw error;
        }
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                },
            },
        }));

        // CORS
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' 
                ? config.cors.allowedOrigins 
                : true,
            credentials: true,
        }));

        // Compression
        this.app.use(compression());

        // Request logging
        this.app.use(morgan('combined', {
            stream: { write: message => logger.info(message.trim()) }
        }));

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request ID middleware
        this.app.use((req, res, next) => {
            req.id = require('crypto').randomUUID();
            res.setHeader('X-Request-ID', req.id);
            next();
        });

        // Rate limiting middleware would go here
        // this.app.use(rateLimiter);
    }

    setupRoutes() {
        // Health check route (must be first)
        this.app.use('/health', healthRoutes);

        // API routes
        this.app.use('/api/jobs', jobRoutes);
        this.app.use('/api/computation', computationRoutes);
        this.app.use('/api/metrics', metricsRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'SMPC Coordinator',
                version: '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                path: req.originalUrl,
                timestamp: new Date().toISOString(),
            });
        });
    }

    setupErrorHandlers() {
        // Global error handler
        this.app.use((error, req, res, next) => {
            logger.error(`Request ${req.id} error:`, error);

            // Don't expose internal errors in production
            const message = process.env.NODE_ENV === 'production' 
                ? 'Internal Server Error' 
                : error.message;

            res.status(error.statusCode || 500).json({
                error: message,
                requestId: req.id,
                timestamp: new Date().toISOString(),
            });
        });

        // Unhandled promise rejection
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Promise Rejection:', reason);
            // Don't exit in production, just log
            if (process.env.NODE_ENV !== 'production') {
                process.exit(1);
            }
        });

        // Uncaught exception
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });
    }

    setupScheduledTasks() {
        // Health check for SMPC nodes every minute
        cron.schedule('*/1 * * * *', async () => {
            try {
                await this.nodeManager.healthCheck();
            } catch (error) {
                logger.error('Scheduled health check failed:', error);
            }
        });

        // Cleanup expired computations every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            try {
                await this.smpcService.cleanupExpiredComputations();
            } catch (error) {
                logger.error('Scheduled cleanup failed:', error);
            }
        });

        // Sync with blockchain every 30 seconds
        cron.schedule('*/30 * * * * *', async () => {
            try {
                await this.blockchainService.syncJobs();
            } catch (error) {
                logger.error('Blockchain sync failed:', error);
            }
        });

        logger.info('Scheduled tasks configured');
    }

    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            if (this.isShuttingDown) {
                logger.info('Force shutdown initiated');
                process.exit(1);
            }

            this.isShuttingDown = true;
            logger.info(`${signal} received, initiating graceful shutdown...`);

            try {
                // Stop accepting new requests
                if (this.server) {
                    this.server.close(() => {
                        logger.info('HTTP server closed');
                    });
                }

                // Stop SMPC computations gracefully
                if (this.smpcService) {
                    await this.smpcService.shutdown();
                }

                // Close database connections
                if (this.redis) {
                    await this.redis.quit();
                    logger.info('Redis connection closed');
                }

                await mongoose.connection.close();
                logger.info('MongoDB connection closed');

                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }

    async start() {
        const port = config.server.port || 8080;
        
        this.server = this.app.listen(port, '0.0.0.0', () => {
            logger.info(`SMPC Coordinator listening on port ${port}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info('Service ready to coordinate SMPC computations');
        });

        return this.server;
    }
}

// Initialize and start the coordinator
async function main() {
    const coordinator = new SMPCCoordinator();
    
    try {
        await coordinator.initialize();
        await coordinator.start();
    } catch (error) {
        logger.error('Failed to start SMPC Coordinator:', error);
        process.exit(1);
    }
}

// Start the application
if (require.main === module) {
    main();
}

module.exports = SMPCCoordinator;