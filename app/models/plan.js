const mongoose = require('mongoose')
const validator = require('validator')

const planSchema = new mongoose.Schema(
    {
        plan_id: {
            type: String,
            required: true
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
                type :String,
                required : true
            },
            amount: {
                type : Number,
                required : true
            },
            currency: {
                type :String,
                required : true
            },
            description:{
                type :String,
                default : ""
            }
        },
        amount_without_discount : {
            type : Number,
            
        },
        trial_period_days:{
            type : Number,
            default : 0
        },
        plan_type: {
            type: String,
            enum: ["individual", "company"]
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

