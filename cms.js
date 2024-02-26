const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const CMSSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum : ["privacy_policy","terms","return_exchange_policy","shipping_delivery_policy","help_support","communication_policy"],
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
module.exports = mongoose.models.CMS || mongoose.model('CMS', CMSSchema)
