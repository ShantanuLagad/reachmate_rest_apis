const mongoose = require('mongoose')
// const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const NotificationSchema = new mongoose.Schema(
    {
        sender_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        receiver_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        type: {
            type: String,
            enum: [
                "user",
                "company",
                "card_shared",
                "by_admin",
                "removed_from_paid",
                "need_subscription_upgrade",

                "new_subscription",
                "subscription_upgrade",
                "subscription_downgrade",
                "subscription_cancelled",
                "new_trial",
                "free_trial_to_new_user",
                "trial_expired",
                "admin_action"
            ],
            required: true,
        },
        related_to: {
            type: mongoose.Schema.Types.ObjectId,
        },
        title: {
            type: String,
            required: true
        },
        body: {
            type: String,
        },
        is_seen: {
            type: Boolean,
            default: false
        },
        is_admin: {
            type: Boolean,
            default: false
        },
    },
    {
        versionKey: false,
        timestamps: true
    }
)

NotificationSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('Notification', NotificationSchema)