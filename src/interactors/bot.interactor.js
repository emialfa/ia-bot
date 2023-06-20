const botRepository = require("../repositories/bot.repository");
const telegramInteractor = require("./telegram.interactor");
const { formatResponse } = require("../utils/formatResponse.js");

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

const updateBotById = async (botId, bot) => {
  try {
    const botFounded = await botRepository.getBotById(botId);
    if (!botFounded) throw `Bot no exist`;

    await telegramInteractor.stopBot(botFounded.telegramToken);
    telegramInteractor.initializeBot(
      bot.telegramToken || botFounded.telegramToken,
      bot.prompt || botFounded.prompt,
      bot.model || botFounded.model,
      bot.name || botFounded.name
    );

    return await botRepository.updateBotById(botId, bot);
  } catch (err) {
    console.log(err);
  }
};

module.exports = { getBots, getBotById, updateBotById };
