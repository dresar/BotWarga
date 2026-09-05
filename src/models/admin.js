const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdminSchema = new Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['super', 'content', 'support'],
        default: 'content'
    },
    permissions: {
        type: [String],
        default: []
    },
    active: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to update the updatedAt field
AdminSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Static method to find admin by phone number
AdminSchema.statics.findByPhoneNumber = function(phoneNumber) {
    return this.findOne({ phoneNumber, active: true });
};

// Method to check if admin has specific permission
AdminSchema.methods.hasPermission = function(permission) {
    if (this.role === 'super') return true;
    return this.permissions.includes(permission);
};

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = Admin;