const mongoose = require("mongoose");
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(`${MONGODB_URI}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connection ready 🌱");
  })
  .catch((err) => {
    console.log(`MongoDB connection error: ${err}`);
  });

const init = async () => {
  return mongoose.connection;
};

const close = async () => {
  mongoose.disconnect().then(() => console.log("MongoDB closed connection"));
};

module.exports = { init, close };
