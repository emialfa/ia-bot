const Clinic = require('../models/Clinic.model');

const getClinics = async (query, page, items) => {
  const clinics = await Clinic.find(query)
    .skip((page - 1) * items)
    .limit(items)
    .lean()

  const count = await Clinic.find(query).countDocuments();

  return { clinics, count };
}


const createCliniic = async (clinic) => {
    const newClinic = new Clinic(clinic);
    return await newClinic.save();
}

module.exports = { getClinics, createCliniic };