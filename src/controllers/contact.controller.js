const WHATSAPP_BOTS_API_URL = process.env.WHATSAPP_BOTS_API_URL;
const axios = require("axios");
const { deleteMany } = require("../models/Chat.model");

const contactController = {
  async create(req, res) {
    try {
      const bots = await axios.post(
        `${WHATSAPP_BOTS_API_URL}/contact`,
        req?.body
      );
      res.status(201).json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error?.response?.data?.message || error.message });
    }
  },

  async createMany(req, res) {
    try {
      const bots = await axios.post(
        `${WHATSAPP_BOTS_API_URL}/contact/bulk`,
        req?.body
      );
      res.status(201).json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async createContatAndMessageFlow(req, res) {
    try {
      const bots = await axios.post(
        `${WHATSAPP_BOTS_API_URL}/contact/message-flow`,
        req?.body
      );
      res.status(201).json(bots?.data);
    }
    catch (error) {
      res.status(500).json({ error: error?.response?.data?.message || error.message });
    }
  },

  async getAll(req, res) {
    try {
      const bots = await axios.get(
        `${WHATSAPP_BOTS_API_URL}/contact?${Object.keys(req?.query)
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
        `${WHATSAPP_BOTS_API_URL}/contact/` + req?.params?.id
      );
      res.json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const bots = await axios.put(
        `${WHATSAPP_BOTS_API_URL}/contact/${req?.params?.id}`,
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
        `${WHATSAPP_BOTS_API_URL}/contact/${req?.params?.id}`
      );
      res.json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  async deleteMany(req, res) {
    try {
      const bots = await axios.delete(
        `${WHATSAPP_BOTS_API_URL}/contacts`,
        { data: req?.body }
      );
      res.json(bots?.data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = contactController;
