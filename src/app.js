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
   cors: {
     origin: "http://localhost:5173",
   },
});

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

const usersConnected = [];

io.on("connection", (socket) => {
  console.log('New client connected:', socket.id);
  usersConnected.push({userId:socket.id, lastMessages: []});
  console.log({usersConnected})
  socket.on("message", (body) => {
    socket.emit("message received", {
      body,
    });
    socket.emit("message", {
      body: "probando",
    });
    
    const userIndex = usersConnected.findIndex(user => user.userId === socket.id);
    usersConnected[userIndex].lastMessages.push(body);
    console.log({usersConnected})
  });

  socket.on("disconnect", () => {
    console.log('Client disconnected:', socket.id);
    const userIndex = usersConnected.findIndex(user => user.userId === socket.id);
    usersConnected.splice(userIndex, 1);
  })
});

server.listen(port, () => {
  console.log("listening on port " + port);
});

module.exports = app;