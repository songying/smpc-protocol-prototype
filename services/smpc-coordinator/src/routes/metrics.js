const express = require('express');
const router = express.Router();

// Placeholder for metrics routes
router.get('/', (req, res) => {
    res.json({ message: 'Metrics endpoint - coming soon' });
});

module.exports = router;