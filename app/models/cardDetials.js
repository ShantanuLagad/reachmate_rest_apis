const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const CardDetials = new mongoose.Schema(
    {
        owner_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "User"
        },
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "company"
        },
        card_type: {
            type: String,
            enum: ["personal", "corporate", "ocr"]
        },
        primary_card: {
            type: Boolean,
            default: false
        },
        business_logo: {
            type: String,
            default: ""
        },
        qr_logo: {
            type: String,
            default: ""
        },
        text_color: {
            type: String,
            default: ""
        },
        card_color: {
            type: [String],
            default: ""
        },
        business_and_logo_status: {
            type: String,
            enum: ["both", "name", "logo"],
        },
        contact_details: {
            country_code: {
                type: String,
                default: ""
            },
            mobile_number: {
                type: String,
                default: ""
            },
            office_landline: {
                type: String,
                default: ""
            },
            email: {
                type: String,
                default: ""
            },
            website: {
                type: String,
                default: ""
            },
            mobile_number_enabled: {
                type: Boolean,
                default: true
            }
        },
        address: {
            country: String,
            state: String,
            city: String,
            address_line_1: {
                type: String,
            },
            address_line_2: {
                type: String,
            },
            pin_code: {
                type: String,
            },
        },
        bio: {
            first_name: {
                type: String,
                default: ""
            },
            last_name: {
                type: String,
                default: ""
            },
            full_name: {
                type: String,
                default: ""
            },
            business_name: {
                type: String,
                default: ""
            },
            designation: {
                type: String,
                default: ""
            }
        },
        social_links: {
            linkedin: {
                type: String,
                default: ""
            },
            linkedin_enabled: {
                type: Boolean,
                default: true
            },
            x: {
                type: String,
                default: ""
            },
            x_enabled: {
                type: Boolean,
                default: true
            },
            instagram: {
                type: String,
                default: ""
            },
            instagram_enabled: {
                type: Boolean,
                default: true
            },
            youtube: {
                type: String,
                default: ""
            },
            youtube_enabled: {
                type: Boolean,
                default: true
            }
        },
        waiting_end_time: {
            type: Date,
        },
        paid_by_company: {
            type: Boolean,
            default: false
        },
    },
    {
        versionKey: false,
        timestamps: true
    }
)


CardDetials.plugin(mongoosePaginate)


module.exports = mongoose.model('card_details', CardDetials)
