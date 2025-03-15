const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Lead = new Schema(
  {
    name: String,
    email: String,
    phone: String,
    country: String,
    comment: String,
    clinics: String,
    dateLead: String,
    messageType: String,
    dateWhatsapp: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Lead", Lead);
