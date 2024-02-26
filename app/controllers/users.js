const model = require('../models/user')
const uuid = require('uuid')
const {
  getUserIdFromToken,
  uploadFile,
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
const SharedCards = require("../models/sharedCards")
const FCMDevice = require("../models/fcm_devices");
const Notification = require("../models/notification");
const { getCode, getName } = require('country-list');

var mongoose = require("mongoose");
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
    const data = req.body;

    const user = await User.findOne({ email:data.email });

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
    const user_id = req.user._id; // Assuming user_id is obtained from authentication


    //chech the user have a card and get user card id
    const userCard = await CardDetials.findOne({owner_id :user_id })
    if (!userCard) {
      return utils.handleError(res, {message : "Your card not found" , code : 404});
    }

    const your_card_id = userCard._id;

    // Fetch card details to get the owner_id
    const carddetails = await getItemThroughId(CardDetials, card_id);
    console.log("Card details are---",carddetails.data)

    if (!carddetails) {
      return utils.handleError(res, {message : "Shared card not found" , code : 404});
    }

    const card_owner_id = carddetails.data.owner_id;

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
      card_id : your_card_id,
      user_id : card_owner_id ,
      card_owner_id : user_id,
    })

    await shareCardToOppositeSide.save();
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
        $addFields : {
          'cardDetails.bio.business_name': {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.company_name',
              else: '$cardDetails.bio.business_name'
            }
          },
          'cardDetails.card_color' : {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.card_color',
              else: '$cardDetails.card_color'
            }
          },
          'cardDetails.text_color' : {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.text_color',
              else: '$cardDetails.text_color'
            }
          },
          "cardDetails.business_logo" :  {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.business_logo',
              else: '$cardDetails.business_logo'
            }
          },
          "cardDetails.address" :  {
            $cond: {
              if: { $eq: ['$cardDetails.card_type', 'corporate'] },
              then: '$company.address',
              else: '$cardDetails.address'
            }
          },
          "cardDetails.contact_details.website" : {
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

exports.addPersonalCard = async ( req , res) => {
  try {
    const owner_id = req.user._id;
    // const owner_id = req.body.owner_id

    const isCardExist = await CardDetials.findOne({owner_id : owner_id});

    if(isCardExist) return utils.handleError(res, {message : "Card already create" , code : 400})
     
    const data = req.body;
    const card = {
      owner_id,
      card_type : 'personal',
      business_logo :data.business_logo,
      card_color :data.card_color,
      text_color:data.text_color,
      bio: {
        first_name : data.bio.first_name,
        last_name : data.bio.last_name,
        full_name : `${data.bio.first_name}${data.bio.last_name ? ` ${data.bio.last_name}` : ""}`,
        business_name :  data.bio.business_name,
        designation :data.bio.designation,
      },
      contact_details : {
        country_code : data.contact_details.country_code,
        mobile_number : data.contact_details.mobile_number,
        office_landline : data.contact_details.office_landline,
        email :   data.contact_details.email,
        website:  data.contact_details.website,
      },
      address : {
        country: data.address.country,
        state: data.address.state,
        city: data.address.city,
        address_line_1 : data.address.address_line_1,
        address_line_2 : data.address.address_line_2,
        pin_code : data.address.pin_code,
      },
      social_links : {
        linkedin : data.social_links.linkedin,
        x : data.social_links.x,
        instagram :data.social_links.instagram,
        youtube : data.social_links.youtube,
      }
    }

    const cardData = new CardDetials(card)
    await cardData.save()

    await User.findByIdAndUpdate(owner_id , {is_card_created : true , user_type : "personal",text_color:data.text_color })
    
    res.json({code : 200 , message : "Card Save successfully"})
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.matchAccessCode = async (req , res) => {
  try {
    const {email , access_code} = req.body;

    const email_domain = extractDomainFromEmail(email);

    const company = await Company.findOne({email_domain} , {password : 0 , decoded_password : 0})
    if(!company) return  utils.handleError(res, {message : "Company not found" , code : 404});
    if(company.access_code !==  access_code) return utils.handleError(res, {message : "Invalid Access Code" , code : 400});

    res.json({code : 200 , data : company})
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.addCorporateCard = async (req , res) => {
  try {
    const owner_id = req.user._id;
    const {company_id} = req.body
    const data = req.body;

    if(company_id){
      const company = await Company.findById(company_id);
      if(!company) return utils.handleError(res, {message : "Company not found" , code : 404});
    }

    //chech this user i have a card or not 

    const isCardExist = await CardDetials.findOne({owner_id : owner_id});
    
    const card = {
      card_type : 'corporate',
      company_id : company_id,
      card_color :data.card_color,
      bio: {
        first_name : data.bio.first_name,
        last_name : data.bio.last_name,
        full_name : `${data.bio.first_name}${data.bio.last_name ? ` ${data.bio.last_name}` : ""}`,
        designation :data.bio.designation,
      },
      contact_details : {
        country_code : data.contact_details.country_code,
        mobile_number : data.contact_details.mobile_number,
        office_landline : data.contact_details.office_landline,
        email :   data.contact_details.email,
        website:  data.contact_details.website,
      },
      address : {
        country: data.address.country,
        state: data.address.state,
        city: data.address.city,
        address_line_1 : data.address.address_line_1,
        address_line_2 : data.address.address_line_2,
        pin_code : data.address.pin_code,
      },
      social_links : {
        linkedin : data.social_links.linkedin,
        x : data.social_links.x,
        instagram :data.social_links.instagram,
        youtube : data.social_links.youtube,
      },
    }


    if(isCardExist){
      await CardDetials.updateOne({owner_id : owner_id} , card),
      res.json({code : 200 , message : "Company change successfully"})
    }else {
      const cardData = new CardDetials({owner_id,...card})
      await cardData.save()
      await User.findByIdAndUpdate(owner_id , {is_card_created : true , user_type : "corporate" })
      res.json({code : 200 , message : "Card Save successfully"})
    }

  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.getProfile = async (req ,res) => {
  try {
    const user_id = req.user._id;
    console.log("==========user_id",user_id)
    
    const profile = await User.aggregate([
      {
        $match : {
          _id : user_id
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
        $addFields : {
          'card_details.bio.business_name': {
            $cond: {
              if: { $eq: ['$card_details.card_type', 'corporate'] },
              then: '$company.company_name',
              else: '$card_details.bio.business_name'
            }
          },
          'card_details.card_color' : {
            $cond: {
              if: { $eq: ['$card_details.card_type', 'corporate'] },
              then: '$company.card_color',
              else: '$card_details.card_color'
            }
          },
          "card_details.business_logo" :  {
            $cond: {
              if: { $eq: ['$card_details.card_type', 'corporate'] },
              then: '$company.business_logo',
              else: '$card_details.business_logo'
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
        $project : {
          password : 0,
          confirm_password :0 ,
          company : 0
        }
      },
    ])

    res.json({data : profile[0] , code : 200})
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.accountPrivacy = async (req , res) => {
  try {
    const owner_id = req.user._id;
    const card = await CardDetials.findOne({owner_id : owner_id});
  
    if(!card) return res.status(404).json({ code: 404, message: "Card not found." });

    const data = {
      linkedin : card?.social_links?.linkedin_enabled ?? true,
      x: card?.social_links?.x_enabled ?? true,
      instagram : card?.social_links?.instagram_enabled ?? true,
      youtube : card?.social_links?.youtube_enabled ?? true,
      mobile_number : card?.contact_details?.mobile_number_enabled ?? true
    }

    res.json({data : data, code : 200})
  
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.enableOrDisableLink = async (req , res) => {

  try {
    const link_type = req.body.type;
    const owner_id = req.user._id;
    const card = await CardDetials.findOne({owner_id : owner_id});
  
    if(!card) return res.status(404).json({ code: 404, message: "Card not found." });
  
    const dataToUpdate = {}
    if(link_type === "linkedin"){
      const link_status = !(card?.social_links?.linkedin_enabled ?? true);
      dataToUpdate["social_links.linkedin_enabled"] = link_status
    }else if (link_type === "x"){
      const link_status = !(card?.social_links?.x_enabled ?? true);
      dataToUpdate["social_links.x_enabled"] = link_status
    }else if (link_type === "instagram"){
      const link_status = !(card?.social_links?.instagram_enabled ?? true);
      dataToUpdate["social_links.instagram_enabled"] = link_status
    }else if (link_type === "youtube"){
      const link_status = !(card?.social_links?.youtube_enabled ?? true);
      dataToUpdate["social_links.youtube_enabled"] = link_status
    }else if (link_type === "mobile"){
      const link_status = !(card?.contact_details?.mobile_number_enabled ?? true);
      dataToUpdate["contact_details.mobile_number_enabled"] = link_status
    }
    
    await CardDetials.updateOne({owner_id : owner_id} , dataToUpdate);
  
    res.json({code : 200 ,message : "Link status changed successfully"})
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
 
}


exports.getCard = async (req ,res) => {
  try {
    const user_id = req.user._id;
    
    // const profile = await CardDetials.findOne({owner_id : user_id});
    
    const profile = await CardDetials.aggregate([
      {
        $match : {
          owner_id : user_id
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
        $addFields : {
          'bio.business_name': {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.company_name',
              else: '$bio.business_name'
            }
          },
          'card_color' : {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.card_color',
              else: '$card_color'
            }
          },
          'text_color' : {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.text_color',
              else: '$text_color'
            }
          },
          "business_logo" :  {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.business_logo',
              else: '$business_logo'
            }
          },
          "address" :  {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.address',
              else: '$address'
            }
          },
          "website" : {
            $cond: {
              if: { $eq: ['$card_type', 'corporate'] },
              then: '$company.contact_details.website',
              else: '$website'
            }
          },
        }
      },
      {
        $project : {
          company : 0
        }
      }
    ])
    res.json({data : profile[0] , code : 200})
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.getCountries = async (req ,res ) => {
  try {
    const data = Country.getAllCountries();
    res.json({data : data , code : 200})
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.getStates = async (req ,res ) => {
  try {
    console.log("req.query" , req.query)
    var countryCode = req.query.countryCode;

    if(!countryCode){
      const countryName = req.query.countryName
      countryCode  = getCode(countryName)
    }

    const data = State.getStatesOfCountry(countryCode)
    res.json({data : data , code : 200})
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
    console.log("================error",error)
    utils.handleError(res, error);
  }
};


exports.getFAQ = async (req, res) => {
  try {
    const { type } = req.query;
   
    const faqResp = await FAQ.find();

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
    console.log("================error",error)
    utils.handleError(res, error);
  }
};

exports.helpsupport = async (req, res) => {
  try {
    const data = req.body;
    const add = await Support.create(
      data
    );
    res.json({
      code: 200,
      message: add,
    });
  } catch (error) {
    console.log("================error",error)
    utils.handleError(res, error);
  }
};

exports.feedback = async (req, res) => {
  try {
    const data = req.body;
    const user_id = req.user._id;
    const feedback = await Feedback.create(
      data
    );
    res.json({
      code: 200,
      message: feedback,
    });
  } catch (error) {
    console.log("================error",error)
    utils.handleError(res, error);
  }
};


exports.deleteAccount = async (req , res) => {
  try {
    const user_id = req.user._id;

    await User.deleteOne({_id : user_id});
    await CardDetials.deleteOne({owner_id : user_id})

    res.json({message : "Your account is deleted successfully"});
  } catch (error) {
    console.log("================error",error)
    utils.handleError(res, error);
  }
}


exports.addFCMDevice = async (req, res) => {
  try {
    const {device_id ,device_type , token } = req.body;
    const user_id = req.user._id;

    const isDeviceExist = await FCMDevice.findOne({user_id : req.user._id})
    
    if (isDeviceExist) {
      isDeviceExist.token = token;
      await isDeviceExist.save();
    } else {
      const data = {
        user_id : user_id,
        device_id : device_id,
        device_type : device_type,
        token : token,
      }
      const item = new FCMDevice(data);
      await item.save()
    }

    res.json({
      message : "Token added successfully",
      code: 200,
    });
  } catch (error) {
    console.log(error)
    utils.handleError(res, error);
  }
};

exports.deleteFCMDevice = async (req, res) => {
  try {
    const {token} = req.body;
    const user_id = req.user._id;

    const fcmToken = await FCMDevice.findOne({user_id : user_id , token : token })

    if(!fcmToken) return utils.handleError(res, {message : "Token not found" , code : 404});

    await FCMDevice.deleteOne({user_id : user_id , token : token })

    res.json({
      message : "Token deleted successfully",
      code: 200
    });

  } catch (error) {
    console.log(error)
    utils.handleError(res, error);
  }
};


exports.changeNotificaitonSetting = async (req , res) => {
  try {
    const user_id = req.user._id;

    const user = await User.findById(user_id);
    user.notification = !user.notification;
    await user.save()

    res.json({message : `Notificaton ${user.notification ? "enabled" : "disabled"} successfully`, code : 200} )
  } catch (error) {
    utils.handleError(res, error);
  }
}

exports.getNotificationSetting = async (req, res) => {
  try {
    const user_id = req.user._id;

    console.log("running")
    const user = await User.findById(user_id);

    res.json({data :user.notification , code : 200 });
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getNotification = async (req, res) => {
  try {
    const { limit = Number.MAX_SAFE_INTEGER, offset = 0 } = req.body;

    console.log("req.body",req.body)
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
                password : 0,
                confirm_password : 0
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

exports.addNotificaiton = async (req ,res) => {
  try {
    const notificaiton = {
      sender_id : "65d06e7484dbf901a036503d",
      receiver_id : "65d0555ad423a9ee3d97078c",
      type : "card_shared",
      related_to : "65d2f663ca96f633ce13ec82",
      title: "Card Shared",
      body: "Deepak has shared their card",
      is_seen :false,
      is_admin:false
    }

    const createNotification = new Notification(notificaiton);
    await createNotification.save()
    
    res.json({message :"notification saved"})
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
} 