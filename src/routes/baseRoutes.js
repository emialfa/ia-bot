const chatsRouter = require('./chat.routes');

const route = (app) => {
  return (req, res, next) => {
    app.use('/api/chats', chatsRouter);
    // next();
  };
};

module.exports = route;
