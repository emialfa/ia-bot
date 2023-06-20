require("dotenv").config();
require("./app")
const mongodb = require('./config/mongoose.config');
const telegramInteractor = require('./interactors/telegram.interactor');
const botInteractor = require('./interactors/bot.interactor');

mongodb.init();

const initializeBots = async () => {
  const bots = await botInteractor.getBots();
  for (const bot of bots.values) {
    telegramInteractor.initializeBot(bot.telegramToken, bot.prompt, bot.model, bot.name);
  }
}

initializeBots();