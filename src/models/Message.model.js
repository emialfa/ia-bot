const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Message = new Schema(
  {
    data: String,
    chatExternalId: String,
    botName: String,
    role: {
      type: String,
      enum: ["system", "assistant", "user"],
    },
    promptToken: {
      type: Number,
      default: 0,
    },
    tokens: {
      type: Number,
      default: 0,
    },
    totalTokens: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", Message);
