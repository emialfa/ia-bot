const messageRepository = require('../repositories/message.repository')

const getMessage = async (query) => {
    try {
        return await messageRepository.getMessage(query);
    } catch (err) {
        console.log(err);
    }
}

const createMessage = async (message) => {
    try {
        return await messageRepository.createMessage(message);
    } catch (err) {
        console.log(err);
    }
}

module.exports = { getMessage, createMessage };