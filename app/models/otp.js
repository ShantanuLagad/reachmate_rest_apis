const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const OtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true
    },
    otp: {
      type: String,
      required: true
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)
OtpSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('Otp', OtpSchema)
