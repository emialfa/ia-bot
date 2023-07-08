const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Bot = new Schema(
  {
    name:String,
    telegramToken: String,
    model: String,
    prompt: String,
    url: String,
    temperature: Number,
    type: String,
    maxMessageCount: Number,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Bot", Bot);
