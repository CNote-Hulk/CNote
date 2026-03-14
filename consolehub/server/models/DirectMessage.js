const mongoose = require('mongoose');

const dmSchema = new mongoose.Schema({
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content:    { type: String, required: true, maxlength: 2000 },
    listingRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', default: null },
    read:       { type: Boolean, default: false },
}, { timestamps: true });

dmSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

module.exports = mongoose.model('DirectMessage', dmSchema);
