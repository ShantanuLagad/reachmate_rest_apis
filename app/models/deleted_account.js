const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')
//const { stringAt } = require('pdfkit/js/data')

const deletedAccountSchema = new mongoose.Schema(
    {
        id: {
            type: mongoose.Schema.Types.ObjectId
        },
        profile_image: {
            type: String
        },
        first_name: {
            type: String,
        },
        last_name: {
            type: String,
        },
        full_name: {
            type: String
        },
        payment_mode: {
            type: String,
            enum: ["upi", "bank", "card"],
            default: "upi"
        },
        email: {
            type: String,
            validate: {
                validator: validator.isEmail,
                message: "EMAIL_IS_NOT_VALID",
            },
            lowercase: true,
            required: false,
        },
        email_verified: {
            type: Boolean,
        },
        designation: {
            type: String
        },
        Phone_number: {
            type: String
        },
        dateOfBirth: {
            type: String
        },
        sex: {
            type: String
        },
        text_color: {
            type: String,
            default: ""
        },
        social_id: {
            type: String,
        },
        social_type: {
            type: String,
            enum: ["google", "apple", null],
            default: null,
        },
        is_deleted: {
            type: Boolean,
            default: false
        },
        is_card_created: {
            type: Boolean,
            default: false
        },
        // isActivated: {
        //   type: String,
        //   enum: ['Active', 'Inactive'],
        //   default: 'Inactive'
        // },
        personal_cards: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'CardDetails',
            },
        ],
        ocr_cards: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'CardDetails',
            },
        ],
        user_type: {
            type: String,
            enum: ["personal", "corporate", "ocr"]
        },
        notification: {
            type: Boolean,
            default: true,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        },
        verification: {
            type: String
        },
        customer_id: {
            type: String
        },
        billing_address: {
            country: String,
            state: String,
            city: String,
            address_line_1: String,
            address_line_2: String,
            pin_code: String
        },

        companyAccessCardDetails: [
            {
                company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company' },
                email_domain: { type: String },
                primary_card: { type: Boolean, default: false },
                company_name: { type: String },
                access_code: { type: String },
                _id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'TeamMember',
                },
                accessCard_social_links: {
                    linkedin: {
                        type: String,
                        default: ""
                    },
                    x: {
                        type: String,
                        default: ""
                    },
                    instagram: {
                        type: String,
                        default: ""
                    },
                    youtube: {
                        type: String,
                        default: ""
                    }
                },
            },
        ],
        access_code: {
            type: String,
        },
        email_domain: {
            type: String,
        },
        profile_image: {
            type: String,
            default: ''
        },
        company_name: {
            type: String,
            default: ""
        },
        payment_mode: {
            type: String,
            enum: ["upi", "bank", "card"],
            default: "upi"
        },
        gst_no: {
            type: String,
            default: ""
        },
        business_logo: {
            type: String
        },
        qr_logo: {
            type: String,
            default: ""
        },
        bt_user_subscription_price: {
            type: Number,
            default: 0
        },
        card_color: {
            type: [String]
        },
        text_color: {
            type: String
        },
        business_and_logo_status: {
            type: String,
            enum: ["both", "name", "logo"],
        },
        primary_card: {
            type: Boolean,
            default: false
        },
        company_id: {
            type: mongoose.Schema.Types.ObjectId,
        },
        type: {
            type: String,
            enum: ["admin", "sub admin"]
        },
        notification: {
            type: Boolean,
            default: true,
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
            designation: {
                type: String,
                default: ""
            }
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
        social_links: {
            linkedin: {
                type: String,
                default: ""
            },
            x: {
                type: String,
                default: ""
            },
            instagram: {
                type: String,
                default: ""
            },
            youtube: {
                type: String,
                default: ""
            }
        },
        is_profile_completed: {
            type: Boolean,
            default: false
        },
        billing_address: {
            country: String,
            state: String,
            city: String,
            address_line_1: String,
            address_line_2: String,
            pin_code: String
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
)

deletedAccountSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('deleted_account', deletedAccountSchema)


