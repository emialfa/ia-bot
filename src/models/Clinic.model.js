const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Clinic = new Schema({
  nombre: Object,
  cualidades: String,
  ranking: Number,
  coordenadas: String,
  descripcion: Object,
  precio: String,
  foliculos: Object,
  Ubicación: String,
  imagenurl: String,
  url: Object,
  qualifications: {
    stars: Number,
    reviews: Number,
    googleurl: String,
  },
});

module.exports = mongoose.model("Clinic", Clinic);
