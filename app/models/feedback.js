const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const feedbackSchema = new mongoose.Schema(
    {
      user_id : {
        type : mongoose.Schema.Types.ObjectId,
        required : true
      },
      message: {
        type: String,
        required : true,
      }
    },
    {
      versionKey: false,
      timestamps: true
    }
  )
  feedbackSchema.plugin(mongoosePaginate)


module.exports = mongoose.model('feedback', feedbackSchema)
