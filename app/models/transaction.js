const mongoose = require('mongoose')
const validator = require('validator')

const transactionSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        user_type: {
            type: String,
            enum: ["individual", "company", "user"]
        },
        country: {
            type: String,
        },
        plan_id: {
            type: String,
        },
        subcription_id: {
            type: String
        },
        amount: {
            type: String
        },
        status: {
            type: String,
            enum: ["renewed"],
            default: "renewed"
        },
        invoice: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('transactions', transactionSchema)

