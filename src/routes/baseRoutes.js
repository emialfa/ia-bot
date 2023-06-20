const chatsRouter = require('./chat.routes');
const botsRouter = require('./bot.routes');

const route = (app) => {
  return (req, res, next) => {
    app.use('/api/chats', chatsRouter);
    app.use('/api/bots', botsRouter);
    // next();
  };
};

module.exports = route;
