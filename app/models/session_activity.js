const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const SessionActivitySchema = new mongoose.Schema(
    {
        session_unique_id: {
            type: String
        },
        session_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "account_session"
        },
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        action: {
            type: String
        },
        route: {
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
        status: {
            type: String,
            enum: ['active', 'completed'],
            default: 'active'
        },
        session_count: {
            type: Number,
            required: true
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

SessionActivitySchema.plugin(mongoosePaginate)
module.exports = mongoose.model('session_activity', SessionActivitySchema)