const mongoose = require('mongoose')
const validator = require('validator')

const trialSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        plan_id: {
            type: String
        },
        plan_tier_id: {
            type: mongoose.Schema.Types.ObjectId
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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('trail', trialSchema)

