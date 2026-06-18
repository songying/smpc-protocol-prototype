const config = {
    server: {
        port: parseInt(process.env.PORT) || 8080,
        host: process.env.HOST || '0.0.0.0',
    },

    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://smpc:smpc123@smpc-mongodb:27017/smpc-protocol?authSource=admin',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }
    },

    redis: {
        url: process.env.REDIS_URL || 'redis://smpc-redis:6379',
        keyPrefix: 'smpc:',
        options: {
            connectTimeout: 10000,
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
        }
    },

    blockchain: {
        rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://smpc-app:8545',
        chainId: parseInt(process.env.CHAIN_ID) || 1337,
        contracts: {
            smpcProtocol: process.env.SMPC_PROTOCOL_ADDRESS || '',
            paymentDistributor: process.env.PAYMENT_DISTRIBUTOR_ADDRESS || '',
        },
        privateKey: process.env.COORDINATOR_PRIVATE_KEY || '',
        gasLimit: parseInt(process.env.GAS_LIMIT) || 500000,
        gasPrice: process.env.GAS_PRICE || 'auto',
    },

    smpc: {
        nodes: process.env.MPSPDZ_NODES ?
            process.env.MPSPDZ_NODES.split(',').map((node, index) => ({
                id: `node-${index + 1}`,
                endpoint: `http://${node.trim()}`,
                maxConcurrentJobs: 3,
                timeout: 300000, // 5 minutes
            })) : [],
        protocols: {
            default: 'shamir',
            available: ['shamir', 'garbled_circuits', 'homomorphic', 'hybrid'],
        },
        computation: {
            maxDuration: parseInt(process.env.MAX_COMPUTATION_DURATION) || 3600, // 1 hour
            maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
            heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL) || 30000, // 30 seconds
        }
    },

    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:8080')
            .split(',')
            .map(origin => origin.trim()),
        rateLimiting: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
        }
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'logs/coordinator.log',
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    },

    cors: {
        allowedOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
            .split(',')
            .map(origin => origin.trim()),
    },

    metrics: {
        enabled: process.env.METRICS_ENABLED === 'true',
        port: parseInt(process.env.METRICS_PORT) || 9090,
        path: process.env.METRICS_PATH || '/metrics',
    },

    health: {
        timeout: parseInt(process.env.HEALTH_TIMEOUT) || 5000,
        retries: parseInt(process.env.HEALTH_RETRIES) || 3,
    },

    development: {
        mockSMPC: process.env.MOCK_SMPC === 'true',
        fastMode: process.env.FAST_MODE === 'true',
        debugLevel: process.env.DEBUG_LEVEL || 'info',
    },

    // Healthcare demo specific configuration
    demo: {
        enabled: process.env.DEMO_MODE === 'true',
        healthDatasets: {
            synthetic: true,
            recordCount: parseInt(process.env.DEMO_RECORD_COUNT) || 350,
            providers: parseInt(process.env.DEMO_PROVIDERS) || 2,
        },
        computation: {
            autoAcceptBids: process.env.AUTO_ACCEPT_BIDS === 'true',
            fastComputation: process.env.FAST_COMPUTATION === 'true',
            simulatedDelay: parseInt(process.env.SIMULATED_DELAY) || 5000, // 5 seconds
        }
    }
};

// Validate required configuration
function validateConfig() {
    const required = [
        'mongodb.uri',
        'redis.url',
    ];

    for (const key of required) {
        const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
        if (!value) {
            throw new Error(`Missing required configuration: ${key}`);
        }
    }

    // Validate SMPC nodes (optional in development)
    if (process.env.NODE_ENV === 'production' && (!config.smpc.nodes || config.smpc.nodes.length === 0)) {
        throw new Error('At least one SMPC node must be configured in production');
    }

    // Validate blockchain configuration in production
    if (process.env.NODE_ENV === 'production') {
        if (!config.blockchain.privateKey) {
            throw new Error('Coordinator private key is required in production');
        }
        if (!config.blockchain.contracts.smpcProtocol) {
            throw new Error('SMPC Protocol contract address is required in production');
        }
    }
}

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
    config.logging.level = 'warn';
    config.development.mockSMPC = false;
    config.development.fastMode = false;
    config.demo.enabled = false;
}

if (process.env.NODE_ENV === 'test') {
    config.mongodb.uri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/smpc-protocol-test';
    config.redis.url = process.env.REDIS_TEST_URL || 'redis://localhost:6379/1';
    config.logging.level = 'error';
}

// Validate configuration
try {
    validateConfig();
} catch (error) {
    console.error('Configuration validation failed:', error.message);
    process.exit(1);
}

module.exports = config;