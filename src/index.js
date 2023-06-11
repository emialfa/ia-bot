const { Telegraf } = require("telegraf");
require("dotenv").config();
require("./app")
const mongodb = require('./config/mongoose.config');
const chatInteractor = require('./interactors/chat.interactor');
const messageInteractor = require('./interactors/message.interactor');

// APIs
const openaiApi = require("./config/openai.config");
const { gepetoBot, IAExpert } = require("./config/telegramBots.config");

mongodb.init();

const botsInitialized = [];

const initializeBot = (openai, apiTokenTelegram, prompt, model) => {
  // Iniciamos Bot de Telegram
  const bot = new Telegraf(apiTokenTelegram);
  botsInitialized.push(bot);

  // Creamos array de conversaciones para mantener en memoria los diferentes chats
  const conversations = [];

  // Definimos el tono del bot y algunas reglas
  const firstMessage = {
    role: "system",
    content: prompt,
  };

  const startBot = async (chat) => {
    await chat.sendChatAction("typing");

    //Log del chat de telegram con el id, nombre y tipo de chat
    console.log({
      telegramMessageChat: chat.message.chat,
    });

    const response = await openai.createChatCompletion({
      model,
      messages: [firstMessage],
    });

    reply = response.data.choices[0].message["content"];
    chat.reply(reply);

    // Log de la response de chatgpt
    console.log({ chatGptResponse: response.data });

    // Guardamos la respuesta.
    const chatId = chat.message.chat.id;
    let conversationIndex = conversations.findIndex((c) => c.id === chatId);

    if (conversationIndex !== -1) {
      conversations.splice(conversationIndex, 1);
    }

    conversations.push({
      id: chatId,
      lastMessages: [firstMessage, { role: "assistant", content: reply }],
    });

    chatInteractor.createChat({
      externalId: chatId,
      firstName: chat.message.chat.first_name,
      type: chat.message.chat.type,
      model: response.data.model,
    })

    messageInteractor.createMessage({
      chatExternalId: chatId,
      data: 'Initializing chat...',
      role: 'system',
      promptToken: response.data.usage.prompt_tokens,
      tokens: response.data.usage.prompt_tokens,
      totalTokens: response.data.usage.prompt_tokens,
    })

    messageInteractor.createMessage({
      chatExternalId: chatId,
      data: reply,
      role: 'assistant',
      promptToken: response.data.usage.prompt_tokens,
      tokens: response.data.usage.completion_tokens,
      totalTokens: response.data.usage.total_tokens,
    })
  };

  // Mensaje que se muestra al iniciar el Chat
  bot.start(async (chat) => {
    await startBot(chat);
  });

  // Escuchamos las peticiones del usuario.
  bot.on("message", async (chat) => {
    let reply = "";

    //Log del chat de telegram con el id, nombre y tipo de chat
    console.log({
      telegramMessageChat: chat.message.chat,
    });

    // Recuperamos el mensaje y el id del usuario.
    let message = chat.message.text;
    const chatId = chat.message.chat.id;

    let conversationIndex = conversations.findIndex((c) => c.id === chatId);

    // Filtramos el mensaje '/start' que inicia el chat, si hay un chat guardado con ese id lo reiniciamos
    if (message.toString().toLowerCase() === "/start") {
      return;
    }

    // Guardamos el mensaje en el array para darle contexto al bot.
    if (conversationIndex !== -1) {
      conversations[conversationIndex].lastMessages.push({
        role: "user",
        content: message,
      });
    } else {
      conversationIndex = conversations.length;
      conversations.push({
        id: chatId,
        lastMessages: [firstMessage, { role: "user", content: message }],
      });
    }

    messageInteractor.createMessage({
      chatExternalId: chatId,
      data: message,
      role: 'user',
    })

    // Generando el mensaje...
    await chat.sendChatAction("typing");

    try {
      // Genera la respuesta usando la API de OpenAI
      const response = await openai.createChatCompletion({
        model,
        messages: conversations[conversationIndex].lastMessages,
      });

      // Log de la response de chatgpt
      console.log({ chatGptResponse: response.data });

      // Envía la respuesta al usuario
      reply = response.data.choices[0].message["content"];
      chat.reply(reply);

      // Guardamos la respuesta.
      conversations[conversationIndex].lastMessages.push({
        role: "assistant",
        content: reply,
      });

      messageInteractor.createMessage({
        chatExternalId: chatId,
        role: 'assistant',
        data: reply,
      })

      // Si los mensajes guardados son mas de 20, eliminamos el primero.
      if (conversations[conversationIndex].lastMessages.length > 20) {
        conversations[conversationIndex].lastMessages.slice(1, 1);
      }
    } catch (e) {
      console.log(e);

      // Si hay un error comenzamos de vuelta el chat
      chat.reply("Se ha producido un error. Reiniciando chat...");
      startBot(chat);
    }
  });

  const stopBot = (botToken) => {
    const botToStop = botsInitialized.find((bot) => bot.token === botToken);
    botToStop.stop();
  };

  // Inicia el bot
  bot.launch();
  console.log("bot iniciado");
};

//  initializeBot(
//    openaiApi,
//    gepetoBot.API_TOKEN_TELEGRAM,
//    gepetoBot.prompt,
//    gepetoBot.openaiModel,
//  );
// initializeBot(openaiApi, IAExpert.API_TOKEN_TELEGRAM, IAExpert.prompt, IAExpert.openaiModel);
// initializeBot(IAExpert.API_TOKEN_TELEGRAM, openaiAPi, IAExpert.prompt, 'text-davinci-003');
