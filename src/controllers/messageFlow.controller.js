const WHATSAPP_BOTS_API_URL = process.env.WHATSAPP_BOTS_API_URL;
const axios = require("axios");

const messageFlowController = {
  async create(req, res) {
    try {
      const bots = await axios.post(
        `${WHATSAPP_BOTS_API_URL}/message-flow`,
        req?.body
      );
      res.status(201).json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async getAll(req, res) {
    try {
      const bots = await axios.get(
        `${WHATSAPP_BOTS_API_URL}/message-flow?${Object.keys(req?.query)
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
        `${WHATSAPP_BOTS_API_URL}/message-flow/` + req?.params?.id
      );
      res.json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const bots = await axios.put(
        `${WHATSAPP_BOTS_API_URL}/message-flow/${req?.params?.id}`,
        req?.body
      );
      res.json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const bots = await axios.delete(
        `${WHATSAPP_BOTS_API_URL}/message-flow/${req?.params?.id}`
      );
      res.json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = messageFlowController;
