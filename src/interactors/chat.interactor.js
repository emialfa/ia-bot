const chatRepository = require('../repositories/chat.repository')
const messageRepository = require('../repositories/message.repository')

const { formatResponse } = require('../utils/formatResponse.js');

const getChats = async (page, items, search) => {
    try {
      const { chats, count } = await chatRepository.getChats(page, items, search);
      return formatResponse(chats, count);
    } catch (err) {
      throw { message: err, status: 400, description: err.message };
    }
  };

  const getChatByExternalId = async (externalId) => {
    try {
      const chat = await chatRepository.getChatByExternalId(externalId);
      if (!chat) 
        throw `Chat no exist`;
      const messages = await messageRepository.getMessages({chatExternalId: externalId})
      return {...chat._doc, messages };
    } catch (err) {
      throw { message: err, status: 400, description: err.message };
    }
  };

const createChat = async (chat) => {
    try {
        const chatFounded = await chatRepository.getChatByExternalId(chat.externalId);
        if (chatFounded) return;

        return await chatRepository.createChat(chat);
    } catch (err) {
        console.log(err);
    }
}

module.exports = { getChats, getChatByExternalId, createChat };