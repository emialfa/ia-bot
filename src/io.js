const conversations = [];
let bots = [];
const openaiService = require('./services/openai.service');
const openai = require("./config/openai.config");
const chatInteractor = require('./interactors/chat.interactor');
const messageInteractor = require('./interactors/message.interactor');

const generateFirstSystemAndAssistantMessage = async (bot) => {
  try {

    const firstSystemMessage = {
      role: "system",
      content: bot.prompt,
    };
    const firstResponse = await openaiService.generateMessage(openai, bot.model, bot.temperature, [firstSystemMessage])
    if (!firstResponse) throw new Error("Failed to generate message with openai service");
    const reply = firstResponse.data.choices[0].message["content"]
    const firstAssistantMessage = {role: "assistant", content: reply}
    return {firstSystemMessage, firstAssistantMessage, firstMessageTokens: firstResponse.data.usage};
  } catch (error) {
    return null;
  }
}

const setBots = (botsToSet) => {
  bots = botsToSet;
}

const addBot = (bot) => {
  bots.push(bot)
}

const updateBot = (bot) => {
  console.log('Updating bot: ' + bot)
  bots = [...bots.filter(b => b._id?.toString() !== bot._id?.toString()), bot]
}

const removeBot = (botId) => {
  bots = bots.filter(b => b._id?.toString()!== botId?.toString())
}

const initializeIO = async (io) => {
    io.on("connection", async (socket) => {
      console.log('New client connected:', socket.id);
      socket.on("bot", async (botName) => {
        try {
        socket.emit("bot received", {
          body: "bot received",
        });
        const chatBot = bots.find(b => b.name === botName);
        if (!chatBot) {
          socket.emit("bot not found", {botName: botName});
          return;
        }
        const firstSystemAndAssistantMessage = await generateFirstSystemAndAssistantMessage(chatBot);
        if (!firstSystemAndAssistantMessage) throw new Error("Failed to generate message with openai service");
        const { firstSystemMessage, firstAssistantMessage, firstMessageTokens } = firstSystemAndAssistantMessage;
        conversations.push({userId:socket.id, botName, lastMessages: [firstSystemMessage, firstAssistantMessage]});
        socket.emit("message", {
          body: firstAssistantMessage.content,
        });
        chatInteractor.createChat({
          chatId: socket.id,
          firstName: 'User[web]',
          model: chatBot.model,
          botName: chatBot.name,
        })
    
        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          data: 'Initializing chat...',
          role: 'system',
          promptToken: firstMessageTokens.prompt_tokens,
          tokens: firstMessageTokens.prompt_tokens,
          totalTokens: firstMessageTokens.prompt_tokens,
        })
    
        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          data: firstAssistantMessage.content,
          role: 'assistant',
          promptToken: firstMessageTokens.prompt_tokens,
          tokens: firstMessageTokens.completion_tokens,
          totalTokens: firstMessageTokens.total_tokens,
        })
        } catch (error) {
          console.log(error);
          socket.emit("message", {
            body: 'An error has occurred. Please try again later.',
          });
        }
      })
      socket.on("message", async (content) => {
        try {
        socket.emit("message received", {
          body: "message received",
        });
        const conversationIndex = conversations.findIndex(user => user.userId === socket.id);
        conversations[conversationIndex].lastMessages.push({
          role: "user",
          content,
        });
        const chatBot = bots.find(b => b.name == conversations[conversationIndex].botName);
        const openaiResponse = await openaiService.generateMessage(openai, chatBot.model, chatBot.temperature, conversations[conversationIndex].lastMessages)
        if (!openaiResponse) throw new Error("Failed to generate message with openai service");
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
          role: 'user',
        })
  
        await messageInteractor.createMessage({
          chatId: socket.id,
          botName: chatBot.name,
          role: 'assistant',
          data: openaiReply,
          promptToken: openaiResponse.data.usage.prompt_tokens,
          tokens: openaiResponse.data.usage.completion_tokens,
          totalTokens: openaiResponse.data.usage.total_tokens,
        })

        if (conversations[conversationIndex].lastMessages.length > (chatBot.maxMessageCount || 20)) {
          conversations[conversationIndex].lastMessages.slice(1, 1);
        }
      } catch (e) {
        console.log(e);
        socket.emit("message", {
          body: 'An error has occurred. Please try again later.',
        });
      }
      });
    
      socket.on("disconnect", () => {
        console.log('Client disconnected:', socket.id);
        const conversationIndex = conversations.findIndex(user => user.userId === socket.id);
        conversations.splice(conversationIndex, 1);
      })
    });
}

module.exports = { initializeIO, setBots, addBot, updateBot, removeBot };