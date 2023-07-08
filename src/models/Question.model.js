const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Question = new Schema(
  {
    slug: String,
    label: String,
    options: [
      {
        key: String,
        label: String,
        imageUrl: String,
        type: {
          type: String,
          default: "BUTTON",
          enum: ["BUTTON", "INPUT"],
        },
        placeholder: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Question", Question);
