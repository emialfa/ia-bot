const Message = require('../models/Message.model');

const getMessages = async (query, page, items) => {
  const messages = await Message.find(query)
    .skip((page - 1) * items)
    .limit(items)
    .sort({createdAt: 'desc'});

  const count = await Message.find().countDocuments();

  return { messages, count };
}

const createMessage = async (message) => {
    const newMessage = new Message(message);
    return await newMessage.save();
}

module.exports = { getMessages, createMessage };