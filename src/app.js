const express = require("express");
const cors = require('cors');
const logger = require('morgan');
const path = require('path');
const chatsRouter = require('./routes/chat.routes');
const botsRouter = require('./routes/bot.routes');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cors());

app.use('/api/chats', chatsRouter);
app.use('/api/bots', botsRouter);
app.use(logger('dev'));

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


app.listen(port, () => {
  console.log("listening on port " + port);
});

module.exports = app;