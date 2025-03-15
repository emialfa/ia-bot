const leadsInteractor = require('../interactors/leads.interactor');
const { handleControllersErrors } = require('../utils/handleControllersErrors');

  const createLeads = async (req, res) => {
    try {
         if (!req.body) 
             return res.status(400).send({ message: req.t('content_not_empty') });
         const leads = await leadsInteractor.createLeads(req.body)
         res.send(leads);
           
     } catch (err) {
         handleControllersErrors(req, res, err, 'Leads can not be created');
       };
 
   };

module.exports = { createLeads };