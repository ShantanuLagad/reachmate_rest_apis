const User = require('../models/user')
const Trial = require("../models/trial")
const utils = require('../middleware/utils')
const { matchedData } = require('express-validator')
const auth = require('../middleware/auth')
const Company = require("../models/company");
const UserAccess = require("../models/userAccess");
const CardDetials = require("../models/cardDetials");
const { Country, State, City } = require('country-state-city');
const Notification = require("../models/notification")
const Reset = require("../models/reset_password")
const jwt = require('jsonwebtoken')
const emailer = require("../middleware/emailer")
const PaidByCompany = require("../models/paid_by_company")
const Subscription = require("../models/subscription")
const Transaction = require("../models/transaction");
const Plan = require("../models/plan")
const Registration = require("../models/registration")
const uuid = require('uuid')
const { getCode, getName } = require('country-list');
const mongoose = require("mongoose")
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
var generator = require('generate-password');
const moment = require("moment")
const TeamMember = require("../models/teamMember")
const Support = require('../models/support')
const Feedback = require('../models/feedback')
const crypto = require('crypto')
const FCMDevice = require("../models/fcm_devices");

const {
  uploadFile,
  uploadFileToLocal,
  capitalizeFirstLetter,
  convertToObjectIds,
} = require("../shared/helpers");
const { resolve } = require('path');

const Razorpay = require('razorpay');
const payments = require('../models/payments')
const { default: axios } = require('axios')
const updateSubscriptionRequest = require('../models/updateSubscriptionRequest')
const account_session = require('../models/account_session')
const fcm_devices = require('../models/fcm_devices')
const deleted_account = require('../models/deleted_account')
var instance = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
/*********************
 * Private functions *
 *********************/

async function checkSusbcriptionIsActive(user_id) {

  const checkIsTrialExits = await Trial.findOne({ user_id });

  if (checkIsTrialExits && checkIsTrialExits.end_at > new Date() && checkIsTrialExits.status === "active") {
    return true
  }

  const subcription = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });

  if (!subcription) return false
  if (!subcription.status === "created") return false
  if (subcription.end_at < new Date()) return false
  return true
}
async function giveTrialIfNotGive(user_id) {
  const isTrialGiven = await Trial.findOne({ user_id: user_id });

  let value = false
  if (!isTrialGiven) {
    const currentDate = new Date();
    const futureDate = moment(currentDate).add(180, 'days');

    const trial = {
      user_id: user_id,
      start_at: new Date(),
      end_at: futureDate.toDate()
    }

    const saveTrial = new Trial(trial);
    await saveTrial.save();
    value = true;
  }


  return value
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

const generateToken = (_id, role, remember_me) => {
  // Gets expiration time

  const expiration = Math.floor(Date.now() / 1000) + 60 * (remember_me === true ? process.env.JWT_EXPIRATION_IN_MINUTES_FOR_REMEMBER_ME : process.env.JWT_EXPIRATION_IN_MINUTES);

  // returns signed and encrypted token
  return auth.encrypt(
    jwt.sign(
      {
        data: {
          _id,
          role: "company",
        },
        exp: expiration
      },
      process.env.JWT_SECRET
    )
  )
}
exports.generateToken = generateToken

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
      resolve({
        token: generateToken(user._id, user.role, remember_me),
        user: user,
        code: 200
      })
    });
  })
}



/**
 * Gets profile from database by id
 * @param {string} id - user id
 */
const getProfileFromDB = async id => {
  return new Promise((resolve, reject) => {
    Company.findById(id, ' -updatedAt -createdAt -password -decoded_password', (err, user) => {
      utils.itemNotFound(err, user, reject, 'NOT_FOUND')
      resolve(user)
    })
  })
}

/**
 * Updates profile in database
 * @param {Object} req - request object
 * @param {string} id - user id
 */
const updateProfileInDB = async (req, id) => {
  return new Promise((resolve, reject) => {
    model.findByIdAndUpdate(
      id,
      req,
      {
        new: true,
        runValidators: true,
        select: '-role -_id -updatedAt -createdAt'
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND')
        resolve(user)
      }
    )
  })
}

/**
 * Finds user by id
 * @param {string} email - user id
 */
const findUser = async id => {
  return new Promise((resolve, reject) => {
    Company.findById(id, 'password email', (err, user) => {
      utils.itemNotFound(err, user, reject, 'USER_DOES_NOT_EXIST')
      resolve(user)
    })
  })
}

/**
 * Build passwords do not match object
 * @param {Object} user - user object
 */
const passwordsDoNotMatch = async () => {
  return new Promise(resolve => {
    resolve(utils.buildErrObject(409, 'WRONG_PASSWORD'))
  })
}

/**
 * Changes password in database
 * @param {string} id - user id
 * @param {Object} req - request object
 */
const changePasswordInDB = async (id, req) => {
  return new Promise((resolve, reject) => {
    model.findById(id, '+password', (err, user) => {
      utils.itemNotFound(err, user, reject, 'NOT_FOUND')

      // Assigns new password to user
      user.password = req.newPassword

      // Saves in DB
      user.save(error => {
        if (err) {
          reject(utils.buildErrObject(422, error.message))
        }
        resolve(utils.buildSuccObject('PASSWORD_CHANGED'))
      })
    })
  })
}

/********************
 * Public functions *
 ********************/

/**
 * Get profile function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getProfile = async (req, res) => {
  try {
    // const id = await utils.isIDGood(req.user._id)


    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    const companydata = await getProfileFromDB(company_id)
    // console.log("companydata : ", companydata)
    // const registrationdata = await Registration.findOne({ email: companydata.email })
    // console.log("registrationdata : ", registrationdata)
    // const returndata = {
    //   ...companydata,
    //   mobile_number: registrationdata?.mobile_number
    // }
    // console.log("returndata : ", returndata)

    res.status(200).json({ data: companydata, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.getMyProfile = async (req, res) => {
  try {
    // const id = await utils.isIDGood(req.user._id)

    let company_id = req.user._id;

    res.status(200).json({ data: await getProfileFromDB(company_id), code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


/**
 * Update profile function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */


exports.uploadCorporateMedia = async (req, res) => {
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

exports.updateProfile = async (req, res) => {
  try {
    const id = await utils.isIDGood(req.user._id)
    const data = req.body;

    await Company.findByIdAndUpdate(id, data)

    res.status(200).json({ message: "Profile update successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Change password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.changePassword = async (req, res) => {
  try {
    const id = await utils.isIDGood(req.user._id)
    const user = await findUser(id)
    req = matchedData(req)
    const isPasswordMatch = await auth.checkPassword(req.oldPassword, user)
    if (!isPasswordMatch) {
      utils.handleError(res, await passwordsDoNotMatch())
    } else {
      // all ok, proceed to change password
      res.status(200).json(await changePasswordInDB(id, req))
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.login = async (req, res) => {
  try {
    const data = req.body;

    const user = await Company.findOne({ email: data.email });

    if (!user) return utils.handleError(res, { message: "Invalid email and password", code: 400 })

    const isPasswordMatch = await auth.checkPassword(data.password, user)

    console.log(isPasswordMatch);

    if (!isPasswordMatch) {
      return utils.handleError(res, { message: "Invalid email and password", code: 400 })
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
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.forgotPassword = async (req, res) => {

  try {
    const data = req.body;
    console.log("data", data)
    const locale = req.getLocale()
    let user = await Company.findOne(
      { email: data.email }
    );
    console.log(data)

    if (!user) {
      throw utils.buildErrObject(422, "WRONG_EMAIL");
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
      name: user.company_name,
      url: data.production === false ? `${process.env.LOCAL_COMPANY_URL}resetPassword/${token}` : `${process.env.PRODUCTION_COMPANY_URL}resetPassword/${token}`
    }

    console.log("url==============", emailData.url)

    console.log("user", emailData)
    const item = await emailer.sendForgetPasswordEmail(locale, emailData, 'reset-password-admin');

    return res.status(200).json({
      code: 200,
      message: "Reset password link has been sent to your email",
    });

  } catch (err) {
    console.log(err)
    utils.handleError(res, err)
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

      return utils.handleError(res, { message: 'Invalid or expired reset password token', code: 400 })
    }

    // Check if the token has expired
    const currentTime = new Date();
    const tokenExpiryTime = new Date(reset.time);
    if (currentTime > tokenExpiryTime) {
      return utils.handleError(res, { message: 'Reset password token has expired', code: 400 })
    }

    // Find the user associated with the reset token
    const user = await Company.findOne({ email: reset.email });

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

    const admin = await Company.findById(user._id, "+password")
    const isPasswordMatch = await auth.checkPassword(old_password, admin)

    if (!isPasswordMatch) return utils.handleError(res, { message: "Incorrect Old Password", code: 400 });

    // Update the user's password
    user.password = new_password;
    // Save the changes
    await user.save();

    res.json({ message: 'Password changed successfully', code: 200 });
  } catch (err) {
    console.error(err);
    utils.handleError(res, err);
  }
};


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


exports.completeProfile = async (req, res) => {
  try {
    const company_id = req.user._id;
    const data = req.body;
    console.log("data", data)
    if (req.user.is_profile_completed === true) return utils.handleError(res, { message: "Card is already created", code: 400 });
    const companydata = await Company.findOne({ _id: company_id })
    console.log("companydata : ", companydata)
    if (!companydata) {
      return utils.handleError(res, { message: "Company not found", code: 400 });
    }
    companydata.is_profile_completed = true
    companydata.bio.full_name = data?.bio?.first_name + " " + data?.bio?.last_name
    companydata.bio.first_name = data?.bio?.first_name
    companydata.bio.last_name = data?.bio?.last_name
    companydata.business_and_logo_status = data?.business_and_logo_status
    companydata.business_logo = data?.business_logo
    companydata.card_color = data?.card_color
    companydata.company_name = data?.company_name
    companydata.address = data?.address
    companydata.contact_details.website = data.contact_details.website
    companydata.text_color = data?.text_color
    await companydata.save()
    res.json({ message: "Card created successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.corporateCardHolder = async (req, res) => {
  try {

    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    const { search = "", limit = 10, offset = 0, sort = -1 } = req.query;

    const condition = {
      $or: [
        { "bio.full_name": { $regex: new RegExp(search, 'i') } },
        { "contact_details.mobile_number": { $regex: new RegExp(search, 'i') } },
        { "bio.designation": { $regex: new RegExp(search, 'i') } },
        { "contact_details.email": { $regex: new RegExp(search, 'i') } },
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
    utils.handleError(res, error)
  }
}

exports.addTeamMemberByBusinessTeam = async (req, res) => {
  try {
    const userData = req.body;
    const userId = req.user._id
    const workEmailDomain = userData.work_email.split('@')[1];
    const companyDomain = req.user.email_domain;
    let isActiveSubscription = await Subscription.findOne({ user_id: userId, status: 'active' })
    console.log("isActiveSubscription : ", isActiveSubscription)

    let trialdata
    if (!isActiveSubscription) {
      trialdata = await Trial.findOne({ user_id: userId });
      console.log("trialdata : ", trialdata)
    }
    if (!trialdata && !isActiveSubscription) {
      return res.status(404).json({
        errors: {
          msg: 'No Subscription found',
        },
      });
    }

    let planId = isActiveSubscription ? isActiveSubscription?.plan_id : trialdata?.plan_id
    console.log("planId : ", planId)
    let planTierId = isActiveSubscription ? isActiveSubscription?.plan_tier?.tier_id : trialdata?.plan_tier_id
    console.log("planTierId : ", planTierId)

    let plandata = await Plan.aggregate(
      [
        {
          $match: {
            plan_id: planId
          }
        },
        {
          $unwind: {
            path: '$plan_tiers',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            "plan_tiers._id": new mongoose.Types.ObjectId(planTierId)
          }
        }
      ]
    )
    console.log("plandata : ", plandata)

    if (trialdata && trialdata.end_at < new Date()) {
      return res.status(400).json({
        errors: {
          msg: 'Trial period expired . please active subscription',
        },
      });
    }

    let totalteamcount = await TeamMember.countDocuments({ 'company_details.email_domain': companyDomain })
    console.log("totalteamcount : ", totalteamcount)
    if (trialdata && trialdata.end_at > new Date()) {
      console.log("inside freemium....")
      if (totalteamcount > 1) {
        return res.status(400).json({
          errors: {
            msg: 'You have exceed the freemium plan limit . please active subscription',
          },
        });
      }
    }

    if (isActiveSubscription && isActiveSubscription.status == 'active' && isActiveSubscription.end_at > new Date()) {
      console.log("inside max user condition...", isActiveSubscription?.plan_tier?.user_count)
      if (totalteamcount > isActiveSubscription?.plan_tier?.user_count) {
        return res.status(400).json({
          errors: {
            msg: 'You have exceed the premium plan limit maximum user limit . please upgrade plan tier',
          },
        });
      }
    }


    if (workEmailDomain !== companyDomain) {
      return res.status(400).json({
        errors: {
          msg: `Work email domain "${workEmailDomain}" does not match the company domain "${companyDomain}".`,
        },
      });
    }
    userData.company_details = {
      company_id: req.user._id,
      email_domain: req.user.email_domain,
      company_name: req.user.company_name,
      access_code: req.user.access_code
    }
    // console.log("userData in admin============",userData)
    //console.log('BUsiness team name------------------>>>>',req.user)
    const doesEmailExist = await TeamMember.exists({ work_email: userData.work_email });
    if (doesEmailExist) {
      return res.status(400).json({ errors: { msg: 'Email already exists.' } });
    }
    userData.full_name = `${userData.first_name} ${userData.last_name}`
    const newUser = new TeamMember(userData);
    const savedUser = await newUser.save();
    const userInfo = {
      id: savedUser._id,
      first_name: savedUser.first_name,
      last_name: savedUser.last_name,
      work_email: savedUser.work_email,
      phone_number: savedUser.phone_number,
      designation: savedUser.designation,
      user_type: savedUser.user_type,
      status: savedUser.status,
      company_id: savedUser.company_details.company_id,
      email_domain: savedUser.company_details.email_domain,
      company_name: savedUser.company_details.company_name,
      access_code: savedUser.company_details.access_code

    };

    await emailer.sendAccessCodeToTeamMemberByCompany(req.body.locale || 'en',
      userInfo, "accessCodeByCompanyToTeamMember");

    res.status(201).json({
      code: 201,
      // userInfo: userInfo, 
      message: 'Team Member has been Added and Access code has been sent on work Email'
    });
  } catch (error) {
    // console.error(error);
    utils.handleError(res, error)
  }
};


exports.getTeamMembersByBusinessTeam = async (req, res) => {
  try {
    const { work_email, status, limit = 10, offset = 0, search } = req.query;

    const companyId = req.user._id;
    if (!companyId) {
      return res.status(400).json({ message: "Invalid request: Company ID is missing." });
    }

    const query = {
      "company_details.company_id": companyId,
    };

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { first_name: { $regex: search, $options: "i" } },
        { last_name: { $regex: search, $options: "i" } },
        { work_email: { $regex: search, $options: "i" } },
        { phone_number: { $regex: search, $options: "i" } },
      ];
    }

    const paginationLimit = parseInt(limit, 10);
    const paginationOffset = parseInt(offset, 10);

    const totalCount = await TeamMember.countDocuments(query);

    const teamMembers = await TeamMember.find(query)
      .sort({ createdAt: -1 })
      .skip(paginationOffset)
      .limit(paginationLimit);

    const response = teamMembers.map((member) => ({
      id: member._id,
      first_name: member.first_name,
      last_name: member.last_name,
      work_email: member.work_email,
      phone_number: member.phone_number,
      designation: member.designation,
      user_type: member.user_type,
      status: member.status,
      company_details: member.company_details,
    }));

    if (totalCount === 0) {
      return res.status(200).json({
        code: 200,
        teamMembers: response,
        message: "No team members are present."
      });
    }

    res.status(200).json({
      code: 200,
      totalCount,
      limit: paginationLimit,
      offset: paginationOffset,
      message: "Team members retrieved successfully",
      teamMembers: response,
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};




exports.getTeamMemberByID = async (req, res) => {
  try {
    const { _id } = req.query;
    //console.log('idd',req.query)
    if (!_id) {
      return res.status(400).json({ message: 'Team member ID (_id) is required.' });
    }
    const teamMember = await TeamMember.findById(_id)
    //.populate('company_details.company_id', 'name email_domain');

    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found.' });
    }

    const response = {
      id: teamMember._id,
      first_name: teamMember.first_name,
      last_name: teamMember.last_name,
      work_email: teamMember.work_email,
      phone_number: teamMember.phone_number,
      designation: teamMember.designation,
      user_type: teamMember.user_type,
      status: teamMember.status,
      company_details: teamMember.company_details,
    };

    res.status(200).json({
      code: 200,
      message: 'Team member retrieved successfully',
      teamMember: response,
    });
  } catch (error) {
    //console.error('Error fetching team member by ID:', error);
    utils.handleError(res, error);
  }
};

exports.updateTeamMember = async (req, res) => {
  try {
    const updateData = req.body;
    let emailChanged = false;
    //console.log('Update request for team member with ID:', updateData);
    if (!updateData._id) return res.status(400).json({ message: 'Team member ID (_id) is required.' });
    const existedData = await TeamMember.findById(updateData._id)
    if (updateData.work_email && updateData.work_email !== existedData.work_email) {
      const emailExists = await TeamMember.exists({ work_email: updateData.work_email });
      if (emailExists) {
        return res.status(400).json({ errors: { msg: 'Email already exists.' } });
      }
      emailChanged = true;
    }

    const teamMember = await TeamMember.findByIdAndUpdate(
      updateData._id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    )
    //.populate('company_details.company_id', 'name email_domain');
    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found.' });
    }
    const response = {
      id: teamMember._id,
      first_name: teamMember.first_name,
      last_name: teamMember.last_name,
      work_email: teamMember.work_email,
      phone_number: teamMember.phone_number,
      designation: teamMember.designation,
      user_type: teamMember.user_type,
      status: teamMember.status,
      company_details: teamMember.company_details,
    };
    if (emailChanged) {
      await emailer.sendAccessCodeToTeamMemberByCompany(req.body.locale || 'en',
        response, "accessCodeByCompanyToTeamMember");
    }
    res.status(200).json({
      code: 200,
      message: emailChanged ? 'Team member updated successfully.Access code has been sent on work Email' : 'Team member updated successfully',
      teamMember: response,
    });
  } catch (error) {
    //console.error('Error updating team member by ID:', error);
    utils.handleError(res, error);
  }
};

exports.updateTeamMemberStatus = async (req, res) => {
  try {
    const { _id } = req.body;
    if (!_id) return res.status(400).json({ message: 'Team Member ID (_id) is required.' });
    const existedData = await TeamMember.findById(_id);
    if (!existedData) return res.status(404).json({ message: 'Team member not found.' });
    console.log('Existing Data:', existedData);
    existedData.status = existedData.status === 'active' ? 'inactive' : 'active';
    const updatedTeamMember = await existedData.save();
    console.log('Updated Status:', updatedTeamMember.status);
    res.status(200).json({
      message: 'Team member status updated successfully',
      status: updatedTeamMember.status
      //updatedTeamMember,
    });
  } catch (err) {
    console.error('Error updating team member status:', err);
    utils.handleError(res, err);
  }
};


exports.deleteTeamMemberByID = async (req, res) => {
  try {
    const { _id } = req.params;
    console.log('Delete request for team member with ID:', _id);

    if (!_id) {
      return res.status(400).json({ message: 'Team member ID (_id) is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      return res.status(400).json({ message: 'Invalid team member ID format.' });
    }

    const objectId = mongoose.Types.ObjectId(_id);

    const teamMember = await TeamMember.findByIdAndDelete(objectId);
    console.log("teamMember : ", teamMember)
    const company_id = teamMember?.company_details?.company_id
    console.log("company_id : ", company_id)
    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found.' });
    }

    console.log('Deleted team member:', teamMember);

    const user = await User.findOneAndUpdate(
      { "companyAccessCardDetails._id": objectId },
      { $pull: { companyAccessCardDetails: { _id: objectId } } },
      { new: true }
    );

    // if (!user) {
    //   return res.status(404).json({
    //     message: 'No user found with the specified team member ID in companyAccessCardDetails.',
    //   });
    // }

    console.log('Updated user after removing team member:', user);

    res.status(200).json({
      code: 200,
      message: 'Team member deleted successfully and reference removed from user.',
      deletedTeamMemberId: _id,
      updatedUser: user,
    });
  } catch (error) {
    console.error('Error deleting team member by ID:', error);
    res.status(500).json({ message: 'Internal server error.', error });
  }
};


//-------------------------------------------------------
exports.deleteCorporateCardHolders = async (req, res) => {
  try {

    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }


    const user_id = req.query.user_id;

    console.log("user_id", user_id)
    const cardDetials = await CardDetials.findOne({ owner_id: mongoose.Types.ObjectId(user_id) })
    if (!cardDetials) return utils.handleError(res, { message: "Card not found", code: 404 });

    if (cardDetials.company_id.toString() !== company_id.toString()) return utils.handleError(res, { message: "You can't delete other company card holder", code: 400 });
    await CardDetials.deleteOne({ owner_id: mongoose.Types.ObjectId(user_id) })

    await User.findByIdAndUpdate(user_id, { is_card_created: false });

    res.json({ message: "Account is deleted successfully", code: 200 });
  } catch (error) {
    utils.handleError(res, error)
  }
}



exports.dashboardData = async (req, res) => {
  try {
    let company_id = req.user._id;
    console.log("company id : ", company_id)

    const type = req.user.type;
    console.log("type : ", type)
    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    const sevenDay = 7 * 24 * 60 * 60 * 1000;

    const data = await CardDetials.aggregate(
      [
        {
          $match: {
            company_id: mongoose.Types.ObjectId(company_id)
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            paid: {
              $sum: {
                $cond: { if: "$paid_by_company", then: 1, else: 0 }
              }
            },
            unpaid: {
              $sum: {
                $cond: { if: "$paid_by_company", then: 0, else: 1 }
              }
            },
            recent: {
              $sum: {
                $cond: {
                  if: {
                    $gte: [
                      "$createdAt",
                      new Date(Date.now() - sevenDay)
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            }
          }
        }
      ]
    )

    const company = await Company.findById(company_id);
    const currentDate = new Date()
    const startOfWeek = new Date();
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    startOfPeriod = startOfWeek;
    endOfPeriod = endOfWeek;
    console.log("currentDate : ", currentDate, " startOfPeriod : ", startOfPeriod, " endOfPeriod : ", endOfPeriod)
    const totalTeamMate = await TeamMember.countDocuments({ 'company_details.company_id': company_id })
    const newTeamMate = await TeamMember.countDocuments({ 'company_details.company_id': company_id, createdAt: { $gte: startOfPeriod, $lte: endOfPeriod } })

    res.json({ data: data[0], access_code: company?.access_code, totalTeamMate, newTeamMate, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.updateAccount = async (req, res) => {
  try {
    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    const data = req.body;

    await Company.findByIdAndUpdate(company_id, data)

    res.json({ message: "Account updated successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.getNotification = async (req, res) => {
  try {
    const { limit = Number.MAX_SAFE_INTEGER, offset = 0 } = req.query;
    let reciever_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      reciever_id = req.user.company_id
    }

    const count = await Notification.count({
      receiver_id: mongoose.Types.ObjectId(reciever_id),
    });

    const notification = await Notification.aggregate([
      {
        $match: {
          receiver_id: mongoose.Types.ObjectId(reciever_id),
          cleared: { $ne: true }
        },
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
    console.log(error)
    utils.handleError(res, error)
  }
};

exports.changeNotificaitonSetting = async (req, res) => {
  try {
    const user_id = req.user._id;

    const user = await Company.findById(user_id);
    user.notification = !user.notification;
    await user.save()

    res.json({ message: `Notificaton ${user.notification ? "enabled" : "disabled"} successfully`, code: 200 })
  } catch (error) {
    utils.handleError(res, error);
  }
}

// exports.changeNotificaitonSetting = async (req, res) => {
//   try {
//     const receiver_id  = req.user._id; // ID of the receiver (user or company) whose notifications to toggle
//    console.log('receiver_id',receiver_id)
//     if (!receiver_id) {
//       return res.status(400).json({ message: "Receiver ID is required", code: 400 });
//     }

//     // Ensure the request is from an admin
//     if (req.user.type !== "admin") {
//       return res.status(403).json({ message: "Access denied. Admin only.", code: 403 });
//     }

//     // Find notifications for the given receiver_id
//     const notifications = await Notification.find({ receiver_id: mongoose.Types.ObjectId(receiver_id) });

//     // if (notifications.length === 0) {
//     //   return res.status(404).json({ message: "No notifications found for the given receiver", code: 404 });
//     // }

//     // Toggle the `is_admin` flag for all notifications for the receiver
//     const currentStatus = notifications[0].is_admin; // Assume all notifications have the same status
//     await Notification.updateMany(
//       { receiver_id: mongoose.Types.ObjectId(receiver_id) },
//       { $set: { is_admin: !currentStatus } }
//     );

//     res.json({
//       message: `Notifications for receiver ${receiver_id} ${!currentStatus ? "enabled" : "disabled"} for admin.`,
//       code: 200,
//     });
//   } catch (error) {
//     console.error("Error changing notification settings:", error);
//     utils.handleError(res, error);
//   }
// };


exports.deleteNotification = async (req, res) => {
  try {
    let company_id = req.user._id;
    const id = req.query.id

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    // const notificaiton = await Notification.findById(id);
    // // if (notificaiton.receiver_id.toString() !== req.user._id.toString()) return utils.handleError(res, { message: "You can only deleted you notification", code: 400 });

    await Notification.findByIdAndDelete(id);
    res.json({ message: "Notification cleared successfully", code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.deleteAllNotification = async (req, res) => {
  try {
    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    await Notification.deleteMany({ receiver_id: mongoose.Types.ObjectId(company_id) });

    res.json({ message: "Notification cleared Successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}



exports.addEmailInPiadByCompany = async (req, res) => {
  try {

    const { email } = req.body;
    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }


    const emailDomain = extractDomainFromEmail(email);
    if (req.user.email_domain !== emailDomain) return utils.handleError(res, { message: "Domain name not matched", code: 400 });

    const isEmailAlreadyExist = await PaidByCompany.findOne({ company_id: mongoose.Types.ObjectId(company_id), email: email });
    if (isEmailAlreadyExist) return utils.handleError(res, { message: "Email is already in the list", code: 400 });

    const isSubcriptionActive = await checkSusbcriptionIsActive(company_id)
    if (!isSubcriptionActive) return utils.handleError(res, { message: "You do not have any active subscription", code: 400 });

    //check is the users already have an active subscription
    const card = await CardDetials.findOne({ "contact_details.email": email });
    if (card) {
      const isSubcriptionActiveForUser = await checkSusbcriptionIsActive(card.owner_id)
      if (isSubcriptionActiveForUser) return utils.handleError(res, { message: "You can not add user who have active subcription", code: 400 });
    }

    const subcription = await Subscription.findOne({ user_id: company_id }).sort({ createdAt: -1 });
    const plan = await Plan.findOne({ plan_id: subcription.plan_id });

    const count = await PaidByCompany.countDocuments({ company_id: mongoose.Types.ObjectId(company_id) });
    if (count >= plan.allowed_user) return utils.handleError(res, { message: `You have already reached the limit of ${plan.allowed_user} paid users`, code: 400 });

    const data = {
      company_id: company_id,
      email: email,
      is_card_created: card ? true : false
    }

    const addNewEmail = new PaidByCompany(data);
    await addNewEmail.save();

    if (data.is_card_created === true) {
      card.paid_by_company = true
      await card.save()
    }

    res.json({ message: "Email added successfully", code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}



exports.bulkUploadEmail = async (req, res) => {
  try {
    const type1 = req.body.type;

    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }
    const isSubcriptionActive = await checkSusbcriptionIsActive(company_id)
    if (!isSubcriptionActive) return utils.handleError(res, { message: "You do not have any active subscription", code: 400 });

    const subcription = await Subscription.findOne({ user_id: company_id }).sort({ createdAt: -1 });
    const plan = await Plan.findOne({ plan_id: subcription.plan_id });
    const limit = plan.allowed_user;

    if (!req.files.media || !req.body.type) {
      // check if image and path missing
      return res.status(422).json({
        code: 422,
        message: "MEDIA OR TYPE MISSING",
      });
    }

    console.log("env", process.env.STORAGE_PATH)
    let media = await uploadFileToLocal({
      file: req.files.media,
      path: `${process.env.STORAGE_PATH_FOR_EXCEL}/bulkUpload`,
    });

    media = `${process.env.STORAGE_PATH_FOR_EXCEL}/bulkUpload/${media}`

    var Email = [];

    if (type1 === "excel") {
      // Read Excel file
      const processExcel = () => {
        const emails = []
        return new Promise((resolve, reject) => {

          const workbook = xlsx.readFile(media);
          const sheet_name_list = workbook.SheetNames;
          const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
          // Assuming email field is in column A
          data.forEach(row => {
            console.log("row", row["Email"])
            emails.push({ email: row['Email'] });
          });

          resolve(emails)
        })
      }
      Email = await processExcel()
    } else if (type1 === "csv") {

      const processCSV = () => {
        const emails = []
        return new Promise((resolve, reject) => {
          fs.createReadStream(media)
            .pipe(csv())
            .on('data', (row) => {
              emails.push({ email: row.Email });
            })
            .on('end', () => {
              resolve(emails)
              console.log('CSV file successfully processed');
            });
        })
      }

      Email = await processCSV()
    }

    if (Email.length === 0) return utils.handleError(res, { message: "Email field should cantain atleast one row", code: 400 });


    for (let index = 0; index < Email.length; index++) {
      const email = Email[index].email;
      const emailDomain = extractDomainFromEmail(email);
      if (req.user.email_domain !== emailDomain) { return utils.handleError(res, { message: `Domain name not matched at row ${index + 2}`, code: 400 }) };
    }

    console.log("Email", Email)

    const findAllExistingEmail = await PaidByCompany.find({ company_id: company_id })
    if (findAllExistingEmail.length >= limit) return utils.handleError(res, { message: `You have already reach the limit of ${limit} emails`, code: 400 });

    const emailInDatabase = findAllExistingEmail.map(element => element.email);

    const alreadyInTheList = [];
    const notIntheList = [];

    Email.forEach(email => {
      if (emailInDatabase.includes(email.email)) {
        alreadyInTheList.push(email.email)
      } else {
        notIntheList.push(email.email)
      }
    })

    if ((emailInDatabase.length + notIntheList.length) > limit) return utils.handleError(res, { message: `You have limit of ${limit} emails`, code: 400 });


    const userWithActiveSubscription = [];
    const emailToInsert = [];

    for (let index = 0; index < notIntheList.length; index++) {
      const email = notIntheList[index];

      const card = await CardDetials.findOne({ "contact_details.email": email });
      if (!card) {
        emailToInsert.push({
          company_id: company_id,
          email: email,
          is_card_created: false
        })
        continue;
      }


      const isSubcriptionActiveForUser = await checkSusbcriptionIsActive(card.owner_id)
      if (!isSubcriptionActiveForUser) {
        emailToInsert.push({
          company_id: company_id,
          email: email,
          is_card_created: true
        })

        card.paid_by_company = true
        await card.save()

        continue;
      }

      userWithActiveSubscription.push(email)

    }

    if (emailToInsert.length === 0) return utils.handleError(res, { message: `${alreadyInTheList.length !== 0 ? `${alreadyInTheList.length} email is already in the list` : ``} ${alreadyInTheList.length !== 0 && userWithActiveSubscription.length !== 0 ? ' and ' : ''}${userWithActiveSubscription.length !== 0 ? `${userWithActiveSubscription.length} email have subscription active` : ""}`, code: 400 })

    await PaidByCompany.insertMany(emailToInsert);

    res.json({ message: `${emailToInsert.length} email uploaded successfully`, media, Email, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.removeEmailfromPiadByCompany = async (req, res) => {
  try {
    const { email } = req.body;
    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    const isEmailAlreadyExist = await PaidByCompany.findOne({ company_id: mongoose.Types.ObjectId(company_id), email: email });
    if (!isEmailAlreadyExist) return utils.handleError(res, { message: "Email not found", code: 404 });

    if (isEmailAlreadyExist.is_card_created === true) {

      const card = await CardDetials.findOne({ "contact_details.email": email })
      if (!card) utils.handleError(res, { message: "User card not found" })
      const user = await User.findById(card?.owner_id);

      const isTrialGiven = await giveTrialIfNotGive(card?.owner_id);
      card.paid_by_company = false;
      let notification;

      if (isTrialGiven) {

        notification = {
          sender_id: company_id,
          receiver_id: card?.owner_id,
          type: "removed_from_paid",
          title: "Subscription Update",
          body: `You've been removed from the company plan. Your six month free plan has been activated`
        }

      } else {
        card.waiting_end_time = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));

        notification = {
          sender_id: company_id,
          receiver_id: card?.owner_id,
          type: "removed_from_paid",
          title: "Subscription Update",
          body: `You've been removed from the company plan. Please buy subscription within 7 days to keep using the app without any interruptions`
        }

      }

      await card.save()

      const saveNotificationForUser = new Notification(notification)
      await saveNotificationForUser.save()

      if (user?.notification) {
        const device_token = await FCMDevice.findOne({ user_id: user._id })
        if (!device_token) return
        utils.sendPushNotification([device_token.token], notification.title, notification.body)
      }
    }


    await isEmailAlreadyExist.remove();
    res.json({ message: "Email removed successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}




exports.getListOfPaidByComapny = async (req, res) => {
  try {
    const { sort = -1, limit = 10, offset = 0 } = req.query;
    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }
    const count = await PaidByCompany.countDocuments({ company_id: mongoose.Types.ObjectId(company_id) });
    const data = await PaidByCompany.find({ company_id: mongoose.Types.ObjectId(company_id) }).sort({ createdAt: +sort }).skip(+offset).limit(+limit)

    res.json({ data: data, count, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.transactionHistory = async (req, res) => {
  try {
    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }
    const { sort = -1, limit = 10, offset = 0 } = req.query;

    const count = await Transaction.countDocuments({ user_id: mongoose.Types.ObjectId(company_id) });
    const data = await Transaction.aggregate([
      {
        $match: {
          user_id: company_id
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

exports.plansList = async (req, res) => {
  try {
    let user_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      user_id = req.user.company_id
    }

    const plans = await Plan.find({ plan_type: "company" })
    let activeSubscription = await Subscription.findOne({ user_id: user_id, status: "active" }).sort({ createdAt: -1 })

    let updatedPlan = null;
    if (activeSubscription) {

      const subcription = await instance.subscriptions.fetch(activeSubscription.subscription_id);
      if (subcription.has_scheduled_changes === true) {
        const update = await instance.subscriptions.pendingUpdate(activeSubscription.subscription_id);
        const planfromDatabase = await Plan.findOne({ plan_id: update.plan_id });

        updatedPlan = {
          update,
          planfromDatabase
        }
      }
      return res.json({ data: plans, isTrialActive: false, active: activeSubscription?.status !== "created" ? activeSubscription : null, update: updatedPlan ? updatedPlan : null, code: 200 });
    } else {
      let checkIsTrialExits = await Trial.findOne({ user_id, status: "active" });
      console.log("checkIsTrialExits", checkIsTrialExits)

      if (checkIsTrialExits && checkIsTrialExits.end_at > new Date()) {
        let result = { ...checkIsTrialExits.toObject() }
        console.log("result : ", result)
        return res.json({ data: plans, isTrialActive: true, active: result, update: updatedPlan ? updatedPlan : null, code: 200 });
      }
    }
    return res.json({ data: plans, isTrialActive: false, active: null, update: null, code: 200 });
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.activeSubscription = async (req, res) => {
  try {
    let company_id = req.user._id;
    console.log("user : ", req.user)

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    console.log("company_id : ", company_id)

    let data = []
    let isactiveSubscription = false;
    let trial_period = false
    data = await Subscription.aggregate(
      [
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(company_id),
            status: "active"
          }
        },
        {
          $lookup: {
            from: "plans",
            let: {
              id: "$plan_id",
              tier_id: "$plan_tier.tier_id"
            },
            pipeline: [
              {
                $unwind: {
                  path: "$plan_tiers"
                }
              },
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$$id", "$plan_id"]
                      },
                      {
                        $eq: ["$$tier_id", "$plan_tiers._id"]
                      }
                    ]
                  }
                }
              }
            ],
            as: "plan"
          }
        },
        {
          $unwind: "$plan"
        },
        {
          $addFields: {
            'plan_tier.plan_tier_data': '$plan.plan_tiers'
          }
        },
        {
          $project: {
            plan: 0
          }
        },
        {
          $sort: {
            createdAt: -1
          }
        }
      ]
    )
    console.log("data : ", data)
    if (data.length === 0) {
      console.log("inside trial check....")
      data = await Trial.aggregate(
        [
          {
            $match: {
              user_id: new mongoose.Types.ObjectId(company_id),
              status: "active"
            }
          },
          {
            $lookup: {
              from: "plans",
              let: {
                id: "$plan_id",
                tier_id: "$plan_tier.tier_id"
              },
              pipeline: [
                {
                  $unwind: {
                    path: "$plan_tiers"
                  }
                },
                {
                  $match: {
                    $expr: {
                      $and: [
                        {
                          $eq: ["$$id", "$plan_id"]
                        },
                        {
                          $eq: ["$$tier_id", "$plan_tiers._id"]
                        }
                      ]
                    }
                  }
                }
              ],
              as: "plan"
            }
          },
          {
            $unwind: "$plan"
          },
          {
            $addFields: {
              'plan_tier.plan_tier_data': '$plan.plan_tiers'
            }
          },
          {
            $project: {
              plan: 0
            }
          },
          {
            $sort: {
              createdAt: -1
            }
          }
        ]
      )
      if (data.length !== 0) {
        trial_period = true
      }
    }
    if (data && data.length > 0) {
      isactiveSubscription = true
    }
    console.log("data : ", data)
    return res.json({ data: { ...data[0], trial_period }, isactiveSubscription, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

async function isTrailNeedToBeGiven(user_id) {
  try {
    const isSubcriptionExist = await Subscription.findOne({ user_id: mongoose.Types.ObjectId(user_id), status: { $nin: ["created", "expired"] } });
    if (isSubcriptionExist) {
      return false
    } else {
      return true
    }
  } catch (error) {
    throw new Error(error)
  }

}

function getTotalCount(interval) {
  if (interval === 12) {
    return 10
  } else if (interval === 6) {
    return 20
  } else if (interval === 3) {
    return 40
  } else if (interval === 1) {
    return 120
  }
}

async function SubscriptionId() {
  const token = await crypto.randomBytes(8).toString('hex')
  return `sub_${token}`
}

async function createRazorpayOrder(amount, user_id) {
  try {
    const order = await instance.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `order_rcptid_${new Date().getTime()}`,
      payment_capture: 1,
      notes: {
        user_id: user_id.toString()
        // plan_id: plan.plan_id
      }
    });

    console.log("razorpay order created: ", order);
    return order;
  } catch (error) {
    console.error("Error creating Razorpay order: ", error);
    throw error;
  }
}

exports.createSubscription = async (req, res) => {
  try {
    let user_id = req.user._id;
    console.log("user_id : ", user_id)

    const type = req.user.type;
    console.log("user_type : ", type)
    if (type === "sub admin") {
      user_id = req.user.company_id
    }

    const { plan_id } = req.body;
    const isSubcriptionExist = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });
    console.log("isSubcriptionExist : ", isSubcriptionExist)


    if (isSubcriptionExist && isSubcriptionExist.status === "created") {
      console.log(isSubcriptionExist)
      if (req.body.tier_id) {
        console.log("checking existing plan.....")
        const status = isSubcriptionExist.status
        if (["created", "expired", "cancelled"].includes(status)) {
          const result = await Subscription.findByIdAndDelete(isSubcriptionExist._id);
          console.log("result : ", result)
        } else if (["authenticated", "active", "paused", "pending", "halted"].includes(status)) {
          return res.json({ message: `You already have ${status} subscription, It will take some to reflect here`, code: 400 })
        }
      } else {
        const subcription = await instance.subscriptions.fetch(isSubcriptionExist.subscription_id);
        const status = subcription.status
        console.log("subcription", status)
        if (["created", "expired", "cancelled"].includes(status)) {
          await Subscription.findByIdAndDelete(isSubcriptionExist._id);
          await instance.subscriptions.cancel(isSubcriptionExist.subscription_id)
        } else if (["authenticated", "active", "paused", "pending", "halted"].includes(status)) {
          return res.json({ message: `You already have ${status} subscription, It will take some to reflect here`, code: 400 })
        }
      }
    }

    if (isSubcriptionExist && ["authenticated", "active"].includes(isSubcriptionExist.status)) {
      return res.json({ message: `You already have ${isSubcriptionExist.status} subscription`, code: 400 })
    }

    if (isSubcriptionExist && ["pending", "halted"].includes(isSubcriptionExist.status)) {
      return res.json({ message: `You already have ${isSubcriptionExist.status} subscription , Please update your payment method`, code: 400 })
    }

    if (isSubcriptionExist && ["cancelled", "completed", "expired"].includes(isSubcriptionExist.status) && isSubcriptionExist.end_at > new Date()) {
      return res.json({ message: `Your can create new subscription after the expiry time of current subscription`, code: 400 })
    }

    // if (isSubcriptionExist && isSubcriptionExist.status === "created" && plan_id !== isSubcriptionExist.plan_id && new Date(isSubcriptionExist.createdAt).getTime() + (5 * 60 * 1000) > new Date()) {
    //   return res.json({ message: "Please wait some time to swith the plan", code: 400 });
    // }

    // if (isSubcriptionExist && isSubcriptionExist.status === "created" && plan_id !== isSubcriptionExist.plan_id && new Date(isSubcriptionExist.createdAt).getTime() + (5 * 60 * 1000) < new Date()) {
    //   await Subscription.findByIdAndDelete(isSubcriptionExist._id);
    //   await instance.subscriptions.cancel(isSubcriptionExist.subcription_id, { cancel_at_cycle_end: 0 })
    // }

    // if (isSubcriptionExist && isSubcriptionExist.status === "created" && plan_id === isSubcriptionExist.plan_id && new Date(isSubcriptionExist.createdAt).getTime() + (5 * 60 * 1000) < new Date()) {
    //   await Subscription.findByIdAndDelete(isSubcriptionExist._id);
    //   await instance.subscriptions.cancel(isSubcriptionExist.subcription_id, { cancel_at_cycle_end: 0 })
    // }

    // if (isSubcriptionExist && isSubcriptionExist.status === "created" && plan_id === isSubcriptionExist.plan_id && new Date(isSubcriptionExist.createdAt).getTime() + (5 * 60 * 1000) > new Date()) {
    //  const subcription = await instance.subscriptions.fetch(isSubcriptionExist.subcription_id);
    //  if(subcription?.status === "created"){
    //   res.json({ data: subcription, code: 200 });
    //  }else{
    //   res.josn({message : "subscription exits"})
    //  }
    // }
    let plan
    if (req.body.tier_id) {
      console.log("checking....")
      plan = await Plan.aggregate(
        [
          {
            $unwind: {
              path: "$plan_tiers",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {
              plan_id,
              'plan_tiers._id': new mongoose.Types.ObjectId(req.body.tier_id)
            }
          }
        ]
      )
      plan = plan[0]
    } else {
      plan = await Plan.findOne({ plan_id: plan_id });
    }
    console.log("plan : ", plan)
    if (!plan) return utils.handleError(res, { message: "Plan not found", code: 404 });

    if (plan.plan_type !== "company") return utils.handleError(res, { message: "This plan is not for company", code: 400 });

    let planId = plan.plan_id
    let subcription
    if (req.body.tier_id) {
      console.log("inside.....")
      const tierPlanData = {
        tier_id: plan?.plan_tiers?._id,
        amount: req.body.amount,
        user_count: req.body.user_count
      }
      const now = new Date()
      let startOfPeriod
      let endOfPeriod
      if (plan.period === "monthly") {
        // startOfPeriod = req.body.isTrial ? new Date(now.setDate(now.getDate() + plan.trial_period_days)) : new Date(now);
        startOfPeriod = new Date(now)
        endOfPeriod = new Date(now.setMonth(now.getMonth() + 1))
      }
      if (plan.period === "yearly") {
        // startOfPeriod = req.body.isTrial ? new Date(now.setDate(now.getDate() + plan.trial_period_days)) : new Date(now);
        startOfPeriod = new Date(now)
        endOfPeriod = new Date(now.setFullYear(now.getFullYear() + 1))
      }
      console.log("startOfPeriod : ", startOfPeriod, " endOfPeriod : ", endOfPeriod)
      const dataForDatabase = {
        user_id: user_id,
        subscription_id: await SubscriptionId(),
        plan_id: planId,
        plan_started_at: startOfPeriod,
        start_at: startOfPeriod,
        end_at: endOfPeriod,
        status: "active",
        plan_tier: tierPlanData
      }
      if (req.body.isTrial) {
        console.log("req.body.isTrial : ", req.body.isTrial)
        // dataForDatabase.trial_period = {
        //   start: startOfPeriod,
        //   end: endOfPeriod
        // }
        const newTrial = await Trial.create({
          user_id,
          subscription_id: await SubscriptionId(),
          plan_id: planId,
          start_at: startOfPeriod,
          end_at: endOfPeriod,
          status: 'active',
          plan_tier: tierPlanData
        })
        console.log("newTrial : ", newTrial)
        return res.json({ message: "Trial created succsessfully", data: newTrial, code: 200 })
      }
      console.log("dataForDatabase : ", dataForDatabase)

      subcription = new Subscription(dataForDatabase);
      console.log("subcription : ", subcription)

      if (!req.body.isTrial) {
        const razorpayOrder = await createRazorpayOrder(req.body.amount, user_id);
        subcription.plan_tier.razorpay_order = razorpayOrder.id
        console.log("razorpayOrder : ", razorpayOrder)
      }

      await subcription.save()

    } else {
      const trailToBeGiven = await isTrailNeedToBeGiven(user_id)
      console.log("trailToBeGiven : ", trailToBeGiven)
      let trail = {}

      const currentDate = moment();
      const futureDate = currentDate.add((plan?.trial_period_days ?? 180), 'days');
      console.log("futureDate : ", futureDate)
      if (trailToBeGiven === true) {
        const timestamp = Math.floor(futureDate.valueOf() / 1000)
        console.log("timestamp : ", timestamp)
        trail = { start_at: timestamp }
      }

      const expireTime = Math.floor((Date.now() + (10 * 60 * 1000)) / 1000);
      console.log("expireTime : ", expireTime)
      console.log("getTotalCount(plan.interval)", getTotalCount(plan.interval));

      subcription = await instance.subscriptions.create({
        "plan_id": planId,
        "total_count": getTotalCount(plan.interval),
        "quantity": 1,
        "customer_notify": 1,
        // ...trail,
        expire_by: expireTime,
        "notes": {
          "user_id": user_id.toString(),
          "user_type": "company"
        }
      })
      console.log("subcription : ", subcription)

      const now = new Date()
      const dataForDatabase = {
        user_id: user_id,
        subscription_id: subcription.id,
        plan_id: planId,
        plan_started_at: now,
        start_at: now,
        end_at: trailToBeGiven === true ? new Date(futureDate.valueOf()) : now,
        status: subcription.status
      }
      console.log("dataForDatabase : ", dataForDatabase)

      const saveToDB = new Subscription(dataForDatabase);
      console.log("saveToDB : ", saveToDB)
      await saveToDB.save()
    }
    return res.json({ message: "Subscription created succsessfully", data: subcription, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.updateSubscription = async (req, res) => {
  try {

    let user_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      user_id = req.user.company_id
    }

    const plan_id = req.body.plan_id;

    let plan
    if (req.body.tier_id) {
      plan = await Plan.aggregate(
        [
          {
            $unwind: {
              path: "$plan_tiers",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {
              plan_id,
              'plan_tiers._id': new mongoose.Types.ObjectId(req.body.tier_id)
            }
          }
        ]
      )
      plan = plan[0]
    } else {
      plan = await Plan.findOne({ plan_id: plan_id });
    }
    console.log("plan : ", plan)
    if (!plan) return utils.handleError(res, { message: "Plan not found", code: 404 });
    if (plan.plan_type !== "company") return utils.handleError(res, { message: "This plan is not for company", code: 400 });

    let isTrial = false;
    let activeSubscription = await Subscription.findOne({ user_id: user_id, status: { $nin: ["expired", "created"] } }).sort({ createdAt: -1 })
    if (!activeSubscription) {
      activeSubscription = await Trial.findOne({ user_id, status: "active" })
      if (activeSubscription) isTrial = true
    }
    if (!activeSubscription) return res.json({ message: "You don not have any active subscription", code: 404 });

    if (plan?.plan_tiers) {
      const status = activeSubscription.status;
      if (status !== "authenticated" && status !== "active") return res.json({ message: `You can not update a ${status} subscription`, code: 400 });
      if (status === "authenticated") return res.json({ message: `You can not update subscription in trial period`, code: 400 });

      const tierPlanData = {
        tier_id: plan?.plan_tiers?._id,
        amount: req.body.amount,
        user_count: req.body.user_count
      }

      const now = new Date()
      let startOfPeriod
      let endOfPeriod
      if (plan.period === "monthly") {
        startOfPeriod = new Date(now);
        endOfPeriod = new Date(now.setMonth(now.getMonth() + 1));
      }
      if (plan.period === "yearly") {
        startOfPeriod = new Date(now);
        endOfPeriod = new Date(now.setFullYear(now.getFullYear() + 1));
      }

      // activeSubscription.user_id = user_id
      // activeSubscription.plan_id = plan.plan_id
      // activeSubscription.plan_started_at = startOfPeriod
      // activeSubscription.start_at = startOfPeriod
      // activeSubscription.end_at = endOfPeriod
      // activeSubscription.status = "active"
      // activeSubscription.plan_tier = tierPlanData

      const razorpayOrder = await createRazorpayOrder(req.body.amount, user_id);
      activeSubscription.plan_tier.razorpay_order = razorpayOrder
      console.log("razorpayOrder : ", razorpayOrder)

      tierPlanData.razorpay_order = {
        id: razorpayOrder?.id
      }
      const updaterequest = await updateSubscriptionRequest.create(
        {
          user_id,
          plan_id: plan.plan_id,
          plan_started_at: startOfPeriod,
          start_at: startOfPeriod,
          end_at: endOfPeriod,
          plan_tier: tierPlanData,
          subscription_id: activeSubscription?.subscription_id
        }
      )
      console.log("updaterequest : ", updaterequest)

      res.json({ message: "Subscription updated successfully. Waiting for payment verification", code: 200 })

      // await activeSubscription.save()
    } else {
      const subcription = await instance.subscriptions.fetch(activeSubscription.subscription_id);
      const status = subcription.status;
      if (status !== "authenticated" && status !== "active") return res.json({ message: `You can not update a ${status} subscription`, code: 400 });

      if (status === "authenticated") return res.json({ message: `You can not update subscription in trial period`, code: 400 });

      if (subcription.has_scheduled_changes === true) {
        await instance.subscriptions.cancelScheduledChanges(activeSubscription.subscription_id);
      }

      const update = {
        plan_id: plan_id,
        schedule_change_at: "cycle_end",
        customer_notify: true,
        remaining_count: getTotalCount(plan.interval)
      }

      await instance.subscriptions.update(activeSubscription.subscription_id, update)
    }

    let result = await Subscription.findOne({ user_id: user_id, status: { $nin: ["expired", "created"] } }).sort({ createdAt: -1 })

    res.json({ message: "Subscription updated successfully", data: result, code: 200 })
  } catch (error) {
    console.log
    utils.handleError(res, error)
  }
}

exports.cancelSubscription = async (req, res) => {
  try {
    let user_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      user_id = req.user.company_id
    }

    const isSubcriptionExist = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });

    if (!isSubcriptionExist) return res.json({ message: "Subscription not found", code: 404 });

    const subcription = await instance.subscriptions.fetch(isSubcriptionExist.subscription_id);
    const status = subcription.status

    if (!["authenticated", "active", "paused", "pending", "halted"].includes(status)) return res.json({ message: `${status} subscription can not be cancelled`, code: 400 });

    if (subcription.has_scheduled_changes === true) {
      await instance.subscriptions.cancelScheduledChanges(isSubcriptionExist.subscription_id);
    }

    const cancelledSubscription = await instance.subscriptions.cancel(isSubcriptionExist.subscription_id, false)

    res.json({ message: "Subscription cancelled successfully", code: 200, data: cancelledSubscription });
  } catch (error) {
    console.log
    utils.handleError(res, error)
  }
}


exports.cancelScheduledUpdate = async (req, res) => {
  try {
    let user_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      user_id = req.user.company_id
    }

    let activeSubscription = await Subscription.findOne({ user_id: user_id, status: { $nin: ["expired", "created"] } }).sort({ createdAt: -1 })
    if (!activeSubscription) return res.json({ message: "You don not have any active subscription", code: 404 });

    const subscription = await instance.subscriptions.fetch(activeSubscription.subscription_id);
    if (subscription.has_scheduled_changes !== true) return res.json({ message: `This subscription does not have any schedule changes`, code: 400 });

    await instance.subscriptions.cancelScheduledChanges(activeSubscription.subscription_id);

    res.json({ message: "Schedule changes cancelled successfully", code: 200 });
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

// exports.cancelSubscription = async (req, res) => {
//   try {
//     const comapany_id = req.user._id;

//     const subcription = await Subscription.findOne({ user_id: mongoose.Types.ObjectId(comapany_id) }.sort({ createdAt: -1 }));
//     if (!subcription) return utils.handleError(res, { message: "You do not have any subscription", code: 404 });

//     razorpay.subscriptions.cancel(subcription.subcription_id, function (error, response) {
//       if (error) {
//         console.error('Error cancelling subscription:', error);
//       } else {
//         res.json({ message: "Subscription canceled successfully", code: 200 })
//       }
//     })
//   } catch (error) {
//     console.log(error)
//     utils.handleError(res, error)
//   }
// }

exports.createSubAdmin = async (req, res) => {
  try {
    const { email, first_name, last_name, mobile_number, country_code } = req.body;

    let company_id = req.user._id;

    const type = req.user.type;
    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    const isEmailExist = await Company.findOne({ email: email });
    if (isEmailExist) return utils.handleError(res, { message: "Email already Exists", code: 400 })

    const company = await Company.findById(company_id);

    const emailDomain = extractDomainFromEmail(email);

    if (company.email_domain !== emailDomain) return utils.handleError(res, { message: "Domain name not matched", code: 400 })

    const subAdminCount = await Company.find({ company_id: mongoose.Types.ObjectId(company_id), type: "sub admin" });

    if (subAdminCount.length >= 3) return utils.handleError(res, { message: "You can create only 3 sub admins", code: 400 })


    var password = generator.generate({
      length: 8,
      numbers: true
    });

    const data = {
      email: email,
      password: password,
      decoded_password: password,
      type: "sub admin",
      company_id,
      is_profile_completed: true,
      bio: {
        first_name: first_name,
        last_name: last_name,
        full_name: `${first_name}${last_name ? ` ${last_name}` : ""}`,
      },
      contact_details: {
        country_code: country_code,
        mobile_number: mobile_number,
      }
    }

    const subAdmin = new Company(data);
    await subAdmin.save();

    const locale = req.getLocale()
    const dataForMail = {
      company_name: company.company_name,
      email: email,
      password: password,
      name: data?.bio?.full_name

    }

    emailer.sendAccountCreationEmailSubAdmin(locale, dataForMail, 'sub-admin-created');

    res.json({ message: "Sub admin created successfully", code: 200 });
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}



exports.removeSubAdmin = async (req, res) => {
  try {
    const company_id = req.user._id;
    const sub_admin_id = req.params.id;

    const subAdmin = await Company.findById(sub_admin_id);
    if (!subAdmin) return utils.handleError(res, { message: "Sub admin not found", code: 404 });

    if (subAdmin.type !== "sub admin") return utils.handleError(res, { message: "You can delete only sub admin", code: 400 });
    if (company_id.toString() !== subAdmin.company_id.toString()) return utils.handleError(res, { message: "You can delete only your sub admin", code: 400 });


    await subAdmin.remove()

    res.json({ message: "Sub admin removed successfully", code: 200 });
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.subSubAdminList = async (req, res) => {
  try {

    let company_id = req.user._id;
    const type = req.user.type;

    if (type === "sub admin") {
      company_id = req.user.company_id
    }

    const subAdmins = await Company.find({ company_id: company_id, type: "sub admin" }).sort({ createdAt: -1 })

    res.json({ data: subAdmins, type: req.user.type, code: 200 })

  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.getPaymentMethod = async (req, res) => {
  try {
    const user_id = req.user._id;

    const latest_payment = await Transaction.findOne({ user_id }).sort({ createdAt: -1 });

    if (!latest_payment) {
      return res.json({ data: latest_payment, code: 200 })
    }

    const data = latest_payment.toJSON()
    data.full_name = req?.user?.bio?.first_name + " " + req?.user?.bio?.last_name

    res.json({ data: data, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.addSubscription = async (req, res) => {
  try {
    const { razorpay_subscription_id } = req.body;
    const user_id = req.user._id;

    if (!razorpay_subscription_id) return utils.handleError(res, { message: "Subscription id is missing", code: 400 });
    const subscription = await instance.subscriptions.fetch(razorpay_subscription_id);

    if (!subscription) return utils.handleError(res, { message: "Subscription not found", code: 404 });
    // if (subscription.status === "created") return utils.handleError(res, { message: "Subscription is not authenticated yet", code: 400 });
    // if (subscription.status === "expired") return utils.handleError(res, { message: "Subscription is expired", code: 400 });
    // if (subscription.status === "cancelled") return utils.handleError(res, { message: "Subscription is cancelled", code: 400 });

    const SubscriptionIndatabase = await Subscription.findOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: razorpay_subscription_id })

    if (!SubscriptionIndatabase) return utils.handleError(res, { message: "Subscription not found", code: 404 });

    if (subscription.status === "active") {
      await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: razorpay_subscription_id }, { status: subscription.status });
    } else {

    }

    const user = await User.findById(user_id);
    // if (user?.is_card_created === false) {
    const savedCard = await SavedCard.findOne({ owner_id: user._id });
    if (savedCard) {
      const data = savedCard.toJSON();
      delete data._id;
      delete data.createdAt;
      delete data.updatedAt;

      const createCard = new CardDetials(data);
      await createCard.save()
      await savedCard.remove()

      user.is_card_created = true;
      user.user_type = data?.card_type;
      await user.save()
    }
    // }


    res.json({ code: 200 })
  } catch (error) {
    console.log("error", error)
    utils.handleError(res, error)
  }
}

exports.editBillingAddress = async (req, res) => {
  try {
    const company_id = req.user._id;

    const { country,
      state,
      city,
      address_line_1,
      address_line_2,
      pin_code } = req.body;


    const billing_address = {
      country,
      state,
      city,
      address_line_1,
      address_line_2,
      pin_code
    }

    await Company.findByIdAndUpdate(company_id, { $set: { billing_address: billing_address } })

    res.json({ message: "Billing address saved successfully", code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.helpsupport = async (req, res) => {
  try {
    const data = req.body;
    const user_id = req.user._id;
    console.log('User type check', req.user)
    const add = await Support.create(
      {
        user_id: user_id,
        message: data?.message,
        userType: req.user.type
      }
    );

    res.json({
      code: 200,
      message: add,
    });
  } catch (error) {
    console.log("================error", error)
    utils.handleError(res, error);
  }
};

exports.feedback = async (req, res) => {
  try {
    const data = req.body;
    const user_id = req.user._id;
    console.log('feedback user',)
    const feedback = await Feedback.create(
      {
        user_id: user_id,
        message: data?.message,
        userType: req.user.type
      }
    );
    res.json({
      code: 200,
      message: feedback,
    });
  } catch (error) {
    console.log("================error", error)
    utils.handleError(res, error);
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const user_id = req.user._id;
    const company_email = req.user.email
    console.log('User', user_id)
    const companydata = await Company.findOne({ email: company_email });
    console.log("companydata : ", companydata)

    let toupdate = {
      id: companydata?._id,
      ...(companydata ? companydata.toObject() : {})
    };

    const newdeletedaccount = await deleted_account.create(
      toupdate
    )
    console.log("newdeletedaccount : ", newdeletedaccount)

    await Company.deleteOne({ _id: user_id });
    await Registration.deleteOne({ email: company_email })
    await CardDetials.deleteOne({ owner_id: user_id })

    const isSubcriptionExist = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });

    if (isSubcriptionExist) {
      const subcription = await instance.subscriptions.fetch(isSubcriptionExist.subscription_id);
      const status = subcription.status
      if (["authenticated", "active", "paused", "pending", "halted"].includes(status)) {
        if (subcription.has_scheduled_changes === true) {
          await instance.subscriptions.cancelScheduledChanges(isSubcriptionExist.subscription_id);
        }
        await instance.subscriptions.cancel(isSubcriptionExist.subscription_id, false);
      }
    }
    res.json({ message: "Your account is deleted successfully", code: 200 });
  } catch (error) {
    console.log("================error", error)
    utils.handleError(res, error);
  }
}


exports.getSingleTierCorporatePlan = async (req, res) => {
  try {
    const { period } = req.query
    let filter = {}
    if (period) {
      filter.period = period
    }
    console.log("filter : ", filter)
    const Tierplan = await Plan.findOne({
      plan_type: 'company',
      corporate_selected: true,
      ...filter
    })
    console.log("Tierplan : ", Tierplan)
    return res.status(200).json({
      message: "Corporate tier plan is fetched successfully",
      data: Tierplan,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.paymentVerification = async (req, res) => {
  try {
    const userId = req.user._id
    console.log("userId : ", userId)
    const { subscription_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body
    let subscription_data = {}
    let isTrial = false;
    subscription_data = await Subscription.findOne({ user_id: userId, status: 'active' })
    console.log("subscription_data : ", subscription_data)

    if (!subscription_data) {
      subscription_data = await Trial.findOne({ user_id: userId, status: 'active' })
      console.log("subscription_data : ", subscription_data)
      if (subscription_data) isTrial = true
    }

    const razorpay_payment_data = await instance.payments.fetch(razorpay_payment_id);
    console.log("razorpay_payment_data : ", razorpay_payment_data)

    const updaterequest = await updateSubscriptionRequest.findOne({ user_id: userId, subscription_id: subscription_data.subscription_id, status: 'pending' })
    console.log("updaterequest : ", updaterequest)

    if (!["failed", "cancelled"].includes(razorpay_payment_data.status)) {
      if (isTrial === false) {
        subscription_data.user_id = updaterequest?.user_id
        subscription_data.plan_id = updaterequest?.plan_id
        subscription_data.plan_started_at = updaterequest?.start_at
        subscription_data.start_at = updaterequest?.start_at
        subscription_data.end_at = updaterequest?.end_at
        subscription_data.status = "active"
        subscription_data.plan_tier = updaterequest?.plan_tier
        await subscription_data.save()

        updaterequest.status = "approved"
        await updaterequest.save()
      } else {
        const dataForDatabase = {
          user_id: updaterequest?.user_id,
          subscription_id: await SubscriptionId(),
          plan_id: updaterequest?.plan_id,
          plan_started_at: updaterequest?.start_at,
          start_at: updaterequest?.start_at,
          end_at: updaterequest?.end_at,
          status: "active",
          plan_tier: updaterequest?.plan_tier
        }
        const newSubscription = await Subscription.create(dataForDatabase);
        console.log("newSubscription : ", newSubscription)

        const result = await Trial.findOneAndUpdate({ user_id: userId, status: 'active' }, { $set: { status: "terminated" } }, { new: true })
        console.log("result : ", result)
      }
    }

    const paymentdata = {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      subscription_id,
      user_id: userId,
      amount: razorpay_payment_data.amount,
      status: razorpay_payment_data.status,
      order_id: razorpay_payment_data.order_id,
      invoice_id: razorpay_payment_data.invoice_id,
      method: razorpay_payment_data.method,
      description: razorpay_payment_data.description,
      card_id: razorpay_payment_data.card_id,
      wallet: razorpay_payment_data.wallet,
      bank: razorpay_payment_data.bank,
      vpa: razorpay_payment_data.vpa,
      acquirer_data: razorpay_payment_data.acquirer_data,
      upi: razorpay_payment_data.upi
    }
    const result = await payments.create(paymentdata)
    console.log("result : ", result)
    return res.status(200).json({
      message: "Payment data saved successfully",
      data: result,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id
    console.log("userId : ", userId)
    let filter = {}
    const { offset = 0, limit = 10, from_date, to_date } = req.query

    if (from_date && to_date) {
      const newFromDate = new Date(from_date);
      const newToDate = new Date(to_date);
      if (isNaN(newFromDate) || isNaN(newToDate)) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      filter.createdAt = { $gte: newFromDate, $lte: newToDate }
    }

    const payment_history = await payments.find({ user_id: userId, ...filter }).sort({ createdAt: -1 }).skip(Number(offset)).limit(Number(limit))
    const count = await payments.countDocuments({ user_id: userId, ...filter })
    console.log("payment_history : ", payment_history)
    return res.status(200).json({
      message: "Payment history fetched successfully",
      data: payment_history,
      count,
      code: 200
    })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id
    console.log("userId : ", userId)
    const userdata = await Company.findOne({ _id: userId })
    console.log("userdata : ", userdata)
    if (!userdata) {
      return res.status(404).json({
        message: "Authentication failed. please login again",
        code: 404
      })
    }
    const { method } = req.body
    if (!["upi", "bank", "card"].includes(method)) {
      return res.status(403).json({
        message: "Invalid method",
        code: 404
      })
    }
    userdata.payment_mode = method
    await userdata.save()
    return res.status(200).json({
      message: "Payment method set successfully",
      code: 200
    })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}



exports.addFCMDevice = async (req, res) => {
  try {
    const { device_id, device_type, token } = req.body;
    const user_id = req.user._id;

    const isDeviceExist = await fcm_devices.findOne({ user_id: user_id })

    if (isDeviceExist) {
      isDeviceExist.token = token;
      await isDeviceExist.save();
    } else {
      const data = {
        user_id: user_id,
        device_id: device_id,
        device_type: device_type,
        token: token,
      }
      const item = new fcm_devices(data);
      await item.save()
    }

    const sessionid = crypto.randomUUID()

    const newsession = await account_session.create({
      session_id: sessionid,
      user_id,
      action: 'Account Session',
      previous_status: 'session created',
      // new_status: 'session deleted',
      start_at: new Date(),
      date_and_time: new Date(),
      performed_by: 'user',
      session_status: 'active'
    })
    console.log("newsession : ", newsession)

    res.json({
      message: "Token added successfully",
      session_id: sessionid,
      code: 200,
    });
  } catch (error) {
    console.log(error)
    utils.handleError(res, error);
  }
};

exports.deleteFCMDevice = async (req, res) => {
  try {
    const { token } = req.body;
    const user_id = req.user._id;

    const fcmToken = await fcm_devices.findOne({ user_id: user_id, token: token })

    if (!fcmToken) return utils.handleError(res, { message: "Token not found", code: 404 });

    await fcm_devices.deleteOne({ user_id: user_id, token: token })

    const newsession = await account_session.findOneAndUpdate(
      {
        user_id: new mongoose.Types.ObjectId(user_id),
        session_status: 'active'
      },
      {
        $set: {
          new_status: 'session deleted',
          end_at: new Date(),
          session_status: 'completed'
        }
      }, { new: true }
    )
    console.log("newsession : ", newsession)

    res.json({
      message: "Token deleted successfully",
      code: 200
    });

  } catch (error) {
    console.log(error)
    utils.handleError(res, error);
  }
};