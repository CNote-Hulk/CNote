const mongoose = require('mongoose');

const repairSchema = new mongoose.Schema({
    userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username:        { type: String, required: true },
    consoleCategory: { type: String, required: true },
    description:     { type: String, required: true, maxlength: 5000 },
    image:           { type: String, default: '' },
    aiDiagnosis:     { type: String, default: '' },
    severity:        { type: String, enum: ['', 'low', 'medium', 'high'], default: '' },
    estimatedCost:   { min: { type: Number, default: 0 }, max: { type: Number, default: 0 } },
    estimatedTime:   { type: String, default: '' },
    recommendation:  { type: String, default: '' },
    status:          { type: String, default: 'pending', enum: ['pending', 'analyzed', 'submitted'] },
}, { timestamps: true });

module.exports = mongoose.model('RepairRequest', repairSchema);
