import mongoose from "mongoose";

const Schema = mongoose.Schema;

const Chat = new Schema({
  externalId: String,
  firstName: String,
  type: String,
});

module.exports = mongoose.model("Chat", Chat);
