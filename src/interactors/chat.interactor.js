const chatRepository = require('../repositories/chat.repository')

const createChat = async (chat) => {
    try {
        const chatFounded = await chatRepository.getChatByExternalId(chat.externalId);
        if (chatFounded) return;

        return await chatRepository.createChat(chat);
    } catch (err) {
        console.log(err);
    }
}

module.exports = { createChat };