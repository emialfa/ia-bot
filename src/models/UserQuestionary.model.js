const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserQuestionary = new Schema(
  {
    userId: String,
    phoneNumber: String,
    questionary: {
      type: Schema.Types.ObjectId,
      ref: "Questionary",
    },
    questions: [
      {
        question: {
          type: Schema.Types.ObjectId,
          ref: "Question",
        },
        optionKey: String,
        optionValue: String,
        backupQuestion: {
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
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("UserQuestionary", UserQuestionary);
