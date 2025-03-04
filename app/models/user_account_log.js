const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const UserAccountLogSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        action: {
            type: String
        },
        previous_status: {
            type: String
        },
        new_status: {
            type: String
        },
        performed_by: {
            type: String,
            enum: ['user', 'admin']
        },
        date_and_time: {
            type: Date,
            default: Date.now()
        },
        start_at: {
            type: Date
        },
        end_at: {
            type: Date
        },
        session_status: {
            type: String,
            enum: ['created', 'active', 'completed'],
            default: 'created'
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

UserAccountLogSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('user_account_log', UserAccountLogSchema)


