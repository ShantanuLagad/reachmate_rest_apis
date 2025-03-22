const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')
//const { stringAt } = require('pdfkit/js/data')

const deletedAccountSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId
        },
        name: {
            type: String
        },
        email: {
            type: String,
            validate: {
                validator: validator.isEmail,
                message: "EMAIL_IS_NOT_VALID",
            },
            lowercase: true,
            required: false,
        },
        company_name: {
            type: String,
            default: ""
        },
        bio: {
            type: mongoose.Schema.Types.Mixed
        },
        contact_details: {
            type: mongoose.Schema.Types.Mixed
        },
        designation: {
            type: String
        },
        Phone_number: {
            type: String
        },
        dateOfBirth: {
            type: String
        },
        sex: {
            type: String
        },
        social_id: {
            type: String,
        },
        social_type: {
            type: String,
            enum: ["google", "apple", null],
            default: null,
        },
        user_type: {
            type: String,
            enum: ["personal", "corporate", "ocr"]
        },
        account_category: {
            type: String,
            enum: ["user", "company"]
        },
        billing_address: {
            country: String,
            state: String,
            city: String,
            address_line_1: String,
            address_line_2: String,
            pin_code: String
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

deletedAccountSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('deleted_account', deletedAccountSchema)


