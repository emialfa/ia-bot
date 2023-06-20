const express = require('express');
const botController = require('../controllers/bot.controller');

const router = express.Router();

router.get('/:id',  botController.getBotById);

router.get('/', botController.getBots);

router.put('/:id',  botController.updateBotById);

module.exports = router;