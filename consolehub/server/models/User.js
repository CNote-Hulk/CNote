const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username:    { type: String, required: true, unique: true, minlength: 2, maxlength: 24, trim: true },
    password:    { type: String, required: true },
    avatar:      { type: String, default: '' },
    role:        { type: String, default: 'member', enum: ['member', 'moderator', 'technician', 'admin'] },
    badges:      [{ type: String, enum: ['verified_repairer', 'restored_console', 'trusted_seller'] }],
    email:       { type: String, default: '', trim: true, maxlength: 254 },
    phone:       { type: String, default: '' },
    totalListings: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
