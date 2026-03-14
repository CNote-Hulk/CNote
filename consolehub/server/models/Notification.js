const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:    { type: String, required: true, enum: ['forum_reply', 'repair_accepted', 'listing_interest', 'listing_sold', 'new_dm', 'upvote'] },
    message: { type: String, required: true, maxlength: 300 },
    link:    { type: String, default: '' },
    read:    { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
