const mongoose = require('mongoose')
// const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const NotificationByAdminSchema = new mongoose.Schema(
    {
        sent_to:{
            type: [String],
            enum : [
                "company",
                "personal",
                "corporate"
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
    },
    {
        versionKey: false,
        timestamps: true
    }
)

NotificationByAdminSchema.plugin(mongoosePaginate)

module.exports = mongoose.model('notification_by_admin', NotificationByAdminSchema)