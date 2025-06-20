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
            },
            billing_cycles: {
                type: Number
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
        plan_variety: {
            type: String,
            enum: ["freemium", "premium"]
        },
        plan_tiers: {
            type: [
                {
                    tier_type: { type: String },
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
        corporate_selected: {
            type: Boolean,
            default: false
        },
        individual_selected: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('plans', planSchema)

