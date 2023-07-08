const chatInteractor = require("../interactors/chat.interactor");
const { handleControllersErrors } = require("../utils/handleControllersErrors");

const getChats = async (req, res) => {
  try {
    const { page, items, search } = req.query;
    const chats = await chatInteractor.getChats(+page, +items, search);
    res.send(chats);
  } catch (e) {
    handleControllersErrors(req, res, e, "Chats can not be found");
  }
};

const getChatByExternalIdAndBotName = async (req, res) => {
  try {
    if (!req.params.externalId)
      return res.status(400).send({ message: req.t("content_not_empty") });
    const { botName, chatId } = req.query;
    const chat = await chatInteractor.getChatByExternalIdAndBotName(
      req.params.externalId,
      botName?.length ? botName : undefined,
      chatId?.length ? chatId : undefined
    );
    res.send(chat);
  } catch (err) {
    handleControllersErrors(req, res, err, "Chat can not be found");
  }
};

module.exports = { getChats, getChatByExternalIdAndBotName };
