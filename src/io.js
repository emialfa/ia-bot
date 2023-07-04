const conversations = [];
const questionaries = [];
let bots = [];

const openaiService = require("./services/openai.service");
const openai = require("./config/openai.config");
const chatInteractor = require("./interactors/chat.interactor");
const messageInteractor = require("./interactors/message.interactor");
const userQuestionaryInteractor = require("./interactors/userQuestionary.interactor");

const generateFirstSystemAndAssistantMessage = async (bot, userId) => {
  try {
    if (userId) {
      const userQuestionary = await userQuestionaryInteractor.getUserQuestionary(userId);
      if (!userQuestionary || bot.type !== 'webform') throw new Error;

      userQuestionary.questions.forEach(q => {
        console.log('slug:', q.question.slug)
        console.log('optionValue:', q.optionValue)
        console.log('option label:', q.question.options.find(o => o.key === q.optionKey).label)

        bot.prompt = bot.prompt.replace(q.question.slug, q.optionValue || q.question.options.find(o => o.key === q.optionKey).label)
      })

      console.log('Prompt generated with questionary answers:', bot.prompt)
    }

    const firstSystemMessage = {
      role: "system",
      content: bot.prompt,
    };
    const firstResponse = await openaiService.generateMessage(
      openai,
      bot.model,
      bot.temperature,
      [firstSystemMessage]
    );
    if (!firstResponse)
      throw new Error("Failed to generate message with openai service");
    const reply = firstResponse.data.choices[0].message["content"];
    const firstAssistantMessage = { role: "assistant", content: reply };
    if (userQuestionary && bot.type === 'webform') console.log('Response generated with questionary answers:', reply);

    return {
      firstSystemMessage,
      firstAssistantMessage,
      firstMessageTokens: firstResponse.data.usage,
    };
  } catch (error) {
    return null;
  }
};

const setBots = (botsToSet) => {
  bots = botsToSet;
};

const addBot = (bot) => {
  bots.push(bot);
};

const updateBot = (bot) => {
  console.log("Updating bot: " + bot);
  bots = [
    ...bots.filter((b) => b._id?.toString() !== bot._id?.toString()),
    bot,
  ];
};

const removeBot = (botId) => {
  bots = bots.filter((b) => b._id?.toString() !== botId?.toString());
};

const initializeIO = async (io) => {
  io.on("connection", async (socket) => {
    console.log("New client connected:", socket.id);

    // ********* questionary events *********

    socket.on("questionary", (phoneNumber) => {
      questionaries.push({
        userId: socket.id,
        phoneNumber: phoneNumber || "",
        questions: [],
      });

      socket.emit("server socket id", socket.id);
    });

    socket.on("questionary response", (questionaryResponse) => {
      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );
      socket.emit(
        "questionary response received",
        "questionary response received"
      );
      if (questionaryIndex !== -1) {
        const questionaryQuestionIndex = questionaries[questionaryIndex].questions.findIndex(q => q.question === questionaryResponse.question)
        if (questionaryQuestionIndex !== -1) {
          questionaries[questionaryIndex].questions[questionaryQuestionIndex] = questionaryResponse;
        } else {
          questionaries[questionaryIndex].questions.push(questionaryResponse);
        }
      } 
    });

    socket.on("questionary finished", async () => {
      console.log(`questionary of user "${socket.id}" finished`);
      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );
      if (questionaryIndex !== -1) {
        await userQuestionaryInteractor.createUserQuestionary(questionaries[questionaryIndex])
        questionaries.splice(questionaryIndex, 1);
        socket.emit(
          "questionary saved",
          "questionary saved"
        );
      }
    })

    // ********* bot events *********
    socket.on("bot", async (botName, formId) => {
      try {
        socket.emit("bot received", {
          body: "bot received",
        });
        const chatBot = bots.find((b) => b.name === botName);
        if (!chatBot) {
          socket.emit("bot not found", { botName: botName });
          return;
        }
        const firstSystemAndAssistantMessage =
          await generateFirstSystemAndAssistantMessage(chatBot, formId);
        if (!firstSystemAndAssistantMessage)
          throw new Error("Failed to generate message with openai service");
        const {
          firstSystemMessage,
          firstAssistantMessage,
          firstMessageTokens,
        } = firstSystemAndAssistantMessage;
        conversations.push({
          userId: socket.id,
          botName,
          lastMessages: [firstSystemMessage, firstAssistantMessage],
        });
        socket.emit("message", {
          body: firstAssistantMessage.content,
        });
        chatInteractor.createChat({
          chatId: socket.id,
          firstName: "User[web]",
          model: chatBot.model,
          botName: chatBot.name,
        }, formId);

        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          data: "Initializing chat...",
          role: "system",
          promptToken: firstMessageTokens.prompt_tokens,
          tokens: firstMessageTokens.prompt_tokens,
          totalTokens: firstMessageTokens.prompt_tokens,
        });

        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          data: firstAssistantMessage.content,
          role: "assistant",
          promptToken: firstMessageTokens.prompt_tokens,
          tokens: firstMessageTokens.completion_tokens,
          totalTokens: firstMessageTokens.total_tokens,
        });
      } catch (error) {
        console.log(error);
        socket.emit("message", {
          body: "An error has occurred. Please try again later.",
        });
      }
    });
    socket.on("message", async (content) => {
      try {
        socket.emit("message received", {
          body: "message received",
        });
        const conversationIndex = conversations.findIndex(
          (user) => user.userId === socket.id
        );
        conversations[conversationIndex].lastMessages.push({
          role: "user",
          content,
        });
        const chatBot = bots.find(
          (b) => b.name == conversations[conversationIndex].botName
        );
        const openaiResponse = await openaiService.generateMessage(
          openai,
          chatBot.model,
          chatBot.temperature,
          conversations[conversationIndex].lastMessages
        );
        if (!openaiResponse)
          throw new Error("Failed to generate message with openai service");
        const openaiReply = openaiResponse.data.choices[0].message["content"];
        conversations[conversationIndex].lastMessages.push({
          role: "assistant",
          content: openaiReply,
        });
        socket.emit("message", {
          body: openaiReply,
        });
        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          data: content,
          role: "user",
        });

        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          role: "assistant",
          data: openaiReply,
          promptToken: openaiResponse.data.usage.prompt_tokens,
          tokens: openaiResponse.data.usage.completion_tokens,
          totalTokens: openaiResponse.data.usage.total_tokens,
        });

        if (
          conversations[conversationIndex].lastMessages.length >
          (chatBot.maxMessageCount || 20)
        ) {
          conversations[conversationIndex].lastMessages.slice(1, 1);
        }
      } catch (e) {
        console.log(e);
        socket.emit("message", {
          body: "An error has occurred. Please try again later.",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      const conversationIndex = conversations.findIndex(
        (user) => user.userId === socket.id
      );
      if (conversationIndex !== -1)
        return conversations.splice(conversationIndex, 1);

      const questionaryIndex = questionaries.findIndex(
        (q) => q.userId === socket.id
      );
      if (questionaryIndex !== -1) {
        userQuestionaryInteractor.createUserQuestionary(questionaries[questionaryIndex])
        questionaries.splice(questionaryIndex, 1);
      }
    });
  });
};

module.exports = { initializeIO, setBots, addBot, updateBot, removeBot };
