const mongoose = require('mongoose');
const validator = require('validator');
const mongoosePaginate = require('mongoose-paginate-v2');


const teamMemberSchema = new mongoose.Schema({
  
  first_name: { type: String },
  
  last_name: { type: String },

  work_email: {
    type: String,
    validate: {
      validator: validator.isEmail,
      message: "EMAIL_IS_NOT_VALID",
    },
    lowercase: true,
  },
  designation: { 
    type: String
 },
  phone_number: {
    type: String,
    validate: {
      validator: (v) => /^[0-9]{10}$/.test(v),
      message: "PHONE_NUMBER_IS_NOT_VALID",
    },
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  company_details: 
    {
       company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'company', required: true },
        email_domain: { type: String }, 
        company_name: { type: String }, 
        access_code:{type:String},
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
  
},{
  timestamps: true
}

);

teamMemberSchema.virtual('full_name').get(function () {
  return `${this.first_name} ${this.last_name}`;
});

teamMemberSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('TeamMember', teamMemberSchema);

