const UserQuestionary = require("../models/UserQuestionary.model");
const Question = require("../models/Question.model");

const getUserQuestionary = async (query) => {
  return await UserQuestionary.findOne(query).populate([
    "questions.question",
    "questionary.bot",
  ]);
};

const createUserQuestionary = async (userQuestionary) => {
  const newUserQuestionary = new UserQuestionary(userQuestionary);
  const savedUserQuestionary = await newUserQuestionary.save();

  const userQuestionaryPopulated = await UserQuestionary.findById(savedUserQuestionary._id).populate([{
    path: 'questionary',
    model: 'Questionary',
    populate: [
      {
        path: 'bot',
        model: 'Bot',
      }
    ]
  }]);

  return userQuestionaryPopulated;
};

module.exports = { getUserQuestionary, createUserQuestionary };
