const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')
//const { stringAt } = require('pdfkit/js/data')

const UserSchema = new mongoose.Schema(
  {
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
    password: {
      type: String,
      required: true,
      // select: false
    },
    confirm_password: {
      type: String,
      // required: true,
      // select: false
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
      enum: ["personal", "corporate"]
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
  },
  {
    versionKey: false,
    timestamps: true
  }
)

const hash = (user, salt, next) => {
  bcrypt.hash(user.password, salt, null, (error, newHash) => {
    if (error) {
      return next(error)
    }
    user.password = newHash
    return next()
  })
}

const genSalt = (user, SALT_FACTOR, next) => {
  bcrypt.genSalt(SALT_FACTOR, (err, salt) => {
    if (err) {
      return next(err)
    }
    return hash(user, salt, next)
  })
}

UserSchema.pre('save', function (next) {
  const that = this
  const SALT_FACTOR = 5
  if (!that.isModified('password')) {
    return next()
  }
  return genSalt(that, SALT_FACTOR, next)
})

UserSchema.methods.comparePassword = function (passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  )
}
UserSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('User', UserSchema)


