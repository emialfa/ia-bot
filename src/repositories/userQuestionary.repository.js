const UserQuestionary = require("../models/UserQuestionary.model");
const Question = require("../models/Question.model");

const getUserQuestionary = async (query) => {
  return await UserQuestionary.findOne(query).populate([
    "questions.question"
  ]);
};

const createUserQuestionary = async (userQuestionary) => {
  const newUserQuestionary = new UserQuestionary(userQuestionary);
  return await newUserQuestionary.save();
};

module.exports = { getUserQuestionary, createUserQuestionary };
