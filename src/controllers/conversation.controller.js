const WHATSAPP_BOTS_API_URL = process.env.WHATSAPP_BOTS_API_URL;
const axios = require("axios");

const contactController = {  
  async getAll(req, res) {
    try {
      const bots = await axios.get(
        `${WHATSAPP_BOTS_API_URL}/conversations?${Object.keys(req?.query)
          .map((key) => `${key}=${req?.query[key]}`)
          .join("&")}`
      );
      res.json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const bots = await axios.get(
        `${WHATSAPP_BOTS_API_URL}/conversations/` + req?.params?.id
      );
      res.json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async deactivate(req, res) {
    try {
      const bots = await axios.put(
        `${WHATSAPP_BOTS_API_URL}/conversations/deactivate/` + req?.params?.id, {}
      );
      res.json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = contactController;
