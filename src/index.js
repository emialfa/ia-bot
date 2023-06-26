require("dotenv").config();
const { app, io } = require("./app");
const mongodb = require("./config/mongoose.config");
const telegramInteractor = require("./interactors/telegram.interactor");
const botInteractor = require("./interactors/bot.interactor");
const { initializeIO, setBots } = require("./io");

mongodb.init();

const botsWeb = [];

const initializeTelegramBots = async () => {
  const bots = await botInteractor.getBots();
  for (const bot of bots.values) {
    if (bot.telegramToken) {
      // telegramInteractor.initializeBot(
      //   bot.telegramToken,
      //   bot.prompt,
      //   bot.model,
      //   bot.temperature,
      //   bot.maxMessageCount,
      //   bot.name
      // );
    } else {
      botsWeb.push(bot);
    }
  }
};

const init = async () => {
  await initializeTelegramBots();
  setBots(botsWeb);
  await initializeIO(io);
};

init();
