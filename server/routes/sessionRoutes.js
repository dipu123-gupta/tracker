const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

router.post('/create-session', sessionController.createSession);
router.get('/session/:id', sessionController.getSession);
router.post('/location/:sessionId', sessionController.updateLocation);
router.delete('/session/:sessionId', sessionController.deleteSession);

module.exports = router;
