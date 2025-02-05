
const mongoose = require('mongoose')
const validator = require('validator')

const paymentSchema = new mongoose.Schema(
    {
        razorpay_payment_id: { type: String },
        razorpay_order_id: { type: String },
        razorpay_signature: { type: String },
        subscription_id: { type: String },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        amount: {
            type: Number
        },
        status: {
            type: String
        },
        order_id: {
            type: String
        },
        invoice_id: {
            type: String
        },
        method: {
            type: String
        },
        description: {
            type: String
        },
        card_id: {
            type: String
        },
        wallet: {
            type: String
        },
        bank: {
            type: String
        },
        vpa: {
            type: String
        },
        acquirer_data: {
            type: mongoose.Schema.Types.Mixed
        },
        upi: {
            vpa: String
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('payments', paymentSchema)

