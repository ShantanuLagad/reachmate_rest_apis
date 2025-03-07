const model = require('../models/user')
const uuid = require('uuid')
const { matchedData } = require('express-validator')
const utils = require('../middleware/utils')
const db = require('../middleware/admin_db')
const APIKey = require('../models/api_keys')
var generator = require('generate-password');
const Transaction = require("../models/transaction");
const { Country, State, City } = require('country-state-city');
const Registration = require("../models/registration")
const ContactUs = require("../models/contactUs")
const moment = require("moment")
const crypto = require("crypto")
const {
  INTERNAL_SERVER_ERROR
} = require('../middleware/error_messages')
const emailer = require('../middleware/emailer')
const {
  POST,
  GET
} = require('../middleware/axios')

const {
  handleError,
  buildErrObject,
  itemNotFound,
  getIP,
  getBrowserInfo,
} = require("../middleware/utils");


const Razorpay = require('razorpay');

var instance = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});


const {
  uploadFile,
  capitalizeFirstLetter,
  convertToObjectIds,
} = require("../shared/helpers");
const auth = require('../middleware/auth')
const Admin = require("../models/admin")
const User = require("../models/user.js")
const UserAccess = require("../models/userAccess")
const Company = require("../models/company")
const CardDetials = require('../models/cardDetials')
const FAQ = require('../models/faq')
const Feedback = require('../models/feedback')
const Support = require('../models/support')
const CMS = require('../models/cms')
const Reset = require("../models/reset_password")
const Notification = require("../models/notification")
const NotificationByAdmin = require("../models/notification_by_admin")
const { getCode, getName } = require('country-list');
const mongoose = require("mongoose")
const jwt = require('jsonwebtoken')
const { off } = require('process')
const { json } = require('stream/consumers')
const { count } = require('console')
const { stat } = require('fs')
const user = require('../models/user')
const cardDetials = require('../models/cardDetials')
const sharedCards = require('../models/sharedCards.js')
const user_account_log = require('../models/user_account_log.js')
const Subscription = require('../models/subscription.js')
const Plan = require('../models/plan.js')


const generateToken = (_id, role, remember_me) => {
  // Gets expiration time

  const expiration = Math.floor(Date.now() / 1000) + 60 * (remember_me === true ? process.env.JWT_EXPIRATION_IN_MINUTES_FOR_REMEMBER_ME : process.env.JWT_EXPIRATION_IN_MINUTES);


  // returns signed and encrypted token
  return auth.encrypt(
    jwt.sign(
      {
        data: {
          _id,
          role,
          type: 'admin'
        },
        exp: expiration
      },
      process.env.JWT_SECRET
    )
  )
}


function generateAccessCode() {
  // Generate 4 random characters
  var chars = '';
  var charLength = 4;
  for (var i = 0; i < charLength; i++) {
    chars += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }

  // Generate 2 random digits
  var digits = '';
  var digitLength = 2;
  for (var j = 0; j < digitLength; j++) {
    digits += Math.floor(Math.random() * 10);
  }

  // Combine characters and digits
  var code = chars + digits;
  // Convert to array to shuffle
  var codeArray = code.split('');
  for (var k = codeArray.length - 1; k > 0; k--) {
    var randIndex = Math.floor(Math.random() * (k + 1));
    var temp = codeArray[k];
    codeArray[k] = codeArray[randIndex];
    codeArray[randIndex] = temp;
  }
  code = codeArray.join('');
  return code;
}


const findUser = async email => {
  return new Promise((resolve, reject) => {
    Admin.findOne(
      {
        email
      },
      'name password first_name last_name email two_step_verification role _id is_email_verified image',
      (err, item) => {
        itemNotFound(err, item, reject, 'EMAIL NOT FOUND')
        resolve(item)
      }
    )
  })
}



const setUserInfo = req => {
  let user = {
    id: req.id,
    first_name: req.first_name,
    last_name: req.last_name,
    email: req.email,
    // role: req.role,
    //verified: req.verified
  }
  // Adds verification for testing purposes
  if (process.env.NODE_ENV !== 'production') {
    user = {
      ...user,
      verification: req.verification
    }
  }
  return user
}


function extractDomainFromEmail(email) {
  // Split the email address at the "@" symbol
  const parts = email.split('@');

  // Check if the email has the correct format
  if (parts.length !== 2) {
    console.error('Invalid email address format');
    return null;
  }

  // Extract and return the domain part
  const domain = parts[1];
  return domain;
}


const saveUserAccessAndReturnToken = async (req, user, remember_me) => {
  return new Promise((resolve, reject) => {
    const userAccess = new UserAccess({
      email: user.email,
      ip: utils.getIP(req),
      browser: utils.getBrowserInfo(req),
      country: utils.getCountry(req),
    })
    userAccess.save((err) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message));
      }
      setUserInfo(user);
      resolve({
        token: generateToken(user._id, user.role, remember_me),
        user: user,
        code: 200
      })
    });
  })
}

exports.addAdmin = async (req, res) => {
  try {
    const data = {
      _id: new mongoose.Types.ObjectId("64b29004376e6cb3d3c6e55c"),
      name: "Admin",
      email: "admin@gmail.com",
      password: "12345",
      phone: "+919967656543",
      role: "admin",
    }
    // const item = await getItemThroughId(Admin , "64b29004376e6cb3d3c6e55c" );
    // const item = await Admin.findOne({ _id: "64b29004376e6cb3d3c6e55c" });
    // item.email = data.email;
    // item.password = data.password;
    // item.is_email_verified = true;

    const item = new Admin(data)
    await item.save();
    return res.status(200).json(item);
  } catch (error) {
    console.log(error);
    handleError(res, error);
  }
};



exports.login = async (req, res) => {
  try {
    const data = req.body;
    console.log("****DATA*****", data);

    const user = await findUser(data.email);
    if (!user) return handleError(res, { message: "Invalid email and password", code: 400 })
    console.log("__----USER---", user);

    const isPasswordMatch = await auth.checkPassword(data.password, user)

    console.log(isPasswordMatch);

    if (!isPasswordMatch) {
      return handleError(res, { message: "Invalid email and password", code: 400 })
    }


    let userObj = JSON.parse(JSON.stringify(user))
    console.log("userObj**********", userObj);
    delete userObj.password;

    //   if(userObj.two_step_verification === true){
    //     const otp = await generatedOtpAndSave(data.email);
    //     console.log("otp>>" , otp)
    //     let mailOptions = {
    //       to: data.email,
    //       subject: "Two step verification",
    //       name: `${capitalizeFirstLetter(userObj.name)}`,
    //       otp: otp
    //     }
    //     const locale = req.getLocale()
    //     emailer.sendEmail(locale, mailOptions, 'verifyEmailWithOtp')

    //     res.json({code : 200 , two_step_verification : true , message : "otp is sent to your email" })
    //   }else{
    res.status(200).json(await saveUserAccessAndReturnToken(req, userObj, data.remember_me))
    //   }

  } catch (error) {
    handleError(res, error)
  }
}

exports.forgotPassword = async (req, res) => {

  try {
    const data = req.body;
    console.log("data", data)
    const locale = req.getLocale()
    let user = await Admin.findOne(
      { email: data.email }
    );
    console.log(data)

    if (!user) {
      throw buildErrObject(422, "WRONG_EMAIL");
    }

    const token = uuid.v4();

    const tokenExpirationDuration = 5 * 60;
    const resetInstance = new Reset({
      email: user.email,
      resetPasswordToken: token,
      used: true,
      time: new Date(Date.now() + tokenExpirationDuration * 1000)
    });
    console.log(resetInstance)
    //Save the resetInstance to the database
    await resetInstance.save();

    console.log("data.prodcution === false", data.prodcution === false)
    const emailData = {
      email: user.email,
      name: user.name,
      url: data.production === false ? `${process.env.LOCAL_ADMIN_URL}ui/Resetpassword/${token}` : `${process.env.PRODUCTION_FRONTEND_URL}ui/Resetpassword/${token}`
    }

    console.log("url==============", emailData.url)

    console.log("user", emailData)
    const item = await emailer.sendForgetPasswordEmail(locale, emailData, 'reset-password-admin');

    return res.status(200).json({
      code: 200,
      message: item,
    });

  } catch (err) {
    console.log(err)
    handleError(res, err)
  }

}


exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    console.log(password)

    // Find the reset token in the database
    const reset = await Reset.findOne({ resetPasswordToken: token });

    console.log(reset)
    // Check if the reset token exists and if it's flagged as used
    if (!reset || !reset.used) {
      return handleError(res, { message: 'Invalid or expired reset password token', code: 400 })
    }

    // Check if the token has expired
    const currentTime = new Date();
    const tokenExpiryTime = new Date(reset.time);
    if (currentTime > tokenExpiryTime) {
      return handleError(res, { message: 'Reset password token has expired', code: 400 })
    }

    // Find the user associated with the reset token
    const user = await Admin.findOne({ email: reset.email });

    // Update the user's password
    user.password = password;

    // Save the changes
    await user.save();

    // Reset the token flag and time
    reset.used = false;
    reset.time = undefined;
    await reset.save();

    res.json({ message: 'Password reset successful', code: 200 });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err)
  }
};



exports.changePassword = async (req, res) => {
  try {
    const user = req.user;

    const { old_password, new_password } = req.body;

    const admin = await Admin.findById(user._id, "+password")
    const isPasswordMatch = await auth.checkPassword(old_password, admin)

    if (!isPasswordMatch) return handleError(res, { message: "Incorrect Old Password", code: 400 });

    // Update the user's password
    user.password = new_password;
    // Save the changes
    await user.save();

    res.json({ message: 'Password changed successfully', code: 200 });
  } catch (err) {
    console.error(err);
    handleError(res, err);
  }
};



// exports.uploadAdminMedia = async (req, res) => {
//   try {
//     console.log("rreq.files " , req.files)
//     if (!req.files.media || !req.body.path) {
//       // check if image and path missing
//       return res.status(422).json({
//         code: 422,
//         message: "MEDIA OR PATH MISSING",
//       });
//     }

//     let media = await uploadFile({
//       file: req.files.media,
//       path: `${STORAGE_PATH}/${req.body.path}`,
//     });

//     return res.status(200).json({
//       code: 200,
//       path: media,
//     });
//   } catch (error) {
//     handleError(res, error);
//   }
// };


exports.uploadAdminMedia = async (req, res) => {
  try {
    if (!req.files.media || !req.body.path) {
      // check if image and path missing
      return res.status(422).json({
        code: 422,
        message: "MEDIA OR PATH MISSING",
      });
    }

    console.log("env", process.env.STORAGE_PATH)
    let media = await uploadFile({
      file: req.files.media,
      path: `${process.env.STORAGE_PATH}/${req.body.path}`,
    });

    media = `${req.body.path}/${media}`

    return res.status(200).json({
      code: 200,
      data: media,
    });
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
};



// exports.addPersonalCardHolders = async (req, res) => {
//   try {
//     const { name , email , card_name,  card_business_name, designation ,mobile_number,office_landline ,contact_email, address ,city ,pin_code ,linkedin , twitter , instagram } = req.body;



//     if (req.files && req.files.business_logo) {
//       var media = await uploadFile({
//         image_data: req.files.business_logo,
//         path: "businessLogo",
//       });
//       data.image = media.data.Location;
//     }

//     const data = {
//       name : name,
//       email : email,
//       user_type : "personal",
//       cards_details : {
//         name : card_name,
//         business_logo,
//         businees_name : card_business_name,
//         designation
//       },
//       contact_details : {
//         mobile_number,
//         office_landline,
//         contact_email,
//       },
//       address : {
//         address,
//         city,
//         pin_code
//       },
//       social_links : {
//         linkedin,
//         twitter,
//         instagram 
//       }
//     }




//   } catch (error) {
//     handleError(res, error)
//   }
// }

exports.getPersonalUser = async (req, res) => {
  try {
    const { sort = -1, offset = 0, limit, search = "", start_date, end_date } = req.query;

    const condition = {}

    if (search) {
      condition["$or"] = [
        { "card_details.bio.full_name": { $regex: new RegExp(search, 'i') } },
        { "card_details.contact_details.mobile_number": { $regex: new RegExp(search, 'i') } },
        { "card_details.bio.business_name": { $regex: new RegExp(search, 'i') } },
      ]
    }

    if (start_date && end_date) {
      condition["createdAt"] = { $gte: new Date(start_date), $lt: new Date(end_date) }
    }



    const offsetCondtion = []

    if (offset) {
      offsetCondtion.push({
        $skip: +offset
      })
    }

    const limitConditon = []
    if (limit) {
      limitConditon.push({
        $limit: +limit
      })
    }


    const count = await User.aggregate([
      {
        $match: {
          user_type: "personal",
        }
      },
      {
        $lookup: {
          from: "card_details",
          localField: "_id",
          foreignField: "owner_id",
          as: "card_details",
        },
      },
      {
        $unwind: {
          path: "$card_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: condition
      },
    ])


    // const users = await User.find({user_type : "personal"} , "-password -confirm_password").sort({createdAt : +sort}).skip(+offset).limit(+limit);

    console.log("condition", condition)
    console.log("offsetCondtion", offsetCondtion)
    const users = await User.aggregate([
      {
        $match: {
          user_type: "personal",
        }
      },
      {
        $lookup: {
          from: "card_details",
          localField: "_id",
          foreignField: "owner_id",
          as: "card_details",
        },
      },
      {
        $unwind: {
          path: "$card_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          password: 0,
          confirm_password: 0
        }
      },
      {
        $match: condition
      },
      {
        $sort: {
          createdAt: +sort
        }
      },
      ...offsetCondtion,
      ...limitConditon
    ])

    res.json({ data: users, count: count.length, code: 200 })

  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.getCorporateUser = async (req, res) => {
  try {
    const { company_id, search = "", limit = 10, offset = 0, sort = -1 } = req.query;

    const condition = {
      $or: [
        { "bio.full_name": { $regex: new RegExp(search, 'i') } },
        { "contact_details.mobile_number": { $regex: new RegExp(search, 'i') } },
        { "bio.designation": { $regex: new RegExp(search, 'i') } },
        { "contact_details.email": { $regex: new RegExp(search, 'i') } },
        { "users.email": { $regex: new RegExp(search, 'i') } },
      ]
    }

    const count = await CardDetials.aggregate([
      {
        $match: {
          company_id: mongoose.Types.ObjectId(company_id)
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "owner_id",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $unwind: {
          path: "$users",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: condition
      },
    ])



    const users = await CardDetials.aggregate([
      {
        $match: {
          company_id: mongoose.Types.ObjectId(company_id)
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "owner_id",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $unwind: {
          path: "$users",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: condition
      },
      {
        $sort: {
          createdAt: +sort
        }
      },
      {
        $skip: +offset
      },
      {
        $limit: +limit
      }
    ])

    res.json({ data: users, count: count.length, code: 200 })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.getSingleCardHolder = async (req, res) => {
  try {
    const id = req.params.id

    if (!id) return handleError(res, { message: "User id not found", code: 404 })

    const users = await User.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id)
        }
      },
      {
        $lookup: {
          from: "card_details",
          localField: "_id",
          foreignField: "owner_id",
          as: "card_details",
        },
      },
      {
        $unwind: {
          path: "$card_details",
          preserveNullAndEmptyArrays: true,
        },
      },
    ])


    res.json({ data: users[0], code: 200 })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}


exports.addCompany = async (req, res) => {
  try {

    const data = req.body;

    const isEmailExist = await Company.findOne({ email: data.email });
    if (isEmailExist) return handleError(res, { message: "Email already Exists", code: 400 })

    const emailDomain = extractDomainFromEmail(data.email);

    const isDomainExists = await Company.findOne({ email_domain: emailDomain });
    if (isDomainExists) return handleError(res, { message: "Domain name already Exists", code: 400 })

    var password = generator.generate({
      length: 8,
      numbers: true
    });

    // let =  access_code = generator.generate({
    //   length: 6,
    //   numbers: true,
    //   uppercase: false
    // });


    // Example usage
    const access_code = generateAccessCode();


    const dataForCompany = {
      email: data.email,
      access_code: access_code.toUpperCase(),
      password: password,
      decoded_password: password,
      email_domain: emailDomain,
      company_name: data.company_name,
      type: "admin",
      // business_logo : data.business_logo,
      // text_color : data.text_color,
      // card_color : data.card_color,
      // gst_no : data.gst_no,
      contact_details: {
        // mobile_number : data.contact_details.mobile_number,
        // office_landline : data.contact_details.office_landline,
        // email :  data.contact_details.email,
        website: data.contact_details.website,
      },
      bio: {
        first_name: data.bio.first_name,
        last_name: data.bio.last_name,
        full_name: `${data.bio.first_name}${data.bio.last_name ? ` ${data.bio.last_name}` : ""}`,
      },
      address: {
        country: data.address.country,
        state: data.address.state,
        city: data.address.city,
        address_line_1: data.address.address_line_1,
        address_line_2: data.address.address_line_2,
        pin_code: data.address.pin_code,
      },
      // social_links : {
      //   linkedin : data.social_links.linkedin,
      //   x : data.social_links.x,
      //   instagram :data.social_links.instagram,
      //   youtube : data.social_links.youtube,
      // }
    }




    const company = new Company(dataForCompany);
    await company.save();


    const locale = req.getLocale()
    const dataForMail = {
      company_name: data.company_name,
      email: data.email,
      password: password,
      access_code: access_code.toUpperCase()
    }

    emailer.sendAccountCreationEmail(locale, dataForMail, 'account-created');

    res.json({ message: "Company registered successfully", code: 200 })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}


exports.getCompanyList = async (req, res) => {
  try {

    const { search, limit = 10, offset = 0, sort = -1, start_date, end_date } = req.query;

    const condition = {
      type: "admin",
      // is_profile_completed : true
    }

    if (search) {
      condition["$or"] = [
        { company_name: { $regex: new RegExp(search, 'i') } },
        { email_domain: { $regex: new RegExp(search, 'i') } },
        // { email: { $regex: new RegExp(search, 'i') } },
      ]
    }

    if (start_date && end_date) {
      condition["createdAt"] = { $gte: new Date(start_date), $lt: new Date(end_date) }
    }

    const count = await Company.countDocuments(condition)

    const offsetCondtion = []

    if (offset) {
      offsetCondtion.push({
        $skip: +offset
      })
    }

    const limitConditon = []
    if (limit) {
      limitConditon.push({
        $limit: +limit
      })
    }

    const company = await Company.aggregate([
      {
        $match: condition
      },
      {
        $project: {
          password: 0,
          decoded_password: 0
        }
      },
      {
        $sort: {
          createdAt: +sort
        }
      },
      ...offsetCondtion,
      ...limitConditon
    ])

    res.json({ data: company, count, code: 200 });
  } catch (error) {
    console.log("error", error)
    handleError(res, error)
  }
}

exports.getSingleCompany = async (req, res) => {
  try {
    const id = req.params.id
    const company = await Company.findById(id);

    if (!company) return

    res.json({ data: company, code: 200 })
  } catch (error) {
    handleError(res, error)
  }
}


exports.dashBoardCard = async (req, res) => {
  try {
    const totalUser = await User.aggregate([
      {
        $lookup: {
          from: "card_details",
          localField: "_id",
          foreignField: "owner_id",
          as: "card"
        }
      },
      {
        $unwind: "$card"
      }
    ]);

    const totalComany = await Company.countDocuments({
      type: "admin",
      //  is_profile_completed : true
    })

    const revenue = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          amount: {
            $sum: {
              $toDouble
                : "$amount"
            }
          }
        }
      },

    ])

    console.log("revenue", revenue)
    const totalRevenue = revenue[0]?.amount ?? 0

    const demographicChart = await User.aggregate(
      [
        {
          $project: {
            sex: { $ifNull: ["$sex", "Other"] }
          }
        },
        {
          $group: {
            _id: "$sex",
            count: { $sum: 1 }
          }
        }
      ]
    );

    const totalUsersCount = await User.countDocuments({})
    console.log("totalUsersCount : ", totalUsersCount)

    const pieChartData = demographicChart.map(item => {
      const percentage = ((item.count / totalUsersCount) * 100).toFixed(2);
      return {
        label: item._id,
        value: percentage
      };
    });

    if (pieChartData.length === 0) {
      pieChartData.push({
        label: 'No data',
        value: 100
      });
    }

    res.json({ data: { users: totalUser.length, company: totalComany, revenue: totalRevenue, demographicChart: pieChartData }, code: 200 })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}


exports.addFaq = async (req, res) => {
  try {
    const { question, answer } = req.body;

    const faq = new FAQ({ question, answer });
    await faq.save();

    res.json({ message: "FAQ added successfully", code: 200 })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getFaqList = async (req, res) => {
  try {
    const { sort = -1 } = req.query;

    const faqs = await FAQ.find({}).sort({ createdAt: +sort });

    res.json({ data: faqs, code: 200 })
  } catch (error) {
    handleError(res, error)
  }
}

exports.getSingleFaq = async (req, res) => {
  try {

    const id = req.params.id;
    const faq = await FAQ.findById(id);

    res.json({ data: faq, code: 200 })
  } catch (error) {
    handleError(res, error)
  }
}

exports.deleteFaq = async (req, res) => {
  try {
    const id = req.params.id;

    await FAQ.findByIdAndDelete(id);

    res.json({ message: "FAQ deleted successfully", code: 200 })
  } catch (error) {
    handleError(res, error)
  }
}
exports.editFaq = async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    await FAQ.findByIdAndUpdate(id, data);

    res.json({ message: "FAQ updated successfully", code: 200 })
  } catch (error) {
    handleError(res, error)
  }
}


exports.addCMS = async (req, res) => {
  try {
    const { type, content } = req.body;

    const cmsResp = await CMS.findOne({ type });

    if (cmsResp) {
      await CMS.findByIdAndUpdate(cmsResp._id, { content: content })
    } else {
      const data = {
        type: type,
        content: content
      }

      const cms = new CMS(data)
      await cms.save()
    }

    res.json({ message: "Content saved successfully", code: 200 })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}

exports.getCMS = async (req, res) => {
  try {
    const { type } = req.query;

    const cmsResp = await CMS.findOne({ type });

    res.json({
      code: 200,
      data: cmsResp,
    });

  } catch (error) {
    console.log("================error", error)
    utils.handleError(res, error);
  }
};


exports.getFeedbackList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, sort = -1 } = req.query;

    // const feedback = await Feedback.find({}).sort({createdAt : +sort}).skip(+offset).limit(+limit);

    const count = await Feedback.countDocuments({})
    const feedback = await Feedback.aggregate([
      {

        $lookup: {
          from: "companies",
          let: { user_id: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$user_id"] },
                  ],
                },
              },
            },
            {
              $project: {
                company_name: 1,
                email: 1,
                company_id: 1,
              },
            },
          ],
          as: "company",
        },
      },
      {
        $lookup: {
          from: "users",
          let: { user_id: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$user_id"]
                }
              }
            },
            {
              $project: {
                first_name: 1,
                last_name: 1,
                full_name: 1,
                email: 1
              }
            }
          ],
          as: "user",
        },
      },
      {
        $addFields: {
          userDetails: {
            $cond: {
              if: { $eq: ["$userType", "admin"] },
              then: { $arrayElemAt: ["$company", 0] },
              else: { $arrayElemAt: ["$user", 0] },
            },
          },
        },
      },
      {
        $unset: ["company", "user"],
      },
      {
        $sort: {
          createdAt: +sort
        }
      },
      {
        $skip: +offset
      },
      {
        $limit: +limit
      }
    ])

    res.json({ data: feedback, count, code: 200 })
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.getSingleFeedback = async (req, res) => {
  try {
    const id = req.params.id;

    // const feedback = await Feedback.findById(id)
    const feedback = await Feedback.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id)
        }
      },
      {
        $lookup: {
          from: "users",
          let: { user_id: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$user_id"]
                }
              }
            },
            {
              $project: {
                first_name: 1,
                last_name: 1,
                full_name: 1,
                email: 1
              }
            }
          ],
          as: "user",
        },
      },
      {
        $lookup: {
          from: "companies",
          let: { user_id: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$user_id"],
                },
              },
            },
            {
              $project: {
                company_name: 1,
                email: 1,
                company_id: 1,
              },
            },
          ],
          as: "company",
        },
      },
      {
        $addFields: {
          userDetails: {
            $cond: {
              if: { $eq: ["$userType", "admin"] },
              then: { $arrayElemAt: ["$company", 0] },
              else: { $arrayElemAt: ["$user", 0] },
            },
          },
        },
      },
      {
        $unset: ["user", "company"],
      },
    ])

    res.json({ data: feedback[0], code: 200 })
  } catch (error) {
    utils.handleError(res, error);
  }
}


//-------------------------------------------
exports.getSupportList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, sort = -1 } = req.query;

    const count = await Support.countDocuments({});

    const feedback = await Support.aggregate([
      {
        $lookup: {
          from: "companies",
          let: { user_id: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$user_id"] },
                  ],
                },
              },
            },
            {
              $project: {
                company_name: 1,
                email: 1,
                company_id: 1,
              },
            },
          ],
          as: "company",
        },
      },
      {
        $lookup: {
          from: "users",
          let: { user_id: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$_id", "$$user_id"] },
                  ],
                },
              },
            },
            {
              $project: {
                first_name: 1,
                last_name: 1,
                email: 1,
                full_name: 1,
              },
            },
          ],
          as: "user",
        },
      },
      {
        $addFields: {
          userDetails: {
            $cond: {
              if: { $eq: ["$userType", "admin"] },
              then: { $arrayElemAt: ["$company", 0] },
              else: { $arrayElemAt: ["$user", 0] },
            },
          },
        },
      },
      {
        $unset: ["company", "user"],
      },
      {
        $sort: {
          createdAt: +sort,
        },
      },
      {
        $skip: +offset,
      },
      {
        $limit: +limit,
      },
    ]);

    res.json({ data: feedback, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


exports.getSingleSupport = async (req, res) => {
  try {
    const id = req.params.id;

    const feedback = await Support.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "users",
          let: { user_id: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$user_id"],
                },
              },
            },
            {
              $project: {
                first_name: 1,
                last_name: 1,
                full_name: 1,
                email: 1,
              },
            },
          ],
          as: "user",
        },
      },
      {
        $lookup: {
          from: "companies",
          let: { user_id: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$user_id"],
                },
              },
            },
            {
              $project: {
                company_name: 1,
                email: 1,
                company_id: 1,
              },
            },
          ],
          as: "company",
        },
      },
      {
        $addFields: {
          userDetails: {
            $cond: {
              if: { $eq: ["$userType", "admin"] },
              then: { $arrayElemAt: ["$company", 0] },
              else: { $arrayElemAt: ["$user", 0] },
            },
          },
        },
      },
      {
        $unset: ["user", "company"],
      },
    ]);

    res.json({ data: feedback[0], code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.reply = async (req, res) => {
  try {
    const { support_id, reply } = req.body;
    const locale = req.getLocale()
    let user;

    const support = await Support.findById(support_id);
    if (!support) return utils.handleError(res, { message: "Question not found", code: 404 });

    user = await User.findById(support.user_id);
    if (!user) {
      user = await Company.findById(support.user_id);
    } else {
      return utils.handleError(res, { message: "User not found", code: 404 });
    }
    // if(support.replied === true) return  utils.handleError(res, {message : "User not found" , code : 404});

    support.reply = reply;
    support.replied = true;
    support.save()

    const emailData = {
      email: user.email,
      full_name: user.full_name || user.company_name,
      question: support.message,
      reply: reply
    }

    console.log("emailData", emailData)
    const item = await emailer.sendReplyEmail(locale, emailData, 'support-reply');



    return res.status(200).json({
      code: 200,
      message: item,
    });

  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.getContactUsList = async (req, res) => {
  try {
    const { limit = 10, offset = 0, sort = -1 } = req.query;

    const count = await ContactUs.countDocuments({})
    const contactUs = await ContactUs.find({}).sort({ createdAt: +sort }).skip(+offset).limit(+limit);


    res.json({ data: contactUs, count, code: 200 })
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.getRegistrationList = async (req, res) => {
  try {
    const { search, limit = 10, offset = 0, sort = -1 } = req.query;
    let filter = {}
    if (search) {
      filter['$or'] = [
        {
          email: { $regex: search, $options: 'i' }
        },
        {
          company_name: { $regex: search, $options: 'i' }
        },
        {
          first_name: { $regex: search, $options: 'i' }
        },
        {
          last_name: { $regex: search, $options: 'i' }
        }
      ]
    }
    console.log("filter : ", filter)
    const start_date = moment().subtract(30, "days").toDate()
    const count = await Registration.countDocuments({})
    const registration = await Registration.aggregate(
      [
        {
          $match: {
            $or: [
              { status: "pending" },
              {
                $and: [
                  { status: "declined" },
                  { createdAt: { $gte: start_date } }
                ]
              }
            ]
          }
        },
        {
          $match: { ...filter }
        }
      ]
    ).sort({ createdAt: +sort }).skip(+offset).limit(+limit);


    res.json({ data: registration, count, code: 200 })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getNotification = async (req, res) => {

  try {
    const { limit = Number.MAX_SAFE_INTEGER, offset = 0, search = "" } = req.query;

    const condition = {
      is_admin: true,
    }

    if (search) {
      condition["$or"] = [
        { title: { $regex: new RegExp(search, 'i') } },
        { body: { $regex: new RegExp(search, 'i') } },
      ]
    }


    const count = await Notification.countDocuments(condition);

    console.log("condition", condition)

    const notification = await Notification.aggregate([
      {
        $match: condition
      },
      {
        $lookup: {
          from: "users",
          let: { user_id: "$sender_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$user_id"] },
              },
            },
            {
              $project: {
                password: 0,
                confirm_password: 0
              },
            },
          ],
          as: "sender_details",
        },
      },
      {
        $unwind: { path: "$sender_details", preserveNullAndEmptyArrays: true },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: +offset,
      },
      {
        $limit: +limit,
      },
    ]);

    res.json({ data: notification, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error)
  }
};


exports.deleteNotification = async (req, res) => {
  try {
    const ids = req.body.ids;

    const convertedToObjectIds = ids.map(element => mongoose.Types.ObjectId(element))

    const deleteNotification = await Notification.deleteMany({ _id: { $in: convertedToObjectIds } })

    res.json({ message: "Selected notification are deleted successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.deleteAdminNotification = async (req, res) => {
  try {
    const ids = req.body.ids;

    const convertedToObjectIds = ids.map(element => mongoose.Types.ObjectId(element))

    const deleteNotification = await NotificationByAdmin.deleteMany({ _id: { $in: convertedToObjectIds } })

    res.json({ message: "Selected notification are deleted successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}





exports.deletePersonalCardHolders = async (req, res) => {
  try {

    const user_id = req.params.user_id;

    await User.deleteOne({ _id: mongoose.Types.ObjectId(user_id) });
    await CardDetials.deleteOne({ owner_id: mongoose.Types.ObjectId(user_id) })

    res.json({ message: "Account is deleted successfully", code: 200 });

  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.deleteCompany = async (req, res) => {
  try {

    const company_id = req.params.company_id;
    console.log("company_id", company_id)

    const result = await Company.findOneAndDelete({ _id: mongoose.Types.ObjectId(company_id) })
    const response = await CardDetials.findOneAndDelete({ company_id: mongoose.Types.ObjectId(company_id) })

    console.log("result : ", result, " response : ", response)

    res.json({ message: "Company and all related Card are deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error)
  }
}



exports.sendNotification = async (req, res) => {
  try {
    const admin_id = req.user._id;
    const { sent_to, title, body } = req.body;

    const user_type = []

    if (sent_to.includes("personal")) {
      user_type.push("personal")
    }

    if (sent_to.includes("corporate")) {
      user_type.push("corporate")
    }

    const users = await User.aggregate([
      {
        $match: {
          user_type: { $in: user_type }
        }
      },
      {
        $lookup: {
          from: "fcmdevices",
          localField: "_id",
          foreignField: "user_id",
          as: "device_token"
        }
      },
      {
        $unwind: {
          path: "$device_token",
          preserveNullAndEmptyArrays: true,
        },
      },
    ])

    const device_tokens = [];

    const notificationToCreate = []

    for (let index = 0; index < users.length; index++) {

      const element = users[index];
      const notificationData = {
        sender_id: admin_id,
        receiver_id: element._id,
        type: "by_admin",
        title: title,
        body: body
      }


      notificationToCreate.push(notificationData);

      if (element.notification === true && element?.device_token) {
        device_tokens.push(element?.device_token?.token)
      }

    }

    console.log("device_token", device_tokens)
    if (sent_to.includes("company")) {

      const companies = await Company.aggregate([
        {
          $lookup: {
            from: "fcmdevices",
            localField: "_id",
            foreignField: "user_id",
            as: "device_token"
          }
        },
        {
          $unwind: {
            path: "$device_token",
            preserveNullAndEmptyArrays: true,
          },
        },
      ])

      for (let index = 0; index < companies.length; index++) {

        const element = companies[index];
        const notificationData = {
          sender_id: admin_id,
          receiver_id: element._id,
          type: "by_admin",
          title: title,
          body: body
        }

        notificationToCreate.push(notificationData);

        if (element?.device_token) {
          device_tokens.push(element?.device_token?.token)
        }

      }

    }


    const notificaitons = await Notification.insertMany(notificationToCreate);

    const dataForAdmin = {
      sent_to,
      title,
      body
    }

    const notificationByAdmin = new NotificationByAdmin(dataForAdmin);

    await notificationByAdmin.save()

    //push notification
    if (device_tokens.length !== 0) {
      utils.sendPushNotification(device_tokens, title, body)
    }

    res.json({ message: "Notification sent successfully", code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}



exports.getAdminNotification = async (req, res) => {

  try {

    const { limit = Number.MAX_SAFE_INTEGER, offset = 0, search = "" } = req.query;

    const condition = {}

    if (search) {
      condition["$or"] = [
        { title: { $regex: new RegExp(search, 'i') } },
        { body: { $regex: new RegExp(search, 'i') } },
      ]
    }


    const count = await NotificationByAdmin.countDocuments(condition);


    console.log("condition", condition)

    const notification = await NotificationByAdmin.aggregate([
      {
        $match: condition
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: +offset,
      },
      {
        $limit: +limit,
      },
    ]);

    res.json({ data: notification, count, code: 200 });
  } catch (error) {
    utils.handleError(res, error)
  }

}



exports.exportCorporateUser = async (req, res) => {
  try {
    const { company_id, sort, start_date, end_date } = req.query;

    const condition = {
      card_type: "corporate"
    };

    if (company_id !== "all") {
      condition["company_id"] = mongoose.Types.ObjectId(company_id);
    }

    if (start_date && end_date) {
      condition["users.createdAt"] = { $gte: new Date(start_date), $lt: new Date(end_date) }
    }

    // const users = await CardDetials.aggregate([
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "owner_id",
    //       foreignField: "_id",
    //       as: "users",
    //     },
    //   },
    //   {
    //     $unwind: {
    //       path: "$users",
    //       preserveNullAndEmptyArrays: true,
    //     },
    //   },
    //   {
    //     $match : condition
    //   },
    //   {
    //     $sort : {
    //       "user.createdAt" : +sort
    //     }
    //   },
    // ])

    const users = await CardDetials.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "owner_id",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $unwind: {
          path: "$users",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: condition
      },
      {
        $lookup: {
          from: "companies",
          localField: "company_id",
          foreignField: "_id",
          as: "company",
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          'bio.business_name': '$company.company_name',
          'card_color': '$company.card_color',
          'text_color': '$company.text_color',
          "business_logo": '$company.business_logo',
          "address": '$company.address',
          "contact_details.website": '$company.contact_details.website',
        }
      },
      {
        $sort: {
          "users.createdAt": +sort
        }
      },
      {
        $project: {
          "users.password": 0,
          "users.confirm_password": 0,
        }
      }
    ])

    res.json({ data: users, code: 200 })

  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}



exports.companyList = async (req, res) => {
  try {

    const companies = await Company.find({}, { company_name: 1 })

    res.json({ data: companies, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.addNewKey = async (req, res) => {

  try {
    const data = req.body;
    // console.log(uuid)
    // validate API key
    if (!uuid.validate(data.api_key)) {
      throw utils.buildErrObject(422, "API key not valid")
    }

    await db.createItem(data, APIKey)

    res.json({
      code: 200
    })

  } catch (err) {
    utils.handleError(res, err)
  }

}

exports.editNewKey = async (req, res) => {

  try {
    const data = req.body;
    console.log(uuid)
    // validate API key
    if (!uuid.validate(data.api_key)) {
      throw utils.buildErrObject(422, "API key not valid")
    }

    await db.updateItem(data.api_key_id, APIKey, data)

    res.json({
      code: 200
    })

  } catch (err) {
    utils.handleError(res, err)
  }

}

exports.deleteAPIKey = async (req, res) => {

  try {
    const data = req.params;

    await db.deleteItem(data.api_key_id, APIKey, data)

    res.json({
      code: 200
    })

  } catch (err) {
    utils.handleError(res, err)
  }

}

exports.getAPIKeys = async (req, res) => {

  try {
    const data = req.query;

    const {
      list,
      count
    } = await db.getAPIKeys(APIKey, data)

    res.json({
      code: 200,
      data: list,
      count: count
    })

  } catch (err) {
    utils.handleError(res, err)
  }

}

exports.addKeyDetails = async (req, res) => {
  try {
    const data = req.params;

    const details = await db.getItem(data.api_key_id, APIKey)

    res.json({
      code: 200,
      data: details
    })

  } catch (err) {
    utils.handleError(res, err)
  }
}

exports.transactionHistoryofUsers = async (req, res) => {
  try {
    const { search = "", sort = -1, limit = 10, offset = 0 } = req.query;

    const user_type = "individual"


    const searchCondition = []
    if (search) {
      searchCondition.push({
        $match: {
          $or: [
            { "user.bio.full_name": { $regex: new RegExp(search, 'i') } },
            { "user.contact_details.email": { $regex: new RegExp(search, 'i') } },
            { "user.contact_details.mobile_number": { $regex: new RegExp(search, 'i') } },
            { "amount": { $regex: new RegExp(search, 'i') } }
          ]
        }
      })
    }

    const count = await Transaction.countDocuments({ user_type: user_type });
    const data = await Transaction.aggregate([
      {
        $match: {
          user_type: user_type
        }
      },
      {
        $addFields: {
          amount: {
            $toString: "$amount"
          }
        }
      },
      {
        $lookup: {
          from: "card_details",
          localField: "user_id",
          foreignField: "owner_id",
          as: "user"
        }
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...searchCondition,
      {
        $project: {
          "user.password": 0,
          "user.confirm_password": 0
        }
      },
      {
        $sort: {
          createdAt: +sort
        }
      },
      {
        $skip: +offset
      },
      {
        $limit: +limit
      }
    ])


    // const transaction = new Transaction({
    //   user_id: company_id,
    //   plan_id: "1",
    //   subcription_id: "1",
    //   amount: 2000,
    //   status: "created"
    // })
    // console.log("transaction", transaction)

    // await transaction.save()

    res.json({ data: data, count, code: 200 })
  } catch (error) {
    console.log("error", error)
    utils.handleError(res, error)
  }
}

exports.transactionHistoryOfCompany = async (req, res) => {
  try {
    const { search = "", sort = -1, limit = 10, offset = 0 } = req.query;

    const searchCondition = []
    if (search) {
      searchCondition.push({
        $match: {
          $or: [
            { "company.company_name": { $regex: new RegExp(search, 'i') } },
            { "company.email": { $regex: new RegExp(search, 'i') } },
            { "company.contact_details.website": { $regex: new RegExp(search, 'i') } },
            { "amount": { $regex: new RegExp(search, 'i') } }
          ]
        }
      })
    }

    const user_type = "company"
    const count = await Transaction.countDocuments({ user_type: user_type });
    const data = await Transaction.aggregate([
      {
        $match: {
          user_type: user_type
        }
      },
      {
        $addFields: {
          amount: {
            $toString: "$amount"
          }
        }
      },
      {
        $lookup: {
          from: "companies",
          localField: "user_id",
          foreignField: "_id",
          as: "company"
        }
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...searchCondition,
      {
        $project: {
          "company.password": 0,
          "company.decoded_password": 0
        }
      },
      {
        $sort: {
          createdAt: +sort
        }
      },
      {
        $skip: +offset
      },
      {
        $limit: +limit
      }
    ])


    // const transaction = new Transaction({
    //   user_id: company_id,
    //   plan_id: "1",
    //   subcription_id: "1",
    //   amount: 2000,
    //   status: "created"
    // })
    // console.log("transaction", transaction)

    // await transaction.save()

    res.json({ data: data, count, code: 200 })
  } catch (error) {
    console.log("error", error)
    utils.handleError(res, error)
  }
}


exports.getCountries = async (req, res) => {
  try {
    const data = Country.getAllCountries();
    res.json({ data: data, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.getStates = async (req, res) => {
  try {
    console.log("req.query", req.query)
    var countryCode = req.query.countryCode;

    if (!countryCode) {
      const countryName = req.query.countryName
      countryCode = getCode(countryName)
    }

    const data = State.getStatesOfCountry(countryCode)
    res.json({ data: data, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


// exports.createPlan = async (req, res) => {
//   try {
//     const { period, interval, amount, name, description, plan_type, trial_period_days, allowed_user, amount_without_discount, plan_tiers } = req.body
//     if (plan_tiers && !Array.isArray(plan_tiers)) {
//       return res.status(403).json({
//         message: "Plan tier must be an array",
//         code: 403
//       })
//     }
//     let newPLans
//     let plan
//     let returnData
//     let result = []
//     if (Array.isArray(plan_tiers)) {
//       newPLans = await plan_tiers.map(async i => {
//         let plan_data = {
//           "period": period,
//           "interval": interval,
//           "item": {
//             "name": i.tier_type,
//             "amount": Number(i.max_users) * Number(i.per_user_charge) * 100,
//             "currency": "INR",
//             // "description": description
//           },
//           "notes": {
//             "plan_type": plan_type,
//             "allowed_user": i.max_users,
//             "trial_period_days": trial_period_days,
//             "amount_without_discount": amount_without_discount
//           }
//         }
//         console.log("plan_data : ", plan_data)
//         const mydata = await instance.plans.create(plan_data)
//         result.push(mydata)
//         console.log("mydata : ", mydata)
//       })
//       console.log("result : ", result)
//       let plan_tiers_data = await result.map((i, index) => {
//         console.log("inside.......")
//         return {
//           plan_ids: i,
//           min_users: plan_tiers[index].min_users,
//           max_users: plan_tiers[index].max_users,
//           per_user_charge: plan_tiers[index].per_user_charge
//         }
//       })
//       console.log('plan_tiers_data : ', plan_tiers_data)
//       const data = {
//         // plan_id: plan.id,
//         period: period,
//         interval: interval,
//         // item: {
//         //   name: plan.item.name,
//         //   amount: plan.item.amount,
//         //   currency: plan.item.currency,
//         //   description: plan.item.description,
//         // },
//         amount_without_discount: amount_without_discount,
//         trial_period_days: trial_period_days,
//         plan_type: plan_type,
//         // allowed_user: plan.notes.allowed_user,
//         plan_tiers: plan_tiers_data
//       }
//       console.log('data', data)

//       returnData = new Plan(data);
//       await returnData.save()
//     } else {
//       console.log("inside else")
//       let planData = {
//         "period": period,
//         "interval": interval,
//         "item": {
//           "name": name,
//           "amount": Number(amount) * 100,
//           "currency": "INR",
//           "description": description
//         },
//         "notes": {
//           "plan_type": plan_type,
//           "allowed_user": allowed_user,
//           "trial_period_days": trial_period_days,
//           "amount_without_discount": amount_without_discount
//         }
//       }
//       plan = await instance.plans.create(planData)
//       console.log("plan", plan)
//       const data = {
//         plan_id: plan.id,
//         period: plan.period,
//         interval: plan.interval,
//         item: {
//           name: plan.item.name,
//           amount: plan.item.amount,
//           currency: plan.item.currency,
//           description: plan.item.description,
//         },
//         amount_without_discount: plan.notes.amount_without_discount,
//         trial_period_days: plan.notes.trial_period_days,
//         plan_type: plan.notes.plan_type,
//         allowed_user: plan.notes.allowed_user,
//         plan_tiers
//       }
//       console.log('data', data)

//       returnData = new Plan(data);
//       await returnData.save()
//     }

//     res.json({ message: "Plan create successfully", data: returnData, code: 200 })
//   } catch (error) {
//     utils.handleError(res, error)
//   }
// }

async function PlanId() {
  const token = await crypto.randomBytes(8).toString('hex')
  return `plan_${token}`
}

exports.createPlan = async (req, res) => {
  try {
    const { period, interval, amount, name, description, plan_type, plan_variety, trial_period_days, allowed_user, amount_without_discount, plan_tiers, billing_cycles, corporate_selected, individual_selected } = req.body;
    if (plan_tiers && !Array.isArray(plan_tiers)) {
      return res.status(403).json({
        message: "Plan tier must be an array",
        code: 403
      });
    }

    let returnData;
    let result = [];

    if (Array.isArray(plan_tiers)) {
      // const newPlans = await Promise.all(plan_tiers.map(async i => {
      //   let plan_data = {
      //     period,
      //     interval,
      //     item: {
      //       name: i.tier_type,
      //       amount: Number(i.max_users) * Number(i.per_user_charge) * 100,
      //       currency: "INR",
      //       description
      //     },
      //     notes: {
      //       plan_type,
      //       allowed_user: i.max_users,
      //       trial_period_days,
      //       amount_without_discount
      //     }
      //   };

      //   console.log("plan_data : ", plan_data);
      //   const mydata = await instance.plans.create(plan_data);
      //   return mydata;
      // }));

      // console.log("newPlans : ", newPlans);

      // const plan_tiers_data = plan_tiers.map((i, index) => {
      //   return {
      //     plan_ids: newPlans[index].id,
      //     min_users: i.min_users,
      //     max_users: i.max_users,
      //     per_user_charge: i.per_user_charge
      //   };
      // });

      console.log('plan_tiers_data : ', plan_tiers);
      const Tierplan = await Plan.find({
        plan_type: 'company',
        corporate_selected: true,
        $or: [{ period: 'monthly' }, { period: 'yearly' }]
      })
      console.log("Tierplan : ", Tierplan, Tierplan.length)
      if (Tierplan && Tierplan.length === 2) {
        return res.status(403).json({
          message: "Corporate Tier plan already existed",
          code: 403
        })
      }

      const data = {
        plan_id: await PlanId(),
        period,
        interval,
        amount_without_discount,
        trial_period_days,
        plan_type,
        plan_tiers: plan_tiers
      };

      if (corporate_selected) {
        data.corporate_selected = true
      }
      // if (plan_variety) {
      //   data.plan_variety = plan_variety
      // }

      console.log('data', data);

      returnData = new Plan(data);
      await returnData.save();
    } else {
      console.log("inside else");

      let data
      if (plan_variety === "premium") {
        const planData = {
          period,
          interval,
          item: {
            name,
            amount: Number(amount) * 100,
            currency: "INR",
            description,
          },
          notes: {
            plan_type,
            allowed_user,
            trial_period_days,
            amount_without_discount
          }
        };

        const plan = await instance.plans.create(planData);
        console.log("plan", plan);

        data = {
          plan_id: plan.id,
          period: plan.period,
          interval: plan.interval,
          item: {
            name: plan.item.name,
            amount: plan.item.amount,
            currency: plan.item.currency,
            description: plan.item.description,
          },
          amount_without_discount: amount_without_discount,
          trial_period_days: trial_period_days,
          plan_type: plan_type,
          allowed_user: allowed_user
        };

        if (billing_cycles) {
          data.item.billing_cycles = billing_cycles
        }
        if (individual_selected) {
          data.individual_selected = true
        }
        if (plan_variety === "premium") {
          data.plan_variety = plan_variety
        }
        console.log('data', data);
      } else {
        data = {
          plan_id: await PlanId(),
          period: period,
          interval: interval,
          item: {
            name: name,
            amount: amount,
            description: description,
          },
          amount_without_discount: amount_without_discount,
          trial_period_days: trial_period_days,
          plan_type: plan_type,
          allowed_user: allowed_user,
          plan_tiers
        };

        if (billing_cycles) {
          data.item.billing_cycles = billing_cycles
        }
        if (individual_selected) {
          data.individual_selected = true
        }
        if (plan_variety === "freemium") {
          data.plan_variety = plan_variety
        }
        console.log('data', data);
      }
      returnData = new Plan(data);
      await returnData.save();
    }
    res.json({ message: "Plan created successfully", data: returnData, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
};


exports.chartData = async (req, res) => {
  try {
    const country = req.query.country;
    const startDate = moment().subtract(11, 'months').startOf('month');
    const endDate = moment();

    const start = startDate.toDate()
    const end = endDate.toDate()

    const monthsInRange = [];

    let currentMonth = moment(start);

    while (currentMonth.isSameOrBefore(endDate)) {
      monthsInRange.push({
        month: currentMonth.month() + 1, // Month is zero-indexed, so adding 1
        year: currentMonth.year()
      });

      currentMonth.add(1, 'month');
    }

    const condition = {
      createdAt: {
        $gte: start,
        $lte: end
      },
    }


    if (country) {
      condition.country = country
    }

    const transaction = await Transaction.aggregate([
      {
        $match: condition
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          amount: {
            $sum: {
              $toDouble
                : "$amount"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          amount: 1,
        }
      },
    ])

    const data = []

    for (let index = 0; index < monthsInRange.length; index++) {
      const element = monthsInRange[index];

      const monthData = transaction.find(ele => ele.year === element.year && ele.month === element.month);

      if (monthData) {
        data.push(monthData)
      } else {
        data.push({
          year: element.year,
          month: element.month,
          amount: 0,
        })
      }
    }

    res.json({ data: data, code: 200 })
  } catch (error) {
    handleError(res, error);
  }
}




// exports.actionOnCompanyRequest = async (req , res) => {
//   try {
//     const {_id , status} = req.body;

//     const registration = await Registration.findById(_id);
//     if(!registration) return handleError(res, {message : "Company request not found" , code : 404});

//     if(registration.status !== "pending") return handleError(res, {message : `Company request already ${registration.status}` , code : 400});








//   } catch (error) {
//     handleError(res, error);
//   }
// }


exports.getSubscription = async (req, res) => {
  const subscription_id = req.body.subscription_id

  let subscriptions;

  instance.subscriptions.fetch(subscription_id, (error, subscription) => {
    if (error) {
      console.error('Error:', error);
      return;
    }
    console.log("subscription", subscription)
    subscriptions = subscription;
    res.json({ subscription: subscriptions })
    const paymentId = subscription.payment_id;

    // Retrieve Payment details
    instance.payments.fetch(paymentId, (error, payment) => {
      if (error) {
        console.error('Error:', error);
        return;
      }

      // Extract Payment Method details
      const paymentMethod = payment.method;

      console.log('Current Payment Method:', paymentMethod);
    });

  });
}

/* Honey work start here */

// exports.userOverview = async (req, res) => {
//   try {
//     const [
//       totalUser,
//       totalActiveUser,
//       totalInactiveUser,
//       totalBusinessCard,
//       totalSharedCard,
//       totalSavedAndReceivedCard
//     ] = await Promise.all([
//       User.countDocuments(),
//       User.countDocuments({ status: 'active' }),
//       User.countDocuments({ status: 'inactive' }),
//       cardDetials.countDocuments({ card_type: 'corporate' }),
//       sharedCards.countDocuments(),
//       User.aggregate([
//         {
//           $project: {
//             personalCardCount: {
//               $cond: {
//                 if: { $eq: [{ $type: "$personal_cards" }, "array"] },
//                 then: { $size: "$personal_cards" },
//                 else: 0
//               }
//             },
//             companyCardCount: {
//               $cond: {
//                 if: { $eq: [{ $type: "$companyAccessCardDetails" }, "array"] },
//                 then: { $size: "$companyAccessCardDetails" },
//                 else: 0
//               }
//             }
//           }
//         },
//         {
//           $group: {
//             _id: null,
//             totalPersonalCards: { $sum: "$personalCardCount" },
//             totalCompanyCards: { $sum: "$companyCardCount" }
//           }
//         },
//         {
//           $project: {
//             _id: 0,
//             totalCards: { $add: ["$totalPersonalCards", "$totalCompanyCards"] }
//           }
//         }
//       ])
//     ]);

//     // User chart data
//     const { selectedPeriod } = req.query;
//     let currentDate = new Date();
//     let startOfPeriod, endOfPeriod;

//     if (selectedPeriod === 'daily') {
//       startOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
//       endOfPeriod = new Date(currentDate.setHours(23, 59, 59, 999));
//     } else if (selectedPeriod === 'weekly') {
//       const startOfWeek = new Date();
//       startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
//       startOfWeek.setHours(0, 0, 0, 0);

//       const endOfWeek = new Date(startOfWeek);
//       endOfWeek.setDate(startOfWeek.getDate() + 6);
//       endOfWeek.setHours(23, 59, 59, 999);

//       startOfPeriod = startOfWeek;
//       endOfPeriod = endOfWeek;
//     } else if (selectedPeriod === 'yearly') {
//       const year = currentDate.getFullYear();
//       startOfPeriod = new Date(year, 0, 1);
//       endOfPeriod = new Date(year, 11, 31, 23, 59, 59, 999);
//     }

//     console.log("start date:", startOfPeriod, "end date:", endOfPeriod);

//     let filter = {};
//     let data = [];
//     if (selectedPeriod) {
//       filter.createdAt = { $gte: startOfPeriod, $lte: endOfPeriod };
//     }

//     console.log("filter:", filter);

//     if (selectedPeriod === 'daily') {
//       const hourlyData = await User.aggregate([
//         { $match: filter },
//         { $project: { hour: { $hour: "$createdAt" } } },
//         { $group: { _id: "$hour", count: { $sum: 1 } } },
//         { $sort: { _id: 1 } }
//       ]);

//       console.log("hourly data:", hourlyData);
//       data = Array(24).fill(0);
//       hourlyData.forEach(item => {
//         data[item._id] = item.count;
//       });

//     } else if (selectedPeriod === 'weekly') {
//       const dailyData = await User.aggregate([
//         { $match: filter },
//         { $project: { day: { $dayOfMonth: "$createdAt" } } },
//         { $group: { _id: "$day", count: { $sum: 1 } } },
//         { $sort: { _id: 1 } }
//       ]);

//       const daysInWeek = 7;
//       data = Array(daysInWeek).fill(0);
//       dailyData.forEach(item => {
//         data[item._id - 1] = item.count;
//       });

//     } else if (selectedPeriod === 'yearly') {
//       const monthlyData = await User.aggregate([
//         { $match: filter },
//         { $project: { month: { $month: "$createdAt" } } },
//         { $group: { _id: "$month", count: { $sum: 1 } } },
//         { $sort: { _id: 1 } }
//       ]);

//       console.log("monthly data:", monthlyData);
//       data = Array(12).fill(0);
//       monthlyData.forEach(item => {
//         data[item._id - 1] = item.count;
//       });
//     }

//     return res.json({
//       message: "User overview fetched successfully",
//       data: {
//         totalUser,
//         totalActiveUser,
//         totalInactiveUser,
//         totalBusinessCard,
//         totalSharedCard,
//         totalSavedAndReceivedCard : totalSavedAndReceivedCard[0]?.totalCards,
//         graphData: data
//       },
//       code: 200
//     });

//   } catch (error) {
//     handleError(res, error);
//   }
// };


exports.userOverview = async (req, res) => {
  try {
    const [
      totalUser,
      totalActiveUser,
      totalInactiveUser,
      totalBusinessCard,
      totalSharedCard,
      totalSavedAndReceivedCard
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'inactive' }),
      cardDetials.countDocuments({ card_type: 'corporate' }),
      sharedCards.countDocuments(),
      User.aggregate([
        {
          $project: {
            personalCardCount: {
              $cond: {
                if: { $eq: [{ $type: "$personal_cards" }, "array"] },
                then: { $size: "$personal_cards" },
                else: 0
              }
            },
            companyCardCount: {
              $cond: {
                if: { $eq: [{ $type: "$companyAccessCardDetails" }, "array"] },
                then: { $size: "$companyAccessCardDetails" },
                else: 0
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalPersonalCards: { $sum: "$personalCardCount" },
            totalCompanyCards: { $sum: "$companyCardCount" }
          }
        },
        {
          $project: {
            _id: 0,
            totalCards: { $add: ["$totalPersonalCards", "$totalCompanyCards"] }
          }
        }
      ])
    ]);

    // User chart data
    const { selectedPeriod } = req.query;
    let currentDate = new Date();
    let startOfPeriod, endOfPeriod;

    if (selectedPeriod === 'daily') {
      startOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
      endOfPeriod = new Date(currentDate.setHours(23, 59, 59, 999));
    } else if (selectedPeriod === 'weekly') {
      const startOfWeek = new Date();
      startOfWeek.setDate(currentDate.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      startOfPeriod = startOfWeek;
      endOfPeriod = endOfWeek;
    } else if (selectedPeriod === 'yearly') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth()
      const date = currentDate.getDate()
      startOfPeriod = new Date(year - 1, month, date);
      // endOfPeriod = new Date(year, 11, 31, 23, 59, 59, 999);
      endOfPeriod = new Date(year, month, date);
    }

    console.log("start date:", startOfPeriod, "end date:", endOfPeriod);

    let filter = {};
    let data = [];
    if (selectedPeriod) {
      filter.createdAt = { $gte: startOfPeriod, $lte: endOfPeriod };
    }

    console.log("filter:", filter);

    if (selectedPeriod === 'daily') {
      const dailyData = await User.aggregate([
        { $match: filter },
        { $project: { dayOfWeek: { $dayOfWeek: "$createdAt" } } },
        { $group: { _id: "$dayOfWeek", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

      console.log("daily data:", dailyData);

      data = Array(7).fill(0);
      dailyData.forEach(item => {
        data[item._id - 1] = item.count;
      });

    } else if (selectedPeriod === 'weekly') {
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      console.log("startOfMonth : ", startOfMonth)
      console.log("endOfMonth : ", endOfMonth)
      // console.log("endOfMonth.getDate() + startOfMonth.getDay()) / 7 : ", (endOfMonth.getDate() + startOfMonth.getDay()) / 7)

      const weeksInMonth = Math.ceil((endOfMonth.getDate() + startOfMonth.getDay()) / 7);
      console.log("weeksInMonth : ", weeksInMonth)

      const weeklyData = await User.aggregate([
        { $match: filter },
        {
          $project: {
            weekOfMonth: {
              $ceil: {
                $divide: [
                  { $subtract: ["$createdAt", startOfMonth] },
                  1000 * 60 * 60 * 24 * 7
                ]
              }
            }
          }
        },
        { $group: { _id: "$weekOfMonth", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

      console.log("weekly data:", weeklyData);

      data = Array(weeksInMonth).fill(0);
      weeklyData.forEach(item => {
        data[item._id - 1] = item.count;
      });

    } else if (selectedPeriod === 'yearly') {
      const yearlyData = await User.aggregate([
        { $match: filter },
        { $project: { month: { $month: "$createdAt" } } },
        { $group: { _id: "$month", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

      console.log("yearly data:", yearlyData);
      data = Array(12).fill(0);
      yearlyData.forEach(item => {
        data[item._id - 1] = item.count;
      });
    }

    return res.json({
      message: "User overview fetched successfully",
      data: {
        totalUser,
        totalActiveUser,
        totalInactiveUser,
        totalBusinessCard,
        totalSharedCard,
        totalSavedAndReceivedCard: totalSavedAndReceivedCard[0]?.totalCards,
        graphData: data
      },
      code: 200
    });

  } catch (error) {
    handleError(res, error);
  }
};



exports.getUser = async (req, res) => {
  try {
    const { offset = 0, limit = 10, search, user_type } = req.query
    let filter = {}
    if (search) {
      filter['$or'] = [
        {
          first_name: { $regex: search, $options: 'i' }
        },
        {
          last_name: { $regex: search, $options: 'i' }
        },
        {
          email: { $regex: search, $options: 'i' }
        }
      ]
    }

    if (user_type) {
      filter.user_type = user_type
    }
    const user_data = await User.aggregate([
      {
        $match: filter
      },
      {
        $project: {
          password: 0,
          confirm_password: 0
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $skip: parseInt(offset)
      },
      {
        $limit: parseInt(limit)
      }
    ])

    const count = await User.countDocuments(filter)

    return res.status(200).json({
      message: "user data fetched successfully",
      data: user_data,
      count,
      code: 200
    })
  } catch (error) {
    handleError(res, error);
  }
}


exports.getSingleUser = async (req, res) => {
  try {
    const { id } = req.params
    console.log("id : ", id)
    const userdata = await User.findOne({ _id: id }).select('-password -confirm_password');
    console.log("userdata : ", userdata)
    if (!userdata) {
      return res.status(404).json({
        message: 'User not found',
        code: 404
      })
    }
    return res.status(200).json({
      message: 'User data fetched successfully',
      data: userdata,
      code: 200
    })
  } catch (error) {
    handleError(res, error);
  }
}


exports.editSignleUser = async (req, res) => {
  try {
    const { user_id } = req.body
    console.log("id : ", user_id)
    const userdata = await User.findOne({ _id: user_id })
    console.log("userdata : ", userdata)
    if (!userdata) {
      return res.status(404).json({
        message: 'User not found',
        code: 404
      })
    }

    const data = req.body
    delete data.user_id
    const result = await User.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(user_id)
      },
      {
        $set: data
      }, { new: true }
    )
    return res.status(200).json({
      message: "user edited successfully",
      data: result,
      code: 200
    })
  } catch (error) {
    handleError(res, error);
  }
}


exports.deleteSignleUser = async (req, res) => {
  try {
    const { id } = req.params
    console.log("id : ", id)
    const userdata = await User.findOne({ _id: id })
    console.log("userdata : ", userdata)
    if (!userdata) {
      return res.status(404).json({
        message: 'User not found',
        code: 404
      })
    }

    const result = await User.findOneAndDelete(
      {
        _id: new mongoose.Types.ObjectId(id)
      }
    )
    return res.status(200).json({
      message: "user deleted successfully",
      data: result,
      code: 200
    })
  } catch (error) {
    handleError(res, error);
  }
}


exports.resetUserPassword = async (req, res) => {
  try {
    const { user_id, password, confirm_password } = req.body
    console.log("id : ", user_id)
    const userdata = await User.findOne({ _id: user_id })
    console.log("userdata : ", userdata)
    if (!userdata) {
      return res.status(404).json({
        message: 'User not found',
        code: 404
      })
    }

    if (password.toString() !== confirm_password.toString()) {
      return res.status(403).json({
        message: 'Password does not matched',
        code: 404
      })
    }

    userdata.password = password
    userdata.confirm_password = confirm_password
    await userdata.save()

    return res.status(200).json({
      message: "User password reset successfully",
      code: 200
    })
  } catch (error) {
    handleError(res, error);
  }
}

exports.changeUserStatus = async (req, res) => {
  try {
    const { user_id, status } = req.body
    const userdata = await User.findOne({ _id: user_id })
    console.log("userdata : ", userdata)
    if (!userdata) {
      return res.status(404).json({
        message: 'User not found',
        code: 404
      })
    }
    userdata.status = status
    await userdata.save()
    return res.status(200).json({
      message: `User profile ${status} successfully`,
      code: 200
    })
  } catch (error) {
    handleError(res, error);
  }
}


exports.getUserAccountLog = async (req, res) => {
  try {
    const { user_id, offset = 0, limit = 10 } = req.query
    const userlog = await user_account_log.find({ user_id }).skip(Number(offset)).limit(Number(limit))
    const count = await user_account_log.countDocuments({ user_id })
    console.log("userlog : ", userlog)
    // if (!userlog || userlog.length === 0) {
    //   return res.status(404).json({
    //     message: "No Account Log History Found",
    //     code: 404
    //   })
    // }
    return res.status(200).json({
      message: "User account log history fetched successfully",
      data: userlog,
      count,
      code: 200
    })
  } catch (error) {
    handleError(res, error);
  }
}


exports.sendFeedbackReply = async (req, res) => {
  try {
    const { feedback_id, reply } = req.body
    console.log("feedback_id : ", feedback_id)
    const feedbackdata = await Feedback.aggregate(
      [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(feedback_id)
          }
        },
        {
          $lookup: {
            from: "users",
            let: { id: "$user_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$$id", "$_id"]
                  }
                }
              }
            ],
            as: "userdata"
          }
        },
        {
          $unwind: {
            path: "$userdata",
            preserveNullAndEmptyArrays: true
          }
        }
      ]
    )
    let data = feedbackdata[0]
    let mailOptions = {
      to: data?.userdata?.email,
      subject: "Reply to your Feedback",
      full_name: `${capitalizeFirstLetter(data?.userdata?.full_name)}`,
      query_topic: data?.message,
      user_query: data?.message,
      response_text: reply,
      response_link: '',
      social_link: '',
      privacy_link: 'https://reachmate.vercel.app/privacypolicy',
      terms_link: 'https://reachmate.vercel.app/termsCondition',
      help_link: 'https://reachmate.vercel.app/contactus'
    }
    const locale = req.getLocale()
    emailer.sendMyEmail(locale, mailOptions, 'feedback_reply')
    return res.status(200).json({
      message: "Reply sent successfully",
      code: 200
    })
  } catch (error) {
    handleError(res, error);
  }
}


// exports.getSubscriptionRevenueChartData = async (req, res) => {
//   try {
//     const { plan_tier_type } = req.query
//     console.log("plan_tier_type : ", plan_tier_type)
//     let data = await Subscription.aggregate(
//       [
//         {
//           $lookup: {
//             from: "plans",
//             let: { id: "$plan_id" },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $eq: ["$$id", "$plan_id"]
//                   }
//                 }
//               }
//             ],
//             as: "plan_data"
//           }
//         },
//         {
//           $unwind: {
//             path: "$plan_data",
//             preserveNullAndEmptyArrays: true
//           }
//         },
//         {
//           $lookup: {
//             from: "plans",
//             let: { id: "$plan_tier.tier_id" },
//             pipeline: [
//               {
//                 $unwind: {
//                   path: "$plan_tiers",
//                   preserveNullAndEmptyArrays: true
//                 }
//               },
//               {
//                 $match: {
//                   $expr: {
//                     $eq: ["$$id", "$plan_tiers._id"]
//                   }
//                 }
//               },
//               {
//                 $addFields: {
//                   single_plan_data: {
//                     $cond: {
//                       if: {
//                         $ne: [
//                           "$plan_tiers.tier_type",
//                           null
//                         ]
//                       },
//                       then: "$plan_tiers",
//                       else: null
//                     }
//                   }
//                 }
//               },
//               {
//                 $project: {
//                   single_plan_data: 1
//                 }
//               }
//             ],
//             as: "plan_tier_data"
//           }
//         },
//         {
//           $unwind: {
//             path: "$plan_tier_data",
//             preserveNullAndEmptyArrays: true
//           }
//         },

//         {
//           $addFields: {
//             bt_revenue: {
//               $cond: {
//                 if: {
//                   $and: [
//                     {
//                       $ne: [
//                         "$plan_data.plan_tiers",
//                         null
//                       ]
//                     },
//                     {
//                       $gt: [
//                         {
//                           $size: "$plan_data.plan_tiers"
//                         },
//                         0
//                       ]
//                     },
//                     {
//                       $eq: [
//                         "$plan_data.plan_type",
//                         "company"
//                       ]
//                     }
//                   ]
//                 },
//                 then: "$plan_tier.amount",
//                 else:
//                   // $divide: [
//                   //   "$plan_data.item.amount",
//                   //   100
//                   // ]
//                   0
//               }
//             }
//           }
//         },
//         {
//           $addFields: {
//             individual_revenue: {
//               $cond: {
//                 if: {
//                   $and: [
//                     // {
//                     //   $ne: [
//                     //     "$plan_data.plan_tiers",
//                     //     null
//                     //   ]
//                     // },
//                     // {
//                     //   $gt: [
//                     //     {
//                     //       $size: "$plan_data.plan_tiers"
//                     //     },
//                     //     0
//                     //   ]
//                     // },
//                     {
//                       $eq: [
//                         "$plan_data.plan_type",
//                         "individual"
//                       ]
//                     }
//                   ]
//                 },
//                 then: {
//                   $divide: [
//                     "$plan_data.item.amount",
//                     100
//                   ]
//                 },
//                 else:
//                   // $divide: [
//                   //   "$plan_data.item.amount",
//                   //   100
//                   // ]
//                   0
//               }
//             }
//           }
//         },
//         {
//           $match: {
//             "plan_tier_data.single_plan_data.tier_type":
//               plan_tier_type
//           }
//         },
//         {
//           $group: {
//             _id: null,
//             total_bt_revenue: {
//               $sum: { $ifNull: ["$bt_revenue", 0] }
//             },
//             total_individual_revenue: {
//               $sum: {
//                 $ifNull: ["$individual_revenue", 0]
//               }
//             }
//           }
//         },

//         {
//           $project: {
//             _id: 0,
//             total_bt_revenue: 1,
//             total_individual_revenue: 1
//           }
//         }
//       ]
//     )
//     console.log("data : ", data[0])
//     if(data[0] === undefined){
//       data[0] = {
//         total_bt_revenue : 0,
//         total_individual_revenue: 0
//       }
//     }

//     return res.status(200).json({
//       message : "chart data fetched successfully",
//       data : data[0],
//       code : 200
//     })
//   } catch (error) {
//     handleError(res, error)
//   }
// }


exports.getSubscriptionRevenueChartData = async (req, res) => {
  try {
    const { plan_tier_type } = req.query;
    console.log("plan_tier_type : ", plan_tier_type);

    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    console.log("sixMonthsAgo : ", sixMonthsAgo)

    if (!plan_tier_type) {
      return res.status(400).json({
        message: "Missing plan tier type parameter",
        code: 400
      });
    }

    let data = await Subscription.aggregate([
      {
        $lookup: {
          from: "plans",
          let: { id: "$plan_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$id", "$plan_id"] } } }
          ],
          as: "plan_data"
        }
      },
      {
        $unwind: {
          path: "$plan_data",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "plans",
          let: { id: "$plan_tier.tier_id" },
          pipeline: [
            { $unwind: { path: "$plan_tiers", preserveNullAndEmptyArrays: true } },
            { $match: { $expr: { $eq: ["$$id", "$plan_tiers._id"] } } },
            {
              $addFields: {
                single_plan_data: {
                  $cond: {
                    if: { $ne: ["$plan_tiers.tier_type", null] },
                    then: "$plan_tiers",
                    else: null
                  }
                }
              }
            },
            { $project: { single_plan_data: 1 } }
          ],
          as: "plan_tier_data"
        }
      },
      {
        $unwind: {
          path: "$plan_tier_data",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          "plan_tier_data.single_plan_data.tier_type": plan_tier_type,
          "start_at": { $gte: sixMonthsAgo }
        }
      },
      {
        $addFields: {
          bt_revenue: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$plan_data.plan_tiers", null] },
                  { $gt: [{ $size: "$plan_data.plan_tiers" }, 0] },
                  { $eq: ["$plan_data.plan_type", "company"] }
                ]
              },
              then: "$plan_tier.amount",
              else: 0
            }
          },
          individual_revenue: {
            $cond: {
              if: { $eq: ["$plan_data.plan_type", "individual"] },
              then: { $divide: ["$plan_data.item.amount", 100] },
              else: 0
            }
          }
        }
      },
      {
        $project: {
          month: { $month: "$start_at" },
          year: { $year: "$start_at" },
          bt_revenue: 1,
          individual_revenue: 1
        }
      },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          total_bt_revenue: { $sum: { $ifNull: ["$bt_revenue", 0] } },
          total_individual_revenue: { $sum: { $ifNull: ["$individual_revenue", 0] } }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      },
      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          total_bt_revenue: 1,
          total_individual_revenue: 1,
          _id: 0
        }
      }
    ]);

    const allMonths = Array.from({ length: 6 }, (_, i) => {
      const month = (today.getMonth() - i + 12) % 12;
      const year = today.getFullYear() - (month > today.getMonth() ? 1 : 0);
      return {
        month: month + 1,
        year: year
      };
    }).reverse();

    const result = allMonths.map(monthData => {
      const existingData = data.find(
        entry => entry.month === monthData.month && entry.year === monthData.year
      );
      return existingData || {
        ...monthData,
        total_bt_revenue: 0,
        total_individual_revenue: 0
      };
    });

    return res.status(200).json({
      message: "Chart data fetched successfully",
      data: result,
      code: 200
    });

  } catch (error) {
    handleError(res, error)
  }
};


exports.userAnalysisChartData = async (req, res) => {
  try {
    const { selectedPeriod } = req.query;
    let currentDate = new Date();
    let startOfPeriod, endOfPeriod;

    if (selectedPeriod === 'daily') {
      startOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
      endOfPeriod = new Date(currentDate.setHours(23, 59, 59, 999));
    } else if (selectedPeriod === 'weekly') {
      const startOfWeek = new Date();
      startOfWeek.setDate(currentDate.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      startOfPeriod = startOfWeek;
      endOfPeriod = endOfWeek;
    } else if (selectedPeriod === 'yearly') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth()
      const date = currentDate.getDate()
      startOfPeriod = new Date(year - 1, month, date);
      // endOfPeriod = new Date(year, 11, 31, 23, 59, 59, 999);
      endOfPeriod = new Date(year, month, date);
    }

    console.log("start date:", startOfPeriod, "end date:", endOfPeriod);

    let filter = {};
    let data = [];
    if (selectedPeriod) {
      filter.createdAt = { $gte: startOfPeriod, $lte: endOfPeriod };
    }

    console.log("filter:", filter);
    let totalUsers = 0
    let newUsers = 0
    let previousUsers = 0
    let retentionRate = 0
    let churnRate = 0
    let growthRate = 0
    let bounceRate = 0

    if (selectedPeriod) {
      filter.createdAt = { $gte: startOfPeriod, $lte: endOfPeriod };
      console.log("filter : ", filter)
      totalUsers = await User.countDocuments({});
      newUsers = await User.countDocuments(filter);
      let previousFilter = {
        createdAt: { $lt: startOfPeriod },
        // updatedAt: { $gte: startOfPeriod, $lte: endOfPeriod }
      };
      previousUsers = await User.countDocuments(previousFilter);

      console.log("totalUsers:", totalUsers, "newUsers:", newUsers, "previousUsers:", previousUsers);

      // retention rate
      if (previousUsers > 0) {
        retentionRate = ((totalUsers - newUsers) / previousUsers) * 100;
        console.log("retentionRate :", retentionRate);
      } else {
        console.log("No previous users to calculate churn rate");
      }

      //churn rate
      const lostUser = await User.countDocuments({ updatedAt: { $not: { $gte: startOfPeriod, $lte: endOfPeriod } } })
      console.log("lost user : ", lostUser)

      if (previousUsers > 0) {
        churnRate = (lostUser / previousUsers) * 100
        console.log("churn rate : ", churnRate)
      }

      if (previousUsers > 0) {
        growthRate = ((totalUsers - previousUsers) / previousUsers) * 100
        console.log("growth rate : ", growthRate)
      }

      //bounce rate
      const totalsessionperiod = await user_account_log.aggregate(
        [
          {
            $match: {
              action: 'Account Session',
              start_at: { $gte: startOfPeriod },
              end_at: { $lte: endOfPeriod }
            }
          },
          {
            $group: {
              _id: '$user_id',
              sessionCount: { $sum: 1 }
            }
          }
        ]
      )
      console.log("totalsessionperiod : ", totalsessionperiod)
      if (totalsessionperiod.length > 0) {
        bounceRate = (totalsessionperiod.length / newUsers) * 100;
      }
      console.log("bounceRate:", bounceRate);
    }

    res.status(200).json({ retentionRate, churnRate, growthRate, bounceRate });

  } catch (error) {
    handleError(res, error)
  }
}

exports.subscriptionDashboardData = async (req, res) => {
  try {
    const today = new Date();
    const oneMonthsAgo = new Date(today);
    oneMonthsAgo.setMonth(today.getMonth() + 2);
    console.log("oneMonthsAgo : ", oneMonthsAgo, " today : ", today)

    const totalSubscription = await Subscription.countDocuments({});

    const upcomingRenewal = await Subscription.countDocuments({
      status: 'active',
      end_at: {
        $gte: today,
        $lt: oneMonthsAgo,
      }
    });

    const overduePayment = await Subscription.aggregate(
      [
        {
          $match: {
            status: "active",
            end_at: {
              $gte: today,
              $lt: oneMonthsAgo,
            }
          }
        },
        {
          $lookup: {
            from: "plans",
            let: { id: "$plan_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$$id", "$plan_id"]
                  }
                }
              }
            ],
            as: "plan_data"
          }
        },
        {
          $unwind: {
            path: "$plan_data"
          }
        },
        {
          $addFields: {
            amount: {
              $cond: {
                if: {
                  $ne: [
                    { $size: "$plan_data.plan_tiers" },
                    0
                  ]
                },
                then: "$plan_tier.amount",
                else: {
                  $divide: [
                    "$plan_data.item.amount",
                    100
                  ]
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totaloverdue: { $sum: "$amount" }
          }
        }
      ]
    );

    const plangraphdata = await Plan.aggregate(
      [
        {
          $group: {
            _id: "$plan_type",
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            totalCount: { $sum: "$count" },
            data: { $push: { plan_type: "$_id", count: "$count" } }
          }
        },
        {
          $unwind: "$data"
        },
        {
          $project: {
            _id: "$data.plan_type",
            percentage: { $multiply: [{ $divide: ["$data.count", "$totalCount"] }, 100] },
            count: "$data.count"
          }
        }
      ]
    )

    return res.json({
      message: "Subscription dashboard data fetched successfully",
      totalSubscription,
      upcomingRenewal,
      overduePayment: overduePayment[0]?.totaloverdue ? overduePayment[0]?.totaloverdue : 0,
      plangraphdata,
      code: 200
    });

  } catch (error) {
    handleError(res, error)
  }
}


// exports.planSubscriptionfilterData = async (req, res) => {
//   try {
//     const { selectedPeriod } = req.query;
//     let currentDate = new Date();
//     let startOfPeriod, endOfPeriod;

//     if (selectedPeriod === 'daily') {
//       startOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
//       endOfPeriod = new Date(currentDate.setHours(23, 59, 59, 999));
//     } else if (selectedPeriod === 'monthly') {
//       const today = new Date();
//       endOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
//       startOfPeriod = new Date(today.setMonth(today.getMonth() - 1))
//     } else if (selectedPeriod === 'yearly') {
//       const year = currentDate.getFullYear();
//       const month = currentDate.getMonth()
//       const date = currentDate.getDate()
//       startOfPeriod = new Date(year - 1, month, date);
//       // endOfPeriod = new Date(year, 11, 31, 23, 59, 59, 999);
//       endOfPeriod = new Date(year, month, date);
//     }

//     console.log("start date:", startOfPeriod, "end date:", endOfPeriod);

//     let filter = {};
//     let data = [];
//     if (selectedPeriod) {
//       filter.createdAt = { $gte: startOfPeriod, $lte: endOfPeriod };
//     }

//     console.log("filter:", filter);
//     return res.json({
//       message: "chart data fetched successfully",
//       startOfPeriod,
//       endOfPeriod,
//       filter,
//       code: 200
//     });

//   } catch (error) {
//     handleError(res, error)
//   }
// }


exports.planSubscriptionfilterData = async (req, res) => {
  try {
    const { selectedPeriod } = req.query;
    let currentDate = new Date();
    let startOfPeriod, endOfPeriod;

    if (selectedPeriod === 'daily') {
      startOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
      endOfPeriod = new Date(currentDate.setHours(23, 59, 59, 999));
    } else if (selectedPeriod === 'monthly') {
      const today = new Date();
      endOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
      startOfPeriod = new Date(today.setMonth(today.getMonth() - 1));
    } else if (selectedPeriod === 'yearly') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const date = currentDate.getDate();
      startOfPeriod = new Date(year - 1, month, date);
      endOfPeriod = new Date(year, month, date);
    }

    console.log("start date:", startOfPeriod.toISOString(), "end date:", endOfPeriod.toISOString());

    let filter = {};
    if (selectedPeriod) {
      filter.createdAt = { $gte: startOfPeriod, $lte: endOfPeriod };
    }
    console.log("filter : ", filter)

    const aggregationPipeline = [
      {
        $match: filter
      },
      {
        $lookup: {
          from: "plans",
          let: { id: "$plan_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$id", "$plan_id"]
                }
              }
            }
          ],
          as: "plan_data"
        }
      },
      {
        $unwind: {
          path: "$plan_data"
        }
      },
      {
        $addFields: {
          amount: {
            $cond: {
              if: {
                $ne: [
                  { $size: "$plan_data.plan_tiers" },
                  0
                ]
              },
              then: "$plan_tier.amount",
              else: {
                $divide: [
                  "$plan_data.item.amount",
                  100
                ]
              }
            }
          }
        }
      }
    ];

    let data = []

    if (selectedPeriod === "daily") {
      const dailyData = await Subscription.aggregate([
        ...aggregationPipeline,
        {
          $project: {
            hour: { $hour: "$createdAt" },
            plan_data: 1,
            amount: 1
          }
        },
        {
          $group: {
            _id: {
              plan_type: "$plan_data.plan_type",
              hour: "$hour"
            },
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.hour": 1 }
        }
      ]);

      console.log("Daily data:", dailyData);

      data = Array.from({ length: 24 }, () => ({
        individual: 0,
        company: 0,
        enterprise: 0
      }));

      dailyData.forEach(item => {
        const hourIndex = item._id.hour;
        const planType = item._id.plan_type;

        if (!data[hourIndex][planType]) {
          data[hourIndex][planType] = 0;
        }

        data[hourIndex][planType] += item.totalAmount;
      });
    } else if (selectedPeriod === "monthly") {
      const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate();
      console.log("daysInMonth : ", daysInMonth)

      const monthlyData = await Subscription.aggregate([
        ...aggregationPipeline,
        {
          $project: {
            day: { $dayOfMonth: "$createdAt" },
            plan_data: 1,
            amount: 1
          }
        },
        {
          $group: {
            _id: {
              plan_type: "$plan_data.plan_type",
              day: "$day"
            },
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.day": 1 }
        }
      ]);

      console.log("Monthly data:", monthlyData);

      data = Array.from({ length: daysInMonth }, () => ({
        individual: 0,
        company: 0,
        enterprise: 0
      }));

      monthlyData.forEach(item => {
        const dayIndex = item._id.day - 1;
        const planType = item._id.plan_type;

        if (!data[dayIndex][planType]) {
          data[dayIndex][planType] = 0;
        }

        data[dayIndex][planType] += item.totalAmount;
      });
    } else if (selectedPeriod === "yearly") {
      const yearlyData = await Subscription.aggregate(
        [
          ...aggregationPipeline,
          {
            $project: {
              month: { $month: "$createdAt" },
              plan_data: 1,
              user_id: 1,
              plan_id: 1,
              subscription_id: 1,
              start_at: 1,
              end: 1,
              amount: 1,
              createdAt: 1
            }
          },
          {
            $group: {
              _id: {
                plan_type: "$plan_data.plan_type",
                month: "$month"
              },
              totalAmount: { $sum: "$amount" },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { "_id.month": 1 }
          }
        ]);

      console.log("yearly data:", yearlyData);
      data = Array.from({ length: 12 }, () => ({
        individual: 0,
        company: 0,
        enterprise: 0
      }));

      yearlyData.forEach(item => {
        const monthIndex = item._id.month - 1;
        const planType = item._id.plan_type;

        if (!data[monthIndex][planType]) {
          data[monthIndex][planType] = 0;
        }

        data[monthIndex][planType] += item.totalAmount;
      });
    }

    return res.json({
      message: "Chart data fetched successfully",
      data: data,
      startOfPeriod,
      endOfPeriod,
      code: 200
    });
  } catch (error) {
    handleError(res, error)
  }
};


exports.userActivityData = async (req, res) => {
  try {
    const mostActiveUsers = await user_account_log.aggregate([
      {
        $match: {
          date_and_time: { $gte: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: "$user_id",
          actionCount: { $sum: 1 },
        },
      },
      {
        $sort: { actionCount: -1 },
      }
    ]);

    console.log("mostActiveUsers : ", mostActiveUsers)

    const activelyUsingUsers = await user_account_log.distinct("user_id", {
      date_and_time: { $gte: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) },
    });

    console.log("activelyUsingUsers : ", activelyUsingUsers)

    const lastLoginUsers = await user_account_log.aggregate([
      {
        $group: {
          _id: "$user_id",
          lastLogin: { $max: "$date_and_time" },
          new_status: { $first: '$new_status' }
        },
      },
      {
        $match: {
          lastLogin: { $lt: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) },
          new_status: 'Login'
        },
      },
    ]);
    console.log("lastLoginUsers : ", lastLoginUsers)

    const totalUsers = await User.countDocuments();
    console.log("totalusers : ", totalUsers, " mostActiveUsers.length : ",mostActiveUsers.length)
    const mostActiveUsersPercentage = (mostActiveUsers.length / totalUsers) * 100;
    const activelyUsingUsersPercentage = (activelyUsingUsers.length / totalUsers) * 100;
    const lastLoginUsersPercentage = (lastLoginUsers.length / totalUsers) * 100;

    return res.status(200).json({
      message: "chart data fetched successfully",
      data: {
        mostActiveUsersPercentage: mostActiveUsersPercentage.toFixed(2),
        activelyUsingUsersPercentage: activelyUsingUsersPercentage.toFixed(2),
        lastLoginUsersPercentage: lastLoginUsersPercentage.toFixed(2),
      },
      code: 200
    })
  } catch (error) {
    handleError(res, error)
  }
}




exports.getActiverUserChartData = async (req, res) => {
  try {
    const { selectedPeriod } = req.query;
    let currentDate = new Date();
    let startOfPeriod, endOfPeriod;

    if (selectedPeriod === 'daily') {
      startOfPeriod = new Date(currentDate.setHours(0, 0, 0, 0));
      endOfPeriod = new Date(currentDate.setHours(23, 59, 59, 999));
    } else if (selectedPeriod === 'weekly') {
      const startOfWeek = new Date();
      startOfWeek.setDate(currentDate.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      startOfPeriod = startOfWeek;
      endOfPeriod = endOfWeek;
    } else if (selectedPeriod === 'yearly') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth()
      const date = currentDate.getDate()
      startOfPeriod = new Date(year - 1, month, date);
      // endOfPeriod = new Date(year, 11, 31, 23, 59, 59, 999);
      endOfPeriod = new Date(year, month, date);
    }

    console.log("start date:", startOfPeriod, "end date:", endOfPeriod);

    let filter = {};
    let data = [];
    if (selectedPeriod) {
      filter.date_and_time = { $gte: startOfPeriod, $lte: endOfPeriod };
    }

    console.log("filter:", filter);

    if (selectedPeriod === 'daily') {
      const dailyData = await user_account_log.aggregate(
        [
          {
            $match: filter
          },
          {
            $group: {
              _id: {
                hour: {
                  $hour: "$date_and_time"
                }
              },
              actionCount: { $sum: 1 }
            }
          },
          {
            $sort: { "_id.hour": 1 }
          }
        ]
      );

      console.log("daily data:", dailyData);

      data = Array(24).fill(0);

      dailyData.forEach(item => {
        const hour = item._id.hour;
        data[hour] = item.actionCount;
      });

    } else if (selectedPeriod === 'weekly') {
      const month = currentDate.getMonth();
      const year = currentDate.getFullYear();

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      console.log("startOfMonth : ", startOfMonth)
      console.log("endOfMonth : ", endOfMonth)
      console.log("endOfMonth.getDate() : ", endOfMonth.getDate(), " startOfMonth.getDay() : ", startOfMonth.getDay(), " endOfMonth.getDate() + startOfMonth.getDay()) / 7 : ", (endOfMonth.getDate() + startOfMonth.getDay()) / 7)

      const weeksInMonth = Math.ceil((endOfMonth.getDate() + startOfMonth.getDay()) / 7);
      console.log("weeksInMonth : ", weeksInMonth)

      const weeklyData = await user_account_log.aggregate(
        [
          {
            $match: filter
          },
          {
            $group: {
              _id: {
                dayOfWeek: {
                  $dayOfWeek: "$date_and_time"
                }
              },
              actionCount: { $sum: 1 }
            }
          },
          {
            $sort: { "_id.dayOfWeek": 1 }
          }
        ]
      );

      console.log("weekly data:", weeklyData);
      data = Array(weeksInMonth).fill(0);
      weeklyData.forEach(item => {
        const dayOfWeek = item._id.dayOfWeek - 1;
        data[dayOfWeek] = item.actionCount;
      });

    } else if (selectedPeriod === 'yearly') {
      const yearlyData = await user_account_log.aggregate(
        [
          {
            $match: filter
          },
          {
            $group: {
              _id: {
                month: {
                  $month: "$date_and_time"
                }
              },
              actionCount: { $sum: 1 }
            }
          },
          {
            $sort: { "_id.month": 1 }
          }
        ]
      );

      console.log("yearly data:", yearlyData);
      data = Array(12).fill(0);
      yearlyData.forEach(item => {
        const month = item._id.month - 1;
        data[month] = item.actionCount;
      });
    }

    return res.json({
      message: "Active users chart data fetched successfully",
      data,
      code: 200
    });

  } catch (error) {
    handleError(res, error);
  }
};


exports.getRevenueGrowthTrendData = async (req, res) => {
  try {
    const data = req.query
    console.log("data : ", data)

    const today = new Date()
    const sixmonth = new Date(new Date().setMonth(today.getMonth() - 6))
    const oneYear = new Date(new Date().setMonth(today.getMonth() - 12))
    console.log("today : ", today, " sixmonth : ", sixmonth, "oneYear : ", oneYear)
    let monthfilter = {
      createdAt: { $gte: sixmonth, $lte: today },
      status: 'active'
    }
    console.log("monthfilter : ", monthfilter)

    let previousFilter = {
      createdAt: { $lt: sixmonth },
    };
    let previousUsers = await User.countDocuments(previousFilter);
    let totalUsers = await User.countDocuments()
    let churnRate = 0
    let growthRate = 0

    console.log("previousUsers:", previousUsers);

    //churn rate
    const lostUser = await User.countDocuments({ updatedAt: { $not: { $gte: sixmonth, $lte: today } } })
    console.log("lost user : ", lostUser)

    if (previousUsers > 0) {
      churnRate = (lostUser / previousUsers) * 100
      console.log("churn rate : ", churnRate)
    }

    if (previousUsers > 0) {
      growthRate = ((totalUsers - previousUsers) / previousUsers) * 100
      console.log("growth rate : ", growthRate)
    }

    console.log("growthRate : ", growthRate, " churnRate : ", churnRate)
    let result = Array.from({ length: 6 }, () => ({
      MRR: 0,
      ARR: 0,
      CLTV: 0,
      FR: 0
    }));
    console.log("result : ", result)
    const subscriptions = await Subscription.aggregate(
      [
        {
          $match: monthfilter
        },
        {
          $lookup: {
            from: "plans",
            let: { id: "$plan_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$$id", "$plan_id"]
                  }
                }
              }
            ],
            as: "plan_data"
          }
        },
        {
          $unwind: {
            path: "$plan_data"
          }
        },
        {
          $addFields: {
            amount: {
              $cond: {
                if: {
                  $ne: [
                    { $size: "$plan_data.plan_tiers" },
                    0
                  ]
                },
                then: "$plan_tier.amount",
                else: {
                  $divide: [
                    "$plan_data.item.amount",
                    100
                  ]
                }
              }
            }
          }
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            totalAmount: { $sum: "$amount" }
          }
        }
      ]
    )
    console.log("subscriptions : ", subscriptions)
    subscriptions.forEach(item => {
      const month = item._id - 1;
      result[month].MRR = item.totalAmount;
      result[month].ARR = item.totalAmount * 12
      result[month].CLTV = churnRate > 0 ? (item.totalAmount / subscriptions.length) / churnRate : 0
      result[month].FR = (item.totalAmount * (1 + growthRate)) * 12;
    });
    console.log("result : ", result)
    return res.status(200).json({
      message: "Revenue growth trend data fetched successfully",
      data: result,
      code: 200
    })
  } catch (error) {
    handleError(res, error);
  }
}

