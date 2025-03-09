const express = require('express');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

router.get('/:externalId',  chatController.getChatByExternalIdAndBotName);

router.get('/', chatController.getChats);

router.post('/export-to-drive-trello', chatController.exportToDriveAndTrello);

router.delete('/', chatController.deleteChats);

module.exports = router;