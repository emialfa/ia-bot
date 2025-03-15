const Lead = require("../models/Lead.model");

const findByLastPhoneDigits = async (phone) => {
  return await Lead.find({
    phone: { $regex: `${phone}$`, $options: "i" }
  });
}

const createLeads = async (leads) => {
  return await Lead.insertMany(leads);
};

module.exports = { findByLastPhoneDigits, createLeads };
