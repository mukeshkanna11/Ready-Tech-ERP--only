const express = require('express');

const authenticate = require('../middleware/auth.middleware');
const { assistant, forecast } = require('../controllers/ai.controller');

const router = express.Router();

router.use(authenticate);

router.post('/assistant', assistant);
router.post('/forecast', forecast);

module.exports = router;
