const express = require('express');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

router.get('/:externalId',  chatController.getChatByExternalIdAndBotName);

router.get('/', chatController.getChats);


module.exports = router;