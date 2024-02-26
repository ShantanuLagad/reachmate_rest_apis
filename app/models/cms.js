const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const CMSSchema = new mongoose.Schema(
    {
      type: {
        type: String,
        enum : ["privacy_policy","terms_condition","about_us"],
        required: true
      },
      content: {
        type: String,
        required : true,
      }
    },
    {
      versionKey: false,
      timestamps: true
    }
  )
  CMSSchema.plugin(mongoosePaginate)


module.exports = mongoose.model('CMS', CMSSchema)
