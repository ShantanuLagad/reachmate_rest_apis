const mongoose = require('mongoose')
const validator = require('validator')

const paidByCompanySchema = new mongoose.Schema(
    {
        company_id : {
            type : mongoose.Schema.Types.ObjectId,
            required : true
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
        is_card_created : {
            type : Boolean,
            default : false
        }
    },
    {
        timestamps : true
    }
    
    );

module.exports = mongoose.model('paid_by_company', paidByCompanySchema)

