const Questionary = require("../models/questionary.model");

const getQuestionaryById = async (id) => {
  return await Questionary.findById(id).populate([
    "questions.question"
  ]);
};

const getFirstQuestionary = async () => {
  return await Questionary.findOne();
};

const createQuestionary = async (questionary) => {
  const newQuestionary = new Questionary(questionary);
  return await newQuestionary.save();
};

module.exports = { getQuestionaryById, createQuestionary, getFirstQuestionary };
