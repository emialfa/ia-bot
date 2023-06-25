const express = require('express');
const botController = require('../controllers/bot.controller');

const router = express.Router();

router.get('/:id',  botController.getBotById);

router.get('/', botController.getBots);

router.post('/',  botController.createBot);

router.put('/:id',  botController.updateBotById);

router.delete('/:id',  botController.deleteBot);

module.exports = router;