const mongoose = require('mongoose')
const validator = require('validator')

const planSchema = new mongoose.Schema(
    {
        plan_id: {
            type: String,
        },
        period: {
            type: String,
            required: true,
            enum: ["daily", "weekly", "monthly", "quarterly", "yearly"]
        },
        interval: {
            type: Number,
            required: true
        },
        item: {
            name: {
                type: String,
            },
            amount: {
                type: Number,
            },
            currency: {
                type: String,
            },
            description: {
                type: String,
                default: ""
            }
        },
        amount_without_discount: {
            type: Number,

        },
        trial_period_days: {
            type: Number,
            default: 0
        },
        plan_type: {
            type: String,
            enum: ["individual", "company"]
        },
        plan_tiers: {
            type: [
                {
                    plan_ids: { type: String },
                    min_users: { type: Number },
                    max_users: { type: Number },
                    per_user_charge: { type: Number }
                }
            ],
            default: []
        },
        allowed_user: {
            type: Number,
        },
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('plans', planSchema)

