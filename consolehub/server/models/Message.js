const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    roomId:   { type: String, required: true, index: true, maxlength: 50 },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, maxlength: 24 },
    avatar:   { type: String, default: '' },
    role:     { type: String, default: 'member' },
    content:  { type: String, required: true, maxlength: 2000 },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
