import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const Message = new Schema({
    payload: String,
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
      },
});

module.exports = mongoose.model('Message', Message)