const Chat = require("../models/Chat.model");
const Message = require("../models/Message.model");

const getChats = async (page, items, search) => {
  const query = {};
  if (search) {
    query.firstName = { $regex: `${search || ""}`, $options: "i" };
  }
  const chats = await Chat.find(query)
    .skip((page - 1) * items)
    .limit(items);

  const count = await Chat.find().countDocuments();

  return { chats, count };
};

const getChatsWithTotalTokens = async (page, items, search) => {
  const query = {};
  if (search) {
    query.firstName = { $regex: `${search || ""}`, $options: "i" };
  }
  const chats = await Chat.find(query)
    .populate([
      {
        path: "userQuestionary",
        model: "UserQuestionary",
        populate: ["questions.question"],
      },
    ])
    //.sort({ createdAt: "desc" })
    // .skip((page - 1) * items)
    // .limit(items);

  const count = await Chat.find().countDocuments();

  if (!chats.length) return { chats, count };

  const chatsToSearch = chats.map((chat) => ({
    ...(chat.externalId
      ? { chatExternalId: chat.externalId.toString() }
      : { chatId: chat.chatId.toString() }),
    botName: chat.botName,
  }));

  const aggregation = await Message.aggregate([
    {
      $match: {
        $or: chatsToSearch,
      },
    },
    {
      $group: {
        _id: {
          chatExternalId: "$chatExternalId",
          chatId: "$chatId",
          botName: "$botName",
        },
        totalTokens: { $sum: "$tokens" },
        totalMessages: { $sum: 1 },
        latestUpdatedAt: { $max: "$updatedAt" },
      },
    },
  ]);

  const chatsWithTotalTokens = chats.map((chat) => {
    const { externalId, chatId, botName } = chat;
    const result = aggregation.find(
      ({ _id }) =>
        (externalId
          ? _id.chatExternalId === externalId?.toString()
          : _id.chatId === chatId.toString()) && _id.botName === botName
    );
    const totalTokens = result ? result.totalTokens : 0;
    const totalMessages = result ? result.totalMessages : 0;
    const updatedAt = result ? result.latestUpdatedAt : chat.updatedAt;
    return {
      ...chat.toObject(),
      updatedAt,
      totalTokens,
      totalMessages,
      languageLocale: chat?.userQuestionary?.languageLocale || "es",
    };
  });

  return { chats: chatsWithTotalTokens.sort((a,b) =>  b.updatedAt - a.updatedAt).slice(items * (page - 1), items * page), count };
};

const getChatByExternalId = async (externalId) => {
  return await Chat.findOne({ externalId });
};

const getChatByExternalIdAndBotName = async (externalId, botName) => {
  return await Chat.findOne({ ...externalId, botName }).populate([
    {
      path: "userQuestionary",
      model: "UserQuestionary",
      populate: ["questions.question"],
    },
  ]);
};

const createChat = async (chat) => {
  const newChat = new Chat(chat);
  return await newChat.save();
};

module.exports = {
  getChats,
  getChatsWithTotalTokens,
  getChatByExternalId,
  getChatByExternalIdAndBotName,
  createChat,
};
