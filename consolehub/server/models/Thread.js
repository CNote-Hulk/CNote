const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, maxlength: 24 },
    body:     { type: String, required: true, maxlength: 5000 },
    upvotes:  { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const threadSchema = new mongoose.Schema({
    consoleCategory: { type: String, required: true, index: true },
    title:    { type: String, required: true, maxlength: 200 },
    body:     { type: String, required: true, maxlength: 10000 },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, maxlength: 24 },
    tag:      { type: String, default: 'General', enum: ['Help', 'Fix', 'Showcase', 'Buy & Sell', 'General'] },
    replies:  [replySchema],
    views:    { type: Number, default: 0 },
    upvotes:  { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Thread', threadSchema);
