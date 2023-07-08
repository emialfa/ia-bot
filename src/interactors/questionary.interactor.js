const questionaryRepository = require('../repositories/questionary.repository')

const getQuestionaryById = async (questionaryId) => {
    try {
      const questionary = await questionaryRepository.getQuestionaryById(questionaryId);
      if (!questionary) throw `User questionary no exist`;
      
      return questionary._doc;
    } catch (err) {
        console.log(err)
      throw { message: err, status: 400, description: err.message };
    }
  };
  
const createQuestionary = async (questionary) => {
    try {
        return await questionaryRepository.createQuestionary(questionary);
    } catch (err) {
        console.log(err);
    }
}

module.exports = { getQuestionaryById, createQuestionary };