const model = require('../models/user')
const uuid = require('uuid')
const {
  getUserIdFromToken,
  uploadFile,
  uploadFilefromPath,
  capitalizeFirstLetter,
  validateFileSize,
  objectToQueryString,
} = require("../shared/helpers");
const { matchedData } = require('express-validator')
const utils = require('../middleware/utils')
const auth = require('../middleware/auth')
const db = require('../middleware/db')
const emailer = require('../middleware/emailer')
const User = require('../models/user')
const CMS = require('../models/cms')
const FAQ = require('../models/faq')
const Feedback = require('../models/feedback')

const Support = require('../models/support')
const { Country, State, City } = require('country-state-city');
const Company = require("../models/company")
const CardDetials = require('../models/cardDetials')
const SavedCard = require("../models/saved_card")
const SharedCards = require("../models/sharedCards")
const FCMDevice = require("../models/fcm_devices");
const Notification = require("../models/notification");
const Subscription = require("../models/subscription");
const PaidByCompany = require("../models/paid_by_company")
const { getCode, getName } = require('country-list');
const Transaction = require("../models/transaction");
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');
var mongoose = require("mongoose");
const ejs = require("ejs");
const Plan = require("../models/plan")
const Razorpay = require('razorpay');
const moment = require("moment")
var instance = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
const crypto = require('crypto');
const {

  getItemThroughId,
  updateItemThroughId
} = require("../shared/core");
/*********************
 * Private functions *
 *********************/

/**
 * Creates a new item in database
 * @param {Object} req - request object
 */
const createItem = async req => {
  return new Promise((resolve, reject) => {
    const user = new model({
      name: req.name,
      email: req.email,
      password: req.password,
      role: req.role,
      phone: req.phone,
      city: req.city,
      country: req.country,
      verification: uuid.v4()
    })
    user.save((err, item) => {
      if (err) {
        reject(utils.buildErrObject(422, err.message))
      }
      // Removes properties with rest operator
      const removeProperties = ({
        // eslint-disable-next-line no-unused-vars
        password,
        // eslint-disable-next-line no-unused-vars
        blockExpires,
        // eslint-disable-next-line no-unused-vars
        loginAttempts,
        ...rest
      }) => rest
      resolve(removeProperties(item.toObject()))
    })
  })
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


function sendInvoiceEmail(mailOptions) {

  const transporter = nodemailer.createTransport({
    from: "nodeteamemail@gmail.com",
    host: "smtp.gmail.com",
    secureConnection: true,
    port: 465,
    transportMethod: "SMTP",
    auth: {
      user: process.env.EMAIL_ID,
      pass: process.env.EMAIL_PASS,
    },
  });


  return new Promise(async (resolve, reject) => {
    try {
      var ejsFile = "./views/invoiceEmail.ejs";

      const emailBody = await ejs.renderFile(ejsFile, mailOptions);

      mailOptions.html = emailBody;

      transporter.sendMail(mailOptions, function (err, message) {
        if (err) {
          console.error("There was an error sending the email", err);
          reject(err);
        } else {
          console.log("Mail sent");
          resolve();
        }
      });
    } catch (error) {
      console.error("Error in sending invoice email:", error);
      reject(error);
    }
  });
}


async function checkSusbcriptionIsActive(user_id) {
  const subcription = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });

  if (!subcription) return false
  if (!subcription.status === "created") return false
  if (subcription.end_at < new Date()) return false
  return true
}


/********************
 * Public functions *
 ********************/

/**
 * Get items function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getItems = async (req, res) => {
  try {
    const query = await db.checkQueryString(req.query)
    res.status(200).json(await db.getItems(req, model, query))
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Get item function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.getItem = async (req, res) => {
  try {
    req = matchedData(req)
    const id = await utils.isIDGood(req.id)
    res.status(200).json(await db.getItem(id, model))
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Update item function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.updateItem = async (req, res) => {
  try {
    req = matchedData(req)
    const id = await utils.isIDGood(req.id)
    const doesEmailExists = await emailer.emailExistsExcludingMyself(
      id,
      req.email
    )
    if (!doesEmailExists) {
      res.status(200).json(await db.updateItem(id, model, req))
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Create item function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */
exports.createItem = async (req, res) => {
  try {
    // Gets locale from header 'Accept-Language'
    const locale = req.getLocale()
    req = matchedData(req)
    const doesEmailExists = await emailer.emailExists(req.email)
    if (!doesEmailExists) {
      const item = await createItem(req)
      emailer.sendRegistrationEmailMessage(locale, item)
      res.status(201).json(item)
    }
  } catch (error) {
    utils.handleError(res, error)
  }
}

/**
 * Delete item function called by route
 * @param {Object} req - request object
 * @param {Object} res - response object
 */


exports.deleteItem = async (req, res) => {
  try {
    req = matchedData(req)
    const id = await utils.isIDGood(req.id)
    res.status(200).json(await db.deleteItem(id, model))
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.uploadUserMedia = async (req, res) => {
  try {
    if (!req.files.media || !req.body.path) {
      // check if image and path missing
      return res.status(422).json({
        code: 422,
        message: "MEDIA OR PATH MISSING",
      });
    }

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
    const data = req.body;

    const user = await User.findOne({ email: data.email });

    if (!user) {
      return res.status(404).json({ message: 'Email does not exist.' });
    }



    await user.save();

    res.status(200).json({ message: 'Password change successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
/*** Gagan ****/
exports.editCardDetails = async (req, res) => {
  try {
    const owner_id = req.user._id;
    const data = req.body;
    const existingCard = await CardDetials.findOne({ owner_id });

    if (existingCard) {
      // Update existing card details dynamically based on provided fields
      for (const field in data) {
        if (field === 'bio') {
          // Update bio fields
          for (const bioField in data.bio) {
            existingCard.bio[bioField] = data.bio[bioField];
          }
        } else if (field === 'contact_details') {
          // Update contact details fields
          for (const contactField in data.contact_details) {
            existingCard.contact_details[contactField] = data.contact_details[contactField];
          }
        } else if (field === 'address') {
          // Update address fields
          for (const addressField in data.address) {
            existingCard.address[addressField] = data.address[addressField];
          }
        } else if (field === 'social_links') {
          // Update social links fields
          for (const socialField in data.social_links) {
            existingCard.social_links[socialField] = data.social_links[socialField];
          }
        } else {
          // Update other top-level fields
          existingCard[field] = data[field];
        }
      }

      existingCard.bio.full_name = `${existingCard.bio.first_name}${existingCard.bio.last_name ? ` ${existingCard.bio.last_name}` : ""}`;

      await existingCard.save();
      res.json({ code: 200, message: "Card updated successfully" });
    } else {

      res.json({ code: 404, message: "Card not found" });
    }
  } catch (error) {
    utils.handleError(res, error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    // Validate if oldPassword and newPassword are provided
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ code: 400, message: "Both oldPassword and newPassword are required." });
    }

    // Fetch the user from the database
    const user = await User.findById(userId);

    // Validate if the user exists
    if (!user) {
      return res.status(404).json({ code: 404, message: "User not found." });
    }

    // Validate the old password
    const isPasswordMatch = await auth.checkPassword(oldPassword, user)
    if (!isPasswordMatch) {
      return res.status(401).json({ code: 401, message: "Old password is incorrect." });

    } else {


      // Update the password with the new one
      user.password = newPassword;
      await user.save();
      res.json({ code: 200, message: "Password changed successfully." });
    }


  } catch (error) {
    console.log("error occurred here in change password: ", error);
    utils.handleError(res, error);
  }
};

exports.addSharedCard = async (req, res) => {
  try {
    const { card_id } = req.body;
    const user_id = req.user._id;

    const user1 = await User.findById(user_id);
    //chech the user have a card and get user card id
    const userCard = await CardDetials.findOne({ owner_id: user_id })
    if (!userCard) {
      return utils.handleError(res, { message: "Your card not found", code: 404 });
    }

    const your_card_id = userCard._id;

    // Fetch card details to get the owner_id
    const carddetails = await getItemThroughId(CardDetials, card_id);
    console.log("Card details are---", carddetails.data)

    if (!carddetails) {
      return utils.handleError(res, { message: "Shared card not found", code: 404 });
    }

    const card_owner_id = carddetails.data.owner_id;
    const user2 = await User.findById(card_owner_id);

    // Check if user is trying to add their own card
    if (user_id.equals(card_owner_id)) {
      return res.status(400).json({ code: 400, message: "You cannot add your own card." });
    }

    // Check if shared card already exists
    const existingSharedCard = await SharedCards.findOne({ card_id, user_id, card_owner_id });

    if (existingSharedCard) {
      return res.status(400).json({ code: 400, message: "Shared card already exists." });
    }

    // Save shared card

    const sharedCard = new SharedCards({
      card_id,
      user_id,
      card_owner_id,
    });

    await sharedCard.save();


    //share card to opposite side

    const shareCardToOppositeSide = new SharedCards({
      card_id: your_card_id,
      user_id: card_owner_id,
      card_owner_id: user_id,
    })

    await shareCardToOppositeSide.save();



    const notificationUser1 = {
      sender_id: card_owner_id,
      receiver_id: user_id,
      type: "card_shared",
      title: "Business Card Shared",
      body: `${carddetails?.bio?.full_name} has shared their business card`
    }

    const saveNotificationForUser1 = new Notification(notificationUser1)
    await saveNotificationForUser1.save()


    if (user1.notification) {
      const device_token = await FCMDevice.findOne({ user_id: user1._id })
      if (!device_token) return
      utils.sendPushNotification(device_token.token, notificationUser1.title, notificationUser1.body)
    }


    const notificationUser2 = {
      sender_id: user_id,
      receiver_id: card_owner_id,
      type: "card_shared",
      title: "Business Card Shared",
      body: `${userCard?.bio?.full_name} has shared their business card`
    }

    const saveNotificationForUser2 = new Notification(notificationUser2)
    await saveNotificationForUser2.save()


    if (user2.notification) {
      const device_token = await FCMDevice.findOne({ user_id: user2._id })
      if (!device_token) return
      utils.sendPushNotification(device_token.token, notificationUser2.title, notificationUser2.body)
    }


    res.json({ code: 200, message: "Shared card added successfully." });
  } catch (error) {
    console.log("error is---", error);
    utils.handleError(res, error);
  }
};



exports.getSharedCardsForUser = async (req, res) => {
  try {
    const { user_id, search } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    // Validate if user_id is provided
    if (!user_id) {
      return res.status(400).json({ code: 400, message: "User ID is required." });
    }

    // Convert limit and offset to integers
    const limitInt = parseInt(limit, 10);
    const offsetInt = parseInt(offset, 10);

    const query = {
      user_id: mongoose.Types.ObjectId(user_id)
    };

    if (search) {
      // If search is present, extend the query for searching by business_name or full_name using regex
      query.$or = [
        { "cardDetails.bio.business_name": { $regex: search, $options: "i" } }, // Case-insensitive regex for business_name
        { "cardDetails.bio.full_name": { $regex: search, $options: "i" } } // Case-insensitive regex for full_name
      ];
    }

    // Fetch shared cards for the user with $lookup, $skip, and $limit
    const sharedCards = await SharedCards.aggregate([
      {
        $lookup: {
          from: "card_details", // Collection name for CardDetails
          localField: "card_id",
          foreignField: "_id",
          as: "cardDetails"
        }
      },
      {
        $unwind: "$cardDetails"
      },
      {
        $lookup: {
          from: "companies",
          localField: "cardDetails.company_id",
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
          'cardDetails.bio.business_name': {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.company_name',
              else: '$cardDetails.bio.business_name'
            }
          },
          'cardDetails.card_color': {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.card_color',
              else: '$cardDetails.card_color'
            }
          },
          'cardDetails.text_color': {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.text_color',
              else: '$cardDetails.text_color'
            }
          },
          "cardDetails.business_logo": {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.business_logo',
              else: '$cardDetails.business_logo'
            }
          },
          "cardDetails.address": {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.address',
              else: '$cardDetails.address'
            }
          },
          "cardDetails.contact_details.website": {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.contact_details.website',
              else: '$cardDetails.contact_details.website'
            }
          },
        }
      },
      {
        $match: query
      },
      {
        $skip: offsetInt
      },
      {
        $limit: limitInt
      },
      {
        $project: {
          _id: 0, // Exclude the default _id field
          card_id: "$card_id",
          user_id: "$user_id",
          card_owner_id: "$card_owner_id",
          cardDetails: "$cardDetails",
        }
      }
    ]);

    res.json({ code: 200, sharedCards });
  } catch (error) {
    console.log("error occurred---", error);
    utils.handleError(res, error);
  }
};

/*******APIs by Gagan ends here*********/

exports.addPersonalCard = async (req, res) => {
  try {
    const owner_id = req.user._id;
    // const owner_id = req.body.owner_id

    const isCardExist = await CardDetials.findOne({ owner_id: owner_id });

    if (isCardExist) return utils.handleError(res, { message: "Card already create", code: 400 })

    const data = req.body;
    const card = {
      owner_id,
      card_type: 'personal',
      business_logo: data.business_logo,
      card_color: data.card_color,
      text_color: data.text_color,
      business_and_logo_status: data.business_and_logo_status,
      bio: {
        first_name: data.bio.first_name,
        last_name: data.bio.last_name,
        full_name: `${data.bio.first_name}${data.bio.last_name ? ` ${data.bio.last_name}` : ""}`,
        business_name: data.bio.business_name,
        designation: data.bio.designation,
      },
      contact_details: {
        country_code: data.contact_details.country_code,
        mobile_number: data.contact_details.mobile_number,
        office_landline: data.contact_details.office_landline,
        email: data.contact_details.email,
        website: data.contact_details.website,
      },
      address: {
        country: data.address.country,
        state: data.address.state,
        city: data.address.city,
        address_line_1: data.address.address_line_1,
        address_line_2: data.address.address_line_2,
        pin_code: data.address.pin_code,
      },
      social_links: {
        linkedin: data.social_links.linkedin,
        x: data.social_links.x,
        instagram: data.social_links.instagram,
        youtube: data.social_links.youtube,
      }
    }

    const cardData = new CardDetials(card)
    await cardData.save()

    await User.findByIdAndUpdate(owner_id, { is_card_created: true, user_type: "personal", text_color: data.text_color })

    await SavedCard.deleteOne({ owner_id: owner_id })

    res.json({ code: 200, message: "Card Save successfully" })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.matchAccessCode = async (req, res) => {
  try {
    const { email, access_code } = req.body;

    const email_domain = extractDomainFromEmail(email);
    const company = await Company.findOne({ email_domain }, { password: 0, decoded_password: 0 })
    if (!company) return utils.handleError(res, { message: "Company not found", code: 404 });
    if (company.access_code !== access_code) return utils.handleError(res, { message: "Invalid Access Code", code: 400 });



    res.json({ code: 200, data: company })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.isPaidByCompany = async (req, res) => {
  try {

    const { email } = req.body;

    const email_domain = extractDomainFromEmail(email);
    const company = await Company.findOne({ email_domain }, { password: 0, decoded_password: 0 })
    if (!company) return utils.handleError(res, { message: "Company not found", code: 404 });

    var paid_by_company = false;
    const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ company_id: company._id, email: email });
    console.log("isSubscriptionPaidByCompany", isSubscriptionPaidByCompany)
    if (isSubscriptionPaidByCompany) {
      const isCompanyHaveSubscription = await checkSusbcriptionIsActive(company._id);
      if (isCompanyHaveSubscription === true) {
        paid_by_company = true
      } else {
        return res.json({ data: paid_by_company, message: "Company does not have any active subscription", code: 200 })
      }
    }

    res.json({ data: paid_by_company, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.addCorporateCard = async (req, res) => {
  try {
    const owner_id = req.user._id;
    const { company_id, paid_by_company } = req.body
    const data = req.body;

    const company = await Company.findById(company_id);
    if (!company) return utils.handleError(res, { message: "Company not found", code: 404 });


    if (paid_by_company === true) {
      const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ company_id: company._id, email: data?.contact_details?.email });
      if (!isSubscriptionPaidByCompany) return utils.handleError(res, { message: "You account is not reimbursed by the company", code: 400 });
      isSubscriptionPaidByCompany.is_card_created = true
      await isSubscriptionPaidByCompany.save()
    }


    //check this user have a card or not 

    const isCardExist = await CardDetials.findOne({ owner_id: owner_id });

    const card = {
      card_type: 'corporate',
      company_id: company_id,
      card_color: data?.card_color,
      business_and_logo_status: data?.business_and_logo_status,
      bio: {
        first_name: data?.bio?.first_name,
        last_name: data?.bio?.last_name,
        full_name: `${data?.bio?.first_name}${data?.bio?.last_name ? ` ${data?.bio?.last_name}` : ""}`,
        designation: data?.bio?.designation,
      },
      contact_details: {
        country_code: data?.contact_details?.country_code,
        mobile_number: data?.contact_details?.mobile_number,
        office_landline: data?.contact_details?.office_landline,
        email: data?.contact_details?.email,
        website: data?.contact_details?.website,
      },
      address: {
        country: data?.address?.country,
        state: data?.address?.state,
        city: data?.address?.city,
        address_line_1: data?.address?.address_line_1,
        address_line_2: data?.address?.address_line_2,
        pin_code: data?.address?.pin_code,
      },
      social_links: {
        linkedin: data?.social_links?.linkedin,
        x: data?.social_links?.x,
        instagram: data?.social_links?.instagram,
        youtube: data?.social_links?.youtube,
      },
    }


    if (isCardExist) {
      await CardDetials.updateOne({ owner_id: owner_id }, card);
      await SavedCard.deleteOne({ owner_id: owner_id })

      res.json({ code: 200, message: "Company change successfully" })
    } else {
      const cardData = new CardDetials({ owner_id, ...card })
      await cardData.save()
      await User.findByIdAndUpdate(owner_id, { is_card_created: true, user_type: "corporate" })
      await SavedCard.deleteOne({ owner_id: owner_id })
      res.json({ code: 200, message: "Card Save successfully" })
    }


  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.getProfile = async (req, res) => {
  try {
    const user_id = req.user._id;
    console.log("==========user_id", user_id)

    const profile = await User.aggregate([
      {
        $match: {
          _id: user_id
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
        $lookup: {
          from: "companies",
          localField: "card_details.company_id",
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
          'card_details.bio.business_name': {
            $cond: {
              if: { $eq: ['$card_details.card_type', 'corporate'] },
              then: '$company.company_name',
              else: '$card_details.bio.business_name'
            }
          },
          'card_details.card_color': {
            $cond: {
              if: { $eq: ['$card_details.card_type', 'corporate'] },
              then: '$company.card_color',
              else: '$card_details.card_color'
            }
          },
          "card_details.business_logo": {
            $cond: {
              if: { $eq: ['$card_details.card_type', 'corporate'] },
              then: '$company.business_logo',
              else: '$card_details.business_logo'
            }
          },
          "card_details.address": {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.address',
              else: '$card_details.address'
            }
          },
          "card_details.contact_details.website": {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.contact_details.website',
              else: '$card_details.contact_details.website'
            }
          },
        }
      },
      {
        $lookup: {
          from: "SharedCards",
          localField: "_id",
          foreignField: "user_id",
          as: "shared_cards",
        }
      },
      {
        $project: {
          password: 0,
          confirm_password: 0,
          company: 0
        }
      },
    ])

    res.json({ data: profile[0], code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.accountPrivacy = async (req, res) => {
  try {
    const owner_id = req.user._id;
    const card = await CardDetials.findOne({ owner_id: owner_id });

    if (!card) return utils.handleError(res, { message: "Card not found", code: 404 })

    // return res.status(404).json({ code: 404, message: "Card not found." });

    const data = {
      linkedin: card?.social_links?.linkedin_enabled ?? true,
      x: card?.social_links?.x_enabled ?? true,
      instagram: card?.social_links?.instagram_enabled ?? true,
      youtube: card?.social_links?.youtube_enabled ?? true,
      mobile_number: card?.contact_details?.mobile_number_enabled ?? true
    }

    res.json({ data: data, code: 200 })

  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.enableOrDisableLink = async (req, res) => {

  try {
    const link_type = req.body.type;
    const owner_id = req.user._id;
    const card = await CardDetials.findOne({ owner_id: owner_id });

    if (!card) return res.status(404).json({ code: 404, message: "Card not found." });

    const dataToUpdate = {}
    if (link_type === "linkedin") {
      const link_status = !(card?.social_links?.linkedin_enabled ?? true);
      dataToUpdate["social_links.linkedin_enabled"] = link_status
    } else if (link_type === "x") {
      const link_status = !(card?.social_links?.x_enabled ?? true);
      dataToUpdate["social_links.x_enabled"] = link_status
    } else if (link_type === "instagram") {
      const link_status = !(card?.social_links?.instagram_enabled ?? true);
      dataToUpdate["social_links.instagram_enabled"] = link_status
    } else if (link_type === "youtube") {
      const link_status = !(card?.social_links?.youtube_enabled ?? true);
      dataToUpdate["social_links.youtube_enabled"] = link_status
    } else if (link_type === "mobile") {
      const link_status = !(card?.contact_details?.mobile_number_enabled ?? true);
      dataToUpdate["contact_details.mobile_number_enabled"] = link_status
    }

    await CardDetials.updateOne({ owner_id: owner_id }, dataToUpdate);

    res.json({ code: 200, message: "Link status changed successfully" })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }

}


exports.getCard = async (req, res) => {
  try {
    const user_id = req.user._id;

    // const profile = await CardDetials.findOne({owner_id : user_id});

    const profile = await CardDetials.aggregate([
      {
        $match: {
          owner_id: user_id
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
          "website": {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.contact_details.website',
              else: '$website'
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
    res.json({ data: profile[0], code: 200 })
  } catch (error) {
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

exports.getCMS = async (req, res) => {
  try {
    const { type } = req.query;

    const cmsResp = await CMS.findOne({ type });

    if (!cmsResp) {
      return res.status(404).json({
        code: 404,
        message: 'Data not found for the specified type.',
      });
    }

    res.json({
      code: 200,
      content: cmsResp,
    });
  } catch (error) {
    console.log("================error", error)
    utils.handleError(res, error);
  }
};


exports.getFAQ = async (req, res) => {
  try {
    const { type } = req.query;

    const faqResp = await FAQ.find().sort({ createdAt: 1 });

    if (!faqResp) {
      return res.status(404).json({
        code: 404,
        message: 'Data not found for the specified type.',
      });
    }

    res.json({
      code: 200,
      content: faqResp,
    });
  } catch (error) {
    console.log("================error", error)
    utils.handleError(res, error);
  }
};

exports.helpsupport = async (req, res) => {
  try {
    const data = req.body;
    const user_id = req.user._id;

    const add = await Support.create(
      {
        user_id: user_id,
        message: data?.message
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

    const feedback = await Feedback.create(
      {
        user_id: user_id,
        message: data?.message
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

    await User.deleteOne({ _id: user_id });
    await CardDetials.deleteOne({ owner_id: user_id })

    res.json({ message: "Your account is deleted successfully" });
  } catch (error) {
    console.log("================error", error)
    utils.handleError(res, error);
  }
}


exports.addFCMDevice = async (req, res) => {
  try {
    const { device_id, device_type, token } = req.body;
    const user_id = req.user._id;

    const isDeviceExist = await FCMDevice.findOne({ user_id: user_id })

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
      const item = new FCMDevice(data);
      await item.save()
    }

    res.json({
      message: "Token added successfully",
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

    const fcmToken = await FCMDevice.findOne({ user_id: user_id, token: token })

    if (!fcmToken) return utils.handleError(res, { message: "Token not found", code: 404 });

    await FCMDevice.deleteOne({ user_id: user_id, token: token })

    res.json({
      message: "Token deleted successfully",
      code: 200
    });

  } catch (error) {
    console.log(error)
    utils.handleError(res, error);
  }
};


exports.changeNotificaitonSetting = async (req, res) => {
  try {
    const user_id = req.user._id;

    const user = await User.findById(user_id);
    user.notification = !user.notification;
    await user.save()

    res.json({ message: `Notificaton ${user.notification ? "enabled" : "disabled"} successfully`, code: 200 })
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.getNotificationSetting = async (req, res) => {
  try {
    const user_id = req.user._id;

    console.log("running")
    const user = await User.findById(user_id);

    res.json({ data: user.notification, code: 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getNotification = async (req, res) => {
  try {
    const { limit = Number.MAX_SAFE_INTEGER, offset = 0 } = req.body;

    console.log("req.body", req.body)
    var reciever_id = req.user._id;

    const count = await Notification.count({
      receiver_id: mongoose.Types.ObjectId(reciever_id),
    });

    const notification = await Notification.aggregate([
      {
        $match: {
          receiver_id: mongoose.Types.ObjectId(reciever_id),
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
    utils.handleError(res, error)
  }
};


exports.exportCardToExcel = async (req, res) => {
  try {
    const user_id = req.user._id;
    const email = req.user.email;


    const query = {
      user_id: mongoose.Types.ObjectId(user_id)
    };

    const sharedCards = await SharedCards.aggregate([
      {
        $match: query
      },
      {
        $lookup: {
          from: "card_details", // Collection name for CardDetails
          localField: "card_id",
          foreignField: "_id",
          as: "cardDetails"
        }
      },
      {
        $unwind: "$cardDetails"
      },
      {
        $lookup: {
          from: "companies",
          localField: "cardDetails.company_id",
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
          'cardDetails.bio.business_name': {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.company_name',
              else: '$cardDetails.bio.business_name'
            }
          },
          'cardDetails.card_color': {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.card_color',
              else: '$cardDetails.card_color'
            }
          },
          'cardDetails.text_color': {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.text_color',
              else: '$cardDetails.text_color'
            }
          },
          "cardDetails.business_logo": {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.business_logo',
              else: '$cardDetails.business_logo'
            }
          },
          "cardDetails.address": {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.address',
              else: '$cardDetails.address'
            }
          },
          "cardDetails.contact_details.website": {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.contact_details.website',
              else: '$cardDetails.contact_details.website'
            }
          },
        }
      },
      {
        $project: {
          _id: 0, // Exclude the default _id field
          "First Name": "$cardDetails.bio.first_name",
          "Last Name": "$cardDetails.bio.last_name",
          "Business Name": "$cardDetails.bio.business_name",
          "Business Logo": { $concat: [process.env.STORAGE_PATH_HTTP, "/", "$cardDetails.business_logo"] },
          "Phone Number": "$cardDetails.contact_details.mobile_number",
          "Office Landline": "$cardDetails.contact_details.office_landline",
          "Designation": "$cardDetails.bio.designation",
          "Email": "$cardDetails.bio.email",
          "Address Line No 1": "$cardDetails.address.address_line_1",
          "Address Line No 2": "$cardDetails.address.address_line_2",
          "City": "$cardDetails.address.city",
          "State": "$cardDetails.address.state",
          "Country": "$cardDetails.address.country",
          "Pin Code": "$cardDetails.address.pin_code",
          "Instagram": "$cardDetails.social_links.instagram",
          "Linkedin": "$cardDetails.social_links.linkedin",
          "Youtube": "$cardDetails.social_links.youtube",
          "X": "$cardDetails.social_links.x"
        }
      }
    ]);

    // Convert JSON to Excel
    const ws = XLSX.utils.json_to_sheet(sharedCards);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');

    // Specify the server folder path and Excel file name
    const serverFolderPath = process.env.STORAGE_PATH_FOR_EXCEL;
    const excelFileName = Date.now() + 'cards.xlsx';
    const excelFilePath = `${serverFolderPath}/cardExcelSheet/${excelFileName}`;

    // Save the Excel file to the server folder
    XLSX.writeFile(wb, excelFilePath, { bookSST: true });


    // const media = await uploadFilefromPath(excelFilePath)

    const path = `${process.env.STORAGE_PATH_HTTP}/cardExcelSheet/${excelFileName}`;

    console.log(email)
    let mailOptions = {
      to: email,
      subject: `Exported Card from ${process.env.APP_NAME}`,
      name: req.user.full_name,
      logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`,
      attachments: [],
    };

    mailOptions.attachments.push({
      filename: `business_cards.xlsx`,
      path: path,
    });

    await sendInvoiceEmail(mailOptions);

    res.json({ data: "Mail send to you email with excel sheet", code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.seenNotification = async (req, res) => {
  try {
    var reciever_id = req.user._id;

    const update = await Notification.updateMany(
      { receiver_id: mongoose.Types.ObjectId(reciever_id), is_seen: false },
      { $set: { is_seen: true } }
    );
    console.log("seenNotification", update);
    res.json({ code: 200 });
  } catch (error) {
    utils.handleError(res, error)
  }
};

exports.unseenNotificationCount = async (req, res) => {
  try {
    var reciever_id = req.user._id;

    const unseenCount = await Notification.count({
      receiver_id: mongoose.Types.ObjectId(reciever_id),
      is_seen: false,
    });

    res.json({ data: unseenCount, code: 200 });
  } catch (error) {
    utils.handleError(res, error)
  }
};


//just of adding tst notificaiton

exports.addNotificaiton = async (req, res) => {
  try {
    const notificaiton = {
      sender_id: "65d06e7484dbf901a036503d",
      receiver_id: "65d0555ad423a9ee3d97078c",
      type: "card_shared",
      related_to: "65d2f663ca96f633ce13ec82",
      title: "Card Shared",
      body: "Deepak has shared their card",
      is_seen: false,
      is_admin: true
    }

    const createNotification = new Notification(notificaiton);
    await createNotification.save()

    res.json({ message: "notification saved" })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


async function isSubscriptionActiveOrNot(user) {
  try {
    const user_id = user._id;
    var subcriptionActive = false
    if (user.user_type === "personal") {
      subcriptionActive = await checkSusbcriptionIsActive(user_id)
    } else if (user.user_type === "corporate") {
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
    }

    return subcriptionActive
  } catch (error) {
    console.log(error)
    return false
  }
}


exports.isSubscriptionActive = async (req, res) => {
  try {
    const user_id = req.user._id;
    const user = req.user;

    if (!user.is_card_created) utils.handleError(res, { message: "Card not created yet", code: 400 });
    var isSubscriptionActive = await isSubscriptionActiveOrNot(user);


    // var isSubscriptionActive = false;
    // if (user.user_type === "personal") {
    //   isSubscriptionActive = await checkSusbcriptionIsActive(user_id)
    // } else if (user.user_type === "corporate") {
    //   const card = await CardDetials.findOne({ owner_id: user_id });
    //   if (!card) utils.handleError(res, { message: "Card not found", code: 400 });

    //   const company_id = card.company_id;
    //   const email = card?.contact_details?.email;
    //   if (!email) return utils.handleError(res, { message: "Work email not found", code: 400 });

    //   const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ company_id: company_id, email: email });
    //   if (isSubscriptionPaidByCompany) {
    //     //Employee is subcription is paid by company
    //     isSubscriptionActive = await checkSusbcriptionIsActive(company_id)
    //   } else {
    //     //Employee is subcription is not paid by company
    //     //check for waiting period 

    //     const waiting_end_time = card.waiting_end_time;
    //     if (waiting_end_time && new Date(waiting_end_time) > new Date()) {
    //       isSubscriptionActive = true
    //     } else {
    //       isSubscriptionActive = await checkSusbcriptionIsActive(user_id)
    //     }
    //   }

    // }

    res.json({ data: isSubscriptionActive, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.removeLogo = async (req, res) => {
  try {
    const user_id = req.user._id;

    const card = await CardDetials.findOne({ owner_id: mongoose.Types.ObjectId(user_id) })
    if (!card) return utils.handleError(res, { message: "Card not found", code: 404 })

    card.business_logo = ""
    await card.save();

    res.json({ message: "Business logo is removed successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

async function isTrailNeedToBeGiven(user_id) {
  try {
    const isSubcriptionExist = await Subscription.findOne({ user_id: mongoose.Types.ObjectId(user_id), status: { $nin: ["created"] } });
    if (isSubcriptionExist) {
      return false
    } else {
      return true
    }
  } catch (error) {
    throw new Error(error)
  }

}

exports.createSubscription = async (req, res) => {
  try {
    const user_id = req.user._id;
    const { plan_id } = req.body;
    const isSubcriptionExist = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });

    if (isSubcriptionExist && ["authenticated", "active", "paused", "pending"].includes(isSubcriptionExist.status)) {
      return res.json({ message: `You already have ${isSubcriptionExist.status} subscription`, code: 400 })
    }

    if (isSubcriptionExist && ["cancelled", "completed", "expired"].includes(isSubcriptionExist.status) && isSubcriptionExist.end_at > new Date()) {
      return res.json({ message: `Your can create new subscription after the expiry time of current subscription`, code: 200 })
    }
    console.log(isSubcriptionExist)
    console.log(plan_id)
    if (isSubcriptionExist && isSubcriptionExist.status === "created" && plan_id !== isSubcriptionExist.plan_id && new Date(isSubcriptionExist.createdAt).getTime() + (5 * 60 * 1000) > new Date()) {
      return res.json({ message: "Please wait some time to swith the plan", code: 400 });
    }


    if (isSubcriptionExist && isSubcriptionExist.status === "created") {
      await Subscription.findByIdAndDelete(isSubcriptionExist._id);
    }


    const plan = await await Plan.findOne({ plan_id: plan_id });
    if (!plan) return utils.handleError(res, { message: "Plan not found", code: 404 });

    if (plan.plan_type !== "individual") return utils.handleError(res, { message: "This plan is not for individiual", code: 400 });

    const trailToBeGiven = await isTrailNeedToBeGiven(user_id)
    let trail = {}

    const currentDate = moment();
    const futureDate = currentDate.add((plan?.trial_period_days ?? 180), 'days');
    if (trailToBeGiven === true) {
      const timestamp = Math.floor(futureDate.valueOf() / 1000)
      trail = { start_at: timestamp }
    }

    console.log("trail",trail)
    const subcription = await instance.subscriptions.create({
      "plan_id": plan.plan_id,
      "total_count": 1,
      "quantity": 1,
      "customer_notify": 1,
      ...trail,
      "notes": {
        "user_id": user_id.toString(),
        "user_type": "individual"
      }
    })

    console.log("futureDate" ,futureDate)
    console.log("futureDate.valueOf" ,futureDate.valueOf())
    const now = new Date()
    const dataForDatabase = {
      user_id: user_id,
      subscription_id: subcription.id,
      plan_id: plan.plan_id,
      start_at: now,
      end_at: trailToBeGiven === true ? new Date(futureDate.valueOf()) : now,
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


exports.webhook = async (req, res) => {
  const payload = JSON.stringify(req.body);
  const signature = req.get('X-Razorpay-Signature');

  console.log("signature", signature)
  // Verify signature
  const expectedSignature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');


  if (signature === expectedSignature) {
    var event = req.body.event;
    const subscription = req.body.payload.subscription.entity
    const user_id = subscription.notes.user_id;
    const user_type = subscription.notes.user_type;


    var user_country = ""

    if (user_type === "individual") {
      const user = await CardDetials.findOne({ owner_id: mongoose.Types.ObjectId(user_id) });
      if (user?.card_type === "corporate") {
        const company = await Company.findById(user?.company_id);
        user_country = company?.address?.country
      } else {
        user_country = user?.address?.country
      }
    } else {
      const company = await Company.findById(user_id);
      user_country = company?.address?.country
    }

    console.log("user_country", user_country)

    const plan_id = subscription.plan_id;
    const plan = await instance.plans.fetch(plan_id)

    
    console.log('Subscription :', subscription);
    switch (event) {
      case 'subscription.authenticated':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status })
        break;
      case 'subscription.paused':
        break;
      case 'subscription.resumed':
        break;
      case 'subscription.activated':
        break;
      case 'subscription.pending':
        break;
      case 'subscription.halted':

        break;
      case 'subscription.charged':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status  , start_at : new Date(subscription.current_start * 1000) , end_at : new Date(subscription.current_end * 1000)})
        const transactionData = {
          user_id: user_id,
          user_type: user_type,
          country: user_country,
          plan_id: plan_id,
          subcription_id: subscription.id,
          amount: Number(plan?.item?.amount ?? 0) / 100
        }

        const transaction = new Transaction(transactionData);
        await transaction.save();

        break;
      case 'subscription.cancelled':
        break;
      case 'subscription.completed':
        break;
      case 'subscription.updated':
        break;
      default:
        console.log('Unhandled event:', event);
    }

    res.sendStatus(200);
  } else {
    // Signature verification failed
    console.error('Invalid webhook signature');
    res.sendStatus(403);
  }
}


exports.plansList = async (req, res) => {
  try {
    const user_id = req.user._id;
    const plans = await Plan.find({ plan_type: "individual" })
    const activeSubscription = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 })

    res.json({ data: plans, active: activeSubscription, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.saveCard = async (req, res) => {
  try {

    const { card_type } = req.body;
    const owner_id = req.user._id;
    const data = req.body;

    const isCardExist = await SavedCard.findOne({ owner_id: owner_id });
    if (card_type !== "personal" && card_type !== "corporate") return utils.handleError(res, { message: "Invalid card type", code: 400 })

    if (card_type == "personal") {
      const card = {
        owner_id,
        card_type: card_type,
        business_logo: data.business_logo,
        card_color: data.card_color,
        text_color: data.text_color,
        business_and_logo_status: data.business_and_logo_status,
        bio: {
          first_name: data.bio.first_name,
          last_name: data.bio.last_name,
          full_name: `${data.bio.first_name}${data.bio.last_name ? ` ${data.bio.last_name}` : ""}`,
          business_name: data.bio.business_name,
          designation: data.bio.designation,
        },
        contact_details: {
          country_code: data.contact_details.country_code,
          mobile_number: data.contact_details.mobile_number,
          office_landline: data.contact_details.office_landline,
          email: data.contact_details.email,
          website: data.contact_details.website,
        },
        address: {
          country: data.address.country,
          state: data.address.state,
          city: data.address.city,
          address_line_1: data.address.address_line_1,
          address_line_2: data.address.address_line_2,
          pin_code: data.address.pin_code,
        },
        social_links: {
          linkedin: data.social_links.linkedin,
          x: data.social_links.x,
          instagram: data.social_links.instagram,
          youtube: data.social_links.youtube,
        }
      }
      if (isCardExist) {
        //updating the saved card
        await SavedCard.updateOne({ owner_id: owner_id }, card);
      } else {
        //creating the existing card
        const savedcard = new SavedCard(card)
        await savedcard.save()
      }

    } else if (card_type == "corporate") {

      const card = {
        owner_id: owner_id,
        card_type: card_type,
        company_id: data.company_id,
        card_color: data?.card_color,
        text_color: data?.text_color,
        business_logo: data?.business_logo,
        business_and_logo_status: data?.business_and_logo_status,
        bio: {
          first_name: data?.bio?.first_name,
          last_name: data?.bio?.last_name,
          full_name: `${data?.bio?.first_name}${data?.bio?.last_name ? ` ${data?.bio?.last_name}` : ""}`,
          designation: data?.bio?.designation,
          business_name: data?.bio?.business_name,
        },
        contact_details: {
          country_code: data?.contact_details?.country_code,
          mobile_number: data?.contact_details?.mobile_number,
          office_landline: data?.contact_details?.office_landline,
          email: data?.contact_details?.email,
          website: data?.contact_details?.website,
        },
        address: {
          country: data?.address?.country,
          state: data?.address?.state,
          city: data?.address?.city,
          address_line_1: data?.address?.address_line_1,
          address_line_2: data?.address?.address_line_2,
          pin_code: data?.address?.pin_code,
        },
        social_links: {
          linkedin: data?.social_links?.linkedin,
          x: data?.social_links?.x,
          instagram: data?.social_links?.instagram,
          youtube: data?.social_links?.youtube,
        },
      }

      if (isCardExist) {
        //updating the existing card
        await SavedCard.updateOne({ owner_id: owner_id }, card);
      } else {
        //need to create
        const savedcard = new SavedCard(card);
        await savedcard.save();
      }

    }

    res.json({ message: "Card saved successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}