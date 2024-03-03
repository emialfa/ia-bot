require("dotenv").config();
const { app, io } = require("./app");
const mongodb = require("./config/mongoose.config");
const { initializeIO } = require("./io");

mongodb.init();

const botsWeb = [];

const init = async () => {
  await initializeIO(io);
};

init();
