const mongoose = require('mongoose')
const bcrypt = require('bcrypt-nodejs')
const validator = require('validator')
const mongoosePaginate = require('mongoose-paginate-v2')

const UserSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
    },
    last_name: {
      type: String,
    },
    full_name : {
      type: String
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
    email_verified : {
      type : Boolean,
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
      type : String,
      default :""
    },
    social_id : {
      type: String,
    },
    social_type: {
      type: String,
      enum: ["google","apple", null],
      default: null,
    },
    is_card_created : {
      type : Boolean,
      default : false
    },
    user_type : {
      type : String,
      enum : ["personal" , "corporate"]
    },
    notification : {
      type : Boolean,
      default : true,
    },
    status : {
      type : String,
      enum : ["active" , "inactive"],
      default : "active"
    },
    verification: {
      type: String
    },
  
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

UserSchema.pre('save', function(next) {
  const that = this
  const SALT_FACTOR = 5
  if (!that.isModified('password')) {
    return next()
  }
  return genSalt(that, SALT_FACTOR, next)
})

UserSchema.methods.comparePassword = function(passwordAttempt, cb) {
  bcrypt.compare(passwordAttempt, this.password, (err, isMatch) =>
    err ? cb(err) : cb(null, isMatch)
  )
}
UserSchema.plugin(mongoosePaginate)
module.exports = mongoose.model('User', UserSchema)
