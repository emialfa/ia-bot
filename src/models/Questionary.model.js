const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Questionary = new Schema(
  {
    name:String,
    bot: {
      type: Schema.Types.ObjectId,
      ref: "Bot",
    },
    questions: [{
        type: Schema.Types.ObjectId,
        ref: "Question",
    }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Questionary", Questionary);