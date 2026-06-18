const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const winston = require('winston');

// Configuration
const config = {
    port: process.env.NODE_PORT || 9999,
    nodeId: process.env.NODE_ID || '1',
    coordinatorUrl: process.env.COORDINATOR_URL || 'http://smpc-coordinator:8080',
    mpSpdzHome: process.env.MP_SPDZ_HOME || '/opt/mp-spdz',
    dataDir: '/app/data',
    programsDir: '/app/programs',
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || 3,
    computationTimeout: parseInt(process.env.COMPUTATION_TIMEOUT) || 300000, // 5 minutes
};

// Logger setup
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
            return `${timestamp} [${level.toUpperCase()}] [Node-${config.nodeId}] ${stack || message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
            filename: '/app/logs/node.log',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        })
    ]
});

class MPSpdzNode {
    constructor() {
        this.app = express();
        this.server = null;
        this.activeComputations = new Map();
        this.nodeStatus = {
            id: config.nodeId,
            status: 'initializing',
            activeJobs: 0,
            totalJobsCompleted: 0,
            totalJobsFailed: 0,
            lastHeartbeat: new Date(),
            uptime: process.uptime(),
            capabilities: ['shamir', 'replicated', 'semi'],
        };
        
        this.setupExpress();
        this.setupRoutes();
        this.startHeartbeat();
    }

    setupExpress() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS
        this.app.use(cors());
        
        // Request logging
        this.app.use(morgan('combined', {
            stream: { write: message => logger.info(message.trim()) }
        }));
        
        // Body parsing
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

        // Request ID
        this.app.use((req, res, next) => {
            req.id = uuidv4();
            res.setHeader('X-Request-ID', req.id);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/status', (req, res) => {
            this.nodeStatus.uptime = process.uptime();
            this.nodeStatus.lastHeartbeat = new Date();
            this.nodeStatus.activeJobs = this.activeComputations.size;
            
            res.json({
                ...this.nodeStatus,
                timestamp: new Date().toISOString(),
            });
        });

        this.app.get('/health', (req, res) => {
            const health = {
                status: this.nodeStatus.status,
                activeJobs: this.activeComputations.size,
                maxJobs: config.maxConcurrentJobs,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString(),
            };
            
            res.json(health);
        });

        // Computation endpoints
        this.app.post('/compute', async (req, res) => {
            try {
                const result = await this.startComputation(req.body);
                res.json(result);
            } catch (error) {
                logger.error(`Computation start failed: ${error.message}`);
                res.status(500).json({
                    error: error.message,
                    requestId: req.id,
                });
            }
        });

        this.app.get('/compute/:jobId/status', (req, res) => {
            const jobId = req.params.jobId;
            const computation = this.activeComputations.get(jobId);
            
            if (!computation) {
                return res.status(404).json({
                    error: 'Computation not found',
                    jobId,
                });
            }
            
            res.json({
                jobId,
                status: computation.status,
                progress: computation.progress,
                startTime: computation.startTime,
                elapsedTime: Date.now() - computation.startTime,
                estimatedCompletion: computation.estimatedCompletion,
            });
        });

        this.app.post('/compute/:jobId/cancel', async (req, res) => {
            try {
                const result = await this.cancelComputation(req.params.jobId);
                res.json(result);
            } catch (error) {
                logger.error(`Computation cancel failed: ${error.message}`);
                res.status(500).json({
                    error: error.message,
                    jobId: req.params.jobId,
                });
            }
        });

        // Capabilities endpoint
        this.app.get('/capabilities', (req, res) => {
            res.json({
                nodeId: config.nodeId,
                protocols: this.nodeStatus.capabilities,
                maxConcurrentJobs: config.maxConcurrentJobs,
                supportedPrograms: [
                    'healthcare_stats',
                    'tutorial',
                    'matrix_mul',
                    'linear_regression',
                    'statistics'
                ],
                features: [
                    'real_time_progress',
                    'computation_cancellation',
                    'result_verification',
                    'secure_aggregation'
                ],
            });
        });

        // Error handling
        this.app.use((error, req, res, next) => {
            logger.error(`Request ${req.id} error:`, error);
            res.status(error.statusCode || 500).json({
                error: error.message || 'Internal Server Error',
                requestId: req.id,
                timestamp: new Date().toISOString(),
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                path: req.originalUrl,
                nodeId: config.nodeId,
            });
        });
    }

    async startComputation(request) {
        const {
            jobId,
            program,
            protocol = 'shamir',
            parties,
            partyId,
            inputData,
            parameters = {},
        } = request;

        // Validate request
        if (!jobId || !program || !parties) {
            throw new Error('Missing required parameters: jobId, program, parties');
        }

        if (this.activeComputations.size >= config.maxConcurrentJobs) {
            throw new Error('Maximum concurrent computations reached');
        }

        if (this.activeComputations.has(jobId)) {
            throw new Error('Computation already running for this job');
        }

        logger.info(`Starting computation for job ${jobId} with program ${program}`);

        // Create computation record
        const computation = {
            jobId,
            program,
            protocol,
            parties,
            partyId: partyId || config.nodeId,
            status: 'initializing',
            progress: 0,
            startTime: Date.now(),
            estimatedCompletion: null,
            process: null,
            inputFile: null,
            outputFile: null,
            error: null,
        };

        this.activeComputations.set(jobId, computation);
        this.nodeStatus.activeJobs = this.activeComputations.size;

        try {
            // Prepare input data
            if (inputData) {
                await this.prepareInputData(jobId, inputData);
                computation.inputFile = path.join(config.dataDir, `${jobId}_input.dat`);
            }

            // Start MP-SPDZ computation
            await this.executeComputation(computation, parameters);

            return {
                jobId,
                status: 'started',
                message: 'Computation initiated successfully',
                estimatedDuration: 60000, // 1 minute default
            };

        } catch (error) {
            logger.error(`Failed to start computation ${jobId}:`, error);
            this.activeComputations.delete(jobId);
            this.nodeStatus.activeJobs = this.activeComputations.size;
            this.nodeStatus.totalJobsFailed++;
            throw error;
        }
    }

    async executeComputation(computation, parameters) {
        const { jobId, program, protocol, parties, partyId } = computation;
        
        // Determine the executable based on protocol
        const executables = {
            'shamir': 'shamir-party.x',
            'replicated': 'replicated-ring-party.x',
            'semi': 'semi-party.x',
        };

        const executable = executables[protocol] || executables.shamir;
        const programPath = path.join(config.mpSpdzHome, 'Programs', 'Bytecode', `${program}.bc`);
        
        // Check if program exists
        if (!await fs.pathExists(programPath)) {
            throw new Error(`Program ${program} not found or not compiled`);
        }

        // Prepare command arguments
        const args = [
            '-p', partyId,
            '-N', parties.length.toString(),
        ];

        // Add party endpoints
        parties.forEach((party, index) => {
            if (index !== parseInt(partyId)) {
                args.push('-ip', party.endpoint.replace('http://', '').split(':')[0]);
            }
        });

        // Add program
        args.push(program);

        // Add custom parameters
        if (parameters.dataSize) {
            args.push('-d', parameters.dataSize.toString());
        }
        if (parameters.precision) {
            args.push('-precision', parameters.precision.toString());
        }

        logger.info(`Executing: ${executable} ${args.join(' ')}`);

        // Start the computation process
        const process = spawn(path.join(config.mpSpdzHome, executable), args, {
            cwd: config.mpSpdzHome,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, MP_SPDZ_HOME: config.mpSpdzHome },
        });

        computation.process = process;
        computation.status = 'computing';
        computation.estimatedCompletion = Date.now() + (parameters.estimatedDuration || 60000);

        // Handle process output
        let output = '';
        let errorOutput = '';

        process.stdout.on('data', (data) => {
            const chunk = data.toString();
            output += chunk;
            this.updateComputationProgress(computation, chunk);
        });

        process.stderr.on('data', (data) => {
            const chunk = data.toString();
            errorOutput += chunk;
            logger.warn(`Computation ${jobId} stderr: ${chunk}`);
        });

        // Handle process completion
        process.on('close', async (code) => {
            logger.info(`Computation ${jobId} finished with code ${code}`);
            
            if (code === 0) {
                await this.handleComputationSuccess(computation, output);
            } else {
                await this.handleComputationFailure(computation, errorOutput || `Process exited with code ${code}`);
            }
        });

        process.on('error', async (error) => {
            logger.error(`Computation ${jobId} process error:`, error);
            await this.handleComputationFailure(computation, error.message);
        });

        // Set timeout
        setTimeout(() => {
            if (this.activeComputations.has(jobId)) {
                logger.warn(`Computation ${jobId} timeout, killing process`);
                this.cancelComputation(jobId);
            }
        }, config.computationTimeout);
    }

    updateComputationProgress(computation, output) {
        // Parse progress from MP-SPDZ output
        // This is a simplified implementation - real progress parsing would be more sophisticated
        if (output.includes('Starting')) {
            computation.progress = 10;
        } else if (output.includes('Preprocessing')) {
            computation.progress = 30;
        } else if (output.includes('Computing')) {
            computation.progress = 60;
        } else if (output.includes('Finished')) {
            computation.progress = 100;
        }

        // Update estimated completion based on progress
        if (computation.progress > 10) {
            const elapsed = Date.now() - computation.startTime;
            const estimated = (elapsed / computation.progress) * 100;
            computation.estimatedCompletion = computation.startTime + estimated;
        }
    }

    async handleComputationSuccess(computation, output) {
        const { jobId } = computation;
        
        computation.status = 'completed';
        computation.progress = 100;
        
        // Save results
        const resultsPath = path.join(config.dataDir, `${jobId}_results.json`);
        const results = {
            jobId,
            nodeId: config.nodeId,
            status: 'completed',
            output: this.parseResults(output),
            completedAt: new Date().toISOString(),
            duration: Date.now() - computation.startTime,
        };
        
        await fs.writeJson(resultsPath, results);
        computation.outputFile = resultsPath;
        
        // Clean up
        setTimeout(() => {
            this.activeComputations.delete(jobId);
            this.nodeStatus.activeJobs = this.activeComputations.size;
            this.nodeStatus.totalJobsCompleted++;
        }, 5000); // Keep result available for 5 seconds

        logger.info(`Computation ${jobId} completed successfully`);
        
        // Notify coordinator if configured
        this.notifyCoordinator(jobId, 'completed', results);
    }

    async handleComputationFailure(computation, error) {
        const { jobId } = computation;
        
        computation.status = 'failed';
        computation.error = error;
        
        // Kill process if still running
        if (computation.process && !computation.process.killed) {
            computation.process.kill('SIGTERM');
        }
        
        setTimeout(() => {
            this.activeComputations.delete(jobId);
            this.nodeStatus.activeJobs = this.activeComputations.size;
            this.nodeStatus.totalJobsFailed++;
        }, 5000);

        logger.error(`Computation ${jobId} failed: ${error}`);
        
        // Notify coordinator
        this.notifyCoordinator(jobId, 'failed', { error });
    }

    async cancelComputation(jobId) {
        const computation = this.activeComputations.get(jobId);
        
        if (!computation) {
            throw new Error('Computation not found');
        }
        
        if (computation.process && !computation.process.killed) {
            computation.process.kill('SIGTERM');
        }
        
        computation.status = 'cancelled';
        
        this.activeComputations.delete(jobId);
        this.nodeStatus.activeJobs = this.activeComputations.size;
        
        logger.info(`Computation ${jobId} cancelled`);
        
        // Notify coordinator
        this.notifyCoordinator(jobId, 'cancelled', { reason: 'User requested cancellation' });
        
        return {
            jobId,
            status: 'cancelled',
            message: 'Computation cancelled successfully',
        };
    }

    async prepareInputData(jobId, inputData) {
        const inputFile = path.join(config.dataDir, `${jobId}_input.dat`);
        
        // Convert input data to MP-SPDZ format
        let formattedData = '';
        
        if (Array.isArray(inputData)) {
            // Assume array of numbers for simple cases
            formattedData = inputData.join('\n');
        } else if (typeof inputData === 'object') {
            // Handle structured data (e.g., healthcare records)
            formattedData = this.formatHealthcareData(inputData);
        } else {
            formattedData = inputData.toString();
        }
        
        await fs.writeFile(inputFile, formattedData);
        logger.info(`Input data prepared for job ${jobId}`);
    }

    formatHealthcareData(data) {
        // Format healthcare data for MP-SPDZ consumption
        // This is a simplified example for the demo
        const records = data.records || [];
        let formatted = `${records.length}\n`; // Number of records
        
        for (const record of records) {
            // Extract numerical values for computation
            const values = [
                record.age || 0,
                record.bmi || 0,
                record.bloodPressure?.systolic || 0,
                record.bloodPressure?.diastolic || 0,
                record.cholesterol || 0,
                record.glucose || 0,
                record.smoker ? 1 : 0,
            ];
            formatted += values.join(' ') + '\n';
        }
        
        return formatted;
    }

    parseResults(output) {
        // Parse MP-SPDZ output into structured results
        // This is a simplified parser for the healthcare demo
        const lines = output.split('\n').filter(line => line.trim());
        const results = {};
        
        for (const line of lines) {
            if (line.includes('Mean:')) {
                results.mean = parseFloat(line.split(':')[1]);
            } else if (line.includes('Variance:')) {
                results.variance = parseFloat(line.split(':')[1]);
            } else if (line.includes('Correlation:')) {
                results.correlation = parseFloat(line.split(':')[1]);
            } else if (line.includes('Count:')) {
                results.count = parseInt(line.split(':')[1]);
            }
        }
        
        return results;
    }

    async notifyCoordinator(jobId, status, data) {
        if (!config.coordinatorUrl) return;
        
        try {
            const axios = require('axios');
            await axios.post(`${config.coordinatorUrl}/api/computation/status`, {
                nodeId: config.nodeId,
                jobId,
                status,
                data,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            logger.warn(`Failed to notify coordinator: ${error.message}`);
        }
    }

    startHeartbeat() {
        setInterval(() => {
            this.nodeStatus.lastHeartbeat = new Date();
            this.nodeStatus.uptime = process.uptime();
            
            // Send heartbeat to coordinator if configured
            this.sendHeartbeat();
        }, 30000); // Every 30 seconds
    }

    async sendHeartbeat() {
        if (!config.coordinatorUrl) return;
        
        try {
            const axios = require('axios');
            await axios.post(`${config.coordinatorUrl}/api/nodes/heartbeat`, {
                ...this.nodeStatus,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            // Don't log heartbeat failures too aggressively
            if (Date.now() - this.lastHeartbeatError > 300000) { // 5 minutes
                logger.warn(`Heartbeat failed: ${error.message}`);
                this.lastHeartbeatError = Date.now();
            }
        }
    }

    async start() {
        // Ensure directories exist
        await fs.ensureDir(config.dataDir);
        await fs.ensureDir('/app/logs');

        this.nodeStatus.status = 'ready';
        
        this.server = this.app.listen(config.port, '0.0.0.0', () => {
            logger.info(`MP-SPDZ Node ${config.nodeId} listening on port ${config.port}`);
            logger.info(`MP-SPDZ Home: ${config.mpSpdzHome}`);
            logger.info(`Maximum concurrent jobs: ${config.maxConcurrentJobs}`);
            logger.info('Node ready for SMPC computations');
        });

        return this.server;
    }

    async shutdown() {
        logger.info('Shutting down MP-SPDZ node...');
        
        // Cancel all active computations
        for (const [jobId, computation] of this.activeComputations) {
            await this.cancelComputation(jobId);
        }
        
        if (this.server) {
            this.server.close();
        }
        
        logger.info('MP-SPDZ node shutdown complete');
    }
}

// Start the node
const node = new MPSpdzNode();

node.start().catch((error) => {
    logger.error('Failed to start MP-SPDZ node:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => node.shutdown());
process.on('SIGINT', () => node.shutdown());

module.exports = MPSpdzNode;