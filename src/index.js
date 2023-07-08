require("dotenv").config();
const { app, io } = require("./app");
const mongodb = require("./config/mongoose.config");
const telegramInteractor = require("./interactors/telegram.interactor");
const botInteractor = require("./interactors/bot.interactor");
const { initializeIO, setBots } = require("./io");
// const { gepetoBot } = require("./config/telegramBots.config")

mongodb.init();

const botsWeb = [];

const initializeTelegramBots = async () => {
  const bots = await botInteractor.getBots();
  for (const bot of bots.values) {
    if (bot.telegramToken) {
      if (process.env.NODE_ENV === "production")
        telegramInteractor.initializeBot(
          bot.telegramToken,
          bot.prompt,
          bot.model,
          bot.temperature,
          bot.maxMessageCount,
          bot.name
        );
    } else {
      botsWeb.push(bot);
    }
  }
  //  telegramInteractor.initializeBot(
  //     gepetoBot.API_TOKEN_TELEGRAM,
  //     gepetoBot.prompt,
  //     gepetoBot.openaiModel,
  //     gepetoBot.temperature,
  //     gepetoBot.maxMessageCount,
  //     gepetoBot.name
  //   );
};

const init = async () => {
  await initializeTelegramBots();
  setBots(botsWeb);
  await initializeIO(io);
};

init();
