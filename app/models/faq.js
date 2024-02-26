const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const FAQSchema = new mongoose.Schema(
    {
      question: {
        type: String,
        required : true,
      },
      answer: {
        type: String,
        required : true,
      }
    },
    {
      versionKey: false,
      timestamps: true
    }
  )
  FAQSchema.plugin(mongoosePaginate)


module.exports = mongoose.model('faq', FAQSchema)
