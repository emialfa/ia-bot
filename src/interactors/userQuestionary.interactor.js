const userQuestionaryRepository = require('../repositories/userQuestionary.repository')
const questionaryRepository = require('../repositories/questionary.repository')

const getUserQuestionary = async (userId) => {
    try {
      const userQuestionary = await userQuestionaryRepository.getUserQuestionary({userId});
      if (!userQuestionary) throw `User questionary no exist`;
      
      return userQuestionary._doc;
    } catch (err) {
        console.log(err)
      throw { message: err, status: 400, description: err.message };
    }
  };
  
const createUserQuestionary = async (userQuestionary) => {
    try {
        if (!userQuestionary.questionary) userQuestionary.questionary = (await questionaryRepository.getFirstQuestionary())?._id;
        if (!userQuestionary.questionary)  throw `No questionary founded`;
        return await userQuestionaryRepository.createUserQuestionary(userQuestionary);
    } catch (err) {
        console.log(err);
    }
}

module.exports = { getUserQuestionary, createUserQuestionary };