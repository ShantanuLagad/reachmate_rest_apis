const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const SharedCards = new mongoose.Schema(
  {
    card_id : {
        type : mongoose.Schema.Types.ObjectId,
        required : true,
        ref : "card_details"
    },
    user_id :  {
        type : mongoose.Schema.Types.ObjectId,
        required:true,
        ref : "User"
    },
    card_owner_id : {
        type : mongoose.Schema.Types.ObjectId,
        required:true,
        ref : "User"
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
)


SharedCards.plugin(mongoosePaginate)


module.exports = mongoose.model('SharedCards', SharedCards)
