const User = require('../models/user')
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
const uuid = require('uuid')
const { getCode, getName } = require('country-list');
const mongoose = require("mongoose")
const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const moment = require("moment")
const {
  uploadFile,
  uploadFileToLocal,
  capitalizeFirstLetter,
  convertToObjectIds,
} = require("../shared/helpers");
const { resolve } = require('path');

const Razorpay = require('razorpay');
var instance = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
/*********************
 * Private functions *
 *********************/

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
    Company.findById(id, '-_id -updatedAt -createdAt -password -decoded_password', (err, user) => {
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
    const id = await utils.isIDGood(req.user._id)
    res.status(200).json({ data: await getProfileFromDB(id), code: 200 })
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
      name: user.company_name,
      url: data.production === false ? `${process.env.LOCAL_COMPANY_URL}resetPassword/${token}` : `${process.env.PRODUCTION_COMPANY_URL}resetPassword/${token}`
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
    data.is_profile_completed = true
    await Company.findByIdAndUpdate(company_id, data);

    res.json({ message: "Card created successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.corporateCardHolder = async (req, res) => {
  try {
    const company_id = req.user._id;
    const { search = "", limit = 10, offset = 0, sort = -1 } = req.query;

    const condition = {
      $or: [
        { "bio.full_name": { $regex: new RegExp(search, 'i') } },
        { "contact_details.mobile_number": { $regex: new RegExp(search, 'i') } },
        { "bio.designation": { $regex: new RegExp(search, 'i') } },
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
          "user.createdAt": +sort
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


exports.deleteCorporateCardHolders = async (req, res) => {
  try {

    const company_id = req.user._id;
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
    const company_id = req.user._id;

    const sevenDay = 7 * 24 * 60 * 60 * 1000;

    const data = await CardDetials.aggregate([
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
    ])

    res.json({ data: data[0], code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.updateAccount = async (req, res) => {
  try {
    const company_id = req.user._id;
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
    var reciever_id = req.user._id;

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

exports.deleteNotification = async (req, res) => {
  try {
    const id = req.query.id;

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
    const company_id = req.user._id;

    await Notification.deleteMany({ receiver_id: mongoose.Types.ObjectId(company_id) });

    res.json({ message: "Notification cleared Successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.addEmailInPiadByCompany = async (req, res) => {
  try {
    const { email } = req.body;
    const company_id = req.user._id;

    const isEmailAlreadyExist = await PaidByCompany.findOne({ company_id: mongoose.Types.ObjectId(company_id), email: email });
    if (isEmailAlreadyExist) return utils.handleError(res, { message: "Email is already added in the list", code: 400 });

    const count = await PaidByCompany.countDocuments({ company_id: mongoose.Types.ObjectId(company_id) });

    if (count >= 50) return utils.handleError(res, { message: "You have already reached the limit of 50 paid users", code: 400 });

    const data = {
      company_id: company_id,
      email: email
    }

    const addNewEmail = new PaidByCompany(data);
    await addNewEmail.save();

    res.json({ message: "Email added successfully", code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}



exports.bulkUploadEmail = async (req, res) => {
  try {
    const type = req.body.type;
    const company_id = req.user._id;

    const limit = 50 //need to get from active subscription
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


    console.log("media", media)
    var Email = [];

    if (type === "excel") {
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
    } else if (type === "csv") {

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
      // Read CSV file
    }

    console.log("Email", Email)

    if (Email.length === 0) return utils.handleError(res, { message: "Email field should cantain atleast one row", code: 400 });

    const findAllExistingEmail = await PaidByCompany.find({ company_id: company_id })
    if (findAllExistingEmail.length >= limit) return utils.handleError(res, { message: `You have already reach the limit of ${limit} emails`, code: 400 });


    const emailInDatabase = findAllExistingEmail.map(element => element.email);

    const alreadyInTheList = [];
    const notIntheList = [];

    Email.forEach(email => {

      if (emailInDatabase.includes(email)) {
        alreadyInTheList.push(email)
      } else {
        notIntheList.push({
          company_id: company_id,
          email: email
        })
      }
    })

    if ((emailInDatabase.length + notIntheList.length) > limit) return utils.handleError(res, { message: `You have limit of ${limit} emails`, code: 400 });

    await PaidByCompany.insertMany(notIntheList);

    res.json({ message: "uploaded successfully", media, Email, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.removeEmailfromPiadByCompany = async (req, res) => {
  try {
    const { email } = req.body;
    const company_id = req.user._id;

    const isEmailAlreadyExist = await PaidByCompany.findOne({ company_id: mongoose.Types.ObjectId(company_id), email: email });
    if (!isEmailAlreadyExist) return utils.handleError(res, { message: "Email not found", code: 404 });

    if (isEmailAlreadyExist.is_card_created === true) {

      const card = await CardDetials.findOne({ "contact_details.email": email })
      if (!card) utils.handleError(res, { message: "User card not found" })
      card.waiting_end_time = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))
      await card.save()

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
    const company_id = req.user._id;
    const count = await PaidByCompany.countDocuments({ company_id: mongoose.Types.ObjectId(company_id) });
    const data = await PaidByCompany.find({ company_id: mongoose.Types.ObjectId(company_id) }).sort({ createdAt: +sort }).skip(+offset).limit(+limit)

    res.json({ data: data, count, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.transactionHistory = async (req, res) => {
  try {
    const company_id = req.user._id;
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
    const company_id = req.user._id;
    const plans = await Plan.find({ plan_type: "company" })
    const activeSubscription = await Subscription.findOne({ user_id: company_id })

    res.json({ data: plans, active: activeSubscription, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.activeSubscription = async (req, res) => {
  try {
    const company_id = req.user._id;

    const activeSubscription = await Subscription.aggregate([
      {
        $match: {
          user_id: company_id
        }
      },
      {
        $lookup: {
          from: "plans",
          localField: "plan_id",
          foreignField: "plan_id",
          as: "plan"
        }
      },
      {
        $unwind: "$plan"
      },
      {
        $sort : {
          createdAt : -1
        }
      },
      {
        $limit : 1
      }
    ])




    // const activePlan = {
    //   user_id : company_id,
    //   plan_id : '1',
    //   start_at : new Date("2024-02-24"),
    //   end_at : new Date("2024-08-24"),
    //   is_trail_active : true,
    //   status : "active"
    // }

    // await Subscription.create(activePlan);

    res.json({ data: activeSubscription[0], code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.createSubscription = async (req, res) => {
  try {
    const user_id = req.user._id;
    const { plan_id } = req.body;
    const isSubcriptionExist = await Subscription.findOne({ user_id: user_id });

    if (isSubcriptionExist && ["authenticated", "active", "paused", "pending"].includes(isSubcriptionExist.status)) {
      return res.json({ message: `You already have ${isSubcriptionExist.status} subscription`, code: 200 })
    }

    console.log(isSubcriptionExist)
    console.log(plan_id)
    if (isSubcriptionExist && isSubcriptionExist.status === "created" && plan_id !== isSubcriptionExist.plan && new Date(isSubcriptionExist.createdAt).getTime() + (5 * 60 * 1000) > new Date()) {
      return res.json({ message: "Please wait some time to swith the plan" , code : 400 });
    }

    if (isSubcriptionExist && isSubcriptionExist.status === "created") {
      await Subscription.findByIdAndDelete(isSubcriptionExist._id);
    }

    if (isSubcriptionExist && ["cancelled", "completed", "expired"].includes(isSubcriptionExist.status) && isSubcriptionExist.end_at > new Date()) {
      return res.json({ message: `Your can create new subscription after the expiry time of current subscription`, code: 200 })
    }

    const plan = await await Plan.findOne({ plan_id: plan_id });
    if (!plan) return utils.handleError(res, { message: "Plan not found", code: 404 });

    console.log("plan" , plan)
    if (plan.plan_type !== "company") return utils.handleError(res, { message: "This plan is not for comapany", code: 400 });

    const currentDate = moment();
    const futureDate = currentDate.add((plan?.trial_period_days ?? 180), 'days');
    const timestamp = isSubcriptionExist ? Date.now() / 1000 : Math.floor(futureDate.valueOf() / 1000);

    const subcription = await instance.subscriptions.create({
      "plan_id": plan.plan_id,
      "total_count": 1,
      "quantity": 1,
      "customer_notify": 1,
      "start_at": timestamp,
      "notes": {
        "user_id": user_id.toString(),
        "user_type": "company"
      }
    })

    const dataForDatabase = {
      user_id: user_id,
      subscription_id: subcription.id,
      plan_id: plan.plan_id,
      start_at: new Date(Number(subcription.start_at) * 1000),
      end_at: new Date(Number(subcription.end_at) * 1000),
      status: subcription.status
    }

    const saveToDB = new Subscription(dataForDatabase);
    await saveToDB.save()

    res.json({ data: subcription, code: 200 })
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
