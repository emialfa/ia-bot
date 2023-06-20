const Chat = require('../models/Chat.model');
const Message = require('../models/Message.model');

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

const getChatsWithTotalTokens = async (page, items, search) => {
  const query = {};
  if (search) {
    query.firstName = { $regex: `${search || ''}`, $options: 'i' }
  }
  const chats = await Chat.find(query)
    .skip((page - 1) * items)
    .limit(items);
  
  const count = await Chat.find().countDocuments();

  if (!chats.length) return { chats, count };

  const chatsToSearch = chats.map(chat => ({chatExternalId: chat.externalId.toString(), botName: chat.botName}))

  const aggregation = await Message.aggregate([
    {
      $match: {
        $or: chatsToSearch
      }
    },
    {
      $group: {
        _id: { chatExternalId: "$chatExternalId", botName: "$botName" },
        totalTokens: { $sum: "$tokens" }
      }
    }
  ]);

  const chatsWithTotalTokens = chats.map(chat => {
    const { externalId, botName } = chat;
    const result = aggregation.find(({ _id }) => _id.chatExternalId === externalId.toString() && _id.botName === botName);
    const totalTokens = result ? result.totalTokens : 0;
    return { ...chat.toObject(), totalTokens };
  });


  return { chats: chatsWithTotalTokens, count };
}


const getChatByExternalId = async (externalId) => {
  return await Chat.findOne({externalId});
}

const getChatByExternalIdAndBotName = async (externalId, botName) => {
  return await Chat.findOne({externalId, botName});
}

const createChat = async (chat) => {
    const newChat = new Chat(chat);
    return await newChat.save();
}

module.exports = { getChats, getChatsWithTotalTokens, getChatByExternalId, getChatByExternalIdAndBotName, createChat };