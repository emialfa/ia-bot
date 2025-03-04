const { default: axios } = require("axios");
const chatRepository = require("../repositories/chat.repository");
const messageRepository = require("../repositories/message.repository");
const userQuestionaryRepository = require("../repositories/userQuestionary.repository");

const { formatResponse } = require("../utils/formatResponse.js");

getImageByQuestionSlugAndKey = (slug, key) => {
  switch (slug) {
    case "alopecia_degree":
      switch (key) {
        case "a":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1719166039/1-a_kpgnbo.png";
        case "b":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1719166825/1_-_c_cqijfu.png";
        case "c":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1719166825/1-b_gfbich.png";
        case "d":
          return "";
      }
    case "how_far_would_you_travel":
      switch (key) {
        case "a":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838909/Up_to_20_km_cvswci.svg";
        case "b":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838909/Up_to_100_km_iiqwwk.svg";
        case "c":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1718590862/abroad_joqsch.svg";
      }
    case "residential_zone":
      switch (key) {
        case "a":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838912/Spain_axbfsx.svg";
        case "b":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838869/Flag_USA_hvwwuu.svg";
        case "c":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838869/Flag_Europe_fa3pxg.svg";
        case "d":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838869/Flag_Other_zmykkx.svg";
      }
    case "hair_transplant_desired_date":
      switch (key) {
        case "a":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838602/As_soon_as_possible_pbz1a3.svg";
        case "b":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838870/In_the_next_six_month_ynbtue.svg";
        case "c":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838870/I_just_want_to_inform_myself_bhqwql.svg";
      }
    case "method_to_contact":
      switch (key) {
        case "a":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1725754768/videocall_d5osh5.svg";
        case "b":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838908/Phone_umxcsz.svg";
        case "c":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838910/whatsapp_p2p94u.svg";
        case "d":
          return "https://res.cloudinary.com/drjpyco3i/image/upload/v1688838872/mail_lncha8.svg";
      }
    default:
      return "";
  }
};

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
                : `${q.optionValue || ""}${
                    questionOptionSelected?.label
                      ? ` (${questionOptionSelected?.label || ""})`
                      : ""
                  }`,
            createdAt: chat.userQuestionary.createdAt,
            tokens: 0,
            totalTokens: 0,
            ...([
              "alopecia_degree",
              "doctor_selection_criteria",
              "how_far_would_you_travel",
              "residential_zone",
              "hair_transplant_desired_date",
              "how_much_do_you_plan_to_invest",
              "method_to_contact",
            ].includes(q.question?.slug)
              ? {
                  map: {
                    src: getImageByQuestionSlugAndKey(
                      q.question?.slug,
                      q.optionKey
                    ),
                    text:
                      questionOptionSelected?.type !== "INPUT"
                        ? questionOptionSelected?.label || ""
                        : `${q.optionValue || ""}${
                            questionOptionSelected?.label
                              ? ` (${questionOptionSelected?.label || ""})`
                              : ""
                          }`,
                  },
                }
              : {}),
          },
        ];
      });

    if (chat.userQuestionary?.generatedPrompt)
      questionaryMessages.push({
        role: "prompt",
        data: chat.userQuestionary?.generatedPrompt || "",
        createdAt: chat?.userQuestionary?.updatedAt,
        tokens: 0,
        totalTokens: 0,
      });

    if (chat.userQuestionary?.calculatedClinicsLogs?.length)
      questionaryMessages.push({
        role: "calculateClinicLogs",
        data: JSON.stringify(chat.userQuestionary?.calculatedClinicsLogs) || "",
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

const createChat = async (
  chat,
  userId,
  questionaryPrompt,
  responsePrompt,
  calculatedClinics,
  calculatedClinicsLogs
) => {
  try {
    const { externalId, chatId } = chat;
    let userQuestionary;
    const chatFounded = await chatRepository.getChatByExternalIdAndBotName(
      externalId ? { externalId } : { chatId },
      chat.botName
    );
    if (chatFounded) return;

    if (userId)
      userQuestionary = await userQuestionaryRepository.getUserQuestionary({
        userId,
      });
    if (userId && (questionaryPrompt || calculatedClinics))
      await userQuestionaryRepository.updateUserQuestionaryByUserId(userId, {
        generatedPrompt: questionaryPrompt,
        firstResponsePrompt: responsePrompt,
        calculatedClinics: calculatedClinics,
        calculatedClinicsLogs: calculatedClinicsLogs,
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

const createStaticChat = async (chat, userId) => {
  try {
    const { chatId } = chat;
    let userQuestionary;
    const chatFounded = await chatRepository.getChatbyChatId(chatId);
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

const exportToDriveAndTrello = async (body) => {
  try {
    await axios.post(
      "https://hook.eu2.make.com/d5kybicwheb8j9atg8kxnn1i8ynofnsk",
      body
    );
  } catch (err) {
    throw { message: err, status: 400, description: err.message };
  }
}

module.exports = {
  getChats,
  getChatByExternalIdAndBotName,
  createChat,
  createStaticChat,
  exportToDriveAndTrello,
};
