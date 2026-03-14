const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
    title:       { type: String, required: true, maxlength: 120, trim: true },
    category:    { type: String, required: true, enum: ['consoles', 'games', 'accessories', 'parts'] },
    price:       { type: Number, required: true, min: 0 },
    condition:   { type: String, required: true, enum: ['new', 'like_new', 'good', 'used', 'for_parts'] },
    description: { type: String, required: true, maxlength: 5000 },
    images:      [{ type: String }],
    location:    { type: String, default: '', maxlength: 100 },
    contact:     { type: String, default: '', maxlength: 30 },
    olxLink:     { type: String, default: '', maxlength: 300 },
    sellerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName:  { type: String, required: true },
    badges:      [String],
    sold:        { type: Boolean, default: false },
}, { timestamps: true });

listingSchema.index({ category: 1, createdAt: -1 });
listingSchema.index({ sellerId: 1 });

module.exports = mongoose.model('Listing', listingSchema);
