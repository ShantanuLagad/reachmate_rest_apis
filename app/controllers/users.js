const model = require('../models/user')
const uuid = require('uuid')
const {
  getUserIdFromToken,
  uploadFile,
  uploadFileToLocal,
  uploadFilefromPath,
  capitalizeFirstLetter,
  validateFileSize,
  objectToQueryString,
  uploadExcelFile
} = require("../shared/helpers");
const { convert } = require('convert-svg-to-png');
const cron = require("node-cron");
const { matchedData } = require('express-validator')
const utils = require('../middleware/utils')
const auth = require('../middleware/auth')
const db = require('../middleware/db')
const emailer = require('../middleware/emailer')
const User = require('../models/user')
const CMS = require('../models/cms')
const FAQ = require('../models/faq')
const Feedback = require('../models/feedback')
const Trial = require("../models/trial")
const Otp = require('../models/otp');
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
const Registration = require("../models/registration")
const ContactUs = require("../models/contactUs")
const nodemailer = require('nodemailer');
const XLSX = require('xlsx');
var mongoose = require("mongoose");
const ejs = require("ejs");
var pdf = require("html-pdf");
const puppeteer = require('puppeteer');
const Plan = require("../models/plan")
const Razorpay = require('razorpay');
const moment = require("moment")
const fs = require("fs")
const path = require("path")
const axios = require("axios")
var instance = new Razorpay({
  key_id: process.env.RAZORPAY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
var html_to_pdf = require('html-pdf-node');
const commaNumber = require('comma-number')
const crypto = require('crypto');
const FormData = require('form-data');

const {

  getItemThroughId,
  updateItemThroughId
} = require("../shared/core");
const { stat } = require('fs/promises');
const { subscribe } = require('diagnostics_channel');
const { error } = require('console');
const { start } = require('repl');
const TeamMember = require('../models/teamMember');
const UserAccess = require('../models/userAccess');
const { generateToken } = require('./corporate');
const user_account_log = require('../models/user_account_log');
const forge = require("node-forge");
const { exec } = require("child_process");
const { Readable } = require("stream");
const admin = require('../models/admin');
const fcm_devices = require('../models/fcm_devices');
const admin_notification = require('../models/admin_notification');
const notification = require('../models/notification');
const account_session = require('../models/account_session');
const session_activity = require('../models/session_activity');


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


// cron.schedule("0 15 * * *", async () => {

//   const start_date = moment().add(6, "days")
//   const end_date = moment().add(7, "days")

//   const trail = await Trial.aggregate([
//     {
//       $match: { end_at: { $gte: start_date.toDate(), $lte: end_date.toDate() }, status: "active" }
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "user_id",
//         foreignField: "_id",
//         as: "users",
//       },
//     },
//     {
//       $unwind: {
//         path: "$users",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//     {
//       $lookup: {
//         from: "fcmdevices",
//         localField: "user_id",
//         foreignField: "user_id",
//         as: "device_token"
//       }
//     },
//     {
//       $unwind: {
//         path: "$device_token",
//         preserveNullAndEmptyArrays: true,
//       },
//     },
//   ])


//   const title = "Your Free Trial Ends in 7 Days";
//   const body = "Your free trial is ending in 7 days. Please consider purchasing a subscription to continue enjoying our service"

//   const tokens = []
//   const notificationToCreate = []


//   trail.forEach(element => {

//     const notificationData = {
//       // sender_id: admin_id,
//       receiver_id: element?.user_id,
//       type: "by_admin",
//       title: title,
//       body: body
//     }

//     notificationToCreate.push(notificationData);

//     if (element?.users?.notification && element?.device_token?.token) {
//       tokens.push(element?.device_token?.token)
//     }

//   })

//   console.log("notificationToCreate", notificationToCreate)
//   await Notification.insertMany(notificationToCreate);

//   console.log("tokens", tokens)
//   //push notification
//   if (tokens.length !== 0) {
//     utils.sendPushNotification(tokens, title, body)
//   }




// });

// cron.schedule("*/20 * * * * *", async () => {
cron.schedule("30 3 * * * ", async () => {

  try {

    //to same day
    const same_day = moment().endOf("day").toDate();
    console.log("same_day : ", same_day)
    const todayEndingTrail = await Trial.aggregate(
      [
        {
          $match: { end_at: same_day, status: "active" }
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "users",
          },
        },
        {
          $unwind: "$users",
        },
        {
          $lookup: {
            from: "subscriptions",
            localField: "user_id",
            foreignField: "_id",
            as: "subscription",
          },
        },
        {
          $unwind: {
            path: "$subscription",
            preserveNullAndEmptyArrays: true,
          },
        }
      ]
    )

    for (let index = 0; index < todayEndingTrail.length; index++) {

      const trail = todayEndingTrail[index];


      const isSubscriptionActive = await isSubscriptionActiveOrNot(trail.user_id);

      if (!isSubscriptionActive) {
        emailer.sendReminderEmail({
          subject: "Your Trial Period is Ending Today - Renew Your Subscription",
          email: trail?.users?.email,
          full_name: trail?.users?.full_name,
          day: "today"
        },
          "subscriptionExpiry"
        )
      }

      //user notification
      const userFcmDevices = await fcm_devices.find({ user_id: trail.user_id });
      console.log("userFcmDevices : ", userFcmDevices)
      const notificationMessage = {
        title: 'Trial Period Ending Today',
        description: `Your Trial period is ending today. Please upgrade to premium subscription. Plan ID : ${trail.plan_id}`,
        trial_id: trail._id
      };
      if (userFcmDevices && userFcmDevices.length > 0) {
        userFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const userNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "trial_expired",
          receiver_id: trail.user_id,
          related_to: trail._id,
          related_to_type: "trial",
        };
        const newuserNotification = new notification(userNotificationData);
        console.log("newuserNotification : ", newuserNotification)
        await newuserNotification.save();
      } else {
        console.log(`No active FCM tokens found for user ${trail.user_id}.`);
      }

    }

    //cencelled
    const same_day_start = moment().startOf("day").toDate();
    console.log("same_day_start : ", same_day_start)
    const todayEndingCanceledSubscription = await Subscription.aggregate([
      {
        $match: { end_at: { $gte: same_day_start, $lte: same_day }, status: "cancelled" }
      },
      {
        $sort: {
          createdAt: -1
        }
      }, {
        $limit: 1
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
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
        $lookup: {
          from: "companies",
          localField: "user_id",
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
          users: {
            $ifNull: ["$users", "$company"]
          }
        }
      },
      {
        $match: {
          users: { $exists: true }
        }
      }
    ])

    for (let index = 0; index < todayEndingCanceledSubscription.length; index++) {
      const trail = todayEndingCanceledSubscription[index];

      emailer.sendReminderEmail({
        subject: "Your Subscription is Ending Today - Renew Your Subscription",
        email: trail?.users?.email,
        full_name: trail?.users?.full_name || trail?.users?.bio.full_name,
        day: "today"
      },
        "cancelSubscriptionExpiry"
      )


      //user notification
      const userFcmDevices = await fcm_devices.find({ user_id: trail.user_id });
      console.log("userFcmDevices : ", userFcmDevices)
      const notificationMessage = {
        title: 'Trial Period Ending Today',
        description: `Your Trial period is ending today. Please upgrade to premium subscription. Plan ID : ${trail.plan_id}`,
        trial_id: trail._id
      };
      if (userFcmDevices && userFcmDevices.length > 0) {
        userFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const userNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "trial_expired",
          receiver_id: trail.user_id,
          related_to: trail._id,
          related_to_type: "trial",
        };
        const newuserNotification = new notification(userNotificationData);
        console.log("newuserNotification : ", newuserNotification)
        await newuserNotification.save();
      } else {
        console.log(`No active FCM tokens found for user ${trail.user_id}.`);
      }

    }





    //to send reminder 1 day before
    const one_day = moment().add(1, "days").endOf("day").toDate();
    console.log("one_day : ", one_day)
    const trailEndingInOneDays = await Trial.aggregate([
      {
        $match: { end_at: one_day, status: "active" }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $unwind: "$users",
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "user_id",
          foreignField: "_id",
          as: "subscription",
        },
      },
      {
        $unwind: {
          path: "$subscription",
          preserveNullAndEmptyArrays: true,
        },
      }
    ])

    for (let index = 0; index < trailEndingInOneDays.length; index++) {
      console.log("todayEndingTrailsdfg")
      const trail = trailEndingInOneDays[index];

      const isSubscriptionActive = await isSubscriptionActiveOrNot(trail.user_id);

      if (!isSubscriptionActive) {

        emailer.sendReminderEmail({
          subject: "Your Trial Period is Ending Tommorrow - Renew Your Subscription",
          email: trail?.users?.email,
          full_name: trail?.users?.full_name,
          day: "tommorrow"
        },
          "subscriptionExpiry"
        )

      }


      //user notification
      const userFcmDevices = await fcm_devices.find({ user_id: trail.user_id });
      console.log("userFcmDevices : ", userFcmDevices)
      const notificationMessage = {
        title: 'Trial Period Ending Tomorrow',
        description: `Your Trial period is ending tomorrow. Please upgrade to premium subscription. Plan ID : ${trail.plan_id}`,
        trial_id: trail._id
      };
      if (userFcmDevices && userFcmDevices.length > 0) {
        userFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const userNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "trial_expired",
          receiver_id: trail.user_id,
          related_to: trail._id,
          related_to_type: "trial",
        };
        const newuserNotification = new notification(userNotificationData);
        console.log("newuserNotification : ", newuserNotification)
        await newuserNotification.save();
      } else {
        console.log(`No active FCM tokens found for user ${trail.user_id}.`);
      }

    }

    //cencelled
    const one_day_start = moment().add(1, "day").startOf("day").toDate();
    console.log("one_day_start : ", one_day_start)
    const subscriptionEndingInOneDays = await Subscription.aggregate([
      {
        $match: { end_at: { $gte: one_day_start, $lte: one_day }, status: "cancelled" }
      },
      {
        $sort: {
          createdAt: -1
        }
      }, {
        $limit: 1
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
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
        $lookup: {
          from: "companies",
          localField: "user_id",
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
          users: {
            $ifNull: ["$users", "$company"]
          }
        }
      },
      {
        $match: {
          users: { $exists: true }
        }
      }
    ])

    for (let index = 0; index < subscriptionEndingInOneDays.length; index++) {
      const trail = subscriptionEndingInOneDays[index];

      emailer.sendReminderEmail({
        subject: "Your Subscription is Ending Tommorrow - Renew Your Subscription",
        email: trail?.users?.email,
        full_name: trail?.users?.full_name || trail?.users?.bio.full_name,
        day: "tommorrow"
      },
        "cancelSubscriptionExpiry"
      )


      //user notification
      const userFcmDevices = await fcm_devices.find({ user_id: trail.user_id });
      console.log("userFcmDevices : ", userFcmDevices)
      const notificationMessage = {
        title: 'Trial Period Ending Tomorrow',
        description: `Your Trial period is ending tomorrow. Please upgrade to premium subscription. Plan ID : ${trail.plan_id}`,
        trial_id: trail._id
      };
      if (userFcmDevices && userFcmDevices.length > 0) {
        userFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const userNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "trial_expired",
          receiver_id: trail.user_id,
          related_to: trail._id,
          related_to_type: "trial",
        };
        const newuserNotification = new notification(userNotificationData);
        console.log("newuserNotification : ", newuserNotification)
        await newuserNotification.save();
      } else {
        console.log(`No active FCM tokens found for user ${trail.user_id}.`);
      }

    }







    // //to send reminder 7 days before
    const seven_day = moment().add(6, "days").endOf("day").toDate();
    console.log("seven_day", seven_day)
    const trailEndingInSevenDays = await Trial.aggregate([
      {
        $match: { end_at: seven_day, status: "active" }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "users",
        },
      },
      {
        $unwind: "$users",
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "user_id",
          foreignField: "_id",
          as: "subscription",
        },
      },
      {
        $unwind: {
          path: "$subscription",
          preserveNullAndEmptyArrays: true,
        },
      }
    ])

    for (let index = 0; index < trailEndingInSevenDays.length; index++) {
      console.log("todayEndingTrailsdfg")
      const trail = trailEndingInSevenDays[index];

      const isSubscriptionActive = await isSubscriptionActiveOrNot(trail.user_id);

      if (!isSubscriptionActive) {

        emailer.sendReminderEmail({
          subject: "Your Trial Period Ends in 7 Days - Renew Your Subscription",
          email: trail?.users?.email,
          full_name: trail?.users?.full_name,
          day: "in 7 days"
        },
          "subscriptionExpiry"
        )

      }

      //user notification
      const userFcmDevices = await fcm_devices.find({ user_id: trail.user_id });
      console.log("userFcmDevices : ", userFcmDevices)
      const notificationMessage = {
        title: 'Trial Period Ending within 7 days',
        description: `Your Trial period is ending within 7 days. Please upgrade to premium subscription. Plan ID : ${trail.plan_id}`,
        trial_id: trail._id
      };
      if (userFcmDevices && userFcmDevices.length > 0) {
        userFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const userNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "trial_expired",
          receiver_id: trail.user_id,
          related_to: trail._id,
          related_to_type: "trial",
        };
        const newuserNotification = new notification(userNotificationData);
        console.log("newuserNotification : ", newuserNotification)
        await newuserNotification.save();
      } else {
        console.log(`No active FCM tokens found for user ${trail.user_id}.`);
      }
    }

    //cencelled
    const seven_day_start = moment().add(6, "days").startOf("day").toDate();
    console.log("seven_day_start : ", seven_day_start)
    const subscriptionEndingInSevenDays = await Subscription.aggregate([
      {
        $match: { end_at: { $gte: seven_day_start, $lte: seven_day }, status: "cancelled" }
      },
      {
        $sort: {
          createdAt: -1
        }
      }, {
        $limit: 1
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
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
        $lookup: {
          from: "companies",
          localField: "user_id",
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
          users: {
            $ifNull: ["$users", "$company"]
          }
        }
      },
      {
        $match: {
          users: { $exists: true }
        }
      }
    ])

    for (let index = 0; index < subscriptionEndingInSevenDays.length; index++) {
      const trail = subscriptionEndingInSevenDays[index];

      emailer.sendReminderEmail({
        subject: "Your Subscription Ends in 7 Days - Renew Your Subscription",
        email: trail?.users?.email,
        full_name: trail?.users?.full_name || trail?.users?.bio.full_name,
        day: "in 7 days"
      },
        "cancelSubscriptionExpiry"
      )


      //user notification
      const userFcmDevices = await fcm_devices.find({ user_id: trail.user_id });
      console.log("userFcmDevices : ", userFcmDevices)
      const notificationMessage = {
        title: 'Trial Period Ending within 7 days',
        description: `Your Trial period is ending within 7 days. Please upgrade to premium subscription. Plan ID : ${trail.plan_id}`,
        trial_id: trail._id
      };
      if (userFcmDevices && userFcmDevices.length > 0) {
        userFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const userNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "trial_expired",
          receiver_id: trail.user_id,
          related_to: trail._id,
          related_to_type: "trial",
        };
        const newuserNotification = new notification(userNotificationData);
        console.log("newuserNotification : ", newuserNotification)
        await newuserNotification.save();
      } else {
        console.log(`No active FCM tokens found for user ${trail.user_id}.`);
      }

    }


    // //to send reminder 15 days before
    const fifteen_day = moment().add(14, "days").endOf("day").toDate();
    console.log("fifteen_day : ", fifteen_day)
    const trailEndingInFifteenDays = await Trial.aggregate([
      {
        $match: { end_at: fifteen_day, status: "active" }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
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
        $lookup: {
          from: "subscriptions",
          localField: "user_id",
          foreignField: "_id",
          as: "subscription",
        },
      },
      {
        $unwind: "$users",
      },
    ])

    for (let index = 0; index < trailEndingInFifteenDays.length; index++) {

      const trail = trailEndingInFifteenDays[index];

      const isSubscriptionActive = await isSubscriptionActiveOrNot(trail.user_id);

      if (!isSubscriptionActive) {
        emailer.sendReminderEmail({
          subject: "Your Trial Period Ends in 15 Days - Renew Your Subscription",
          email: trail?.users?.email,
          full_name: trail?.users?.full_name,
          day: "in 15 days"
        },
          "subscriptionExpiry"
        )
      }
      //user notification
      const userFcmDevices = await fcm_devices.find({ user_id: trail.user_id });
      console.log("userFcmDevices : ", userFcmDevices)
      const notificationMessage = {
        title: 'Trial Period Ending within 15 days',
        description: `Your Trial period is ending within 15 days. Please upgrade to premium subscription. Plan ID : ${trail.plan_id}`,
        trial_id: trail._id
      };
      if (userFcmDevices && userFcmDevices.length > 0) {
        userFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const userNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "trial_expired",
          receiver_id: trail.user_id,
          related_to: trail._id,
          related_to_type: "trial",
        };
        const newuserNotification = new notification(userNotificationData);
        console.log("newuserNotification : ", newuserNotification)
        await newuserNotification.save();
      } else {
        console.log(`No active FCM tokens found for user ${trail.user_id}.`);
      }
    }

    //cencelled
    const fifteen_day_start = moment().add(14, "days").startOf("day").toDate();
    console.log("fifteen_day_start : ", fifteen_day_start)
    const subscriptionEndingInifteenDays = await Subscription.aggregate([
      {
        $match: { end_at: { $gte: fifteen_day_start, $lte: fifteen_day }, status: "cancelled" }
      },
      {
        $sort: {
          createdAt: -1
        }
      }, {
        $limit: 1
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
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
        $lookup: {
          from: "companies",
          localField: "user_id",
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
          users: {
            $ifNull: ["$users", "$company"]
          }
        }
      },
      {
        $match: {
          users: { $exists: true }
        }
      }
    ])

    for (let index = 0; index < subscriptionEndingInifteenDays.length; index++) {
      const trail = subscriptionEndingInifteenDays[index];

      emailer.sendReminderEmail({
        subject: "Your Subscription Ends in 15 Days - Renew Your Subscription",
        email: trail?.users?.email,
        full_name: trail?.users?.full_name || trail?.users?.bio.full_name,
        day: "in 15 days"
      },
        "cancelSubscriptionExpiry"
      )

      //user notification
      const userFcmDevices = await fcm_devices.find({ user_id: trail.user_id });
      console.log("userFcmDevices : ", userFcmDevices)
      const notificationMessage = {
        title: 'Trial Period Ending within 15 days',
        description: `Your Trial period is ending within 15 days. Please upgrade to premium subscription. Plan ID : ${trail.plan_id}`,
        trial_id: trail._id
      };
      if (userFcmDevices && userFcmDevices.length > 0) {
        userFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const userNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "trial_expired",
          receiver_id: trail.user_id,
          related_to: trail._id,
          related_to_type: "trial",
        };
        const newuserNotification = new notification(userNotificationData);
        console.log("newuserNotification : ", newuserNotification)
        await newuserNotification.save();
      } else {
        console.log(`No active FCM tokens found for user ${trail.user_id}.`);
      }

    }

  } catch (error) {
    console.log("error", error)
  }

});

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

const transporter = nodemailer.createTransport({
  from: "nodeteamemail@gmail.com",
  host: "smtp.gmail.com",
  secureConnection: true,
  port: 465,
  transportMethod: "SMTP",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
});

function sendInvoiceEmail(mailOptions) {
  console.log("mailOptions : ", mailOptions)
  return new Promise(async (resolve, reject) => {
    try {
      var ejsFile = "./views/invoiceEmail.ejs";

      const emailBody = await ejs.renderFile(ejsFile, mailOptions);
      console.log("emailBody : ", emailBody)

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

function sendInvoiceEmailForTransaction(mailOptions) {

  return new Promise(async (resolve, reject) => {
    try {
      var ejsFile = "./views/en/invoide-email.ejs";

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

  const checkIsTrialExits = await Trial.findOne({ user_id });
  console.log('endd date>>', checkIsTrialExits?.end_at)
  if (checkIsTrialExits && checkIsTrialExits?.end_at > new Date() && checkIsTrialExits?.status === "active") {
    return true
  }

  const subcription = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });

  console.log("subcription", subcription, 'subcription.end_at', subcription?.end_at, 'subcription.status', subcription?.status)
  if (!subcription) return false
  if (subcription?.status === "created") return false
  if (subcription?.end_at < new Date()) return false
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
    console.log("req.files.media.mimetype", req.files.media.mimetype)
    console.log(req.files.media)

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

// exports.uploadUserMediaForIOS = async (req, res) => {
//   try {
//     if (!req.files.media || !req.body.path) {
//       // check if image and path missing
//       return res.status(422).json({
//         code: 422,
//         message: "MEDIA OR PATH MISSING",
//       });
//     }


//     return res.status(200).json({
//       code: 200,
//       data: media,
//     });
//   } catch (error) {
//     console.log(error)
//     utils.handleError(res, error)
//   }
// };


exports.uploadUserMediaForIOS = async (req, res) => {
  try {
    if (!req.files.media || !req.body.path) {
      // check if image and path missing
      return res.status(422).json({
        code: 422,
        message: "MEDIA OR PATH MISSING",
      });
    }

    const apiKey = process.env.REMOVE_BG_KEY;
    const files = req.files;
    console.log("files are---", files);

    var FormData = require('form-data');
    var fs = require('fs');

    const formData = new FormData();
    formData.append('size', 'auto');
    formData.append('image_file', files.media.data, files.media.name);
    // var file_name = Date.now() + files.media.name;
    const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
      responseType: 'arraybuffer',
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': apiKey,
      },
      encoding: null
    });

    if (response.status !== 200) {
      return res.status(response.status).json({ error: 'Remove.bg API error' });
    }

    req.files.media.data = response.data

    let media = await uploadFile({
      file: req.files.media,
      path: `${process.env.STORAGE_PATH}/${req.body.path}`,
    });

    media = `${req.body.path}/${media}`

    return res.status(200).json({
      code: 200,
      data: media,
    });
  } catch (err) {
    console.log("error occurred here---", err);
    utils.handleError(res, err);
  }
}


// const svg2img = require('svg2img');

// exports.uploadUserMedia = async (req, res) => {
//   try {
//     if (!req.files.media || !req.body.path) {
//       // Check if image and path are missing
//       return res.status(422).json({
//         code: 422,
//         message: "MEDIA OR PATH MISSING",
//       });
//     }

//     console.log("req.files.media.mimetype" ,req.files.media.mimetype)
//     // Check if the uploaded file is SVG
//     if (req.files.media.mimetype === 'image/svg+xml') {
//       // Convert SVG to PNG
//       const svgBuffer = req.files.media.data;
//       svg2img(svgBuffer, async function(error, pngBuffer) {
//         if (error) {
//           console.error('Error converting SVG to PNG:', error);
//           return res.status(500).json({
//             code: 500,
//             message: "Error converting SVG to PNG",
//           });
//         }

//         console.log("svgBuffer" ,svgBuffer)
//         req.files.media.data = svgBuffer;
//         req.files.media.name = req.files.media.name.replace('.svg', '.png');

//         console.log("req.files.media.name" ,req.files.media.name)
//         // // Write the PNG buffer to file
//         // const filePath = `${process.env.STORAGE_PATH}/${req.body.path}`;
//         // const fileName = req.files.media.name.replace('.svg', '.png');


//         // fs.writeFileSync(`${filePath}/${fileName}`, pngBuffer);

//         // Construct the path to the PNG file
//         let media = await uploadFile({
//           file: req.files.media,
//           path: `${process.env.STORAGE_PATH}/${req.body.path}`,
//         });

//         media = `${req.body.path}/${media}`;

//         return res.status(200).json({
//           code: 200,
//           data: media,
//         });
//       });
//     } else {
//       // If the uploaded file is not SVG, proceed with regular file upload logic
//       let media = await uploadFile({
//         file: req.files.media,
//         path: `${process.env.STORAGE_PATH}/${req.body.path}`,
//       });

//       media = `${req.body.path}/${media}`;

//       return res.status(200).json({
//         code: 200,
//         data: media,
//       });
//     }
//   } catch (error) {
//     console.log(error);
//     utils.handleError(res, error);
//   }
// };
// exports.uploadUserMedia = async (req, res) => {
//   try {
//     if (!req.files.media || !req.body.path) {
//       // check if image and path missing
//       return res.status(422).json({
//         code: 422,
//         message: "MEDIA OR PATH MISSING",
//       });
//     }

//     let media = req.files.media;

//     // Check if the uploaded file is an SVG
//     if (media.mimetype === 'image/svg+xml') {
//       // Convert SVG to PNG
//       const pngBuffer = await convert(media.data, {
//         width: 200, // Specify width of PNG image
//         height: 200, // Specify height of PNG image
//       });
//       media = {
//         data: pngBuffer,
//         mimetype: 'image/png',
//       };
//     }

//     // Upload the media file
//     let uploadedMedia = await uploadFile({
//       file: media,
//       path: `${process.env.STORAGE_PATH}/${req.body.path}`,
//     });

//     uploadedMedia = `${req.body.path}/${uploadedMedia}`;

//     return res.status(200).json({
//       code: 200,
//       data: uploadedMedia,
//     });
//   } catch (error) {
//     console.log(error);
//     utils.handleError(res, error);
//   }
// };


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


exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ code: 400, message: "Both oldPassword and newPassword are required." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ code: 404, message: "User not found." });
    }

    const isPasswordMatch = await auth.checkPassword(oldPassword, user)
    if (!isPasswordMatch) {
      return res.status(401).json({ code: 401, message: "Old password is incorrect." });

    } else {


      user.password = newPassword;
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

      res.json({ code: 200, message: "Password changed successfully." });
    }


  } catch (error) {
    console.log("error occurred here in change password: ", error);
    utils.handleError(res, error);
  }
};

exports.addSharedCard = async (req, res) => {
  try {

    const isSubscriptionActive = await isSubscriptionActiveOrNot(req.user);
    if (isSubscriptionActive === false) return utils.handleError(res, { message: "Your subscription has expired. Please renew to continue accessing our services", code: 400 });

    const { card_id } = req.body;
    const user_id = req.user._id;
    console.log("user_id : ", user_id, " card_id : ", card_id)

    const user1 = await User.findById(user_id);
    console.log("user1 : ", user1)

    let activeSubscription = await Subscription.findOne({ user_id: user_id, status: "active" })
    console.log("activeSubscription : ", activeSubscription)

    if (!activeSubscription) {
      activeSubscription = await Trial.findOne({ user_id: user_id, status: "active" })
      console.log("activeSubscription : ", activeSubscription)
    }

    if (activeSubscription) {
      const plandata = await Plan.findOne({ plan_id: activeSubscription.plan_id })
      console.log("plandata : ", plandata)
      if (plandata.plan_variety === "freemium") {
        const totalSharedCard = await SharedCards.countDocuments({ user_id })
        console.log("totalSharedCard : ", totalSharedCard)
        if (totalSharedCard >= 10) {
          return res.status(403).json({
            message: "You have reached the maximum limit of freemium plan",
            code: 403
          })
        } else {
          if (Array.isArray(user1?.personal_cards) && Array.isArray(user1?.companyAccessCardDetails)) {
            if (user1?.personal_cards?.length >= 5 && user1?.companyAccessCardDetails?.length >= 5) {
              return res.status(403).json({
                message: "You have reached the maximum limit of freemium plan",
                code: 403
              })
            }
          }
        }
      }
    }

    //chech the user have a card and get user card id
    let userCard = await CardDetials.findOne({ _id: card_id })
    console.log("userCard : ", userCard)
    // if (!userCard) {
    //   let userCard = await Company.findOne({ _id: card_id })
    //   console.log("userCard : ", userCard)
    // }
    if (!userCard) {
      return utils.handleError(res, { message: "Your card not found", code: 404 });
    }

    const your_card_id = userCard._id;
    console.log("your_card_id : ", your_card_id)

    // Fetch card details to get the owner_id
    console.log("card_id : ", card_id)

    const carddetails = await getItemThroughId(CardDetials, card_id);
    // const carddetails = await CardDetials.findOne({ _id: card_id })
    console.log("Card details are---", carddetails.data)

    if (!carddetails || carddetails === null) {
      return utils.handleError(res, { message: "Shared card not found", code: 404 });
    }

    const card_owner_id = carddetails.data.owner_id;
    const user2 = await User.findById(card_owner_id);
    console.log("user2 : ", user2)

    // Check if user is trying to add their own card
    if (user_id.equals(card_owner_id)) {
      return res.status(400).json({ code: 400, message: "You cannot add your own card." });
    }

    // Check if shared card already exists
    const existingSharedCard = await SharedCards.findOne({ card_id, user_id, card_owner_id });
    console.log("existingSharedCard : ", existingSharedCard)

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


    let card_owner_subscription = await Subscription.findOne({ user_id: card_owner_id, status: "active" })
    console.log("card_owner_subscription : ", card_owner_subscription)

    if (!card_owner_subscription) {
      card_owner_subscription = await Trial.findOne({ user_id: card_owner_id, status: "active" })
      console.log("card_owner_subscription : ", card_owner_subscription)
    }

    const notificationUser2 = {
      sender_id: user_id,
      receiver_id: card_owner_id,
      type: "card_shared",
      title: "Business Card Shared",
      body: `${userCard?.bio?.full_name} has shared their business card`
    }

    const notificationUser1 = {
      sender_id: card_owner_id,
      receiver_id: user_id,
      type: "card_shared",
      title: "Business Card Shared",
      body: `${carddetails?.data?.bio?.full_name} has shared their business card`
    }


    if (card_owner_subscription) {
      const plandata = await Plan.findOne({ plan_id: card_owner_subscription.plan_id })
      console.log("plandata : ", plandata)
      if (plandata.plan_variety === "premium") {
        const isOppositeSieCardAlreadyExist = await SharedCards.findOne({ card_id: your_card_id, user_id: card_owner_id, card_owner_id: user_id });

        if (!isOppositeSieCardAlreadyExist) {

          const shareCardToOppositeSide = new SharedCards({
            card_id: your_card_id,
            user_id: card_owner_id,
            card_owner_id: user_id,
          })

          await shareCardToOppositeSide.save();
        }

        const saveNotificationForUser1 = new Notification(notificationUser1)
        await saveNotificationForUser1.save()


        if (user2.notification) {
          const device_token = await FCMDevice.findOne({ user_id: user2._id })
          console.log("device_token2", device_token)
          if (!device_token) return
          utils.sendPushNotification([device_token.token], notificationUser2.title, notificationUser2.body)
        }
      }
      const fremiumNotification = {
        sender_id: card_owner_id,
        receiver_id: user_id,
        type: "need_subscription_upgrade",
        title: "Need to Upgrade your plan",
        body: `${carddetails?.data?.bio?.full_name} has shared their business card but due to your Freemium Subscription you can't received it. Please upgrade your plan`
      }

      const saveFreemiumNotification = new Notification(fremiumNotification)
      await saveFreemiumNotification.save()


      if (user2.notification) {
        const device_token = await FCMDevice.findOne({ user_id: user2._id })
        console.log("device_token2", device_token)
        if (!device_token) return
        utils.sendPushNotification([device_token.token], fremiumNotification.title, fremiumNotification.body)
      }
    }

    if (user1.notification) {
      const device_token = await FCMDevice.findOne({ user_id: user_id })
      console.log("device_token1", device_token)
      if (!device_token) return
      utils.sendPushNotification([device_token.token], notificationUser1.title, notificationUser1.body)
    }


    const saveNotificationForUser2 = new Notification(notificationUser2)
    await saveNotificationForUser2.save()


    const user1accountlog = await user_account_log.create({
      user_id: user1?._id,
      action: `Card Scanned of ${user2?.full_name}`,
      previous_status: `Card Scanned of ${user2?.full_name}`,
      new_status: `Card Scanned of ${user2?.full_name}`,
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("user1accountlog : ", user1accountlog)

    const user2accountlog = await user_account_log.create({
      user_id: user2?._id,
      action: `Card Scanned by ${user1?.full_name}`,
      previous_status: `Card Scanned by ${user1?.full_name}`,
      new_status: `Card Scanned by ${user1?.full_name}`,
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("user2accountlog : ", user2accountlog)


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

    console.log("user_id : ", user_id)
    // Validate if user_id is provided
    if (!user_id) {
      return res.status(400).json({ code: 400, message: "User ID is required." });
    }

    const user = await User.findById(user_id);
    let activeSubscription = await Subscription.findOne({ user_id, status: "active" })
    console.log("activeSubscription : ", activeSubscription)

    if (!activeSubscription) {
      activeSubscription = await Trial.findOne({ user_id, status: "active" })
      console.log("activeSubscription : ", activeSubscription)
    }

    // const isSubscriptionActive = await isSubscriptionActiveOrNot(user);
    if (!activeSubscription) return utils.handleError(res, { message: "Your subscription has expired. Please renew to continue accessing our services", code: 400 });

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
    const sharedCards = await SharedCards.aggregate(
      [
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
            "cardDetails.business_and_logo_status": {
              $cond: {
                if: { $eq: ['$cardDetails.card_type', 'corporate'] },
                then: '$company.business_and_logo_status',
                else: '$cardDetails.business_and_logo_status'
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
          $addFields: {
            "cardDetails.social_links": {
              $cond: {
                if: {
                  $eq: [
                    new mongoose.Types.ObjectId(user_id),
                    "$card_owner_id"
                  ]
                },
                then: "$cardDetails.social_links",
                else: {
                  linkedin: {
                    $cond: {
                      if: {
                        $eq: [
                          "$cardDetails.social_links.linkedin_enabled",
                          true
                        ]
                      },
                      then: "$cardDetails.social_links.linkedin",
                      else: null
                    }
                  },
                  linkedin_enabled: "$cardDetails.social_links.linkedin_enabled",
                  instagram: {
                    $cond: {
                      if: {
                        $eq: [
                          "$cardDetails.social_links.instagram_enabled",
                          true
                        ]
                      },
                      then: "$cardDetails.social_links.instagram",
                      else: null
                    }
                  },
                  instagram_enabled: "$cardDetails.social_links.instagram_enabled",
                  youtube: {
                    $cond: {
                      if: {
                        $eq: [
                          "$cardDetails.social_links.youtube_enabled",
                          true
                        ]
                      },
                      then: "$cardDetails.social_links.youtube",
                      else: null
                    }
                  },
                  youtube_enabled: "$cardDetails.social_links.youtube_enabled",
                  x: {
                    $cond: {
                      if: {
                        $eq: [
                          "$cardDetails.social_links.x_enabled",
                          true
                        ]
                      },
                      then: "$cardDetails.social_links.x",
                      else: null
                    }
                  },
                  x_enabled: "$cardDetails.social_links.x_enabled"
                }
              }
            }
          }
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
      ]
    );

    res.json({ code: 200, sharedCards });
  } catch (error) {
    console.log("error occurred---", error);
    utils.handleError(res, error);
  }
};

/*******APIs by Gagan ends here*********/

exports.addPersonalCard = async (req, res) => {
  try {
    const user = req.user
    console.log('USerrr', user)
    const owner_id = req.user._id;

    let activeSubscription = await Subscription.findOne({ user_id: owner_id, status: "active" })
    console.log("activeSubscription : ", activeSubscription)

    if (!activeSubscription) {
      activeSubscription = await Trial.findOne({ user_id: owner_id, status: "active" })
      console.log("activeSubscription : ", activeSubscription)
      if (activeSubscription && req.body.qr_logo) {
        return res.status(403).json({
          message: "Customized QR code is not allowed for trial users.",
          code: 403
        })
      }
    }

    if (activeSubscription) {
      const plandata = await Plan.findOne({ plan_id: activeSubscription.plan_id })
      console.log("plandata : ", plandata, " plandata.plan_variety : ", plandata.plan_variety)
      if (plandata.plan_variety === "freemium") {
        console.log("user?.personal_cards?.length : ", user?.personal_cards?.length)
        if (user?.personal_cards?.length >= 1) {
          return res.status(403).json({
            message: "You have reached the maximum limit of freemium plan",
            code: 403
          })
        }
      }
    }

    const isFirstCard = user.personal_cards.length === 0 && user.companyAccessCardDetails.length === 0 && user.ocr_cards.length === 0;
    console.log('cardd is first card', isFirstCard)

    const data = req.body;
    const card = {
      owner_id,
      card_type: 'personal',
      business_logo: data.business_logo,
      qr_logo: data.qr_logo,
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
      },
      primary_card: isFirstCard,
    }
    const cardData = new CardDetials(card)
    await cardData.save()

    console.log('added card>>>>>', cardData)

    //--------------------------------------
    await User.findByIdAndUpdate(owner_id, {
      $push: { personal_cards: cardData._id },
    });

    await User.findByIdAndUpdate(owner_id, { is_card_created: true, user_type: "personal", text_color: data.text_color })

    await giveTrialIfNotGive(owner_id)

    await SavedCard.deleteOne({ owner_id: owner_id })

    const accountlog = await user_account_log.create({
      user_id: owner_id,
      action: 'Personal Card Added',
      previous_status: 'Personal Card Added',
      new_status: 'Personal Card Added',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)


    return res.json({
      code: 200, message: "Card Save successfully",
      cardData: cardData
    })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.editCardDetails = async (req, res) => {
  try {
    const owner_id = req.user._id;
    console.log("owner id : ", owner_id)
    const card_id = req.body._id;
    const data = req.body;
    const type = req.body.cardType;
    console.log("req.body : ", req.body)

    if (!card_id) {
      return res.status(400).json({ code: 400, message: "Card ID (_id) is required." });
    }

    let model = null;
    let existingEntity = null;
    let companyTeammate

    if (type === "individual") {
      existingEntity = await CardDetials.findOne({ _id: card_id, owner_id });
      model = CardDetials;
    } else if (type === "corporate") {
      existingEntity = await CardDetials.findOne({ _id: card_id, owner_id });
      if (!existingEntity) {
        existingEntity = await Company.findOne({ _id: card_id });
        const company_employee = await TeamMember.find({ 'company_details.company_id': existingEntity._id })
        companyTeammate = company_employee.find(i => {
          if (i.work_email) {
            if (i.work_email.toString() === (req?.body?.contact_details?.email?.toString() || req?.body?.bio?.work_email?.toString())) return i
          }
          return false;
        })

        console.log("companyTeammate : ", companyTeammate);
        model = Company;
      }
    } else {
      return res.status(400).json({ code: 400, message: "Invalid type. Allowed values: 'individual', 'corporate'." });
    }

    if (!existingEntity) {
      return res.status(404).json({ code: 404, message: "Entity not found" });
    }

    for (const field in data) {
      if (field === 'bio') {
        for (const bioField in data.bio) {
          if (!companyTeammate) {
            existingEntity.bio[bioField] = data.bio[bioField];
          } else {
            companyTeammate[bioField] = data.bio[bioField];
          }
        }
      } else if (field === 'contact_details') {
        for (const contactField in data.contact_details) {
          existingEntity.contact_details[contactField] = data.contact_details[contactField];
        }
      } else if (field === 'address') {
        for (const addressField in data.address) {
          existingEntity.address[addressField] = data.address[addressField];
        }
      } else if (field === 'social_links') {
        for (const socialField in data.social_links) {
          existingEntity.social_links[socialField] = data.social_links[socialField];
        }
      } else {
        existingEntity[field] = data[field];
      }
    }
    if (existingEntity.bio) {
      existingEntity.bio.full_name = `${existingEntity.bio.first_name}${existingEntity.bio.last_name ? ` ${existingEntity.bio.last_name}` : ""}`;
    }
    console.log("existingEntity : ", existingEntity, " companyTeammate : ", companyTeammate)
    if (companyTeammate) {
      await companyTeammate.save()
    }
    await existingEntity.save();

    const accountlog = await user_account_log.create({
      user_id: owner_id,
      action: `${type} card edited`,
      previous_status: `${type} card edited`,
      new_status: `${type} card edited`,
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    res.json({ code: 200, message: `${type === "corporate" ? "Company" : "Individual"} updated successfully` });

  } catch (error) {
    console.error(error);
    utils.handleError(res, error);
  }
};

exports.getCardAndUserDetails = async (req, res) => {
  try {
    const owner_id = req.user._id; // Logged-in user's ID
    const card_id = req.params.card_id; // Card ID from request params

    if (!card_id) {
      return res.status(400).json({ code: 400, message: "Card ID (card_id) is required." });
    }

    // Fetch user details (excluding sensitive fields like password)
    const user = await User.findById(owner_id).select("-password -confirm_password");

    if (!user) {
      return res.status(404).json({ code: 404, message: "Logged-in user not found." });
    }

    // Determine the type of card and retrieve details
    let cardDetails = await CardDetials.findOne({ _id: card_id, owner_id });
    let cardType = "individual";

    if (!cardDetails) {
      cardDetails = await Company.findOne({ _id: card_id });
      cardType = "corporate";
    }

    if (!cardDetails) {
      return res.status(404).json({ code: 404, message: "Card not found." });
    }

    // Format the response
    const response = {
      user: {
        _id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        full_name: user.full_name,
        profile_image: user.profile_image,
        user_type: user.user_type,
        createdAt: user.createdAt,
      },
      card: {
        _id: cardDetails._id,
        cardType,
        owner_id: cardDetails.owner_id,
        bio: cardDetails.bio || {},
        contact_details: cardDetails.contact_details || {},
        address: cardDetails.address || {},
        social_links: cardDetails.social_links || {},
        createdAt: cardDetails.createdAt,
        updatedAt: cardDetails.updatedAt,
      },
    };

    res.status(200).json({ code: 200, message: "Card and user details retrieved successfully.", data: response });
  } catch (error) {
    console.error("Error in getCardAndUserDetails API:", error);
    utils.handleError(res, error);
  }
};




exports.makeIndividualCardPrimary = async (req, res) => {
  try {
    const owner_id = req.user._id;
    console.log("owner id : ", owner_id)
    const card_id = req.body._id; // company id
    console.log("card id : ", card_id)
    if (!card_id) return res.status(400).json({ code: 400, message: "Card ID (_id) is required." });
    const existingCard = await CardDetials.findOne({ _id: card_id, owner_id });
    console.log("existingCard : ", existingCard)
    let existingAccessCard;
    if (!existingCard) {
      existingAccessCard = await Company.findOne({ _id: card_id });
      console.log("existingAccessCard : ", existingAccessCard)
      if (!existingAccessCard) {
        return res.status(404).json({ code: 404, message: "Card not found" });
      }
    }
    await CardDetials.updateMany(
      { owner_id, _id: { $ne: card_id } },
      { $set: { primary_card: false } }
    );
    await Company.updateMany(
      { _id: { $ne: card_id } },
      { $set: { primary_card: false } }
    );
    if (existingCard) {
      existingCard.primary_card = true;
      await existingCard.save();
    } else if (existingAccessCard) {
      existingAccessCard.primary_card = true;
      await existingAccessCard.save();
    }

    const accountlog = await user_account_log.create({
      user_id: owner_id,
      action: 'Individual Card become primary',
      previous_status: 'Individual Card become primary',
      new_status: 'Individual Card become primary',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    res.json({ code: 200, message: "Primary card updated successfully" });
  } catch (error) {
    console.error("Error updating primary card:", error);
    utils.handleError(res, error);
  }
};

const generateNumericOTP = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

exports.matchAccessCode = async (req, res) => {
  try {
    const { email, access_code } = req.body;
    const userId = req.user._id;
    //console.log('USER>>>',req.user)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ errors: { msg: 'User not found.' } });
    }

    let activeSubscription = await Subscription.findOne({ user_id: userId, status: "active" })
    console.log("activeSubscription : ", activeSubscription)

    if (!activeSubscription) {
      activeSubscription = await Trial.findOne({ user_id: userId, status: "active" })
      console.log("activeSubscription : ", activeSubscription)
    }

    if (activeSubscription) {
      const plandata = await Plan.findOne({ plan_id: activeSubscription.plan_id })
      console.log("plandata : ", plandata)
      console.log("plandata?.plan_variety : ", plandata?.plan_variety)
      if (plandata?.plan_variety === "freemium") {
        console.log("plandata?.plan_variety : ", plandata?.plan_variety)
        if (user?.companyAccessCardDetails?.length >= 1) {
          return res.status(403).json({
            message: "You have reached the maximum limit of freemium plan",
            code: 403
          })
        }
      }
    }

    const checkTeamSize = await TeamMember.find({ 'company_details.access_code': access_code })
    console.log("checkTeamSize : ", checkTeamSize)
    // if (checkTeamSize.length >= 1) {
    //   return res.status(403).json({
    //     message: "Only one Team can be created on access code",
    //     code: 403
    //   })
    // }

    const email_domain = extractDomainFromEmail(email) || email.split('@')[1];
    console.log("email_domain : ", email_domain)

    if (user && Array.isArray(user.companyAccessCardDetails) && user.companyAccessCardDetails.length !== 0) {
      const isSameDomainExists = await user.companyAccessCardDetails.find(i => i.email_domain.toString() === email_domain.toString())
      console.log("isSameDomainExists : ", isSameDomainExists)

      if (isSameDomainExists) {
        return utils.handleError(res, { message: "Email and Access Code Already used", code: 404 });
      }
    }

    const company = await Company.findOne({ email_domain }, { password: 0, decoded_password: 0 })
    if (!company) return utils.handleError(res, { message: "Company not found", code: 404 });
    if (company.access_code !== access_code) return utils.handleError(res, { message: "Invalid Access Code", code: 400 });
    //----------
    const isTeamMemberExist = await TeamMember.findOne({ work_email: email })
    if (!isTeamMemberExist) return utils.handleError(res, { message: "Email does not exist", code: 404 });

    const otp = generateNumericOTP();

    await Otp.deleteMany({ email });
    const otpData = new Otp({ email, otp });
    await otpData.save();

    await emailer.sendAccessCodeOTP_Email(req.body.locale || 'en', {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: email,
      otp: otp,
    }, "matchAccessCodeOTP");
    res.status(200).json({
      code: 200,
      message: 'OTP sent successfully!'
    });
  } catch (error) {
    utils.handleError(res, error)

  }
};







exports.verifyOtpAndFetchCompany = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const userId = req.user._id;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' });
    }

    const otpRecord = await Otp.findOne({ email }).sort({ createdDate: -1 });
    if (!otpRecord) {
      return res.status(404).json({ message: 'OTP not found or already used.' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (Date.now() > otpRecord.expired) {
      return res.status(400).json({ message: 'This OTP has expired.' });
    }

    const emailDomain = email.split('@')[1];

    const company = await Company.findOne(
      { email_domain: emailDomain },
      { password: 0, decoded_password: 0, bio: 0, social_links: 0 }
    );
    console.log("company : ", company)
    if (!company) {
      return res.status(404).json({ message: 'Company not found.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const teamMember = await TeamMember.findOne({ work_email: email });
    if (!teamMember) {
      return res.status(404).json({ message: 'Team member not found.' });
    }

    const bio = {
      first_name: teamMember.first_name,
      last_name: teamMember.last_name,
      full_name: `${teamMember.first_name} ${teamMember.last_name}`,
      designation: teamMember.designation || "",
      phone_number: teamMember.phone_number
    };

    const companyAccessDetails = {
      company_id: company._id,
      email_domain: company.email_domain,
      company_name: company.company_name,
      access_code: company.access_code,
      _id: teamMember._id,
      accessCard_social_links: {
        linkedin: teamMember.social_links?.linkedin || "",
        x: teamMember.social_links?.x || "",
        instagram: teamMember.social_links?.instagram || "",
        youtube: teamMember.social_links?.youtube || "",
      },
    };

    const carddata = {
      // contact_details: {
      //   coeuntry_code: '',
      //   mobil_number: teamMember?.phone_number,
      //   office_landline: '',
      //   email: teamMember?.work_email,
      //   website: '',
      //   mobile_number_enabled: ''
      // },
      contact_details: company.contact_details,
      bio: bio,
      social_links: {
        linkedin: teamMember.social_links?.linkedin || "",
        x: teamMember.social_links?.x || "",
        instagram: teamMember.social_links?.instagram || "",
        youtube: teamMember.social_links?.youtube || ""
      },
      address: company?.address,
      business_logo: company?.business_logo,
      text_color: company?.text_color,
      card_color: company?.card_color,
      card_type: 'corporate',
      owner_id: userId,
      company_id: teamMember?.company_details?.company_id,
      business_and_logo_status: company?.business_and_logo_status
    }

    const existingIndex = user.companyAccessCardDetails.findIndex(
      (detail) => detail.company_id.toString() === company._id.toString()
    );

    if (existingIndex > -1) {
      user.companyAccessCardDetails[existingIndex] = companyAccessDetails;
    } else {
      const isFirstCard =
        user.personal_cards.length === 0 &&
        user.companyAccessCardDetails.length === 0;
      company.primary_card = isFirstCard;
      await company.save();

      user.companyAccessCardDetails.push(companyAccessDetails);
    }

    await user.save();

    const newCard = await CardDetials.create(carddata)
    console.log("newCard : ", newCard)

    otpRecord.used = true;
    await otpRecord.save();

    const accountlog = await user_account_log.create({
      user_id: userId,
      action: 'Access Card created',
      previous_status: 'Access Card created',
      new_status: 'Access Card created',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    res.status(200).json({
      message: existingIndex > -1
        ? 'Company access card updated successfully.'
        : 'OTP verified and company access card created successfully!',
      data: { bio, company },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.', error });
  }
};


exports.getAllAccessCards = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(' logged in USER IS>>>>', req.user)
    const user = await User.findById(userId).select("companyAccessCardDetails");
    console.log("user : ", user)
    if (!user || !user.companyAccessCardDetails || user.companyAccessCardDetails.length === 0) {
      return res.status(204).json({ message: "No company access cards found." });
    }

    const companyConditions = user.companyAccessCardDetails.map((detail) => ({
      email_domain: detail.email_domain,
      access_code: detail.access_code,
    }));
    console.log("companyConditions : ", companyConditions)

    const companies = await Company.find(
      { $or: companyConditions },
      { bio: 0, social_links: 0, password: 0, decoded_password: 0 }
    );
    console.log("companies : ", companies)

    if (companies.length === 0) {
      return res.status(204).json({ message: "No companies found for the access cards." });
    }
    const enrichedCompanies = await Promise.all(
      companies.map(async (company) => {
        const userAccessCardDetail = user.companyAccessCardDetails.find(
          (detail) => detail.email_domain === company.email_domain
        );

        const teamMember = userAccessCardDetail?._id
          ? await TeamMember.findById(userAccessCardDetail._id)
          : null;
        // console.log('userAccessCardDetail._id',userAccessCardDetail._id)
        // console.log('teammmmmm',teamMember)
        const bio = teamMember
          ? {
            first_name: teamMember.first_name,
            last_name: teamMember.last_name,
            full_name: `${teamMember.first_name} ${teamMember.last_name}`,
            designation: teamMember.designation || "",
            work_email: teamMember.work_email,
            phone_number: teamMember.phone_number
          }
          : null;
        // console.log('bio',bio)
        return {
          bio,
          ...company.toObject(),
          social_links: userAccessCardDetail?.accessCard_social_links || {
            linkedin: "",
            x: "",
            instagram: "",
            youtube: "",
          },
        };
      })
    );


    res.status(200).json({
      code: 200,
      message: "Access Cards retrieved successfully.",
      count: enrichedCompanies.length,
      data: enrichedCompanies,
    });

    // const Allaccesscard = await CardDetials.find({ owner_id: userId, card_type: 'corporate' })
    // console.log("Allaccesscard : ", Allaccesscard)
    // const count = await CardDetials.countDocuments({ owner_id: userId, card_type: 'corporate' })
    // if (!Allaccesscard || Allaccesscard.length === 0) {
    //   return res.status(204).json({ message: "No company access cards found." });
    // }
    // return res.status(200).json({
    //   message: "Access card fetched successfully",
    //   data: Allaccesscard,
    //   count,
    //   code: 200
    // })
  } catch (error) {
    console.error("Error in getAllAccessCards API:", error);
    utils.handleError(res, error);
  }
};





exports.updateAccessCard = async (req, res) => {
  try {
    const { first_name, last_name, work_email, accessCard_social_links } = req.body;
    //console.log('bodyyy',req.body)
    // console.log('USERRRR',req.user)
    const isMemberExists = await TeamMember.findOne({ work_email });
    if (!isMemberExists) {
      return res.status(404).json({ message: "Team member not found.", code: 404 });
    }
    if (!work_email) {
      return res.status(400).json({ message: "Work email is required.", code: 400 });
    }

    const emailDomain = work_email.split("@")[1];
    if (!emailDomain) {
      return res.status(400).json({ message: "Invalid email format.", code: 400 });
    }

    const isDomainExists = await Company.findOne({ email_domain: emailDomain });
    if (!isDomainExists) {
      return res.status(404).json({ message: "Company with this domain not found.", code: 404 });
    }
    const allowedSocialLinks = ["linkedin", "x", "instagram", "youtube"];
    const sanitizedSocialLinks = {};
    if (accessCard_social_links) {
      for (const key of allowedSocialLinks) {
        if (accessCard_social_links[key] !== undefined) {
          sanitizedSocialLinks[key] = accessCard_social_links[key];
        }
      }
    }

    const updateData = {
      ...(first_name && { first_name }),
      ...(last_name && { last_name }),
      ...(Object.keys(sanitizedSocialLinks).length > 0 && {
        "company_details.accessCard_social_links": sanitizedSocialLinks,
      }),
    };

    const updatedTeamMember = await TeamMember.findOneAndUpdate(
      { work_email },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTeamMember) {
      return res.status(404).json({ message: "Team member not found.", code: 404 });
    }

    if (Object.keys(sanitizedSocialLinks).length > 0) {
      const updatedUser = await User.findOneAndUpdate(
        {
          "companyAccessCardDetails.email_domain": emailDomain,
        },
        {
          $set: {
            "companyAccessCardDetails.$.accessCard_social_links": sanitizedSocialLinks,
          },
        },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User with the given domain not found.", code: 404 });
      }
    }


    res.status(200).json({
      code: 200,
      message: "Access Card updated successfully.",
      teamMember: {
        id: updatedTeamMember._id,
        first_name: updatedTeamMember.first_name,
        last_name: updatedTeamMember.last_name,
        accessCard_social_links: updatedTeamMember.company_details?.accessCard_social_links || {},
      },
    });
  } catch (error) {
    console.error("Error updating access card:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


//----------------------------------------------------------------
exports.isPaidByCompany = async (req, res) => {
  try {

    const { email } = req.body;

    const email_domain = extractDomainFromEmail(email);
    const company = await Company.findOne({ email_domain }, { password: 0, decoded_password: 0 })
    if (!company) return utils.handleError(res, { message: "Company not found", code: 404 });

    var paid_by_company = false;
    const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ company_id: company._id, email: email });

    // if (isSubscriptionPaidByCompany) {
    //   const isCompanyHaveSubscription = await checkSusbcriptionIsActive(company._id);
    //   if (isCompanyHaveSubscription === true) {
    //     paid_by_company = true
    //   } else {
    //     return utils.handleError(res, {message : "Company does not have any active subscription" , code : 400})
    //   }
    // }

    res.json({ data: isSubscriptionPaidByCompany ? true : false, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.haveSubscription = async (req, res) => {
  try {
    const user_id = req.user._id;
    const subscription = await checkSusbcriptionIsActive(user_id);
    res.json({ data: subscription, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}

exports.addCorporateCard = async (req, res) => {
  try {
    const owner_id = req.user._id;
    const { company_id } = req.body
    const data = req.body;

    const company = await Company.findById(company_id);
    if (!company) return utils.handleError(res, { message: "Company not found", code: 404 });

    const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ company_id: company_id, email: data?.contact_details?.email });
    const haveSubscription = await checkSusbcriptionIsActive(owner_id);

    // if (!isSubscriptionPaidByCompany && !haveSubscription) return utils.handleError(res, { message: "You do not have any active subcription to create the card", code: 400 })

    let paid_by_company = false
    if (isSubscriptionPaidByCompany && !haveSubscription) {
      //check does company have subcripton or not 
      const doesCompnayHaveSubscription = await checkSusbcriptionIsActive(company_id);
      if (!doesCompnayHaveSubscription) return utils.handleError(res, { message: "Company does not have any active subcription", code: 400 })
      isSubscriptionPaidByCompany.is_card_created = true
      paid_by_company = true
      await isSubscriptionPaidByCompany.save()
    }

    if (paid_by_company === false) {
      await giveTrialIfNotGive(owner_id)
    }

    //check this user have a card or not 
    const isCardExist = await CardDetials.findOne({ owner_id: owner_id });
    const previousCompany = isCardExist?.company_id;

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
      paid_by_company: paid_by_company
    }

    const notificationData = {
      sender_id: owner_id,
      receiver_id: company_id,
      type: "company",
      title: "Company Joined",
      body: `${req.user.full_name} has joined the company.`
    }

    const saveNotification = new Notification(notificationData);
    await saveNotification.save()

    if (isCardExist) {
      await CardDetials.updateOne({ owner_id: owner_id }, card);
      await SavedCard.deleteOne({ owner_id: owner_id })

      const notificationData = {
        sender_id: owner_id,
        receiver_id: previousCompany,
        type: "company",
        title: "Company Changed",
        body: `${req.user.full_name} has left the company`
      }

      const saveNotification = new Notification(notificationData);
      await saveNotification.save()

      res.json({ code: 200, message: "Company change successfully" })
    } else {
      const cardData = new CardDetials({ owner_id, ...card })
      await cardData.save()
      await User.findByIdAndUpdate(owner_id, { is_card_created: true, user_type: "corporate" })
      await SavedCard.deleteOne({ owner_id: owner_id })


      res.json({ code: 200, message: "Card Save successfully" })
    }

  } catch (error) {
    // console.log(error)
    utils.handleError(res, error)
  }
}


exports.getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ errors: { msg: 'User not found.' } });
    }

    const userInfo = {
      id: user._id,
      first_name: user?.first_name,
      last_name: user?.last_name,
      email: user?.email,
      profile_image: user?.profile_image,
      dateOfBirth: user?.dateOfBirth,
      sex: user?.sex,
      payment_method: user?.payment_mode
    };

    res.status(200).json({ data: userInfo });
  } catch (error) {
    // console.error(error);
    res.status(500).json({ errors: { msg: 'Internal Server Error' } });
  }
};






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
    // console.log(error)
    utils.handleError(res, error)
  }

}


// exports.getCard = async (req, res) => {
//   try {
//     const isSubscriptionActive = await isSubscriptionActiveOrNot(req.user);
//     if (isSubscriptionActive === false) return utils.handleError(res, { message: "Your subscription has expired. Please renew to continue accessing our services", code: 400 });

//     const user_id = req.user._id;
//     console.log('user id : ', user_id)

//     const user_data = await User.findOne({ _id: user_id })
//     console.log("user_data : ", user_data)

//     const primaryPersonalCards = await Promise.all(
//       user_data.personal_cards.map(async (i) => {
//         const card = await CardDetials.findOne({ _id: i });
//         return card && card.primary_card ? card : null;
//       })
//     ).then(cards => cards.filter(card => card !== null));
//     console.log("primaryPersonalCards : ", primaryPersonalCards);

//     const primaryCompanyCards = await Promise.all(
//       user_data.companyAccessCardDetails.map(async (i) => {
//         const company = await Company.findOne({ _id: i.company_id }, { bio: 0, password: 0, decoded_password: 0 });
//         return company && company.primary_card ? company : null;
//       })
//     ).then(cards => cards.filter(card => card !== null));
//     primaryCompanyCards = primaryCompanyCards.map(async i => {
//       const data = await TeamMember.findOne({ 'company_details.company_id': i._id })
//       const bio = data ? {
//         first_name: data.first_name,
//         last_name: data.last_name,
//         full_name: `${data.first_name} ${data.last_name}`,
//         desigmail: data.work_email,
//         phone_number: data.phone_number
//       }
//         : null;
//       return {
//         bio,
//         ...i.toObject(),
//       }
//     })
//     console.log("primaryCompanyCards : ", primaryCompanyCards);

//     let result = []
//     if (primaryPersonalCards.length === 0 && primaryCompanyCards.length > 0) {
//       result = primaryCompanyCards
//     }
//     if (primaryCompanyCards.length === 0 && primaryPersonalCards.length > 0) {
//       result = primaryPersonalCards
//     }
//     if (primaryCompanyCards.length === 0 && primaryPersonalCards.length === 0) {
//       result = []
//     }
//     console.log("result : ", result)
//     return res.status(200).json({
//       message: "Primary Card fetched successfully",
//       data: result[0],
//       code: 200
//     })
//   } catch (error) {
//     utils.handleError(res, error)
//   }
// }

exports.getCard = async (req, res) => {
  try {
    console.log("req.user : ", req.user)
    // const isSubscriptionActive = await isSubscriptionActiveOrNot(req.user);
    // const isSubscriptionActive = await checkActiveSubscription(req.user)
    // console.log("isSubscriptionActive : ", isSubscriptionActive)
    // if (isSubscriptionActive === false) {
    //   return utils.handleError(res, { message: "Your subscription has expired. Please renew to continue accessing our services", code: 400 });
    // }

    const user_id = req.user._id;
    console.log('user id : ', user_id);

    const user_data = await User.findOne({ _id: user_id });
    console.log("user_data : ", user_data);

    const primaryPersonalCards = await Promise.all(
      user_data.personal_cards.map(async (i) => {
        const card = await CardDetials.findOne({ _id: i });
        console.log("fetched card : ", card)
        return card && card?.primary_card ? card : null;
      })
    ).then(cards => cards.filter(card => card !== null));
    console.log("primaryPersonalCards : ", primaryPersonalCards);

    let primaryCompanyCards = await Promise.all(
      user_data.companyAccessCardDetails.map(async (i) => {
        const company = await Company.findOne({ _id: i.company_id }, { bio: 0, password: 0, decoded_password: 0 });
        console.log('Fetched company:', company);
        if (company && company.primary_card) {
          const data = await TeamMember.findOne({ 'company_details.company_id': company._id });
          const bio = data ? {
            first_name: data.first_name,
            last_name: data.last_name,
            full_name: `${data.first_name} ${data.last_name}`,
            designation: data.designation || "",
            work_email: data.work_email,
            phone_number: data.phone_number
          } : null;
          return {
            bio,
            ...company.toObject(),
          };
        }
        return null;
      })
    );
    primaryCompanyCards = primaryCompanyCards.filter(card => card !== null);
    console.log("primaryCompanyCards : ", primaryCompanyCards);

    let result = [];
    if (primaryPersonalCards.length === 0 && primaryCompanyCards.length > 0) {
      result = primaryCompanyCards;
    }
    if (primaryCompanyCards.length === 0 && primaryPersonalCards.length > 0) {
      result = primaryPersonalCards;
    }
    if (primaryCompanyCards.length === 0 && primaryPersonalCards.length === 0) {
      result = [];
    }
    console.log("result : ", result);

    return res.status(200).json({
      message: "Primary Card fetched successfully",
      data: result[0] || null,
      code: 200
    });
  } catch (error) {
    utils.handleError(res, error);
  }
};


exports.getPersonalCards = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("User ID:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      // console.error("Invalid User ID format:", userId);
      return res.status(422).json({ code: 422, message: "ID_MALFORMED" });
    }

    const personalCards = await CardDetials.find({
      owner_id: userId,
      card_type: "personal",
    });

    if (!personalCards || personalCards.length === 0) {
      // console.log("No personal cards found for user:", userId);
      return res.status(204).json({ errors: { msg: "No personal cards found for this user." } });
    }

    res.status(200).json({ data: personalCards });
  } catch (error) {
    //console.error("Error fetching personal cards:", error);
    res.status(500).json({ errors: { msg: "Server error" } });
  }
};


exports.getCountries = async (req, res) => {
  try {
    const data = Country.getAllCountries();
    res.json({ data: data, code: 200 })
  } catch (error) {
    // console.log(error)
    utils.handleError(res, error)
  }
}

exports.getStates = async (req, res) => {
  try {
    // console.log("req.query", req.query)
    var countryCode = req.query.countryCode;

    if (!countryCode) {
      const countryName = req.query.countryName
      // console.log("countryName", countryName)
      countryCode = getCode(countryName)
    }

    //console.log("countryCode", countryCode)

    const data = State.getStatesOfCountry(countryCode)
    res.json({ data: data, code: 200 })
  } catch (error) {
    //console.log(error)
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
    console.log('user check from users', req.user.user_type)
    const add = await Support.create(
      {
        user_id: user_id,
        message: data?.message,
        userType: req.user.user_type
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
        message: data?.message,
        userType: req.user.user_type
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

    const result = await User.findOneAndUpdate({ _id: user_id }, { $set: { is_deleted: true } }, { new: true });
    console.log("result : ", result)
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

    const accountlog = await user_account_log.create({
      user_id: user_id,
      action: 'Account Deleted',
      previous_status: 'Account Deleted',
      new_status: 'Account Deleted',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

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

    const fcmToken = await FCMDevice.findOne({ user_id: user_id, token: token })

    if (!fcmToken) return utils.handleError(res, { message: "Token not found", code: 404 });

    await FCMDevice.deleteOne({ user_id: user_id, token: token })

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
    const isSubscriptionActive = await isSubscriptionActiveOrNot(req.user);
    if (isSubscriptionActive === false) return utils.handleError(res, { message: "Your subscription has expired. Please renew to continue accessing our services", code: 400 });

    const user_id = req.user._id;
    const email = req.user.email;


    const query = {
      user_id: mongoose.Types.ObjectId(user_id)
    };

    console.log("query : ", query)

    const sharedCards = await SharedCards.aggregate([
      {
        $match: query
      },
      {
        $lookup: {
          from: "card_details",
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
          // "cardDetails.qr_logo": {
          //   $cond: {
          //     if: { $eq: ['$cardDetails.card_type', 'corporate'] },
          //     then: '$company.qr_logo',
          //     else: '$cardDetails.qr_logo'
          //   }
          // },
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

    console.log("sharedCards : ", sharedCards)
    if (!sharedCards || sharedCards.length === 0) {
      return utils.handleError(res, { message: "No card found", code: 400 });
    }

    const ws = XLSX.utils.json_to_sheet(sharedCards);
    console.log("ws : ", ws)
    const wb = XLSX.utils.book_new();
    console.log("wb : ", wb)
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet 1');
    console.log("ws and wb : ", ws, " ", wb)

    // const serverFolderPath = process.env.STORAGE_PATH_FOR_EXCEL;
    const serverFolderPath = '/public/cardExcelSheet'
    console.log("serverFolderPath : ", serverFolderPath)
    const excelFileName = Date.now() + 'cards.xlsx';
    const excelFilePath = `${serverFolderPath}/${excelFileName}`;
    console.log("excelFilePath : ", excelFilePath)

    if (!fs.existsSync(excelFilePath)) {
      fs.mkdirSync(excelFilePath,{ recursive: true });
      console.log('Directory created:', excelFilePath);
    } else {
      console.log('Directory already exists:', excelFilePath);
    }

    XLSX.writeFile(wb, excelFilePath, { bookSST: true });

    // const media = await uploadFilefromPath(excelFilePath)

    // const path = `${process.env.STORAGE_PATH_HTTP}/cardExcelSheet/${excelFileName}`;
    // console.log("path : ", path)

    // console.log(email)
    // let mailOptions = {
    //   to: email,
    //   subject: `Exported Card from ${process.env.APP_NAME}`,
    //   name: req.user.full_name,
    //   logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`,
    //   attachments: [],
    // };

    // mailOptions.attachments.push({
    //   filename: `business_cards.xlsx`,
    //   path: path,
    // });

    // try {
    //   await sendInvoiceEmail(mailOptions);
    //   res.json({ data: "Mail sent to your email with the Excel sheet", code: 200 });
    // } catch (sendError) {
    //   console.error("Error sending email:", sendError);
    //   utils.handleError(res, { message: "Failed to send email", code: 500 });
    // }

    const path = await uploadExcelFile(excelFilePath);
    console.log("path : ", path)

    let mailOptions = {
      to: email,
      subject: `Exported Card from ${process.env.APP_NAME}`,
      name: req.user.full_name,
      logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`,
      attachments: [
        {
          filename: `business_cards.xlsx`,
          path: path,
        },
      ],
    };

    try {
      await sendInvoiceEmail(mailOptions);
      res.json({ data: "Mail sent to your email with the Excel sheet", code: 200 });
    } catch (sendError) {
      console.error("Error sending email:", sendError);
      utils.handleError(res, { message: "Failed to send email", code: 500 });
    }


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
    //console.log('user>>>>----',user)
    const user_id = user._id;
    var subcriptionActive = false
    console.log("user.user_type : ", user.user_type)
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
      // console.log('end dateee',waiting_end_time)

    }
    //console.log('user subcriptionActive >>>>----',user)
    return subcriptionActive
  } catch (error) {
    console.log(error)
    return false
  }
}


async function checkActiveSubscription(user) {
  var isSubscriptionActive = false
  const checkIsTrialExits = await Trial.findOne({ user_id: user._id, status: "active" });
  console.log('endd date>>', checkIsTrialExits?.end_at, " checkIsTrialExits : ", checkIsTrialExits)
  if (checkIsTrialExits && checkIsTrialExits?.status === "active") {
    return isSubscriptionActive = true
  }

  const subcription = await Subscription.findOne({ user_id: user._id, status: "active" })
  if (subcription) {
    console.log("subcription", subcription, 'subcription.end_at', subcription?.end_at, 'subcription.status', subcription?.status)
    // if (subcription?.status === "created") return false
    // if (subcription?.end_at < new Date()) return false
    return isSubscriptionActive = true
  } else {
    const card = await CardDetials.findOne({ owner_id: user._id });
    if (!card) return isSubscriptionActive = false
    const company_id = card.company_id;
    const email = card?.contact_details?.email;
    if (!email) return isSubscriptionActive = false
    const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ company_id: company_id, email: email });
    if (isSubscriptionPaidByCompany) {
      //Employee is subcription is paid by company
      isSubscriptionActive = false
    } else {
      //Employee is subcription is not paid by company
      //check for waiting period 
      const waiting_end_time = card.waiting_end_time;
      if (waiting_end_time && new Date(waiting_end_time) > new Date()) {
        isSubscriptionActive = true
      } else {
        isSubscriptionActive = false
      }
    }
    return isSubscriptionActive
  }
}

exports.isSubscriptionActive = async (req, res) => {
  try {
    const user_id = req.user._id;
    const user = req.user;
    console.log("user : ", user, " user_id : ", user_id)

    // if (!user.is_card_created) return res.json({ data: false, code: 200 })
    var isSubscriptionActive = false
    const checkIsTrialExits = await Trial.findOne({ user_id, status: "active" });
    console.log('endd date>>', checkIsTrialExits?.end_at, " checkIsTrialExits : ", checkIsTrialExits)
    if (checkIsTrialExits && checkIsTrialExits?.status === "active") {
      isSubscriptionActive = true
      return res.json({ data: isSubscriptionActive, code: 200 })
    }

    const subcription = await Subscription.findOne({ user_id: user_id, status: "active" })
    if (subcription) {
      console.log("subcription", subcription, 'subcription.end_at', subcription?.end_at, 'subcription.status', subcription?.status)
      // if (subcription?.status === "created") return false
      // if (subcription?.end_at < new Date()) return false
      return res.json({ data: true, code: 200 })
    } else {
      const card = await CardDetials.findOne({ owner_id: user_id });
      if (!card) return res.json({ data: false, code: 200 })
      const company_id = card.company_id;
      const email = card?.contact_details?.email;
      if (!email) return res.json({ data: false, code: 200 })
      const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ company_id: company_id, email: email });
      if (isSubscriptionPaidByCompany) {
        //Employee is subcription is paid by company
        isSubscriptionActive = false
      } else {
        //Employee is subcription is not paid by company
        //check for waiting period 
        const waiting_end_time = card.waiting_end_time;
        if (waiting_end_time && new Date(waiting_end_time) > new Date()) {
          isSubscriptionActive = true
        } else {
          isSubscriptionActive = false
        }
      }
      return res.json({ data: isSubscriptionActive, code: 200 })
    }
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


// var isSubscriptionActive = await isSubscriptionActiveOrNot(user);
// console.log("isSubscriptionActive : ", isSubscriptionActive)

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

// res.json({ data: isSubscriptionActive, code: 200 })


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
    return 1
  } else if (interval === 6) {
    return 20
  } else if (interval === 3) {
    return 40
  } else if (interval === 1) {
    return 100
  }
}

async function SubscriptionId() {
  const token = await crypto.randomBytes(8).toString('hex')
  return `sub_${token}`
}

exports.createSubscription = async (req, res) => {
  try {

    // if (req.user.is_card_created === false) {
    //   return utils.handleError(res, { message: "Please create a card before purchasing the subscription", code: 400 })
    // }

    // if (req.user.is_card_created === false) {
    //   const saveCard = await SavedCard.findOne({ owner_id: req.user._id });
    //   if (!saveCard) return utils.handleError(res, { message: "Please save card in the app before creating subscription", code: 400 })
    // }

    const user_id = req.user._id;
    const userdata = await User.findOne({ _id: user_id });
    console.log("userdata : ", userdata);

    // function checkValue(value) {
    //   return !value;
    // }

    // if (req.user.billing_address && (Object.values(req.user.billing_address).length === 0 || Object.values(req.user.billing_address).every(checkValue))) return res.json({ code: 400, billing_address: false })

    const { plan_id } = req.body;
    const isSubcriptionExist = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });

    const checkIsTrialExits = await Trial.findOne({ user_id, status: "active" });
    console.log("checkIsTrialExits", checkIsTrialExits)

    if (checkIsTrialExits && checkIsTrialExits.end_at > new Date() && checkIsTrialExits.status === "active") {
      const result = await Trial.findOneAndUpdate({ _id: checkIsTrialExits._id, user_id }, { $set: { status: "terminated" } }, { new: true });
      console.log("result : ", result)
    }

    const getCard = await CardDetials.findOne({ owner_id: user_id })

    if (getCard) {
      const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ email: getCard?.contact_details?.email });
      if (isSubscriptionPaidByCompany) return utils.handleError(res, { message: "You can not create subscription because you are in company plan", code: 400 })
    }

    if (isSubcriptionExist && isSubcriptionExist.status === "created") {
      console.log(isSubcriptionExist)
      const subcription = await instance.subscriptions.fetch(isSubcriptionExist.subscription_id);
      const status = subcription.status
      console.log("subcription", status)
      if (["created"].includes(status)) {
        await Subscription.findByIdAndDelete(isSubcriptionExist._id);

        await instance.subscriptions.cancel(isSubcriptionExist.subscription_id)
      } else if (["authenticated", "active", "paused", "pending", "halted"].includes(status)) {
        return res.json({ message: `You already have ${status} subscription`, code: 400 })
      }
    }

    if (isSubcriptionExist && ["authenticated", "active"].includes(isSubcriptionExist.status)) {
      return res.json({ message: `You already have ${isSubcriptionExist.status} subscription, It will take some to reflect here`, code: 400 })
    }

    if (isSubcriptionExist && ["pending", "halted"].includes(isSubcriptionExist.status)) {
      return res.json({ message: `You already have ${isSubcriptionExist.status} subscription , Please update your payment method`, code: 400 })
    }


    // if (isSubcriptionExist && ["cancelled", "completed", "expired"].includes(isSubcriptionExist.status) && isSubcriptionExist.end_at > new Date()) {
    //   return res.json({ message: `Your can create new subscription after the expiry time of current subscription`, code: 400 })
    // }

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

    const plan = await Plan.findOne({ plan_id: plan_id });
    console.log("plan : ", plan)
    if (!plan) return utils.handleError(res, { message: "Plan not found", code: 404 });

    if (plan.plan_type !== "individual") return utils.handleError(res, { message: "This plan is not for individiual", code: 400 });

    // const trailToBeGiven = await isTrailNeedToBeGiven(user_id)
    // let trail = {}

    // const currentDate = moment();
    // const futureDate = currentDate.add((plan?.trial_period_days ?? 180), 'days');
    // if (trailToBeGiven === true) {
    //   const timestamp = Math.floor(futureDate.valueOf() / 1000)
    //   trail = { start_at: timestamp }
    // }

    // const expireTime = Math.floor((Date.now() + (10 * 60 * 1000)) / 1000);
    // console.log('getTotalCount(plan.interval)', getTotalCount(plan.interval))
    // console.log('instance : ', instance)

    const now = new Date()
    let startOfPeriod
    let endOfPeriod
    if (plan.period === "monthly") {
      startOfPeriod = new Date(now)
      endOfPeriod = new Date(now.setMonth(now.getMonth() + 1))
    }
    if (plan.period === "yearly") {
      startOfPeriod = new Date(now)
      endOfPeriod = new Date(now.setFullYear(now.getFullYear() + 1))
    }
    // let expireBy = Math.floor(endOfPeriod.getTime() / 1000);
    // let expireBy = Math.floor(Date.UTC(endOfPeriod.getUTCFullYear(), endOfPeriod.getUTCMonth(), endOfPeriod.getUTCDate()) / 1000);
    // console.log("startOfPeriod : ", startOfPeriod, " endOfPeriod : ", endOfPeriod, " expireBy : ", expireBy)
    let expireBy = new Date(endOfPeriod).getTime()
    let newSubscription
    let newTrial

    if (plan.plan_variety === "freemium") {
      newTrial = await Trial.create({
        user_id,
        plan_id,
        start_at: startOfPeriod,
        end_at: endOfPeriod,
        status: 'active'
      })
      console.log("newTrial : ", newTrial)

      // admin notification
      const admins = await admin.findOne({ role: 'admin' });
      console.log("admins : ", admins)

      if (admins) {
        const notificationMessage = {
          title: 'New Trial created',
          description: `${userdata.full_name} has created a new Trial . Plan ID : ${newTrial.plan_id}`,
          trial_id: newTrial._id
        };

        const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
        console.log("adminFcmDevices : ", adminFcmDevices)

        if (adminFcmDevices && adminFcmDevices.length > 0) {
          // let tokens = adminFcmDevices.map(i => i.token)
          // console.log("tokens : ", tokens)
          // await utils.sendNotificationsInBatches(tokens, notificationMessage);
          adminFcmDevices.forEach(async i => {
            const token = i.token
            console.log("token : ", token)
            await utils.sendNotification(token, notificationMessage);
          })
          const adminNotificationData = {
            title: notificationMessage.title,
            body: notificationMessage.description,
            // description: notificationMessage.description,
            type: "new_trial",
            receiver_id: admins._id,
            related_to: newTrial._id,
            related_to_type: "trial",
          };
          const newAdminNotification = new admin_notification(adminNotificationData);
          console.log("newAdminNotification : ", newAdminNotification)
          await newAdminNotification.save();
        } else {
          console.log(`No active FCM tokens found for admin ${admin._id}.`);
        }
      }

      return res.json({ message: "Freemium plan activated successfully", data: newTrial, code: 200 })
    } else {
      console.log('Creating subscription with:', {
        plan_id: plan.plan_id,
        total_count: getTotalCount(plan.interval),
        quantity: 1,
        customer_notify: 1,
        expire_by: expireBy,
      });

      const subcription = await instance.subscriptions.create({
        "plan_id": plan.plan_id,
        "total_count": getTotalCount(plan.interval),
        "quantity": 1,
        "customer_notify": 1,
        // ...trail,
        expire_by: expireBy,
        "notes": {
          "user_id": user_id.toString(),
          "user_type": "individual"
        }
      })

      const dataForDatabase = {
        user_id: user_id,
        subscription_id: subcription.id,
        plan_id: plan.plan_id,
        plan_started_at: startOfPeriod,
        start_at: startOfPeriod,
        end_at: endOfPeriod,
        status: subcription.status
      }

      newSubscription = new Subscription(dataForDatabase);
      await newSubscription.save()

      const accountlog = await user_account_log.create({
        user_id: user_id,
        action: 'Subscription created',
        previous_status: 'Subscription created',
        new_status: 'Subscription created',
        performed_by: 'user',
        date_and_time: new Date()
      })
      console.log("accountlog : ", accountlog)

      // admin notification
      const admins = await admin.findOne({ role: 'admin' });
      console.log("admins : ", admins)

      if (admins) {
        const notificationMessage = {
          title: 'New Subscription created',
          description: `${userdata.full_name} has created a new subscription . ID : ${newSubscription.subscription_id}`,
          subscription_id: newSubscription.subscription_id
        };

        const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
        console.log("adminFcmDevices : ", adminFcmDevices)

        if (adminFcmDevices && adminFcmDevices.length > 0) {
          // let tokens = adminFcmDevices.map(i => i.token)
          // console.log("tokens : ", tokens)
          // await utils.sendNotificationsInBatches(tokens, notificationMessage);
          adminFcmDevices.forEach(async i => {
            const token = i.token
            console.log("token : ", token)
            await utils.sendNotification(token, notificationMessage);
          })
          const adminNotificationData = {
            title: notificationMessage.title,
            body: notificationMessage.description,
            // description: notificationMessage.description,
            type: "new_subscription",
            receiver_id: admins._id,
            related_to: newSubscription._id,
            related_to_type: "subscription",
          };
          const newAdminNotification = new admin_notification(adminNotificationData);
          console.log("newAdminNotification : ", newAdminNotification)
          await newAdminNotification.save();
        } else {
          console.log(`No active FCM tokens found for admin ${admin._id}.`);
        }
      }

      res.json({ message: "subscription activated successfully", data: newSubscription, code: 200 })
    }
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.webhook = async (req, res) => {
  const payload = JSON.stringify(req.body);
  const signature = req.get('X-Razorpay-Signature');

  res.sendStatus(200);

  console.log("signature", signature)
  // Verify signature
  const expectedSignature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');


  if (signature === expectedSignature) {

    console.log("req.body.card>>>>>>>>>>>>>>>>>", req.body?.payload?.payment?.entity?.card)
    var event = req.body.event;
    console.log("event", event)
    const subscription = req.body.payload.subscription.entity
    const user_id = subscription.notes.user_id;
    const user_type = subscription.notes.user_type;


    var user_country = ""

    let buyerData = null;
    if (user_type === "individual") {
      buyerData = await User.findById(user_id);
      const user = await CardDetials.findOne({ owner_id: mongoose.Types.ObjectId(user_id) });
      if (user?.card_type === "corporate") {
        const company = await Company.findById(user?.company_id);
        user_country = company?.address?.country
      } else {
        user_country = user?.address?.country
      }
    } else {
      const company = await Company.findById(user_id);
      buyerData = company;
      user_country = company?.address?.country
    }

    const plan_id = subscription.plan_id;
    const plan = await instance.plans.fetch(plan_id)

    console.log('Subscription :', subscription);
    switch (event) {
      case 'subscription.authenticated':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status });

        const checkIsTrialExits = await Trial.findOne({ user_id, status: "active" });
        if (checkIsTrialExits) {
          checkIsTrialExits.status = "completed";
          await checkIsTrialExits.save()
        }

        if (user_type === "individual") {
          const user = await User.findById(user_id);
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
        }

        const emailData = {
          email: buyerData?.email,
          locale: "en",
          full_name: user_type === "individual" ? buyerData?.full_name : buyerData?.company_name,
          subscription_name: plan?.item?.name,
          purchased_date: new Date(),
          price: (plan?.item?.amount ?? 0) / 100,
          interval: plan?.interval,
          start_date: new Date(subscription?.charge_at * 1000)
        }

        console.log("emailData", emailData)
        sendMail(emailData)
        break;
      case 'subscription.paused':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status })
        break;
      case 'subscription.resumed':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status })
        break;
      case 'subscription.activated':
        break;
      case 'subscription.pending':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status })
        break;
      case 'subscription.halted':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status })
        break;
      case 'subscription.charged':

        const payment_id = req?.body?.payload?.payment?.entity?.id
        const payment_details = req?.body?.payload?.payment?.entity

        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status, start_at: new Date(subscription.current_start * 1000), end_at: new Date(subscription.current_end * 1000) })
        const transactionData = {
          user_id: user_id,
          user_type: user_type,
          country: user_country,
          plan_id: plan_id,
          subcription_id: subscription.id,
          amount: Number(plan?.item?.amount ?? 0) / 100,
          payment_id: payment_id,
          payment_details: payment_details
        }

        const transaction = new Transaction(transactionData);
        await transaction.save();


        sendSubscriptionInvoiceEmail(transaction, subscription, plan, buyerData);

        break;
      case 'subscription.cancelled':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status })
        break;
      case 'subscription.completed':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status })
        break;
      case 'subscription.updated':
        await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: subscription.id }, { status: subscription.status, plan_id: subscription.plan_id, start_at: new Date(subscription.current_start * 1000), end_at: new Date(subscription.current_end * 1000) })
        break;
      default:
        console.log('Unhandled event:', event);
    }


  } else {
    // Signature verification failed
    console.error('Invalid webhook signature');

  }
}


exports.plansList = async (req, res) => {
  try {
    const user_id = req.user._id;
    const plans = await Plan.find({ plan_type: "individual", individual_selected: true }).sort({ 'item.amount': 1 })
    console.log("plans : ", plans)
    let updatedPlan = null;

    let activeSubscription = await Subscription.findOne({ user_id: user_id, status: 'active' }).sort({ createdAt: -1 })
    console.log("activeSubscription", activeSubscription)
    if (activeSubscription) {
      const subcription = await instance.subscriptions.fetch(activeSubscription.subscription_id);
      console.log("subcription : ", subcription)
      if (subcription.has_scheduled_changes === true) {
        const update = await instance.subscriptions.pendingUpdate(activeSubscription.subscription_id);
        const planfromDatabase = await Plan.findOne({ plan_id: update.plan_id });

        updatedPlan = {
          update,
          planfromDatabase
        }
      }
      console.log("subscriptions ", { activeSubscription, subcription })
      return res.json({ data: plans, isTrialActive: false, active: activeSubscription?.status !== "created" ? activeSubscription : null, update: updatedPlan ? updatedPlan : null, code: 200 });
    } else {

      let checkIsTrialExits = await Trial.findOne({ user_id, status: "active" });
      console.log("checkIsTrialExits", checkIsTrialExits)

      if (checkIsTrialExits && checkIsTrialExits.end_at > new Date() && checkIsTrialExits.status === "active") {
        let result = { ...checkIsTrialExits.toObject() }
        const freemium = plans.find(i => i.plan_variety === "freemium")
        console.log(freemium, "freemium?.plan_id : ", freemium?.plan_id)
        result.plan_id = freemium?.plan_id
        console.log("result : ", result)
        return res.json({ data: plans, isTrialActive: true, active: result, update: updatedPlan ? updatedPlan : null, code: 200 });
      }
    }
    return res.json({ data: plans, isTrialActive: false, active: null, update: null, code: 200 });
  } catch (error) {
    utils.handleError(res, error)
  }
}

async function giveTrialIfNotGive(user_id) {
  const isTrialGiven = await Trial.findOne({ user_id: user_id });

  if (!isTrialGiven) {
    const currentDate = new Date();
    const futureDate = moment(currentDate).add(180, 'days').endOf('day');

    const trial = {
      user_id: user_id,
      start_at: new Date(),
      end_at: futureDate.toDate()
    }

    const saveTrial = new Trial(trial);
    await saveTrial.save();
  }
}



exports.saveCard = async (req, res) => {
  try {

    const { card_type } = req.body;
    const owner_id = req.user._id;
    const data = req.body;

    console.log("data", data)
    const isCardExist = await SavedCard.findOne({ owner_id: owner_id });
    if (card_type !== "personal" && card_type !== "corporate") return utils.handleError(res, { message: "Invalid card type", code: 400 })

    if (card_type == "personal") {
      const card = {
        owner_id,
        card_type: card_type,
        business_logo: data.business_logo,
        qr_logo: data?.qr_logo,
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

      await giveTrialIfNotGive(owner_id)

    } else if (card_type == "corporate") {

      const card = {
        owner_id: owner_id,
        card_type: card_type,
        company_id: data.company_id,
        card_color: data?.card_color,
        text_color: data?.text_color,
        business_logo: data?.business_logo,
        qr_logo: data?.qr_logo,
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

      const email_domain = extractDomainFromEmail(data?.contact_details?.email);
      const company = await Company.findOne({ email_domain }, { password: 0, decoded_password: 0 })
      if (!company) return utils.handleError(res, { message: "Company not found", code: 404 });
      const isSubscriptionPaidByCompany = await PaidByCompany.findOne({ company_id: company._id, email: data?.contact_details?.email });
      if (!isSubscriptionPaidByCompany) {
        await giveTrialIfNotGive(owner_id)
      }

    }



    res.json({ message: "Card saved successfully", code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.getSavedCard = async (req, res) => {
  try {
    const owner_id = req.user._id;
    const isCardExist = await SavedCard.findOne({ owner_id: owner_id });
    res.json({ data: isCardExist, code: 200 })
  } catch (error) {
    utils.handleError(res, error)
  }
}


exports.isPaymentDone = async (req, res) => {
  try {
    const user_id = req.user._id;
    console.log("user_id", user_id)
    const isPayment = await checkSusbcriptionIsActive(user_id)

    if (isPayment === true) {
      const user = await User.findById(user_id);
      const savedCard = await SavedCard.findOne({ owner_id: user_id });
      if (savedCard) {
        const data = savedCard.toJSON();
        delete data._id;
        delete data.createdAt;
        delete data.updatedAt;

        const getCard = await CardDetials.findOne({ owner_id: user_id });

        if (getCard) {
          await CardDetials.findByIdAndUpdate(getCard._id, data)
        } else {
          const createCard = new CardDetials(data);
          await createCard.save()
        }

        await savedCard.remove()

        user.is_card_created = true;
        user.user_type = data?.card_type;
        await user.save()
      }
    }
    // const isSubcriptionExist = await Subscription.findOne({ user_id: user_id }).sort({ createdAt: -1 });

    // console.log("isSubcriptionExist" ,isSubcriptionExist)
    // if (!isSubcriptionExist) return res.json({ data: false, code: 200 });

    // if (isSubcriptionExist.status === "authenticated") {
    //   return res.json({ data: true, code: 200 });
    // }

    // if (isSubcriptionExist.status === "created") {
    //   const subcription = await instance.subscriptions.fetch(isSubcriptionExist.subscription_id);
    //   const status = subcription.status

    //   if (["authenticated", "active"].includes(status)) {
    //     return res.json({ data: true, code: 200 });
    //   }

    // } else if (isSubcriptionExist.status === "authenticated" || isSubcriptionExist.status === "active") {
    //   return res.json({ data: true, code: 200 });
    // }

    res.json({ data: isPayment, code: 200 });
  } catch (error) {
    console.log
    utils.handleError(res, error)
  }
}


exports.cancelSubscription = async (req, res) => {
  try {
    const user_id = req.user._id;

    const userdata = await User.findOne({ _id: user_id })
    console.log("userdata : ", userdata)

    const isSubcriptionExist = await Subscription.findOne({ user_id: user_id, status: "active" })
    console.log("isSubcriptionExist : ", isSubcriptionExist)

    if (!isSubcriptionExist) {
      const isTrialExists = await Trial.findOne({ user_id, status: "active" })
      console.log("isTrialExists : ", isTrialExists)
      if (!isTrialExists) {
        return res.json({ message: "Subscription not found", code: 404 });
      }
      if (isTrialExists) {
        const result = await Trial.deleteOne({ _id: isTrialExists._id })
        console.log("result : ", result)
        return res.json({ message: "cancellation successfull", code: 200, data: result });
      }
    }

    const subcription = await instance.subscriptions.fetch(isSubcriptionExist.subscription_id);
    const status = subcription.status

    if (!["authenticated", "active", "paused", "pending", "halted", "created"].includes(status)) return res.json({ message: `${status} subscription can not be cancelled`, code: 400 });

    if (subcription.has_scheduled_changes === true) {
      await instance.subscriptions.cancelScheduledChanges(isSubcriptionExist.subscription_id);
    }

    const subresult = await instance.subscriptions.cancel(isSubcriptionExist.subscription_id, false)

    // admin notification
    const admins = await admin.findOne({ role: 'admin' });
    console.log("admins : ", admins)

    if (admins) {
      const notificationMessage = {
        title: 'Subscription cancelled',
        description: `${userdata.full_name} has cancelled a subscription . ID : ${isSubcriptionExist.subscription_id}`,
        subscription_id: isSubcriptionExist._id
      };

      const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
      console.log("adminFcmDevices : ", adminFcmDevices)

      if (adminFcmDevices && adminFcmDevices.length > 0) {
        // let tokens = adminFcmDevices.map(i => i.token)
        // console.log("tokens : ", tokens)
        // await utils.sendNotificationsInBatches(tokens, notificationMessage);
        adminFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const adminNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "subscription_cancelled",
          receiver_id: admins._id,
          related_to: isSubcriptionExist._id,
          related_to_type: "subscription",
        };
        const newAdminNotification = new admin_notification(adminNotificationData);
        console.log("newAdminNotification : ", newAdminNotification)
        await newAdminNotification.save();
      } else {
        console.log(`No active FCM tokens found for admin ${admin._id}.`);
      }
    }

    //user notification
    const userFcmDevices = await fcm_devices.find({ user_id: userdata._id });
    console.log("userFcmDevices : ", userFcmDevices)
    const notificationMessage = {
      title: 'Subscription cancelled',
      description: `Your subscription has been cancelled. ID : ${isSubcriptionExist.subscription_id}`,
      subscription_id: isSubcriptionExist._id
    };
    if (userFcmDevices && userFcmDevices.length > 0) {
      // let tokens = adminFcmDevices.map(i => i.token)
      // console.log("tokens : ", tokens)
      // await utils.sendNotificationsInBatches(tokens, notificationMessage);
      userFcmDevices.forEach(async i => {
        const token = i.token
        console.log("token : ", token)
        await utils.sendNotification(token, notificationMessage);
      })
      const userNotificationData = {
        title: notificationMessage.title,
        body: notificationMessage.description,
        // description: notificationMessage.description,
        type: "subscription_cancelled",
        receiver_id: userdata._id,
        related_to: isSubcriptionExist._id,
        related_to_type: "subscription",
      };
      const newuserNotification = new notification(userNotificationData);
      console.log("newuserNotification : ", newuserNotification)
      await newuserNotification.save();
    } else {
      console.log(`No active FCM tokens found for user ${userdata._id}.`);
    }

    const accountlog = await user_account_log.create({
      user_id: user_id,
      action: 'Subscription Cancelled',
      previous_status: 'Subscription Cancelled',
      new_status: 'Subscription Cancelled',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    res.json({ message: "cancellation successfull", code: 200, data: subresult });
  } catch (error) {
    console.log
    utils.handleError(res, error)
  }
}

exports.updateSubscription = async (req, res) => {
  try {
    const user_id = req.user._id;
    const plan_id = req.body.plan_id;

    const plan = await Plan.findOne({ plan_id: plan_id });
    console.log("plan : ", plan)
    if (!plan) return utils.handleError(res, { message: "Plan not found", code: 404 });
    if (plan.plan_type !== "individual") return utils.handleError(res, { message: "This plan is not for individiual", code: 400 });

    let result
    let trial

    const now = new Date()
    let startOfPeriod
    let endOfPeriod
    if (plan.period === "monthly") {
      startOfPeriod = new Date(now)
      endOfPeriod = new Date(now.setMonth(now.getMonth() + 1))
    }
    if (plan.period === "yearly") {
      startOfPeriod = new Date(now)
      endOfPeriod = new Date(now.setFullYear(now.getFullYear() + 1))
    }
    // let expireBy = Math.floor(endOfPeriod.getTime() / 1000);
    let expireBy = new Date(endOfPeriod).getTime()
    // console.log("utc date : ", Date.UTC(endOfPeriod.getUTCFullYear(), endOfPeriod.getUTCMonth(), endOfPeriod.getUTCDate()))
    // let expireBy = Math.floor(Date.UTC(endOfPeriod.getUTCFullYear(), endOfPeriod.getUTCMonth(), endOfPeriod.getUTCDate()) / 1000);
    console.log("startOfPeriod : ", startOfPeriod, " endOfPeriod : ", endOfPeriod, "expireBy ", expireBy)

    const checkIsTrialExits = await Trial.findOne({ user_id, status: "active" });
    console.log("checkIsTrialExits", checkIsTrialExits)

    //{ $nin: ["expired", "created", "cancelled"] }
    let activeSubscription = await Subscription.findOne({ user_id: user_id, status: "active" }).sort({ createdAt: -1 })
    console.log("activeSubscription : ", activeSubscription)

    if (!activeSubscription) {
      if (!checkIsTrialExits) {
        return res.json({ message: "You don not have any active subscription", code: 404 });
      }
    }
    if (plan.plan_variety === "premium") {
      if (checkIsTrialExits && checkIsTrialExits?.end_at > new Date() && checkIsTrialExits?.status === "active") {
        const result = await Trial.findOneAndUpdate({ _id: checkIsTrialExits._id, user_id }, { $set: { status: "terminated" } }, { new: true });
        console.log("result : ", result)
      }

      if (activeSubscription) {
        const subcription = await instance.subscriptions.fetch(activeSubscription.subscription_id);
        console.log("subcription : ", subcription)
        const status = subcription.status;
        const paymentMode = subcription.payment_method;
        console.log("paymentMode : ", paymentMode)
        if (status === "created") {
          return res.json({ message: `You already have an pending subscription . please wait for activation`, code: 400 });
        }
        if (status !== "created") {
          await Subscription.findByIdAndDelete(activeSubscription._id);
          await instance.subscriptions.cancel(activeSubscription.subscription_id)
        }
        // if (status !== "authenticated" && status !== "active") return res.json({ message: `You can not update a ${status} subscription`, code: 400 });

        if (status === "authenticated") return res.json({ message: `You can not update subscription in trial period`, code: 400 });

        if (subcription.has_scheduled_changes === true) {
          await instance.subscriptions.cancelScheduledChanges(activeSubscription.subscription_id);
        }
        if (paymentMode === "upi") {
          console.log('Creating subscription with:', {
            plan_id: plan.plan_id,
            total_count: getTotalCount(plan.interval),
            quantity: 1,
            customer_notify: 1,
            expire_by: expireBy
          });

          const subcription = await instance.subscriptions.create({
            "plan_id": plan.plan_id,
            "total_count": getTotalCount(plan.interval),
            "quantity": 1,
            "customer_notify": 1,
            // ...trail,
            expire_by: expireBy,
            "notes": {
              "user_id": user_id.toString(),
              "user_type": "individual"
            }
          })

          const dataForDatabase = {
            user_id: user_id,
            subscription_id: subcription.id,
            plan_id: plan.plan_id,
            plan_started_at: startOfPeriod,
            start_at: startOfPeriod,
            end_at: endOfPeriod,
            status: subcription.status
          }

          result = new Subscription(dataForDatabase);
          await result.save()

          console.log("New subscription created:", result);
        } else {
          const update = {
            plan_id: plan_id,
            schedule_change_at: "cycle_end",
            customer_notify: true,
            remaining_count: getTotalCount(plan.interval),
            status: "active"
          }

          console.log("update : ", update)

          result = await instance.subscriptions.update(activeSubscription.subscription_id, update)
          console.log("result : ", result)
        }

        const accountlog = await user_account_log.create({
          user_id: user_id,
          action: 'Subscription updated',
          previous_status: 'Subscription updated',
          new_status: 'Subscription updated',
          performed_by: 'user',
          date_and_time: new Date()
        })
        console.log("accountlog : ", accountlog)


        // admin notification
        const admins = await admin.findOne({ role: 'admin' });
        console.log("admins : ", admins)

        if (admins) {
          const notificationMessage = {
            title: 'subscription upgraded',
            description: `${req.user.full_name} has upgrade a subscription . ID : ${result.subscription_id}`,
            subscription_id: result.subscription_id
          };

          const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
          console.log("adminFcmDevices : ", adminFcmDevices)

          if (adminFcmDevices && adminFcmDevices.length > 0) {
            // let tokens = adminFcmDevices.map(i => i.token)
            // console.log("tokens : ", tokens)
            // await utils.sendNotificationsInBatches(tokens, notificationMessage);
            adminFcmDevices.forEach(async i => {
              const token = i.token
              console.log("token : ", token)
              await utils.sendNotification(token, notificationMessage);
            })
            const adminNotificationData = {
              title: notificationMessage.title,
              body: notificationMessage.description,
              // description: notificationMessage.description,
              type: "subscription_upgrade",
              receiver_id: admins._id,
              related_to: result._id,
              related_to_type: "subscription",
            };
            const newAdminNotification = new admin_notification(adminNotificationData);
            console.log("newAdminNotification : ", newAdminNotification)
            await newAdminNotification.save();
          } else {
            console.log(`No active FCM tokens found for admin ${admin._id}.`);
          }
        }

        return res.json({ message: "Subscription updated successfully", data: result, code: 200 })
      } else {
        console.log('Creating subscription with:', {
          plan_id: plan.plan_id,
          total_count: getTotalCount(plan.interval),
          quantity: 1,
          customer_notify: 1,
          expire_by: expireBy
        });

        const subcription = await instance.subscriptions.create({
          "plan_id": plan.plan_id,
          "total_count": getTotalCount(plan.interval),
          "quantity": 1,
          "customer_notify": 1,
          // ...trail,
          expire_by: expireBy,
          "notes": {
            "user_id": user_id.toString(),
            "user_type": "individual"
          }
        })

        const dataForDatabase = {
          user_id: user_id,
          subscription_id: subcription.id,
          plan_id: plan.plan_id,
          plan_started_at: startOfPeriod,
          start_at: startOfPeriod,
          end_at: endOfPeriod,
          status: subcription.status
        }

        result = new Subscription(dataForDatabase);
        await result.save()

        console.log("New subscription created:", result);

        const accountlog = await user_account_log.create({
          user_id: user_id,
          action: 'Subscription updated',
          previous_status: 'Subscription updated',
          new_status: 'Subscription updated',
          performed_by: 'user',
          date_and_time: new Date()
        })
        console.log("accountlog : ", accountlog)

        return res.json({ message: "Subscription updated successfully", data: result, code: 200 })
      }
    }
    if (plan.plan_variety === "freemium") {
      trial = await Trial.create({
        user_id,
        plan_id,
        start_at: startOfPeriod,
        end_at: endOfPeriod,
        status: 'active'
      })
      console.log("newTrial : ", trial)

      if (activeSubscription) {
        const subcription = await instance.subscriptions.fetch(activeSubscription.subscription_id);
        console.log("subcription : ", subcription)
        const status = subcription.status;
        const paymentMode = subcription.payment_method;
        console.log("paymentMode : ", paymentMode)
        if (status === "created") {
          return res.json({ message: `You already have an pending subscription . please wait for activation`, code: 400 });
        }
        if (status !== "created") {
          await Subscription.findByIdAndDelete(activeSubscription._id);
          await instance.subscriptions.cancel(activeSubscription.subscription_id)
        }
        // if (status !== "authenticated" && status !== "active") return res.json({ message: `You can not update a ${status} subscription`, code: 400 });

        if (status === "authenticated") return res.json({ message: `You can not update subscription in trial period`, code: 400 });

        // if (subcription.has_scheduled_changes === true) {
        //   await instance.subscriptions.cancelScheduledChanges(activeSubscription.subscription_id);
        // }
      }

      const accountlog = await user_account_log.create({
        user_id: user_id,
        action: 'Subscription converted to Freemium',
        previous_status: 'Subscription converted to Freemium',
        new_status: 'Subscription converted to Freemium',
        performed_by: 'user',
        date_and_time: new Date()
      })
      console.log("accountlog : ", accountlog)


      // admin notification
      const admins = await admin.findOne({ role: 'admin' });
      console.log("admins : ", admins)

      if (admins) {
        const notificationMessage = {
          title: 'subscription downgraded',
          description: `${userdata.full_name} has downgrade a subscription to freemium. Plan ID : ${trial.plan_id}`,
          trial_id: trial._id
        };

        const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
        console.log("adminFcmDevices : ", adminFcmDevices)

        if (adminFcmDevices && adminFcmDevices.length > 0) {
          // let tokens = adminFcmDevices.map(i => i.token)
          // console.log("tokens : ", tokens)
          // await utils.sendNotificationsInBatches(tokens, notificationMessage);
          adminFcmDevices.forEach(async i => {
            const token = i.token
            console.log("token : ", token)
            await utils.sendNotification(token, notificationMessage);
          })
          const adminNotificationData = {
            title: notificationMessage.title,
            body: notificationMessage.description,
            // description: notificationMessage.description,
            type: "subscription_downgrade",
            receiver_id: admins._id,
            related_to: trial._id,
            related_to_type: "trial",
          };
          const newAdminNotification = new admin_notification(adminNotificationData);
          console.log("newAdminNotification : ", newAdminNotification)
          await newAdminNotification.save();
        } else {
          console.log(`No active FCM tokens found for admin ${admin._id}.`);
        }
      }

      return res.json({ message: "Plan converted to Freemium", data: trial, code: 200 })
    }
  } catch (error) {
    console.log("errorewre", error)
    utils.handleError(res, error)
  }
}

exports.cancelScheduledUpdate = async (req, res) => {
  try {
    const user_id = req.user._id;

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

exports.registration = async (req, res) => {
  try {
    const { first_name, last_name, email, country_code, mobile_number,
      company_name, country, how_can_we_help_you } = req.body;

    const isEmailExistInRegistration = await Registration.findOne({ email: email });
    if (isEmailExistInRegistration) return utils.handleError(res, { message: "Email already Exists.", code: 400 })

    const isEmailExistInCompany = await Company.findOne({ email: email });
    if (isEmailExistInCompany) return utils.handleError(res, { message: "Email already Exists", code: 400 })

    const emailDomain = extractDomainFromEmail(email);
    const isDomainExists = await Company.findOne({ email_domain: emailDomain });
    if (isDomainExists) return utils.handleError(res, { message: "Domain name already Exists", code: 400 });


    const isEmailExist = await Registration.findOne({ email: email });

    if (isEmailExist) return utils.handleError(res, { message: "You have already register", code: 400 });
    // if (mobile_number) {
    //   const isPhoneNumberExist = await Registration.findOne({ mobile_number: mobile_number });
    //   console.log("isPhoneNumberExist", isPhoneNumberExist)
    //   if (isPhoneNumberExist) return utils.handleError(res, { message: "You have already register", code: 400 });
    // }
    const data = {
      first_name,
      last_name,
      email,
      country_code,
      mobile_number,
      company_name,
      country,
      how_can_we_help_you
    }
    const register = new Registration(data);
    const userInfo = {
      id: register._id,
      first_name: register.first_name,
      last_name: register.last_name,
      email: register.email,
      country_code: register.country_code,
      mobile_number: register.mobile_number,
      company_name: register.company_name,
      country: register.country,
      how_can_we_help_you: register.how_can_we_help_you,
    };
    const locale = req.getLocale()
    const isProduction = process.env.NODE_ENV === 'production';
    const baseURL = isProduction
      ? process.env.PRODUCTION_WEBSITE_URL
      : process.env.LOCAL_WEBSITE_URL;

    const dataForMail = {
      subject: 'Your Reachmate Account Creation',
      company_name: `${userInfo.first_name} ${userInfo.last_name}`,
      email: userInfo.email,
      link: `${baseURL}CreateAccount?email=${userInfo.email}`
    };


    emailer.sendApprovalEmail(locale, dataForMail, 'registration-accepted');
    await register.save()

    res.json({
      message: "Registeration successfully.Verification link has been sent on email to verify and set password. ",
      code: 200
    })
  } catch (error) {
    console.log
    utils.handleError(res, error)
  }
}

exports.contactUs = async (req, res) => {
  try {
    const { first_name, last_name, email, country_code, mobile_number, company_name, country, how_can_we_help_you } = req.body;

    // const isEmailExist = await ContactUs.findOne({ email: email });

    // if (isEmailExist) return utils.handleError(res, { message: "You have already register", code: 400 });
    // if(mobile_number){
    //   const isPhoneNumberExist = await ContactUs.findOne({ mobile_number: mobile_number });
    //   console.log("isPhoneNumberExist", isPhoneNumberExist)
    //   if (isPhoneNumberExist) return utils.handleError(res, { message: "You have already register", code: 400 });
    // }

    const data = {
      first_name,
      last_name,
      email,
      country_code,
      mobile_number,
      company_name,
      country,
      how_can_we_help_you
    }

    const contactus = new ContactUs(data);
    await contactus.save()

    res.json({ message: "Submitted Successfully", code: 200 })
  } catch (error) {
    console.log
    utils.handleError(res, error)
  }
}



function sendMail(data) {

  function convertPriceInterval(price, interval) {

    let intervalString = "";

    if (interval == 1) {
      intervalString = "month"
    } else if (interval == 3) {
      intervalString = "3 months"
    } else if (interval == 6) {
      intervalString = "6 months"
    } else if (interval == 12) {
      intervalString = "year"
    }

    return `${price}/${intervalString}`;

  }

  emailer.sendBuySubscriptionEmail(data.locale, {
    email: data.email,
    full_name: data.full_name,
    subscription_name: data.subscription_name,
    purchased_date: moment(data.purchased_date).format('DD MMMM YYYY'),
    price: convertPriceInterval(data.price, data.interval),
    start_date: moment(data.start_date).format('DD MMMM YYYY'),
  },
    "subscription_started"
  )
}


async function generateAndSavePDF(html, options, fileName, data) {
  console.log("inside the function");
  return new Promise((resolve, reject) => {
    console.log("options", options)
    pdf.create(html, options).toBuffer(async function (err, buffer) {
      if (err) return console.log("err>>>>>>>>>>>>>>>>>>>>>>>>>>", err);
      try {
        const file = {
          data: buffer,
          name: fileName,
          mimetype: "application/pdf",
        };

        let media = await uploadFile({
          file: file,
          path: `${process.env.STORAGE_PATH}/transaction`,
        });

        media = `transaction/${media}`

        console.log("invoice_iiiiiiiiiiidd", data.transaction_id);
        console.log("media", media)


        await Transaction.findByIdAndUpdate(data.transaction_id, { invoice: media })

        resolve(media);
      } catch (error) {
        reject(error);
      }

    })


  });
}


function calculatePercentage(amount, percentage) {
  const decimalPercentage = percentage / 100;
  const percentageAmount = amount * decimalPercentage;
  return Math.round(percentageAmount * 100) / 100;
}

async function sendSubscriptionInvoiceEmail(transaction, subscription, plan, user) {

  // const billing_address = user?.billing_address;
  // const line_1 = `${billing_address?.address_line_1}${billing_address?.address_line_2 ?`, ${billing_address?.address_line_2}` : ''}`
  // const line_2 = `${billing_address?.city}, ${billing_address?.state}, ${billing_address?.country},${billing_address?.pin_code}`;



  const planFromDataBase = await Plan.findOne({ plan_id: plan.id })
  const amount = (plan?.item?.amount ?? 0) / 100
  const gst_amount = calculatePercentage(amount, 18);
  const sub_total = amount - gst_amount;

  // Read the logo image file
  const logoPath = "./public/logo/LogoO.png";
  const logoBuffer = fs.readFileSync(logoPath);
  const base64Logo = Buffer.from(logoBuffer).toString("base64");
  const logoDataUrl = `data:image/png;base64,${base64Logo}`;

  const data = {
    logo: logoDataUrl,
    transaction_id: transaction._id,
    subcription_id: transaction.subcription_id,
    email: user?.email,
    invoice_date: moment().format('DD MMM YYYY'),
    plan_name: planFromDataBase?.item?.name,
    amount: commaNumber(amount),
    gst: commaNumber(gst_amount),
    sub_total: commaNumber(sub_total),
    renew_on: moment(subscription.charge_at * 1000).format('DD MMMM YYYY'),
    year: new Date().getFullYear()
  }

  var ejsFile = "./views/invoiceTemplate.ejs";
  const contents = fs.readFileSync(ejsFile, "utf8");

  const html = ejs.render(contents, data);
  console.log(html)

  var options = {
    format: "A4",
    width: "14in",
    orientation: "landscape",
    height: "21in",
    timeout: 540000,
  };

  const fileName =
    Date.now() + `reachmate-invoice.pdf`;

  const invoice_image = await generateAndSavePDF(
    html,
    options,
    fileName,
    data
  );

  let mailOptions = {
    to: user?.email,
    name: user?.full_name,
    website_url: process.env.PRODUCTION_WEBSITE_URL,
    logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`,
    year: new Date().getFullYear(),
    subject: `ReachMate Invoice`,
    attachments: [],
  };

  mailOptions.attachments.push({
    filename: `Invoice.pdf`,
    path: `${process.env.STORAGE_PATH_HTTP_AWS}/${invoice_image}`,
  });

  sendInvoiceEmailForTransaction(mailOptions)
}


exports.sendMail = (req, res) => {
  try {
    console.log("mailOptions")
    const transaction = {
      _id: "660b9d83ac4587374aa93fd5",
      status: "renewed",
      user_id: "65f3e7b804b5f3e6d07ef559",

      user_type: "individual",
      country: "India",
      plan_id: "plan_NocKwR6lMi1uQS",
      subcription_id: "sub_Nte3PhZtdx5bt0",
      amount: 1062,
      createdAt: "2024-04-02T05:54:11.325+00:00",
      updatedAt: "2024-04-02T05:54:11.325+00:00",
      __v: 0

    }

    const subscription = {
      id: 'sub_Nte3PhZtdx5bt0',
      entity: 'subscription',
      plan_id: 'plan_NocKwR6lMi1uQS',
      customer_id: 'cust_Nob45fh3GkB4xq',
      status: 'active',
      current_start: 1712037179,
      current_end: 1719858600,
      ended_at: null,
      quantity: 1,
      notes: { user_id: '65f3e7b804b5f3e6d07ef559', user_type: 'individual' },
      charge_at: 1719858600,
      start_at: 1712037179,
      end_at: 2019753000,
      auth_attempts: 0,
      total_count: 40,
      paid_count: 1,
      customer_notify: true,
      created_at: 1712037154,
      expire_by: 1712037754,
      short_url: null,
      has_scheduled_changes: false,
      change_scheduled_at: null,
      source: 'api',
      payment_method: 'card',
      offer_id: null,
      remaining_count: 39
    }

    const plan = {
      id: 'plan_NocKwR6lMi1uQS',
      entity: 'plan',
      interval: 3,
      period: 'monthly',
      item: {
        id: 'item_NocKwQcyhfuy0m',
        active: true,
        name: 'Personal/Corporate',
        description: 'Elevate your networking game with our three-month subscription plan at a discounted rate of ₹1062! This plan offers the same comprehensive features as the one-month plan, allowing you to make lasting connections and streamline your professional interactions. Enjoy the flexibility of an extended subscription period with significant cost savings.',
        amount: 106200,
        unit_amount: 106200,
        currency: 'INR',
        type: 'plan',
        unit: null,
        tax_inclusive: false,
        hsn_code: null,
        sac_code: null,
        tax_rate: null,
        tax_id: null,
        tax_group_id: null,
        created_at: 1710939406,
        updated_at: 1710939406
      },
      notes: {
        plan_type: 'individiual',
        trial_period_days: '180',
        amount_without_discount: '0'
      },
      created_at: 1710939406
    }

    const user = {
      text_color: '#ffffff',
      social_type: null,
      is_card_created: true,
      notification: true,
      status: 'active',
      _id: "65f3e7b804b5f3e6d07ef559",
      first_name: 'Vikas',
      last_name: 'Dixit',
      password: '$2a$05$W/Os2Dp5et79Z5mhfhNGt.2IRzHnarZFInvGWVlsmGfS1ObvelBbu',
      confirm_password: '12345678',
      email: 'promatics.mohammadafzal@gmail.com',
      email_verified: true,
      full_name: 'Vikas Dixit',
      createdAt: "2024-03-15T06:16:24.437Z",
      updatedAt: "2024-04-01T09:09: 43.432Z",
      user_type: 'personal'
    }

    sendSubscriptionInvoiceEmail(transaction, subscription, plan, user)

    res.json({ "send": "sfd" })
  } catch (error) {
    console.log("error", error)
    utils.handleError(res, error)
  }
}


exports.deleteCard = async (req, res) => {
  try {
    // const isSubscriptionActive = await isSubscriptionActiveOrNot(req.user);
    // if (isSubscriptionActive === false) return utils.handleError(res, { message: "Your subscription has expired. Please renew to continue accessing our services", code: 400 });

    const { card_id } = req.body;
    const user_id = req.user._id;

    const isCardExist = await SharedCards.findOne({
      user_id: mongoose.Types.ObjectId(user_id),
      card_id: mongoose.Types.ObjectId(card_id)
    })

    console.log("isCardExist", isCardExist)
    if (!isCardExist) return utils.handleError(res, { message: "Card not found", code: 404 });

    await isCardExist.remove()

    res.json({ message: "Card deleted successfully", card_id, code: 200 })
  } catch (error) {
    console.log("error", error)
    utils.handleError(res, error)
  }
}




exports.deleteUserCards = async (req, res) => {
  try {
    const isSubscriptionActive = await isSubscriptionActiveOrNot(req.user);
    if (!isSubscriptionActive) {
      return utils.handleError(res, {
        message: "Your subscription has expired. Please renew to continue accessing our services.",
        code: 400,
      });
    }

    const { card_id } = req.body;
    const user_id = req.user._id;

    let cardDeleted = false; // Flag to track if the card was deleted

    console.log("User before deletion:", req.user);

    const isCardExistInCardDetails = await CardDetials.findOne({
      _id: mongoose.Types.ObjectId(card_id),
    });

    if (isCardExistInCardDetails) {
      await CardDetials.findByIdAndDelete(card_id);
      cardDeleted = true;
    }

    const isCardExistInCompany = await Company.findOne({
      _id: mongoose.Types.ObjectId(card_id),
    });

    if (isCardExistInCompany) {
      const { email_domain, access_code } = isCardExistInCompany;

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user_id,
          "companyAccessCardDetails.email_domain": email_domain,
          "companyAccessCardDetails.access_code": access_code,
        },
        {
          $pull: {
            companyAccessCardDetails: { email_domain, access_code },
          },
        },
        { new: true }
      );

      if (updatedUser) {
        cardDeleted = true;
      }
    } else {
      console.log("Card not found in users company access card details.");
    }

    const updatedUserWithPersonalCards = await User.findOneAndUpdate(
      {
        _id: user_id,
        personal_cards: mongoose.Types.ObjectId(card_id),
      },
      {
        $pull: { personal_cards: mongoose.Types.ObjectId(card_id) },
      },
      { new: true }
    );

    if (updatedUserWithPersonalCards) {
      cardDeleted = true;
    } else {
      console.log("Card not found in users personal cards.");
    }

    console.log("User After deletion:", req.user);

    if (!cardDeleted) {
      return utils.handleError(res, {
        message: "Card not found",
        code: 404,
      });
    }

    return res.status(200).json({
      message: "Card deleted successfully",
      code: 200,
    });
  } catch (error) {
    console.error("Error in deleteCard:", error);
    utils.handleError(res, {
      message: "An error occurred while deleting the card.",
      error,
    });
  }
};





exports.addSubscription = async (req, res) => {
  try {
    const { razorpay_subscription_id } = req.body;
    const user_id = req.user._id;

    if (!razorpay_subscription_id) return utils.handleError(res, { message: "Subscription id is missing", code: 400 });
    const subscription = await instance.subscriptions.fetch(razorpay_subscription_id);

    if (!subscription) return utils.handleError(res, { message: "Subscription not found", code: 404 });
    if (subscription.status === "created") return utils.handleError(res, { message: "Subscription is not authenticated yet", code: 400 });
    if (subscription.status === "expired") return utils.handleError(res, { message: "Subscription is expired", code: 400 });
    if (subscription.status === "cancelled") return utils.handleError(res, { message: "Subscription is cancelled", code: 400 });

    const SubscriptionIndatabase = await Subscription.findOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: razorpay_subscription_id })

    if (!SubscriptionIndatabase) return utils.handleError(res, { message: "Subscription not found", code: 404 });


    await Subscription.updateOne({ user_id: mongoose.Types.ObjectId(user_id), subscription_id: razorpay_subscription_id }, { status: subscription.status });

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


exports.getPaymentDetails = async (req, res) => {
  try {
    const user_id = req.user._id
    const subcription = await Subscription.findOne({ user_id });

    const subcription_razorpay = await instance.subscriptions.fetch(subcription.subscription_id);

    console.log("subcription_razorpay", subcription_razorpay)
    const customer = await instance.customers.fetch(subcription_razorpay.customer_id);

    res.json({ data: subcription_razorpay, customer })
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
    data.full_name = req?.user?.full_name

    res.json({ data: data, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.editBillingAddress = async (req, res) => {
  try {
    const user_id = req.user._id;

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

    await User.findByIdAndUpdate(user_id, { $set: { billing_address: billing_address } })


    res.json({ message: "Billing address saved successfully", code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}



exports.checkProfileIsExist = async (req, res) => {
  try {
    const data = req.body;

    const user = await User.findOne({ social_id: data.social_id }).select("_id social_id first_name last_name full_name email");

    if (!user) {
      return res.status(404).json({ message: 'User does not exist.', code: 404 });
    } else {
      return res.status(200).json({ data: user, code: 200 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


/*Honey work start here */
exports.getUserPlans = async (req, res) => {
  try {
    const usersPlan = await Plan.find({
      plan_type: 'individual',
      individual_selected: true
    }).sort({ 'item.amount': 1 })
    console.log("usersPlan : ", usersPlan)
    return res.status(200).json({
      message: "User plans fetched successfully",
      data: usersPlan,
      code: 200
    })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.getMyBillingAddress = async (req, res) => {
  try {
    const userId = req.user._id
    console.log("user id : ", userId)
    const userdata = await User.findOne({ _id: userId })
    console.log("userdata : ", userdata)
    return res.status(200).json({
      message: "Billing address fetched successfully",
      data: userdata.billing_address,
      code: 200
    })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.getPaymentHistoryByUser = async (req, res) => {
  try {
    const user_id = req.user._id;
    console.log("user id : ", user_id)

    const allPayments = await instance.payments.all({
      count: 100,
    });
    console.log("allPayments : ", allPayments)

    const userPayments = allPayments.items.filter(payment => {
      return payment.notes && payment.notes.user_id === user_id.toString();
    });
    console.log("userPayments : ", userPayments)

    res.json({ data: userPayments, code: 200 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching payment history', code: 500 });
  }
};


exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user._id
    console.log("userId : ", userId)
    const userdata = await User.findOne({ _id: userId })
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
    utils.handleError(res, error)
  }
}


// exports.generateSignatureForIOS = async (req, res) => {
//   try {
//     try {
//       const manifest = req.body;
//       const path = process.env.STORAGE_PATH_FOR_EXCEL
//       const privateKeyPem = fs.readFileSync(`${path}/signature/private_key.pem`, "utf8");
//       const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);

//       const manifestString = JSON.stringify(manifest);

//       const md = forge.md.sha1.create();
//       md.update(manifestString, "utf8");

//       const signature = privateKey.sign(md);

//       const signatureBase64 = forge.util.encode64(signature);

//       return res.json({ message: "signature generated successfully", signature: signatureBase64, code: 200 });
//     } catch (error) {
//       utils.handleError(res, error)
//     }
//   } catch (error) {
//     utils.handleError(res, error)
//   }
// }


// exports.generateSignatureForIOS = async (req, res) => {
//   try {
//     const manifest = req.body;

//     console.log("manifest" , manifest)
//     const storagePath = process.env.STORAGE_PATH_FOR_EXCEL;

//     const appleWWDRCAPath = path.join(storagePath, "signature/applecode.pem");
//     const certificatePath = path.join(storagePath, "signature/certificate.pem");
//     const privateKeyPath = path.join(storagePath, "signature/private.key");
//     const outPath = path.join(storagePath, "signature/signed_manifest.der");

//     console.log("appleWWDRCAPath : ", appleWWDRCAPath, " certificatePath : ", certificatePath, " privateKeyPath : ", privateKeyPath)
//     if (!fs.existsSync(appleWWDRCAPath)) {
//       throw new Error(`File not found: ${appleWWDRCAPath}`);
//     }
//     if (!fs.existsSync(certificatePath)) {
//       throw new Error(`File not found: ${certificatePath}`);
//     }
//     if (!fs.existsSync(privateKeyPath)) {
//       throw new Error(`File not found: ${privateKeyPath}`);
//     }

//     const manifestString = JSON.stringify(manifest);

//     const command = `openssl smime -binary -sign \
//                 -certfile "${appleWWDRCAPath}" \
//                 -signer "${certificatePath}" \
//                 -inkey "${privateKeyPath}" \
//                 -in "${manifestString}" \
//                 -out "${outPath}" \
//                 -outform DER`;


//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error: ${error.message}`);
//         return;
//       }
//       console.log("stdout", stdout)
//       if (stderr) {
//         console.error(`stderr: ${stderr}`);
//         return;
//       }
//       console.log(`Signature generated successfully.`);
//     });


//     // const opensslCommand = `openssl smime -binary -sign \
//     //   -certfile ${appleWWDRCAPath} \
//     //   -signer ${certificatePath} \
//     //   -inkey ${privateKeyPath} \
//     //   -outform DER`;

//     // exec(opensslCommand, { input: manifestString }, (error, stdout, stderr) => {
//     //   if (error) {
//     //     console.error(`Error executing openssl command: ${error.message}`);
//     //     console.error(`openssl stderr: ${stderr}`);
//     //     return res.status(500).json({
//     //       message: "Failed to generate signature",
//     //       error: error.message,
//     //       stderr: stderr,
//     //     });
//     //   }

//     //   const signatureBase64 = Buffer.from(stdout, "binary").toString("base64");

//     //   return res.json({
//     //     message: "signature generated successfully",
//     //     signature: signatureBase64,
//     //     code: 200,
//     //   });
//     // });

//     res.json({ status: "ok" })
//   } catch (error) {
//     utils.handleError(res, error)
//   }
// };


exports.generateSignatureForIOS = async (req, res) => {
  try {
    const manifest = req.body;
    console.log("Manifest received:", manifest);
    const storagePath = process.env.STORAGE_PATH_FOR_EXCEL;
    const appleWWDRCAPath = path.join(storagePath, "signature/applecode.pem");
    const certificatePath = path.join(storagePath, "signature/certificate.pem");
    const privateKeyPath = path.join(storagePath, "signature/private_key.pem");
    const manifestPath = path.join(storagePath, "signature/manifest.json");
    const outPath = path.join(storagePath, "signature/signed_manifest.der");
    console.log("Paths:", {
      appleWWDRCAPath,
      certificatePath,
      privateKeyPath,
      manifestPath,
    });
    // Check if required files exist
    if (!fs.existsSync(appleWWDRCAPath)) throw new Error(`File not found: ${appleWWDRCAPath}`);
    if (!fs.existsSync(certificatePath)) throw new Error(`File not found: ${certificatePath}`);
    if (!fs.existsSync(privateKeyPath)) throw new Error(`File not found: ${privateKeyPath}`);
    // Save manifest as a file
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    // OpenSSL command to sign the manifest file
    const command = `openssl smime -binary -sign \
      -certfile "${appleWWDRCAPath}" \
      -signer "${certificatePath}" \
      -inkey "${privateKeyPath}" \
      -in "${manifestPath}" \
      -out "${outPath}" \
      -outform DER`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`OpenSSL Error: ${error.message}`);
        return res.status(500).json({ message: "Failed to generate signature", error: error.message });
      }
      if (stderr) {
        console.error(`OpenSSL stderr: ${stderr}`);
        return res.status(500).json({ message: "OpenSSL encountered an issue", stderr });
      }
      console.log("Signature generated successfully:", outPath);
      // Convert the signed file to Base64 and send it as a response
      const signatureBase64 = fs.readFileSync(outPath).toString("base64");
      return res.json({
        message: "Signature generated successfully",
        signature: signatureBase64,
        filePath: outPath,
        code: 200,
      });
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "An error occurred", error: error.message });
  }
};


exports.addOCRCard = async (req, res) => {
  try {
    const user = req.user
    console.log('User : ', user)
    const owner_id = req.user._id;

    let activeSubscription = await Subscription.findOne({ user_id: owner_id, status: "active" })
    console.log("activeSubscription : ", activeSubscription)

    if (!activeSubscription) {
      activeSubscription = await Trial.findOne({ user_id: owner_id, status: "active" })
      console.log("activeSubscription : ", activeSubscription)
    }

    if (!activeSubscription) {
      return res.status(401).json({
        message: "You do not have a valid subscription"
      }
      )
    }

    if (activeSubscription) {
      const plandata = await Plan.findOne({ plan_id: activeSubscription.plan_id })
      console.log("plandata : ", plandata, " plandata.plan_variety : ", plandata.plan_variety)
      if (plandata.plan_variety === "freemium") {
        console.log("user?.ocr_cards?.length : ", user?.ocr_cards?.length)
        const SharedCardCounts = await SharedCards.countDocuments({ user_id: owner_id })
        console.log("SharedCardCounts : ", SharedCardCounts)
        if (SharedCardCounts >= 10) {
          return res.status(403).json({
            message: "Exceed the limit of sharing cards",
            code: 403
          })
        }
        if (user?.ocr_cards?.length >= 5) {
          return res.status(403).json({
            message: "You have reached the maximum limit of freemium plan",
            code: 403
          })
        }
      }
    }

    // const isFirstCard = user.personal_cards.length === 0 && user.companyAccessCardDetails.length === 0 && user.ocr_cards.length === 0;
    // console.log('cardd is first card', isFirstCard)

    const data = req.body;
    const card = {
      owner_id,
      card_type: 'ocr',
      business_logo: data.business_logo,
      qr_logo: data.qr_logo,
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
      },
      // primary_card: isFirstCard,
    }
    const cardData = new CardDetials(card)
    await cardData.save()

    console.log('new added card : ', cardData)

    //--------------------------------------
    await User.findByIdAndUpdate(owner_id, {
      $push: { ocr_cards: cardData._id },
    });

    await User.findByIdAndUpdate(owner_id, { is_card_created: true, text_color: data.text_color })

    // await giveTrialIfNotGive(owner_id)
    const sharedCard = new SharedCards({
      card_id: cardData._id,
      user_id: owner_id,
      card_owner_id: owner_id,
    });

    await sharedCard.save();

    await SavedCard.deleteOne({ owner_id: owner_id })

    const accountlog = await user_account_log.create({
      user_id: owner_id,
      action: 'OCR Card Added',
      previous_status: 'OCR Card Added',
      new_status: 'OCR Card Added',
      performed_by: 'user',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)


    return res.json({
      code: 200, message: "OCR Card Saved successfully",
      cardData: cardData
    })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.getOCRCards = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("User ID : ", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(422).json({ code: 422, message: "ID_MALFORMED" });
    }

    const OCRCards = await CardDetials.find({
      owner_id: userId,
      card_type: "ocr",
    });

    if (!OCRCards || OCRCards.length === 0) {
      return res.status(204).json({ errors: { msg: "No OCR cards found for this user." } });
    }

    return res.status(200).json({ data: OCRCards });
  } catch (error) {
    return res.status(500).json({ errors: { msg: error } });
  }
};


exports.checkIsTrialSubscriptionExisted = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("User ID : ", userId);
    const trialSubscription = await Trial.findOne({ user_id: userId });
    console.log("trialSubscription : ", trialSubscription)
    if (trialSubscription) {
      return res.json({ message: "Trial Subscription Existed", data: trialSubscription, is_subscriber: true, code: 200 });
    }
    const activeSubscription = await Subscription.findOne({ user_id: userId })
    console.log("activeSubscription : ", activeSubscription)
    if (activeSubscription) {
      return res.json({ message: "Active Subscription Existed", data: activeSubscription, is_subscriber: true, code: 200 })
    }
    return res.json({ message: "No Subscription Existed", is_subscriber: false, code: 200 })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}

exports.giveFreeTrialToFirstUser = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("User ID : ", userId);
    const userdata = await User.findOne({ _id: userId });
    console.log("userdata : ", userdata);
    const plansdata = await Plan.findOne({ individual_selected: true, period: "monthly", plan_variety: "premium" })
    console.log("plansdata : ", plansdata)
    const today = new Date();
    const endedat = new Date(today);
    endedat.setMonth(today.getMonth() + 6);
    console.log("startedat : ", today, " endedat : ", endedat)
    const firstTrial = await Trial.create({
      user_id: userId,
      plan_id: plansdata.plan_id,
      status: "active",
      start_at: today,
      end_at: endedat
    })
    console.log("firstTrial : ", firstTrial)


    // admin notification
    const admins = await admin.findOne({ role: 'admin' });
    console.log("admins : ", admins)

    if (admins) {
      const notificationMessage = {
        title: 'Free Trial to New User',
        description: `Free Trial granted to new User with name ${userdata.full_name} . Plan ID : ${firstTrial.plan_id}`,
        trial_id: firstTrial._id
      };

      const adminFcmDevices = await fcm_devices.find({ user_id: admins._id });
      console.log("adminFcmDevices : ", adminFcmDevices)

      if (adminFcmDevices && adminFcmDevices.length > 0) {
        // let tokens = adminFcmDevices.map(i => i.token)
        // console.log("tokens : ", tokens)
        // await utils.sendNotificationsInBatches(tokens, notificationMessage);
        adminFcmDevices.forEach(async i => {
          const token = i.token
          console.log("token : ", token)
          await utils.sendNotification(token, notificationMessage);
        })
        const adminNotificationData = {
          title: notificationMessage.title,
          body: notificationMessage.description,
          // description: notificationMessage.description,
          type: "free_trial_to_new_user",
          receiver_id: admins._id,
          related_to: firstTrial._id,
          related_to_type: "trial",
        };
        const newAdminNotification = new admin_notification(adminNotificationData);
        console.log("newAdminNotification : ", newAdminNotification)
        await newAdminNotification.save();
      } else {
        console.log(`No active FCM tokens found for admin ${admin._id}.`);
      }
    }

    //user notification
    const userFcmDevices = await fcm_devices.find({ user_id: userdata._id });
    console.log("userFcmDevices : ", userFcmDevices)
    const notificationMessage = {
      title: 'Free Trial to New User',
      description: `Congratulations! you got free trial for six month. Plan ID : ${firstTrial.plan_id}`,
      trial_id: firstTrial._id
    };
    if (userFcmDevices && userFcmDevices.length > 0) {
      // let tokens = adminFcmDevices.map(i => i.token)
      // console.log("tokens : ", tokens)
      // await utils.sendNotificationsInBatches(tokens, notificationMessage);
      userFcmDevices.forEach(async i => {
        const token = i.token
        console.log("token : ", token)
        await utils.sendNotification(token, notificationMessage);
      })
      const userNotificationData = {
        title: notificationMessage.title,
        body: notificationMessage.description,
        // description: notificationMessage.description,
        type: "free_trial_to_new_user",
        receiver_id: userdata._id,
        related_to: firstTrial._id,
        related_to_type: "trial",
      };
      const newuserNotification = new notification(userNotificationData);
      console.log("newuserNotification : ", newuserNotification)
      await newuserNotification.save();
    } else {
      console.log(`No active FCM tokens found for user ${userdata._id}.`);
    }


    const accountlog = await user_account_log.create({
      user_id: userId,
      action: 'Free Trial to New User',
      previous_status: 'Free Trial to New User',
      new_status: 'Free Trial to New User',
      performed_by: 'reachmate',
      date_and_time: new Date()
    })
    console.log("accountlog : ", accountlog)

    return res.status(200).json({
      message: "Free Trial assigned to first user successfully",
      data: firstTrial,
      code: 200
    })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}


exports.createSessionActivity = async (req, res) => {
  try {
    const { session_token, user_id, action, route } = req.body
    console.log("body : ", req.body)
    const session = await account_session.findOne({ session_id: session_token, user_id: new mongoose.Types.ObjectId(user_id), session_status: "active" })
    console.log("session : ", session)
    if (!session) {
      return res.status(204).json({ message: "Invalid session id", code: 403 });
    }

    const previousactivity = await session_activity.findOne({ session_unique_id: session_token, user_id: new mongoose.Types.ObjectId(user_id) }).sort({ session_count: -1 });
    console.log("previousactivity : ", previousactivity)

    let sessioncount = 1
    if (previousactivity) {
      sessioncount = previousactivity.session_count + 1
      previousactivity.end_at = new Date()
      await previousactivity.save()
    }
    const newactivity = await session_activity.create({
      session_id: session._id,
      session_unique_id: session_token,
      user_id: user_id,
      action,
      route,
      date_and_time: new Date(),
      performed_by: 'user',
      status: 'completed',
      session_count: sessioncount,
      start_end: new Date()
    })

    console.log("newactivity : ", newactivity)
    return res.status(200).json({
      message: "Session activity created successfully",
      data: newactivity,
      code: 200
    })
  } catch (error) {
    console.log(error)
    utils.handleError(res, error)
  }
}