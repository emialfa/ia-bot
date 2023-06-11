const Chat = require('../models/Chat.model');

const getChats = async (page, items, search) => {
  const query = {};
  if (search) {
    query.firstName = { $regex: `${search || ''}`, $options: 'i' }
  }
  const chats = await Chat.find(query)
    .skip((page - 1) * items)
    .limit(items);

  const count = await Chat.find().countDocuments();

  return { chats, count };
}

const getChatByExternalId = async (externalId) => {
    return await Chat.findOne({externalId});
}

const createChat = async (chat) => {
    const newChat = new Chat(chat);
    return await newChat.save();
}

module.exports = { getChats, getChatByExternalId, createChat };