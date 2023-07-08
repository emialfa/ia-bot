const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Chat = new Schema(
  {
    externalId: Number,
    chatId: String,
    firstName: String,
    type: String,
    model: String,
    botName:String,
    userQuestionary: {
      type: Schema.Types.ObjectId,
      ref: "UserQuestionary",
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Chat", Chat);
