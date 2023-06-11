const messageRepository = require('../repositories/message.repository')

const createMessage = async (message) => {
    try {
        return await messageRepository.createMessage(message);
    } catch (err) {
        console.log(err);
    }
}

module.exports = { createMessage };