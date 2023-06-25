const botInteractor = require('../interactors/bot.interactor');
const { handleControllersErrors } = require('../utils/handleControllersErrors');

const getBots = async (req, res) => {
    try {
      const { page, items, search } = req.query;
      const bots = await botInteractor.getBots(+page, +items, search);
      res.send(bots);
    } catch (e) {
      handleControllersErrors(req, res, e, 'Bots can not be found');
    }
  };

  const getBotById = async (req, res) => {
   try {
        if (!req.params.id) 
            return res.status(400).send({ message: req.t('content_not_empty') });
        const bot = await botInteractor.getBotById(req.params.id)
        res.send(bot);
          
    } catch (err) {
        handleControllersErrors(req, res, err, 'Bot can not be found');
      };

  };

  const createBot = async (req, res) => {
    try {
         if (!req.body) 
             return res.status(400).send({ message: req.t('content_not_empty') });
         const bot = await botInteractor.createBot(req.body)
         res.send(bot);
           
     } catch (err) {
         handleControllersErrors(req, res, err, 'Bot can not be found');
       };
 
   };

  const updateBotById = async (req, res) => {
    try {
         if (!req.params.id || !req.body) 
             return res.status(400).send({ message: req.t('content_not_empty') });
         const bot = await botInteractor.updateBotById(req.params.id, req.body)
         res.send(bot);
           
     } catch (err) {
         handleControllersErrors(req, res, err, 'Bot can not be found');
       };
   };

   const deleteBot = async (req, res) => {
    try {
      const { id } = req.params;
  
      if (!id) {
        throw { message: 'content_not_empty', status: 400, description: 'Error: Param ID empty' };
      }
      const bot = await botInteractor.deleteBot(id);
      res.send(bot);
    } catch (e) {
      handleControllersErrors(req, res, e, 'colors_error_delete');
    }
   }

module.exports = { getBots, getBotById, createBot, updateBotById, deleteBot };