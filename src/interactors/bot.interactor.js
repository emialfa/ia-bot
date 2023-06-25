const botRepository = require("../repositories/bot.repository");
const telegramInteractor = require("./telegram.interactor");
const { formatResponse } = require("../utils/formatResponse.js");
const { updateBot, addBot, removeBot } = require("../io");

const getBots = async (page, items, search) => {
  try {
    const { bots, count } = await botRepository.getBots(page, items, search);
    return formatResponse(bots, count);
  } catch (err) {
    throw { message: err, status: 400, description: err.message };
  }
};

const getBotById = async (botId) => {
  try {
    const bot = await botRepository.getBotById(botId);
    if (!bot) throw `Bot no exist`;
    return bot;
  } catch (err) {
    throw { message: err, status: 400, description: err.message };
  }
};

const createBot = async (bot) => {
  try {
    const botFounded = await botRepository.getBotByName(bot.name);
    if (botFounded) throw `Bot already exist`;
    if(bot.type !== 'web') {
      throw new Error(`Bot type ${bot.type}`)
    }
    addBot(bot)
    return await botRepository.createBot(bot);
  } catch (err) {
    throw { message: err, status: 400, description: err.message };
  }
}

const updateBotById = async (botId, bot) => {
  try {
    const botFounded = await botRepository.getBotById(botId);
    if (!botFounded) throw `Bot no exist`;
    
    
    if (botFounded.chatExternalId?.length) {
      await telegramInteractor.stopBot(botFounded.telegramToken);
      telegramInteractor.initializeBot(
        bot.telegramToken || botFounded.telegramToken,
        bot.prompt || botFounded.prompt,
        bot.model || botFounded.model,
        bot.temperature || botFounded.temperature,
        bot.maxMessageCount || botFounded.maxMessageCount,
        bot.name || botFounded.name
        );
      }  else {
        updateBot({...botFounded._doc, ...bot})
      }
      
    return await botRepository.updateBotById(botId, bot);
  } catch (err) {
    throw { message: err, status: 400, description: err.message };
  }
};

const deleteBot  = async (botId) => {
  try {
    const botFounded = await botRepository.getBotById(botId);
    if (!botFounded) throw `Bot no exist`;

    console.log({botFounded})

    if(botFounded._doc?.type !== 'web') {
      throw new Error(`Bot type ${botFounded.type}`)
    }
    const botDeleted = await botRepository.deleteBotById(botId);
    removeBot(botId)
    return botDeleted;
  } catch (err) {
    throw { message: err, status: 400, description: err.message };
  }
}

module.exports = { getBots, getBotById, createBot, updateBotById, deleteBot };
