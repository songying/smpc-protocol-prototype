const express = require('express');
const router = express.Router();

// Basic health check endpoint
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'smpc-coordinator',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;