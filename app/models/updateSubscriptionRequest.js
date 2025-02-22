const mongoose = require('mongoose')
const validator = require('validator')

const updateSubscriptionRequest = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        subscription_id: {
            type: String,
            required: true
        },
        plan_id: {
            type: String,
            required: true
        },
        payment_id: {
            type: String
        },
        plan_started_at: {
            type: Date,
            required: true
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
            razorpay_order: {
                id: {
                    type: String
                },
            }
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
            enum: ["approved", "pending", "cancel"],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('update_subscription_request', updateSubscriptionRequest)

