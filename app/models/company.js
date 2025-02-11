const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const CompanySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      validate: {
        validator: validator.isEmail,
        message: "EMAIL_IS_NOT_VALID",
      },
      lowercase: true,
      required: false,
    },
    access_code: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    decoded_password: {
      type: String,
    },
    email_domain: {
      type: String,
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

CompanySchema.pre('save', function (next) {
  const that = this
  const SALT_FACTOR = 5
  if (!that.isModified('password')) {
    return next()
  }
  return genSalt(that, SALT_FACTOR, next)
})

CompanySchema.methods.comparePassword = function (passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  )
}


CompanySchema.plugin(mongoosePaginate)
module.exports = mongoose.model('company', CompanySchema)
