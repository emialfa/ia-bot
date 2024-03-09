const express = require("express");
const http = require("http");
const cors = require('cors');
const logger = require('morgan');
const path = require('path');
const { Server: SocketServer } = require("socket.io");
const chatsRouter = require('./routes/chat.routes');
const botsRouter = require('./routes/bot.routes');

const app = express();

const server = http.createServer(app);
const port = process.env.PORT || 5000;

const io = new SocketServer(server, {
   cors: process.env.NODE_ENV === "development" ? {
     origin: "http://127.0.0.1:5173",
   } : {},
});


app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cors());

app.use('/hair-questionary/api/chats', chatsRouter);
app.use('/hair-questionary/api/bots', botsRouter);
app.use(logger('dev'));

app.use('/hair-questionary/', express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

server.listen(port, () => {
  console.log("listening on port " + port);
});

module.exports = { app, io };