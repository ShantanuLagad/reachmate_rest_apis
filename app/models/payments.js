
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
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('payments', paymentSchema)

