const jwt = require('jsonwebtoken')
const UserModel = require('../models/user'); // Assuming you have a User model
const Trial = require("../models/trial")
const OtpModel = require('../models/otp'); // Import your OtpModel
const User = require('../models/user')
const Admin = require('../models/admin')
const UserAccess = require('../models/userAccess')
const ForgotPassword = require('../models/forgotPassword')
const utils = require('../middleware/utils')
const db = require('../middleware/db')
const uuid = require('uuid')
const { addHours } = require('date-fns')
const { matchedData } = require('express-validator')
const auth = require('../middleware/auth')
const emailer = require('../middleware/emailer')
const APIKey = require('../models/api_keys')
const SavedCard = require("../models/saved_card")
const mongoose = require("mongoose")
const Subscription = require("../models/subscription");
const CardDetials = require('../models/cardDetials')
const PaidByCompany = require("../models/paid_by_company")
const VerificationToken = require('../models/verificationToken');
const Company = require("../models/company")
const Registration = require("../models/registration")
const HOURS_TO_BLOCK = 2
const LOGIN_ATTEMPTS = 5
const bcrypt = require('bcrypt');
const moment = require("moment");
const cardDetials = require('../models/cardDetials');
const teamMember = require('../models/teamMember');
const user_account_log = require('../models/user_account_log');
/*********************
 * Private functions *
 *********************/

/**
 * Generates a token
 * @param {Object} user - user object
 */
const generateToken = (user, role = 'user') => {
  // Gets expiration time
  console.log("user", user)
  const expiration =
    Math.floor(Date.now() / 1000) + 60 * process.env.JWT_EXPIRATION_IN_MINUTES

  const signedToken = jwt.sign({ data: { _id: user } }, process.env.JWT_SECRET);
  console.log('Signed Token:', signedToken);

  const encryptedToken = auth.encrypt(signedToken);
  console.log('Encrypted Token:', encryptedToken);
  // returns signed and encrypted token
  return auth.encrypt(
    jwt.sign(
      {
        data: {
          _id: user,
        },
      },
      process.env.JWT_SECRET
    )
  )
}


// const generateToken = (user, role = 'user') => {
//   const expiration =
//     Math.floor(Date.now() / 1000) + 60 * process.env.JWT_EXPIRATION_IN_MINUTES;

//   return jwt.sign(
//     {
//       data: {
//         _id: user,
//       },
//       exp: expiration, 
//     },
//     process.env.JWT_SECRET
//   );
// };




async function checkSusbcriptionIsActive(user_id) {
  const checkIsTrialExits = await Trial.findOne({ user_id });

  if (checkIsTrialExits && checkIsTrialExits.end_at > new Date() && checkIsTrialExits.status === "active") {
    return true
  }

  const subcription = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });

  if (!subcription) return false
  if (subcription.status === "created") return false
  if (subcription.end_at < new Date()) return false
  return true
}

async function isSubscriptionActiveOrNot(user) {
  try {
    const user_id = user._id;
    var subcriptionActive = false
    if (user.user_type === "corporate") {
      const card = await CardDetials.findOne({ owner_id: user_id });
      if (!card) return false
      const company_id = card.company_id;
      const email = card?.contact_details?.email;
      if (!email) return false
      const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ company_id: company_id, email: email });
      if (isSubscriptionPaidByCompany) {
        //Employee is subcription is paid by company
        subcriptionActive = await checkSusbcriptionIsActive(company_id)
      } else {
        //Employee is subcription is not paid by company
        //check for waiting period 
        const waiting_end_time = card.waiting_end_time;
        if (waiting_end_time && new Date(waiting_end_time) > new Date()) {
          subcriptionActive = true
        } else {
          subcriptionActive = await checkSusbcriptionIsActive(user_id)
        }
      }
    } else {
      subcriptionActive = await checkSusbcriptionIsActive(user_id)
    }

    return subcriptionActive
  } catch (error) {
    console.log(error)
    return false
  }
}
/**
 * Creates an object with user info
 * @param {Object} req - request object
 */
const setUserInfo = req => {
  let user = {
    _id: req._id,
    name: req.name,
    email: req.email,
    password: req.password,
    confirm_password: req.confirm_password
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

/**
 * Saves a new user access and then returns token
 * @param {Object} req - request object
 * @param {Object} user - user object
 */
const saveUserAccessAndReturnToken = async (req, user) => {

  console.log("users", user)
  user = user.toJSON()
  let haveSubscription = await checkSusbcriptionIsActive(user._id)

  delete user.password;
  delete user.confirm_password;



  return new Promise((resolve, reject) => {
    const userAccess = new UserAccess({
      email: user.email,
      ip: utils.getIP(req),
      browser: utils.getBrowserInfo(req),
      country: utils.getCountry(req)
    })
    userAccess.save(async err => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      const userInfo = setUserInfo(user)
      // Returns data with access token
      const savedCard = await getPreviewCard(user._id)


      resolve({
        token: generateToken(user._id, user.role),
        userInfo: user,
        previewCard: savedCard ? savedCard : null,
        haveSubscription,
        code: 200
      })
    })
  })
}

/**
 * Blocks a user by setting blockExpires to the specified date based on constant HOURS_TO_BLOCK
 * @param {Object} user - user object
 */
const blockUser = async user => {
  return new Promise((resolve, reject) => {
    user.blockExpires = addHours(new Date(), HOURS_TO_BLOCK)
    user.save((err, result) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      if (result) {
        resolve(utils.buildErrObject(409, 'BLOCKED_USER'))
      }
    })
  })
}

/**
 * Saves login attempts to dabatabse
 * @param {Object} user - user object
 */
const saveLoginAttemptsToDB = async user => {
  return new Promise((resolve, reject) => {
    user.save((err, result) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      if (result) {
        resolve(true)
      }
    })
  })
}



const getPreviewCard = async (owner_id) => {
  try {
    const saveCard = await SavedCard.aggregate([
      {
        $match: {
          owner_id: mongoose.Types.ObjectId(owner_id)
        }
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
          'bio.business_name': {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.company_name',
              else: '$bio.business_name'
            }
          },
          'card_color': {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.card_color',
              else: '$card_color'
            }
          },
          'text_color': {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.text_color',
              else: '$text_color'
            }
          },
          "business_logo": {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.business_logo',
              else: '$business_logo'
            }
          },
          "address": {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.address',
              else: '$address'
            }
          },
          "contact_details.website": {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.contact_details.website',
              else: '$contact_details.website'
            }
          },
        }
      },
      {
        $project: {
          company: 0
        }
      }
    ])

    console.log("saveCard", saveCard)


    return saveCard[0] ? saveCard[0] : null
  } catch (error) {
    console.log(error)
  }
}
/**
 * Checks that login attempts are greater than specified in constant and also that blockexpires is less than now
 * @param {Object} user - user object
 */
const blockIsExpired = user =>
  user.loginAttempts > LOGIN_ATTEMPTS && user.blockExpires <= new Date()

/**
 *
 * @param {Object} user - user object.
 */
const checkLoginAttemptsAndBlockExpires = async user => {
  return new Promise((resolve, reject) => {
    // Let user try to login again after blockexpires, resets user loginAttempts
    if (blockIsExpired(user)) {
      user.loginAttempts = 0
      user.save((err, result) => {
        if (err) {
          reject(utils.buildErrObject(422, err.message))
        }
        if (result) {
          resolve(true)
        }
      })
    } else {
      // User is not blocked, check password (normal behaviour)
      resolve(true)
    }
  })
}

/**
 * Checks if blockExpires from user is greater than now
 * @param {Object} user - user object
 */
const userIsBlocked = async user => {
  return new Promise((resolve, reject) => {
    if (user.blockExpires > new Date()) {
      reject(utils.buildErrObject(409, 'BLOCKED_USER'))
    }
    resolve(true)
  })
}

/**
 * Finds user by email
 * @param {string} email - user´s email
 */
const findUser = async email => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        email
      },
      'password loginAttempts blockExpires name email role verified verification',
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
        resolve(item)
      }
    )
  })
}


/**
 * Finds user by email
 * @param {string} email - user´s email
 */
const findAdmin = async email => {
  return new Promise((resolve, reject) => {
    Admin.findOne(
      {
        email
      },
      'password loginAttempts blockExpires name email role verified verification',
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
        resolve(item)
      }
    )
  })
}

/**
 * Finds user by ID
 * @param {string} id - user´s id
 */
const findUserById = async userId => {
  return new Promise((resolve, reject) => {
    User.findById(userId, (err, item) => {
      utils.itemNotFound(err, item, reject, 'USER_DOES_NOT_EXIST')
      resolve(item)
    })
  })
}

/**
 * Adds one attempt to loginAttempts, then compares loginAttempts with the constant LOGIN_ATTEMPTS, if is less returns wrong password, else returns blockUser function
 * @param {Object} user - user object
 */
const passwordsDoNotMatch = async user => {
  user.loginAttempts += 1
  await saveLoginAttemptsToDB(user)
  return new Promise((resolve, reject) => {
    if (user.loginAttempts <= LOGIN_ATTEMPTS) {
      resolve(utils.buildErrObject(409, 'WRONG_PASSWORD'))
    } else {
      resolve(blockUser(user))
    }
    reject(utils.buildErrObject(422, 'ERROR'))
  })
}

/**
 * Registers a new user in database
 * @param {Object} req - request object
 */
const registerUser = async req => {
  return new Promise((resolve, reject) => {
    // const user = new User({
    //   name: req.name,
    //   email: req.email,
    //   password: req.password,
    //   verification: uuid.v4()
    // })

    const user = new User({
      first_name: req.first_name,
      last_name: req.last_name,
      full_name: `${req.first_name}${req.last_name ? ` ${req.last_name}` : ""}`,
      email: req.email,
      social_id: req.social_id,
      social_type: req.social_type,
      password: req.password,
      confirm_password: req.confirm_password,
      email_verified: true
    })
    user.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve(item)
    })
  })
}

//------------
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
//-----------Set Password For Business Team Admin-------
exports.createCompanyAccount = async (req, res) => {
  try {
    const { email, password } = req.body;

    const isEmailExist = await Company.findOne({ email: email });
    if (isEmailExist) return utils.handleError(res, { message: "Email already Exists", code: 400 })

    const emailDomain = extractDomainFromEmail(email);
    const isDomainExists = await Company.findOne({ email_domain: emailDomain });
    // if (isDomainExists) return utils.handleError(res, { message: "Domain name already Exists", code: 400 });


    const isEmailRegistered = await Registration.findOne({ email: email });
    console.log("isEmailRegistered : ", isEmailRegistered)
    // if (!isApprovedByAdmin || isApprovedByAdmin.status !== "accepted") return utils.handleError(res, { message: "You're email is not approved by admin", code: 400 });

    // const access_code = generator.generate({
    //   length: 6,
    //   numbers: true,
    //   uppercase: true
    // });

    const access_code = generateAccessCode();


    const dataForCompany = {
      email: email,
      access_code: access_code.toUpperCase(),
      password: password,
      decoded_password: password,
      email_domain: emailDomain,
      company_name: isEmailRegistered.company_name,
      type: "admin",
      bio: {
        first_name: isEmailRegistered.first_name,
        last_name: isEmailRegistered.last_name,
        full_name: `${isEmailRegistered?.first_name}${isEmailRegistered?.last_name ? ` ${isEmailRegistered?.last_name}` : ""}`,
      },
      contact_details: {
        country_code: isEmailRegistered?.country_code ?? "",
        mobile_number: isEmailRegistered?.mobile_number ?? "",
        email: isEmailRegistered?.email ?? ""
      },
      address: {
        country: isEmailRegistered.country,
        state: '',
        city: '',
        address_line_1: '',
        address_line_2: '',
        pin_code: ''
      }
    }

    const company = new Company(dataForCompany);
    await company.save();

    res.json({ message: "Company registered successfully.", code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}
//-------------------------------------------------------

function extractDomainFromEmail(email) {
  // Split the email address at the "@" symbol
  const parts = email.split('@');
  //console.log('email parts',parts)
  // Check if the email has the correct format
  if (parts.length !== 2) {
    console.error('Invalid email address format');
    return null;
  }

  // Extract and return the domain part
  const domain = parts[1];
  return domain;
}

/**
 * Builds the registration token
 * @param {Object} item - user object that contains created id
 * @param {Object} userInfo - user object
 */
const returnRegisterToken = (item, userInfo) => {
  if (process.env.NODE_ENV !== 'production') {
    userInfo.verification = item.verification
  }
  const data = {
    token: generateToken(item._id),
    user: userInfo
  }
  return data
}

/**
 * Checks if verification id exists for user
 * @param {string} id - verification id
 */
const verificationExists = async id => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        verification: id,
        verified: false
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND_OR_ALREADY_VERIFIED')
        resolve(user)
      }
    )
  })
}

/**
 * Verifies an user
 * @param {Object} user - user object
 */
const verifyUser = async user => {
  return new Promise((resolve, reject) => {
    user.verified = true
    user.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve({
        email: item.email,
        verified: item.verified
      })
    })
  })
}

/**
 * Marks a request to reset password as used
 * @param {Object} req - request object
 * @param {Object} forgot - forgot object
 */
const markResetPasswordAsUsed = async (req, forgot) => {
  return new Promise((resolve, reject) => {
    forgot.used = true
    forgot.ipChanged = utils.getIP(req)
    forgot.browserChanged = utils.getBrowserInfo(req)
    forgot.countryChanged = utils.getCountry(req)
    forgot.save((err, item) => {
      utils.itemNotFound(err, item, reject, 'NOT_FOUND')
      resolve(utils.buildSuccObject('PASSWORD_CHANGED'))
    })
  })
}

/**
 * Updates a user password in database
 * @param {string} password - new password
 * @param {Object} user - user object
 */
const updatePassword = async (password, user) => {
  return new Promise((resolve, reject) => {
    user.password = password
    user.save((err, item) => {
      utils.itemNotFound(err, item, reject, 'NOT_FOUND')
      resolve(item)
    })
  })
}

/**
 * Finds user by email to reset password
 * @param {string} email - user email
 */
const findUserToResetPassword = async email => {
  return new Promise((resolve, reject) => {
    User.findOne(
      {
        email
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND')
        resolve(user)
      }
    )
  })
}

/**
 * Finds admin by email to reset password
 * @param {string} email - user email
 */
const findAdminToResetPassword = async email => {
  return new Promise((resolve, reject) => {
    Admin.findOne(
      {
        email
      },
      (err, user) => {
        utils.itemNotFound(err, user, reject, 'NOT_FOUND')
        resolve(user)
      }
    )
  })
}

/**
 * Checks if a forgot password verification exists
 * @param {string} id - verification id
 */
const findForgotPassword = async id => {
  return new Promise((resolve, reject) => {
    ForgotPassword.findOne(
      {
        verification: id,
        used: false
      },
      (err, item) => {
        utils.itemNotFound(err, item, reject, 'NOT_FOUND_OR_ALREADY_USED')
        resolve(item)
      }
    )
  })
}

/**
 * Creates a new password forgot
 * @param {Object} req - request object
 */
const saveForgotPassword = async req => {
  return new Promise((resolve, reject) => {
    const forgot = new ForgotPassword({
      email: req.body.email,
      verification: uuid.v4(),
      ipRequest: utils.getIP(req),
      browserRequest: utils.getBrowserInfo(req),
      countryRequest: utils.getCountry(req)
    })
    forgot.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      resolve(item)
    })
  })
}

/**
 * Builds an object with created forgot password object, if env is development or testing exposes the verification
 * @param {Object} item - created forgot password object
 */
const forgotPasswordResponse = item => {
  let data = {
    msg: 'RESET_EMAIL_SENT',
    email: item.email,
    code: 200
  }
  if (process.env.NODE_ENV !== 'production') {
    data = {
      ...data,
      verification: item.verification
    }
  }
  return data
}

/**
 * Checks against user if has quested role
 * @param {Object} data - data object
 * @param {*} next - next callback
 */
const checkPermissions = async (data, next) => {
  return new Promise((resolve, reject) => {
    User.findById(data.id, (err, result) => {
      utils.itemNotFound(err, result, reject, 'NOT_FOUND')
      if (data.roles.indexOf(result.role) > -1) {
        return resolve(next())
      }
      return reject(utils.buildErrObject(401, 'UNAUTHORIZED'))
    })
  })
}

/**
 * Gets user id from token
 * @param {string} token - Encrypted and encoded token
 */
// const getUserIdFromToken = async token => {
//   return new Promise((resolve, reject) => {
//     // Decrypts, verifies and decode token
//     jwt.verify(auth.decrypt(token), process.env.JWT_SECRET, (err, decoded) => {
//       if (err) {
//         reject(utils.buildErrObject(409, 'BAD_TOKEN'))
//       }
//       resolve(decoded.data._id)
//     })
//   })
// }

const getUserIdFromToken = async token => {
  return new Promise((resolve, reject) => {
    try {
      const decryptedToken = auth.decrypt(token);
      console.log('Decrypted Token:', decryptedToken);
      jwt.verify(decryptedToken, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          console.error('JWT Verification Error:', err);
          return reject(utils.buildErrObject(409, 'BAD_TOKEN'));
        }
        console.log('Decoded Token:', decoded);
        const userId = decoded?.data?._id || decoded._id;
        if (!userId) {
          return reject(utils.buildErrObject(400, 'INVALID_TOKEN_PAYLOAD'));
        }
        resolve(userId);
      });
    } catch (error) {
      console.error('Decryption Error:', error);
      reject(utils.buildErrObject(400, 'TOKEN_DECRYPTION_FAILED'));
    }
  });
};


/********************
 * Public functions *
 ********************/

/**
 * Login function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.login = async (req, res) => {
  try {
    const data = matchedData(req)
    const user = await findUser(data.email)
    await userIsBlocked(user)
    await checkLoginAttemptsAndBlockExpires(user)
    const isPasswordMatch = await auth.checkPassword(data.password, user)
    if (!isPasswordMatch) {
      utils.handleError(res, await passwordsDoNotMatch(user))
    } else {
      // all ok, register access and return token
      user.loginAttempts = 0
      await saveLoginAttemptsToDB(user)
      res.status(200).json(await saveUserAccessAndReturnToken(req, user))
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Login function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.adminLogin = async (req, res) => {
  try {
    const data = matchedData(req)
    const user = await findAdmin(data.email)
    await userIsBlocked(user)
    await checkLoginAttemptsAndBlockExpires(user)
    const isPasswordMatch = await auth.checkPassword(data.password, user)
    if (!isPasswordMatch) {
      utils.handleError(res, await passwordsDoNotMatch(user))
    } else {
      // all ok, register access and return token
      user.loginAttempts = 0
      await saveLoginAttemptsToDB(user)
      res.status(200).json(await saveUserAccessAndReturnToken(req, user))
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Register function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
// exports.registeruser = async (req, res) => {
//   try {
//     // Gets locale from header 'Accept-Language'
//     const data =req.body;
//     console.log("user=================user",data)
//     console.log("req=================req",req)
//     console.log("req=================req",req.email)
//     const locale = req.getLocale()
//     req = matchedData(req)
//     const doesEmailExists = await emailer.emailExists(req.email)
//     if (!doesEmailExists) {
//       const item = await registerUser(req)
//       const userInfo = setUserInfo(item)
//       const response = returnRegisterToken(item, userInfo)
//       emailer.sendRegistrationEmailMessage(locale, item)
//       res.status(201).json({response:response ,message:"hello"})
//     }
//   } catch (error) {
//     utils.handleError(res, error)
//   }
// }

/////////////////////////////////////reachmate////////////////////////////////////////////



const generateNumericOTP = () => {
  return Math.floor(1000 + Math.random() * 9000);
};



exports.registerUser = async (req, res) => {
  try {
    let newOtpforget;
    const userData = req.body;
    console.log("userData============", userData)

    const doesEmailExist = await UserModel.exists({ email: userData.email });
    if (doesEmailExist) {
      return res.status(400).json({ errors: { msg: 'Email already exists.' } });
    }
    userData.full_name = `${userData.first_name} ${userData.last_name}`
    const newUser = new UserModel(userData);
    const savedUser = await newUser.save();
    newOtpforget = generateNumericOTP();

    const userInfo = {
      id: savedUser._id,
      first_name: savedUser.first_name,
      last_name: savedUser.last_name,
      email: savedUser.email,
      profile_image: savedUser.profile_image,
      dateOfBirth: savedUser.dateOfBirth,
      sex: savedUser.sex,
      password: savedUser.password,
      confirm_password: savedUser.confirm_password,
    };
    const verificationToken = generateToken(userInfo.id);

    await emailer.sendVerificationEmail(req.body.locale || 'en',
      userInfo, "emailVerification", verificationToken);

    const accountlog = await user_account_log.create({
      user_id: savedUser?._id,
      action: 'Account Registered',
      previous_status: 'Signup',
      new_status: 'Signup',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    res.status(201).json({
      userInfo: userInfo,
      token: verificationToken,
      message: 'Email sent for verification successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: { msg: 'Internal Server Error' } });
  }
};

//---------------EDIT PROFILE-------------------
exports.editUser = async (req, res) => {
  try {
    const updateData = req.body;
    const userId = req.user._id;

    console.log("updateData============", updateData);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ errors: { msg: 'User not found.' } });
    }

    let emailChanged = false;

    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await User.exists({ email: updateData.email });
      if (emailExists) {
        return res.status(400).json({ errors: { msg: 'Email already exists.' } });
      }
      emailChanged = true;
    }

    if (updateData.first_name || updateData.last_name) {
      updateData.full_name = `${updateData.first_name || user.first_name} ${updateData.last_name || user.last_name}`;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(500).json({ errors: { msg: 'Failed to update user.' } });
    }

    if (emailChanged) {
      const verificationToken = generateToken(updatedUser._id);
      await emailer.sendVerificationEmail(req.body.locale || 'en', {
        id: updatedUser._id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email: updatedUser.email,
      }, "emailVerification", verificationToken);
    }

    const userInfo = {
      id: updatedUser._id,
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      email: updatedUser.email,
      profile_image: updatedUser.profile_image,
      dateOfBirth: updatedUser.dateOfBirth,
      sex: updatedUser.sex,
    };


    const accountlog = await user_account_log.create({
      user_id: updatedUser?._id,
      action: 'Account edited',
      previous_status: 'Edit account',
      new_status: 'Edit account',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    res.status(200).json({
      userInfo,
      message: emailChanged ? 'User updated successfully. Verification email sent.' : 'User updated successfully.'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: { msg: 'Internal Server Error' } });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ code: 400, message: "Token is required." });
    }

    const verificationRecord = await VerificationToken.findOne({ token });

    if (!verificationRecord) {
      return res
        .status(400)
        .json({ code: 400, message: "Invalid or expired token." });
    }

    if (verificationRecord.isVerified) {
      return res
        .status(400)
        .json({ code: 400, message: "This email has already been verified." });
    }

    verificationRecord.isVerified = true;
    const verifydata = await verificationRecord.save();

    await UserModel.findOneAndUpdate(
      { email: verifydata.email },
      { $set: { is_email_verified: true } }
    );

    const userdata = await User.findOne({ email: verifydata.email })
    console.log("userdata : ", userdata)
    const accountlog = await user_account_log.create({
      user_id: userdata?._id,
      action: 'Email Verified',
      previous_status: 'Email Verified',
      new_status: 'Email Verified',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    return res
      .status(200)
      .json({ code: 200, message: "Email verification successful!" });
  } catch (err) {
    return utils.handleError(res, err);
  }
};



exports.sendotpnew = async (req, res) => {
  try {
    const data = req.body;
    const email = data.email;
    let newOtpforget = generateNumericOTP();

    const savedUser = await OtpModel.findOne({ email: email });

    if (savedUser) {
      await OtpModel.updateOne({ email: email }, { otp: newOtpforget });
    } else {
      // If email doesn't exist, create a new OTP entry
      const otpData = new OtpModel({
        email: email,
        otp: newOtpforget,
      });
      await otpData.save();
    }
    console.log("newOtpforget", newOtpforget)

    // Send the OTP to the email address
    await emailer.sendOtpOnEmail({
      email: email,
      otp: newOtpforget,
      name: savedUser ? savedUser.first_name : undefined
    }, "OTP");

    console.log("OTP is", newOtpforget);

    res.status(200).json({ message: 'Please check your email for the OTP.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: { msg: 'Internal Server Error' } });
  }
};


// exports.sendotpnew = async (req, res) => {
//   try {
//     let newOtpforget;

//     const data = req.body;
//     const email = data.email 
//     newOtpforget = generateNumericOTP();
//     const doesEmailExist = await UserModel.exists({ email: userData.email });

//     const otpData = new OtpModel({
//       email: email,
//       otp: newOtpforget,
//     });
//     await otpData.save();

//     emailer.sendOtpOnEmail({
//       email:savedUser.email,
//       otp: newOtpforget,
//       name:savedUser.first_name
//     },
//       "OTP"
//     )

//     console.log("otp is",newOtpforget)


//     res.status(200).json({ message: 'please check the mail.' });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ errors: { msg: 'Internal Server Error' } });
//   }
// };



exports.verifyotpemail = async (req, res) => {
  try {

    const data = req.body;
    const email = data.email
    const otp = data.otp

    const user = await UserModel.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ errors: { msg: 'User not found.' } });
    }

    const otpData = await OtpModel.findOne({ email: email, otp: otp });
    if (!otpData) {
      return res.status(400).json({ errors: { msg: 'Invalid OTP.' } });
    }
    // else {
    //   const newUser = new UserModel(data);
    //   const savedUser = await newUser.save();
    // }

    user.email_verified = true;
    await user.save();

    res.status(200).json({ message: 'OTP verified and user activated successfully.', code: 200 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: { msg: 'Internal Server Error' } });
  }
};





exports.verifyotpemailNew = async (req, res) => {
  try {

    const data = req.body;
    const email = data.email
    const otp = data.otp

    // const user = await UserModel.findOne({ email: email });
    // if (!user) {
    //   return res.status(404).json({ errors: { msg: 'User not found.' } });
    // }
    const doesEmailExist = await UserModel.findOne({ email: email });
    let newuser

    if (doesEmailExist) {
      return res.status(400).json({ errors: { msg: 'Email already exists.' } });
    }

    data.full_name = `${data.first_name} ${data.last_name}`
    const otpData = await OtpModel.findOne({ email: email, otp: otp }).sort({ createdAt: -1 });
    if (!otpData) {
      return res.status(400).json({ errors: { msg: 'Invalid OTP.' } });
    }
    else {
      const newUser = new UserModel(data);
      delete newUser.password;
      delete newUser.confirm_password;

      newuser = await newUser.save();
      console.log("newuser : ", newuser)
      // savedUser.email_verified = true; 
      // await user.save();
    }



    res.status(200).json({ message: 'OTP verified and user activated successfully.', userInfo: newuser, token: generateToken(newuser._id), code: 200 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: { msg: 'Internal Server Error' } });
  }
};
// Function to verify the password
const verifyPassword = async (plainPassword, hashedPassword) => {
  try {
    // Compare the plain password with the hashed password
    const passwordMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return passwordMatch;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false; // Return false in case of an error
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password, login_from } = req.body;

    var user = await UserModel.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ errors: { msg: 'Invalid credentials' } });
    }


    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ errors: { msg: 'Invalid credentials' } });
    }

    if (!user.email_verified) {
      return res.status(400).json({ errors: { msg: 'Your email is not verified.' } });
    }

    user = user.toJSON()

    console.log("user", user);
    let haveSubscription = await checkSusbcriptionIsActive(user._id)
    console.log("haveSubscription", haveSubscription);

    delete user.password;
    delete user.confirm_password;

    const savedCard = await getPreviewCard(user._id)

    const accountlog = await user_account_log.create({
      user_id: user?._id,
      action: 'Account Login',
      previous_status: 'Login',
      new_status: 'Login',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    // if (login_from === "web" && user.is_card_created !== true) return res.status(400).json({ errors: { msg: 'You have not create your card yet' } });

    res.status(200).json({ userInfo: user, token: generateToken(user._id), previewCard: savedCard ? savedCard : null, haveSubscription, message: 'Login successful.', code: 200 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: { msg: 'Internal Server Error' } });
  }
};


exports.emailexist = async (req, res) => {
  try {
    const userData = req.body;
    console.log("userData============", userData.email)

    const doesEmailExist = await UserModel.exists({ email: userData.email });
    if (doesEmailExist) {
      return res.status(400).json({ errors: { msg: 'Email already exists.' } });
    }
    res.status(200).json({ message: 'Email Not exists.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ errors: { msg: 'Internal Server Error' } });
  }
};
exports.changepassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword, confirmPassword } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Email does not exist.' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const newPasswordMatch = await bcrypt.compare(newPassword, user.password);

    if (newPasswordMatch) {
      return res.status(400).json({ message: 'New password must be different from the current password.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match.' });
    }
    user.password = newPassword;
    user.confirm_password = newPassword;
    await user.save();

    const accountlog = await user_account_log.create({
      user_id: user?._id,
      action: 'Password Changed',
      previous_status: 'Password Changed',
      new_status: 'Password Changed',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)


    res.status(200).json({ message: 'Password change successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
exports.resetpassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Email does not exist.' });
    }
    const newPasswordMatch = await bcrypt.compare(password, user.password);

    if (newPasswordMatch) {
      return res.status(400).json({ message: 'New password must be different from the previous password.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match.' });
    }
    user.password = password;
    user.confirm_password = password;
    await user.save();

    const accountlog = await user_account_log.create({
      user_id: user?._id,
      action: 'Password Reset',
      previous_status: 'Password Reset',
      new_status: 'Password Reset',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)


    res.status(200).json({ message: 'Password change successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.socialLogin = async (req, res) => {
  try {
    const data = req.body;
    console.log("data", data)

    if (!data.social_id || !data.social_type) return utils.handleError(res, { message: "social id or social type is missing", code: 400 });
    const userExists = await emailer.userExists(User, data.email, false);

    if (data.social_type === "apple" && (!data.first_name || !data.last_name)) {
      const user = await User.findOne({ $or: [{ email: data.email }, { social_id: data.social_id, social_type: data.social_id }] });
      if (!user) return res.json({ data: false, code: 400 })
    }

    const doesSocialIdExists = await emailer.socialIdExists(User,
      data.social_id,
      data.social_type
    );
    data.password = "12345678";
    data.confirm_password = "12345678";
    console.log("userExists", userExists)
    console.log("doesSocialIdExists", doesSocialIdExists)
    if (!userExists && !doesSocialIdExists) {
      const item = await registerUser(data);
      console.log("item", item)
      const userInfo = setUserInfo(item);
      const response = returnRegisterToken(item, userInfo);


      // if(data.login_from === "web" && item.is_card_created !== true) return res.status(400).json({ errors: { msg: 'You have not create your card yet' } })
      res.status(201).json({ code: 200, data: await saveUserAccessAndReturnToken(req, item) });
    } else {

      const user = await User.findOne({ $or: [{ email: data.email }, { social_id: data.social_id, social_type: data.social_id }] })
      userExists.last_sign_in = new Date();
      console.log("user", user)
      // if(data.login_from === "web" && user.is_card_created !== true) return res.status(400).json({ errors: { msg: 'You have not create your card yet' } });

      const accountlog = await user_account_log.create({
        user_id: user?._id,
        action: 'Social Login',
        previous_status: 'Social Login',
        new_status: 'Social Login',
        performed_by: 'user',
        date_and_time: new Date()
      })
      console.log("accountlog : ", accountlog)

      return res.status(200).json(
        {
          code: 200,
          data: await saveUserAccessAndReturnToken(req, user)
        }
      );
    }
  } catch (error) {
    console.log(error)
    utils.handleError(res, error);
  }
};


/////////////////////////////////////reachmate////////////////////////////////////////////

/**
 * Validate API key called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.validateAPIKey = async (req, res) => {
  try {
    const data = req.body;
    const resp = await db.validateAPIKey(APIKey, data)

    console.log(resp)

    var isValid = resp ? true : false;
    res.json({
      code: 200,
      isValid: isValid
    })
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Verify function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.verify = async (req, res) => {
  try {
    req = matchedData(req)
    const user = await verificationExists(req.id)
    res.status(200).json(await verifyUser(user))
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Forgot password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.forgotPassword = async (req, res) => {
  try {
    // Gets locale from header 'Accept-Language'
    const locale = req.getLocale()
    const data = req.body
    //  matchedData(req)
    const user = await findUser(data.email)
    const item = await saveForgotPassword(req)
    const newOtpforget = generateNumericOTP();

    const otpData = await OtpModel.findOne({ email: data.email });
    if (!otpData) {

      const otp = new OtpModel({
        email: data.email,
        otp: newOtpforget,
      });

      await otp.save();
    } else {

      otpData.otp = newOtpforget
      otpData.used = false
      otpData.expired = new Date(Date.now() + (5 * 60 * 1000))

      await otpData.save()
    }


    emailer.sendOtpOnEmail({
      email: data.email,
      otp: newOtpforget,
      name: user.first_name
    },
      "OTP"
    )

    const accountlog = await user_account_log.create({
      user_id: user?._id,
      action: 'Forget Password Request Sent',
      previous_status: 'Forget Password',
      new_status: 'Forget Password',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    // emailer.sendResetPasswordEmailMessage(locale, item)
    res.status(200).json(forgotPasswordResponse(item))
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.resetPasswordWeb = async (req, res) => {
  try {
    const { otp, password } = req.body;
    const otpData = await OtpModel.findOne({ otp: otp });

    if (!otpData) return utils.handleError(res, { message: "Invalid OTP", code: 400 })

    if (otpData.used === true) return utils.handleError(res, { message: "OTP is already used", code: 400 })
    if (otpData.expired < new Date()) return utils.handleError(res, { message: "OTP Expired", code: 400 })
    if (otpData.otp !== otp) return utils.handleError(res, { message: "Invalid OTP", code: 400 })


    const user = await User.findOne({ email: otpData.email });
    if (!user) return utils.handleError(res, { message: "User not found", code: 404 });

    user.password = password;
    await user.save()

    otpData.used = true;
    await otpData.save()

    res.json({ message: "Password reset successfully", code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}
/**
 * Admin Forgot password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.forgotAdminPassword = async (req, res) => {
  try {
    // Gets locale from header 'Accept-Language'
    const locale = req.getLocale()
    const data = matchedData(req)
    const admin = await findAdmin(data.email)
    const item = await saveForgotPassword(req)
    // emailer.sendResetPasswordEmailMessage(locale, item)
    emailer.sendResetPasswordMail(locale, {
      email: admin.email,
      link: process.env.ADMIN_URL + 'auth/reset-password/' + item.verification
    })
    res.status(200).json(forgotPasswordResponse(item))
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Reset password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.resetPassword = async (req, res) => {
  try {
    const data = matchedData(req)
    const forgotPassword = await findForgotPassword(data.id)
    const user = await findUserToResetPassword(forgotPassword.email)
    await updatePassword(data.password, user)
    const result = await markResetPasswordAsUsed(req, forgotPassword)
    res.status(200).json(result)
  } catch (error) {
    utils.handleError(res, error)
  }
}


/**
 * Reset password function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.resetAdminPassword = async (req, res) => {
  try {
    const data = matchedData(req)
    const forgotPassword = await findForgotPassword(data.id)
    const user = await findAdminToResetPassword(forgotPassword.email)
    await updatePassword(data.password, user)
    const result = await markResetPasswordAsUsed(req, forgotPassword)
    res.status(200).json(result)
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Refresh token function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getRefreshToken = async (req, res) => {
  try {
    const tokenEncrypted = req.headers.authorization
      .replace('Bearer ', '')
      .trim()
    let userId = await getUserIdFromToken(tokenEncrypted)
    userId = await utils.isIDGood(userId)
    const user = await findUserById(userId)
    const token = await saveUserAccessAndReturnToken(req, user)
    // Removes user info from response
    delete token.user
    res.status(200).json(token)
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Roles authorization function called by route
 * @param {Array} roles - roles specified on the route
 */
exports.roleAuthorization = roles => async (req, res, next) => {
  try {
    const data = {
      id: req.user._id,
      roles
    }
    await checkPermissions(data, next)
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.updateProfile = async (req, res) => {
  try {
    const data = req.body;

    const user = await User.findOne({ email: data.email });

    if (!user) {
      return res.status(404).json({ message: 'Email does not exist.' });
    }



    await user.save();

    res.status(200).json({ message: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


exports.sendOTP = async (req, res) => {
  try {
    // Gets locale from header 'Accept-Language'
    const locale = req.getLocale()
    const data = req.body
    //  matchedData(req)
    const item = await saveForgotPassword(req)
    const newOtpforget = generateNumericOTP();

    const otpData = await OtpModel.findOne({ email: data.email });
    if (!otpData) {

      const otp = new OtpModel({
        email: data.email,
        otp: newOtpforget,
        expired: new Date(Date.now() + (5 * 60 * 1000))
      });

      await otp.save();
    } else {

      otpData.otp = newOtpforget
      otpData.used = false
      otpData.expired = new Date(Date.now() + (5 * 60 * 1000))

      await otpData.save()
    }

    console.log("newOtpforget", newOtpforget)

    emailer.sendOtpOnEmail({
      email: data.email,
      otp: newOtpforget,

    },
      "OTP"
    )

    // emailer.sendResetPasswordEmailMessage(locale, item)
    res.status(200).json(forgotPasswordResponse(item))
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const data = await OtpModel.findOne({ email: email })

    if (!data) return utils.handleError(res, { message: "Invalid OTP", code: 400 })

    if (data.used === true) return utils.handleError(res, { message: "OTP is already used", code: 400 })
    if (data.expired < new Date()) return utils.handleError(res, { message: "OTP Expired", code: 400 })
    if (data.otp !== otp) return utils.handleError(res, { message: "Invalid OTP", code: 400 })

    data.used = true;
    await data.save();
    res.json({ data: true, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.token = async (req, res) => {
  try {
    res.json({ data: true })
  } catch (error) {
    res.json({ data: false })
  }
}

// exports.userProfileDetails = async (req, res) => {
//   try {
//     // const userId = req.body._id;
//     const cardId = req.body.card_id
//     console.log("cardId : ", cardId)
//     // if (!userId) {
//     //   return res.status(400).json({ errors: { msg: 'User ID is required.' } });
//     // }
//     // const user = await User.findById(userId).select(
//     //   'first_name last_name email profile_image dateOfBirth sex'
//     // );
//     // if (!user) {
//     //   return res.status(404).json({ errors: { msg: 'User not found.' } });
//     // }
//     let card_data
//     let user_data
//     let teamMate
//     let returnData
//     card_data = await cardDetials.findOne({ _id: cardId })
//     console.log("card_data : ", card_data)
//     if (!card_data) {
//       card_data = await Company.findOne({ _id: cardId })
//       user_data = await UserModel.findOne({ 'companyAccessCardDetails.company_id': new mongoose.Types.ObjectId(cardId) })

//       const userAccessCardDetail = user_data.companyAccessCardDetails.find(
//         (detail) => detail.email_domain === card_data.email_domain
//       );
//       console.log("userAccessCardDetail : ", userAccessCardDetail)

//       teamMate = userAccessCardDetail?._id
//         ? await teamMember.findById(userAccessCardDetail._id)
//         : null;

//       console.log("teamMate : ", teamMate)
//       const bio = teamMate
//         ? {
//           first_name: teamMate.first_name,
//           last_name: teamMate.last_name,
//           full_name: `${teamMate.first_name} ${teamMate.last_name}`,
//           designation: teamMate.designation || "",
//           work_email: teamMate.work_email,
//           phone_number: teamMate.phone_number
//         }
//         : null;
//       // console.log('bio',bio)
//       returnData = {
//         bio,
//         ...card_data.toObject()
//       };

//     }
//     if (!user_data) {
//       user_data = await UserModel.findOne({ 'personal_cards': new mongoose.Types.ObjectId(cardId) })
//     }
//     console.log("card_data : ", card_data)
//     console.log("user_data : ", user_data)
//     res.status(200).json({
//       // data: {
//       //   // first_name: user.first_name,
//       //   // last_name: user.last_name,
//       //   // email: user.email,
//       //   // profile_image: user.profile_image,
//       //   // dateOfBirth: user.dateOfBirth,
//       //   // sex: user.sex,
//       //   card_data
//       // },
//       data: returnData ? returnData : card_data
//     });
//   } catch (error) {
//     console.error('Error fetching user profile:', error);
//     res.status(500).json({ errors: { msg: 'Internal Server Error' } });
//   }
// };


exports.userProfileDetails = async (req, res) => {
  try {
    const cardId = req.body.card_id;
    console.log("cardId:", cardId);

    let card_data;
    let user_data;
    let teamMate;
    let bio;

    card_data = await cardDetials.findOne({ _id: cardId });
    console.log("card_data:", card_data);

    if (!card_data) {
      console.log("inside....")
      card_data = await Company.findOne({ _id: cardId });
      user_data = await UserModel.findOne({ 'companyAccessCardDetails.company_id': new mongoose.Types.ObjectId(cardId) });

      const userAccessCardDetail = user_data?.companyAccessCardDetails.find(
        (detail) => detail.email_domain === card_data.email_domain
      );
      console.log("userAccessCardDetail:", userAccessCardDetail);

      teamMate = userAccessCardDetail?._id ? await teamMember.findById(userAccessCardDetail._id) : null;
      console.log("teamMate:", teamMate);

      bio = teamMate
        ? {
          first_name: teamMate.first_name,
          last_name: teamMate.last_name,
          full_name: `${teamMate.first_name} ${teamMate.last_name}`,
          designation: teamMate.designation || "",
          work_email: teamMate.work_email,
          phone_number: teamMate.phone_number
        }
        : null;
      console.log("bio : ", bio)
    }

    if (!user_data) {
      user_data = await UserModel.findOne({ 'personal_cards': new mongoose.Types.ObjectId(cardId) });
    }

    console.log("card_data:", card_data);
    console.log("user_data:", user_data);

    let mydata = {}
    if (card_data && bio) {
      // card_data.bio.first_name = bio.first_name
      // card_data.bio.last_name = bio.last_name
      // card_data.bio.full_name = bio.full_name
      // card_data.bio.designation = bio.designation
      // card_data.bio.work_email = bio.work_email
      // card_data.bio.phone_number = bio.phone_number

      mydata = {
        ...bio,
        ...card_data.toObject()
      }
      delete mydata.bio
    }

    res.status(200).json({
      data: bio ? mydata : card_data
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ errors: { msg: 'Internal Server Error' } });
  }
};
