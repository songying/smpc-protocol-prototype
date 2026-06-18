const express = require('express');
const router = express.Router();

// Placeholder for computation routes
router.get('/', (req, res) => {
    res.json({ message: 'Computation endpoint - coming soon' });
});

module.exports = router;