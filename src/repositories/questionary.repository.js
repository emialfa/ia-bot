const Questionary = require("../models/Questionary.model");

const getQuestionaryById = async (id) => {
  return await Questionary.findById(id).populate([
    "questions.question"
  ]);
};

const getFirstQuestionary = async () => {
  const questionary = await Questionary.find().populate(['bot']);
  const questinaryWithActiveBot = questionary.find(q => q.bot.active);
  return questinaryWithActiveBot;
};

const createQuestionary = async (questionary) => {
  const newQuestionary = new Questionary(questionary);
  return await newQuestionary.save();
};

module.exports = { getQuestionaryById, createQuestionary, getFirstQuestionary };
