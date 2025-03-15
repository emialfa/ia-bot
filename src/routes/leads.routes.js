const express = require('express');
const leadsController = require('../controllers/leads.controller');

const router = express.Router();

router.post('/',  leadsController.createLeads);

module.exports = router;