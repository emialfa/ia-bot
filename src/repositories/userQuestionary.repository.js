const UserQuestionary = require("../models/UserQuestionary.model");
const Question = require("../models/Question.model");

// (async () => {
//   const userQuestionaries = await UserQuestionary.deleteMany({ createdAt: { $lt: new Date("2024-06-07") } });
//   console.log(userQuestionaries.deletedCount, "userQuestionaries eliminados");
// })()

const getUserQuestionary = async (query) => {
  return await UserQuestionary.findOne(query).populate([
    "questions.question",
    "questionary.bot",
  ]);
};

const createUserQuestionary = async (userQuestionary) => {
  const newUserQuestionary = new UserQuestionary(userQuestionary);
  const savedUserQuestionary = await newUserQuestionary.save();

  const userQuestionaryPopulated = await UserQuestionary.findById(
    savedUserQuestionary._id
  ).populate([
    {
      path: "questionary",
      model: "Questionary",
      populate: [
        {
          path: "bot",
          model: "Bot",
        },
      ],
    },
  ]);

  return userQuestionaryPopulated;
};

const updateUserQuestionaryByUserId = async (userId, data) => {
  return await UserQuestionary.updateOne({ userId }, data);
};

module.exports = { getUserQuestionary, createUserQuestionary, updateUserQuestionaryByUserId };
