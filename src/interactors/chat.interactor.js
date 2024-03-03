const chatRepository = require("../repositories/chat.repository");
const messageRepository = require("../repositories/message.repository");
const userQuestionaryRepository = require("../repositories/userQuestionary.repository");

const { formatResponse } = require("../utils/formatResponse.js");

const getChats = async (page, items, search) => {
  try {
    const { chats, count } = await chatRepository.getChatsWithTotalTokens(
      page,
      items,
      search
    );
    const chatsToResponse = chats.map((c) => ({
      ...c,
      totalMessages:
        (c.userQuestionary?.questions?.length +
          (c.userQuestionary?.generatedPrompt ? 1 : 0) || 0) *
          2 +
        c.totalMessages,
    }));
    return formatResponse(chatsToResponse, count);
  } catch (err) {
    throw { message: err, status: 400, description: err.message };
  }
};

const getChatByExternalIdAndBotName = async (externalId, botName, chatId) => {
  try {
    const chat = await chatRepository.getChatByExternalIdAndBotName(
      chatId ? { chatId } : { externalId },
      botName
    );
    if (!chat) throw `Chat no exist`;
    let questionaryMessages = [];
    if (chat.userQuestionary)
      questionaryMessages = chat.userQuestionary.questions.flatMap((q) => {
        const questionOptionSelected = q.question?.options?.find(
          (o) => o.key === q.optionKey
        );
        return [
          {
            role: "assistant",
            data: q.question?.label || "",
            createdAt: chat.userQuestionary.createdAt,
            tokens: 0,
            totalTokens: 0,
          },
          {
            role: "user",
            data:
              questionOptionSelected?.type !== "INPUT"
                ? questionOptionSelected?.label || ""
                : q.optionValue,
            createdAt: chat.userQuestionary.createdAt,
            tokens: 0,
            totalTokens: 0,
          },
        ];
      });

    if (chat.userQuestionary?.generatedPrompt) questionaryMessages.push({
      role: "prompt",
      data: chat.userQuestionary?.generatedPrompt || "",
      createdAt: chat?.userQuestionary?.updatedAt,
      tokens: 0,
      totalTokens: 0,
    });

    const messages = await messageRepository.getMessages({
      ...(chatId ? { chatId: chatId } : { chatExternalId: externalId }),
      botName,
    });

    return {
      ...chat._doc,
      messages: {
        ...messages,
        messages: [...questionaryMessages, ...messages.messages],
      },
    };
  } catch (err) {
    throw { message: err, status: 400, description: err.message };
  }
};

const createChat = async (chat, userId) => {
  try {
    const { chatId } = chat;
    let userQuestionary;
    const chatFounded = await chatRepository.getChatbyChatId(
      chatId,
    );
    if (chatFounded) return;

    if (userId)
      userQuestionary = await userQuestionaryRepository.getUserQuestionary({
        userId,
      });

    return await chatRepository.createChat({
      ...chat,
      ...(userQuestionary
        ? { userQuestionary: userQuestionary._id.toString() }
        : {}),
    });
  } catch (err) {
    console.log(err);
  }
};

module.exports = { getChats, getChatByExternalIdAndBotName, createChat };
