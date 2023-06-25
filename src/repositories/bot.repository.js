const Bot = require("../models/Bot.model");

const getBots = async (page, items, search) => {
  const bots = await Bot.find()
    .skip((page - 1) * items)
    .limit(items);

  const count = await Bot.find().countDocuments();

  return { bots, count };
};

const getBotById = async (botId) => {
  return await Bot.findById(botId);
};

const getBotByName = async (name) => {
  return await Bot.findOne({name});
}

const createBot = async (bot) => {
  const newBot = new Bot(bot);
  return await newBot.save();
};

const updateBotById = async (botId, bot) => {
  return await Bot.findByIdAndUpdate(botId, bot, { new: true });
};

const deleteBotById = async (botId) => {
  return await Bot.findByIdAndDelete(botId);
};

module.exports = { getBots, getBotById, getBotByName, createBot, updateBotById, deleteBotById };
