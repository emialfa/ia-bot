const Chat = require("../models/Chat.model");
const Message = require("../models/Message.model");
const UserQuestionary = require("../models/UserQuestionary.model");

// (async () => {
//   // borrar todos los chats y mensajes que fueron creados antes del 7 de junio de 2024 y devuelvo en consola la cantidad de chats y mensajes eliminados
//   const chats = await Chat.deleteMany({ createdAt: { $lt: new Date("2024-06-07") } });
//   console.log(chats.deletedCount, "chats eliminados");
//   const messages = await Message.deleteMany({ createdAt: { $lt: new Date("2024-06-07") } });
//   console.log(messages.deletedCount, "mensajes eliminados");
// })()

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
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      // Agregamos la búsqueda en campos de userQuestionary usando $expr y $regex
      {
        $or: [
          { "userQuestionary.name": { $regex: search, $options: "i" } },
          { "userQuestionary.phoneNumber": { $regex: search, $options: "i" } }
        ]
      }
    ];
  }

  // Primero obtenemos los IDs de UserQuestionary que coinciden con la búsqueda
  let userQuestionaryIds = [];
  if (search) {
    userQuestionaryIds = await UserQuestionary.find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } }
      ]
    }).distinct('_id');

    // Agregamos la búsqueda por userQuestionary al query
    query.$or = query.$or || [];
    query.$or.push({ userQuestionary: { $in: userQuestionaryIds } });
  }

  const chats = await Chat.find(query)
    .populate([
      {
        path: "userQuestionary",
        model: "UserQuestionary",
        populate: ["questions.question"],
      },
    ])
    .sort({ createdAt: "desc" })
    .skip((page - 1) * items)
    .limit(items);

  const count = await Chat.find(query).countDocuments();

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

  return { chats: chatsWithTotalTokens, count };
};

const getChatByExternalId = async (externalId) => {
  return await Chat.findOne({ externalId });
};

const getChatbyChatId = async (chatId) => {
  return await Chat.findOne({ chatId }).populate([
    {
      path: "userQuestionary",
      model: "UserQuestionary",
      populate: ["questions.question"],
    },
  ]);
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

const deleteChats = async (chatIds) => {
  return await Chat.deleteMany({ _id: { $in: chatIds }})
}

module.exports = {
  getChats,
  getChatbyChatId,
  getChatsWithTotalTokens,
  getChatByExternalId,
  getChatByExternalIdAndBotName,
  createChat,
  deleteChats
};
