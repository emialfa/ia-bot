const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Chat = new Schema(
  {
    externalId: {
      type: Number,
      unique: true,
    },
    firstName: String,
    type: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Chat", Chat);
