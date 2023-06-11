const express = require("express");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.listen(port, () => {
  console.log("listening on port " + port);
});

module.exports = app;