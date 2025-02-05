const { Telegraf } = require("telegraf");
const { generateMessage } = require("../services/openai.service");
const chatInteractor = require('./chat.interactor');
const messageInteractor = require('./message.interactor');
const openaiService = require('../services/openai.service');
const openai = require("../config/openai.config");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const botsInitialized = [];

const initializeBot = (apiTokenTelegram, prompt, model, temperature, maxMessageCount, botName) => {
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
        try {
      await chat.sendChatAction("typing");
  
      //Log del chat de telegram con el id, nombre y tipo de chat
      // console.log({
      //   telegramMessageChat: chat.message.chat,
      // });
  
      const response = await openaiService.generateMessage(openai, model, temperature, [firstMessage])
      
      if (!response) throw new Error("Failed to generate message with openai service");
      
      reply = response.data.choices[0].message["content"];
      chat.reply(reply);
  
      // Log de la response de chatgpt
      // console.log({ chatGptResponse: response.data });
  
      // Guardamos la respuesta.
      const chatId = chat.message.chat.id;
      let conversationIndex = conversations.findIndex((c) => c.id === chatId && c.botName === botName);
  
      if (conversationIndex !== -1) {
        conversations.splice(conversationIndex, 1);
      }
  
      conversations.push({
        id: chatId,
        botName: botName || '',
        lastMessages: [firstMessage, { role: "assistant", content: reply }],
      });
  
      chatInteractor.createChat({
        externalId: chatId,
        firstName: chat?.message?.chat?.first_name,
        type: chat?.message?.chat?.type,
        model: response?.data?.model,
        botName: botName || '',
      })
  
      await messageInteractor.createMessage({
        chatExternalId: chatId,
        botName: botName || '',
        data: 'Initializing chat...',
        role: 'system',
        promptToken: response.data?.usage?.prompt_tokens,
        tokens: response.data?.usage?.prompt_tokens,
        totalTokens: response.data?.usage?.prompt_tokens,
      })
  
      await messageInteractor.createMessage({
        chatExternalId: chatId,
        botName: botName || '',
        data: reply,
        role: 'assistant',
        promptToken: response?.data?.usage?.prompt_tokens,
        tokens: response?.data?.usage?.completion_tokens,
        totalTokens: response?.data?.usage?.total_tokens,
      })
    } catch (error) {
        console.log(error);

        chat.reply("An error has occurred. Please try again later.");
        // startBot(chat);
    }
    };
  
    // Mensaje que se muestra al iniciar el Chat
    bot.start(async (chat) => {
      await startBot(chat);
    });
  
    bot.on("voice", async (ctx) => {
      try {
        const chatId = ctx.message.chat.id;
        const fileId = ctx.message.voice.file_id;
    
        // Obtener la URL del archivo de Telegram
        const fileLink = await ctx.telegram.getFileLink(fileId);
        // console.log("Descargando audio de:", fileLink);
    
        // Descargar el archivo
        const response = await axios({
          url: fileLink,
          method: "GET",
          responseType: "stream",
        });
    
        // Guardar el archivo temporalmente
        const filePath = `audio_${chatId}.ogg`;
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
    
        writer.on("finish", async () => {
          // Enviar el archivo a OpenAI Whisper
          const formData = new FormData();
          formData.append("file", fs.createReadStream(filePath));
          formData.append("model", "whisper-1");
    
          const openaiResponse = await axios.post("https://api.openai.com/v1/audio/transcriptions", formData, {
            headers: {
              Authorization: `Bearer ${process.env.API_OPENAI}`,
              ...formData.getHeaders(),
            },
          });
    
          // Enviar la transcripción al usuario
          const transcript = openaiResponse.data.text;
          // console.log("Transcripción:", transcript);
          fs.unlinkSync(filePath);

          let conversationIndex = conversations.findIndex((c) => c.id === chatId && c.botName === botName);
          if (conversationIndex !== -1) {
            conversations[conversationIndex].lastMessages.push({
              role: "user",
              content: transcript,
            });
          } else {
            conversationIndex = conversations.length;
            conversations.push({
              id: chatId,
              botName: botName || '',
              lastMessages: [firstMessage, { role: "user", content: transcript }],
            });
          }
          // Generando el mensaje...
          await ctx.sendChatAction("typing");
          const response = await openaiService.generateMessage(openai, model, temperature, conversations[conversationIndex].lastMessages)

          if (!response) throw new Error("Failed to generate message with openai service");

           // Log de la response de chatgpt
        // console.log({ chatGptResponse: response.data });
  
        // Envía la respuesta al usuario
        reply = response.data.choices[0].message["content"];
        ctx.reply(reply);
  
        // Guardamos la respuesta.
        conversations[conversationIndex].lastMessages.push({
          role: "assistant",
          content: reply,
        });
  
        // Si los mensajes guardados son mas de 20, eliminamos el primero.
        if (conversations[conversationIndex].lastMessages.length > (maxMessageCount || 20)) {
          conversations[conversationIndex].lastMessages.slice(1, 1);
        }
  
        
        await messageInteractor.createMessage({
          chatExternalId: chatId,
          botName: botName || '',
          data: transcript,
          role: 'user',
        })
  
        await messageInteractor.createMessage({
          chatExternalId: chatId,
          botName: botName || '',
          role: 'assistant',
          data: reply,
          promptToken: response.data.usage.prompt_tokens,
          tokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        })
        });
      } catch (error) {
        console.error("Error procesando el audio:", error);
        ctx.reply("Hubo un problema al procesar tu audio. Inténtalo de nuevo.");
      }
    })
    
    // Escuchamos las peticiones del usuario.
    bot.on("message", async (chat) => {
      let reply = "";
  
      //Log del chat de telegram con el id, nombre y tipo de chat
      // console.log({
      //   telegramMessageChat: chat.message.chat,
      // });
  
      // Recuperamos el mensaje y el id del usuario.
      let message = chat.message.text;
      const chatId = chat.message.chat.id;
  
      let conversationIndex = conversations.findIndex((c) => c.id === chatId && c.botName === botName);
  
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
          botName: botName || '',
          lastMessages: [firstMessage, { role: "user", content: message }],
        });
      }
  
      // Generando el mensaje...
      await chat.sendChatAction("typing");
  
      try {
        // Genera la respuesta usando la API de OpenAI
        const response = await openaiService.generateMessage(openai, model, temperature, conversations[conversationIndex].lastMessages)
        
        if (!response) throw new Error("Failed to generate message with openai service");

        // Log de la response de chatgpt
        // console.log({ chatGptResponse: response.data });
  
        // Envía la respuesta al usuario
        reply = response.data.choices[0].message["content"];
        chat.reply(reply);
  
        // Guardamos la respuesta.
        conversations[conversationIndex].lastMessages.push({
          role: "assistant",
          content: reply,
        });
  
        // Si los mensajes guardados son mas de 20, eliminamos el primero.
        if (conversations[conversationIndex].lastMessages.length > (maxMessageCount || 20)) {
          conversations[conversationIndex].lastMessages.slice(1, 1);
        }
  
        
        await messageInteractor.createMessage({
          chatExternalId: chatId,
          botName: botName || '',
          data: message,
          role: 'user',
        })
  
        await messageInteractor.createMessage({
          chatExternalId: chatId,
          botName: botName || '',
          role: 'assistant',
          data: reply,
          promptToken: response.data.usage.prompt_tokens,
          tokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        })
  
      
    } catch (e) {
        console.log(e);
  
        // Si hay un error comenzamos de vuelta el chat
        chat.reply("An error has occurred. Restarting the chat...");
        startBot(chat);
      }
    });
  
    // Inicia el bot
    bot.launch();
    console.log("bot iniciado");
  };

  const stopBot = async (botToken) => {
    const botToStopIndex = botsInitialized.findIndex((bot) => bot?.telegram?.token === botToken);
    if (botToStopIndex !== -1) {
        await botsInitialized[botToStopIndex].stop();
        botsInitialized.splice(botToStopIndex, 1)
    }
  };

module.exports = { initializeBot, stopBot };