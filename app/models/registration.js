const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const registrationSchema = new mongoose.Schema(
    {
        first_name: {
            type: String,
            required: true
        },
        last_name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        country_code : {
            type : String,
        },
        mobile_number: {
            type: String,
        },
        company_name: {
            type: String,
            required: true,
        },
        country: {
            type: String,
            required: true,
        },
        how_can_we_help_you: {
            type: String,
        },
        status : {
            type : String,
            enum : ["pending" , "accepted" , "declined"],
            default :"pending"
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)
registrationSchema.plugin(mongoosePaginate)


module.exports = mongoose.model('registration', registrationSchema)
