const model = require('../models/user')
const uuid = require('uuid')
const { matchedData } = require('express-validator')
const utils = require('../middleware/utils')
const db = require('../middleware/admin_db')
const APIKey = require('../models/api_keys')
var generator = require('generate-password');
const moment = require("moment")
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
const CMS = require('../models/cms')
const Reset = require("../models/reset_password")
const mongoose = require("mongoose")
const jwt = require('jsonwebtoken')
const { off } = require('process')
const { json } = require('stream/consumers')


const generateToken = (_id, role , remember_me) => {
    // Gets expiration time
  
    const expiration =  Math.floor(Date.now() / 1000) + 60 *(remember_me === true ? process.env.JWT_EXPIRATION_IN_MINUTES_FOR_REMEMBER_ME : process.env.JWT_EXPIRATION_IN_MINUTES);
    
  
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


const saveUserAccessAndReturnToken = async (req, user , remember_me) => {
    return new Promise((resolve, reject) => {
      const userAccess = new UserAccess({
        email : user.email,
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
        token: generateToken(user._id, user.role , remember_me),
        user: user,
        code : 200
      })
      });
    })
  }

exports.addAdmin = async (req, res) => {
    try {
      const data = {
        _id : new mongoose.Types.ObjectId("64b29004376e6cb3d3c6e55c"),
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
  
      console.log("__----USER---", user);
  
      const isPasswordMatch = await auth.checkPassword(data.password, user)
  
      console.log(isPasswordMatch);
  
      if (!isPasswordMatch) {
        return res.status(422).json({
          code: 422,
          errors: {
            msg: "Wrong Password"
          }
        })
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
        res.status(200).json(await saveUserAccessAndReturnToken(req, userObj , data.remember_me))
    //   }
  
    } catch (error) {
      handleError(res, error)
    }
}

exports.forgotPassword = async (req, res) => {

  try {
    const data = req.body;
    console.log("data",data)
    const locale = req.getLocale()
    let user = await Admin.findOne(
      { email: data.email }
    );
    console.log(data)

    if (!user) {
      throw buildErrObject(422, "WRONG_EMAIL");
    }

    const token = uuid.v4();

    const tokenExpirationDuration = 5*60;
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
      email : user.email,
      name: user.name,
      url : data.production === false ? `${process.env.LOCAL_FRONTEND_URL}ui/Resetpassword/${token}` : `${process.env.PRODUCTION_FRONTEND_URL}ui/Resetpassword/${token}`
    }

    console.log("url==============",emailData.url)

    console.log("user",emailData)
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
      return res.status(400).json({ message: 'Invalid or expired reset password token'  , code : 400});
    }

    // Check if the token has expired
    const currentTime = new Date();
    const tokenExpiryTime = new Date(reset.time);
    if (currentTime > tokenExpiryTime) {
      return res.status(400).json({ message: 'Reset password token has expired'  , code : 400});
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

    res.json({ message: 'Password reset successful'  , code : 200});
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
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

exports.getPersonalUser = async (req , res) => {
    try {
        const {sort = -1 , offset = 0 , limit  , search = "" , start_date , end_date} = req.query;

      const condition = {}

      if(search){
        condition["$or"] =  [
          {"card_details.bio.full_name" : { $regex: new RegExp(search, 'i') } },
          {"card_details.contact_details.mobile_number" : { $regex: new RegExp(search, 'i') }},
          {"card_details.bio.business_name" : { $regex: new RegExp(search, 'i') }},
        ]
      }

      if(start_date && end_date){
        condition["createdAt"] = {$gte : new Date(start_date) , $lt : new Date(end_date)}
      }



      const offsetCondtion = []

      if(offset){
        offsetCondtion.push({
            $skip : +offset
        })
      }

      const limitConditon = []
      if(limit){
        limitConditon.push({
            $limit : +limit
        })
      }


      const count = await User.aggregate([
        {
          $match : {
           user_type : "personal",
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
          $match : condition
        },
      ])


        // const users = await User.find({user_type : "personal"} , "-password -confirm_password").sort({createdAt : +sort}).skip(+offset).limit(+limit);

        console.log("condition",condition)
        console.log("offsetCondtion",offsetCondtion)
        const users = await User.aggregate([
          {
            $match : {
             user_type : "personal",
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
            $project : {
              password : 0,
              confirm_password : 0
            }
          },
          {
            $match : condition
          },
          {
            $sort :{
              createdAt : +sort
            }
          },
          ...offsetCondtion,
          ...limitConditon
        ])

        res.json({data : users , count : count.length , code : 200})

    } catch (error) {
      console.log(error)
        handleError(res, error)
    }
}

exports.getCorporateUser = async (req , res) => {
  try {
    const {company_id , search = "" , limit = 10 , offset = 0 , sort = -1 } =req.query;  
    
    const condition ={
      $or : [
        {  "bio.full_name" : { $regex: new RegExp(search, 'i') } },
        {  "contact_details.mobile_number" : { $regex: new RegExp(search, 'i') } },
        {  "bio.designation" : { $regex: new RegExp(search, 'i') } },
        ]
    }


    const count =  await CardDetials.aggregate([
      {
        $match : {
          company_id : mongoose.Types.ObjectId(company_id)
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
        $match : condition
      },
    ])



    const users = await CardDetials.aggregate([
      {
        $match : {
          company_id : mongoose.Types.ObjectId(company_id)
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
        $match : condition
      },
      {
        $sort : {
          "user.createdAt" : +sort
        }
      },
      {
        $skip : +offset
      },
      {
        $limit : +limit
      }
    ])

    res.json({data : users , count: count.length , code : 200})
  } catch (error) {
    console.log(error)
        handleError(res, error)
  }
}

exports.getSingleCardHolder = async (req , res) => {
  try {
    const id = req.params.id

    if(!id) return handleError(res, {message : "User id not found" , code : 404})

    const users = await User.aggregate([ 
      {
        $match : {
          _id : mongoose.Types.ObjectId(id)
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


    res.json({data :users[0] , code : 200 })
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}


exports.addCompany = async (req ,res) => {
  try {

    const data = req.body;

    var password = generator.generate({
      length: 10,
      numbers: true
    });
    
    const emailDomain = extractDomainFromEmail(data.email);
    const dataForCompany = {
      email : data.email,
      access_code : data.access_code,
      password : password,
      decoded_password : password,
      email_domain : emailDomain,
      company_name : data.company_name,
      business_logo : data.business_logo,
      text_color : data.text_color,
      card_color : data.card_color,
      gst_no : data.gst_no,
      contact_details : {
        mobile_number : data.contact_details.mobile_number,
        office_landline : data.contact_details.office_landline,
        email :  data.contact_details.email,
        website: data.contact_details.website,
      },
      address : {
        country:data.address.country,
        state:data.address.state,
        city:data.address.city,
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
    
    const company = new Company(dataForCompany);
    await company.save();

    res.json({message : "Company registered successfully" , code : 200})
    
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}


exports.getCompanyList =async (req, res) => {
  try {

    const {search , limit = 10 , offset = 0 , sort = -1 , start_date , end_date} = req.query;

    const condition = {}

    if(search){
      condition["$or"] = [
        {  company_name : { $regex: new RegExp(search, 'i') } },
        {  email_domain : { $regex: new RegExp(search, 'i') } },
        ]
    }

    if(start_date && end_date){
      condition["createdAt"] = {$gte : new Date(start_date) , $lt : new Date(end_date)}
    }

    const count = await Company.count(condition)
    
    const offsetCondtion = []

    if(offset){
      offsetCondtion.push({
          $skip : +offset
      })
    }

    const limitConditon = []
    if(limit){
      limitConditon.push({
          $limit : +limit
      })
    }

    const company = await Company.aggregate([
      {
        $match : condition
      },
      {
        $project : {
          password : 0,
          decoded_password : 0
        }
      },
      {
        $sort :{
          createdAt : +sort
        }
      },
      ...offsetCondtion,
      ...limitConditon
    ])

    res.json({data : company ,count , code : 200});
  } catch (error) {
    console.log("error" , error)
    handleError(res, error)
  }
}

exports.getSingleCompany = async (req , res) => {
  try {
    const id = req.params.id
    const company = await Company.findById(id);

    if(!company) return 

    res.json({data :company , code : 200 })
  } catch (error) {
    handleError(res, error)
  }
}


exports.dashBoardCard = async (req , res) => {
  try {
    const totalUser = await User.aggregate([
      {
        $lookup : {
          from : "card_details",
          localField : "_id",
          foreignField : "owner_id",
          as : "card"
        }
      },
      {
        $unwind : "$card"
      }
    ]);
    const totalComany = await Company.count({})
    const totalRevenue = 0

    res.json({data : {users : totalUser.length , company : totalComany,  revenue : totalRevenue}  , code : 200})
  } catch (error) {
    console.log(error)
    handleError(res, error)
  }
}


exports.addFaq = async (req , res) => {
  try {
    const {question , answer} = req.body;

    const faq = new FAQ({question , answer});
    await faq.save();

    res.json({message : "FAQ added successfully" , code : 200})
  } catch (error) {
    handleError(res, error)
  }
}

exports.getFaqList = async (req , res) => {
  try {
    const faqs = await FAQ.find({}).sort({createdAt : -1});

    res.json({data : faqs , code : 200})
  } catch (error) {
    handleError(res, error)
  }
}

exports.getSingleFaq = async (req , res) => {
  try {
    
    const id = req.params.id;
    const faq = await FAQ.findById(id);

    res.json({data : faq , code : 200})
  } catch (error) {
    handleError(res, error)
  }
}

exports.deleteFaq = async(req, res) => {
  try {
    const id = req.params.id;

    await FAQ.findByIdAndDelete(id);

    res.json({message : "FAQ deleted successfully" , code : 200})
  } catch (error) {
    handleError(res, error)
  }
}
exports.editFaq = async (req ,res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    await FAQ.findByIdAndUpdate(id , data);

    res.json({message : "FAQ updated successfully" , code : 200})
  } catch (error) {
    handleError(res, error)
  }
}


exports.addCMS = async (req , res) => {
  try {
    const { type , content} = req.body;

    const cmsResp = await CMS.findOne({ type });

    if(cmsResp){
      await CMS.findByIdAndUpdate(cmsResp._id , {content : content})
    }else {
      const data = {
        type : type,
        content : content
      }

      const cms = new CMS(data)
      await cms.save()
    }

    res.json({message : "Content saved successfully" , code : 200})
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
    console.log("================error",error)
    utils.handleError(res, error);
  }
};


exports.getFeedbackList = async(req, res) => {
  try {
    const {limit = 10 , offset = 0 , sort = -1 } = req.query;

    const feedback = await Feedback.find({}).sort({createdAt : +sort}).skip(+offset).limit(+limit);

    res.json({data : feedback , code : 200 })
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getSingleFeedback = async (req , res) => {
  try {
    const id = req.params.id;

    const feedback = await Feedback.findById(id)
    
    res.json({data : feedback , code : 200})
  } catch (error) {
    utils.handleError(res, error);
  }
}


exports.getNotification = async (req, res) => {
  try {
    const { limit = Number.MAX_SAFE_INTEGER, offset = 0 } = req.body;

    const count = await Notification.count({
      is_admin : true ,
    });

    const notification = await Notification.aggregate([
      {
        $match: {
          is_admin : true ,
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



exports.addNewKey = async (req, res) => {

    try{
        const data = req.body;
        // console.log(uuid)
        // validate API key
        if(!uuid.validate(data.api_key)){
            throw utils.buildErrObject(422, "API key not valid")
        }

        await db.createItem(data, APIKey)

        res.json({
            code: 200
        })

    }catch(err){
        utils.handleError(res, err)
    }

}

exports.editNewKey = async (req, res) => {

    try{
        const data = req.body;
        console.log(uuid)
        // validate API key
        if(!uuid.validate(data.api_key)){
            throw utils.buildErrObject(422, "API key not valid")
        }

        await db.updateItem(data.api_key_id, APIKey, data)

        res.json({
            code: 200
        })

    }catch(err){
        utils.handleError(res, err)
    }

}

exports.deleteAPIKey = async (req, res) => {

    try{
        const data = req.params;

        await db.deleteItem(data.api_key_id, APIKey, data)

        res.json({
            code: 200
        })

    }catch(err){
        utils.handleError(res, err)
    }

}

exports.getAPIKeys = async (req, res) => {

    try{
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

    }catch(err){
        utils.handleError(res, err)
    }

}

exports.addKeyDetails = async (req, res) => {
    try{
        const data = req.params;

        const details = await db.getItem(data.api_key_id, APIKey)

        res.json({
            code: 200,
            data: details
        })

    }catch(err){
        utils.handleError(res, err)
    }
}