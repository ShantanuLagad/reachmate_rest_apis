const mongoose = require('mongoose')
// const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const NotificationSchema = new mongoose.Schema(
    {
        sender_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        receiver_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        type:{
            type: String,
            enum : [
                "user",
                "company",
                "card_shared"
            ],
            required: true,
        },
        related_to : {
            type : mongoose.Schema.Types.ObjectId,
        },
        title:{
            type:String,
            required : true
        },
        body:{
            type:String,
        },
        is_seen :{
            type: Boolean,
            default:false
        },
        is_admin:{
            type: Boolean,
            default:false
        },
    },
    {
        versionKey: false,
        timestamps: true
    }
)

NotificationSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('Notification', NotificationSchema)