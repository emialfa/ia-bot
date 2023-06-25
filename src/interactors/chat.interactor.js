const chatRepository = require('../repositories/chat.repository')
const messageRepository = require('../repositories/message.repository')

const { formatResponse } = require('../utils/formatResponse.js');

const getChats = async (page, items, search) => {
    try {
      const { chats, count } = await chatRepository.getChatsWithTotalTokens(page, items, search);
      return formatResponse(chats, count);
    } catch (err) {
      throw { message: err, status: 400, description: err.message };
    }
  };

  const getChatByExternalIdAndBotName = async (externalId, botName, chatId) => {
    try {
      const chat = await chatRepository.getChatByExternalIdAndBotName(chatId ? {chatId} : {externalId}, botName);
      if (!chat) 
        throw `Chat no exist`;
      const messages = await messageRepository.getMessages({ ...(chatId ? {chatId: chatId} : {chatExternalId: externalId}), botName });
      return {...chat._doc, messages };
    } catch (err) {
      throw { message: err, status: 400, description: err.message };
    }
  };

const createChat = async (chat) => {
    try {
        const {externalId, chatId} = chat;
        const chatFounded = await chatRepository.getChatByExternalIdAndBotName(externalId ? {externalId} : {chatId}, chat.botName);
        if (chatFounded) return;

        return await chatRepository.createChat(chat);
    } catch (err) {
        console.log(err);
    }
}

module.exports = { getChats, getChatByExternalIdAndBotName, createChat };