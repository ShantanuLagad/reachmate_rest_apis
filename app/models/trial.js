const mongoose = require('mongoose')
const validator = require('validator')

const trialSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        subscription_id: {
            type: String,
        },
        plan_id: {
            type: String
        },
        plan_tier: {
            tier_id: {
                type: mongoose.Schema.Types.ObjectId
            },
            amount: {
                type: Number
            },
            user_count: {
                type: Number
            },
        },
        start_at: {
            type: Date,
        },
        end_at: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ["active", "completed", "terminated"],
            default: "active"
        },
        is_new_user_trial: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('trail', trialSchema)

