const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')
const validator = require('validator')

const APIKeySchema = new mongoose.Schema(
  {
    client_name: {
      type: String,
    },
    client_email: {
      type: String,
    },
    api_key: {
      type: String,
      required: true,
      unique: true,
    },
    expireDate: {
      type: Date,
    },
    domain_name: {
      type: String,
      required: true,
      validate: {
        validator(v) {
          return v === '' ? true : validator.isURL(v)
        },
        message: 'NOT_A_VALID_URL'
      },
      lowercase: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'  
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)
APIKeySchema.plugin(mongoosePaginate)
module.exports = mongoose.model('APIKey', APIKeySchema)
