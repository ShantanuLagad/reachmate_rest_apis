const mongoose = require('mongoose')
const requestIp = require('request-ip')
const { validationResult } = require('express-validator')
const { POST } = require('./axios')
const jwt = require('jsonwebtoken')
const auth = require('../middleware/auth')
const { admin } = require("./../../config/firebase");
const fcm_devices = require('../models/fcm_devices')
/**
 * Removes extension from file
 * @param {string} file - filename
 */
exports.removeExtensionFromFile = file => {
  return file
    .split('.')
    .slice(0, -1)
    .join('.')
    .toString()
}

/**
 * Gets IP from user
 * @param {*} req - request object
 */
exports.getIP = req => requestIp.getClientIp(req)

/**
 * Gets browser info from user
 * @param {*} req - request object
 */
exports.getBrowserInfo = req => req.headers['user-agent']

/**
 * Gets country from user using CloudFlare header 'cf-ipcountry'
 * @param {*} req - request object
 */
exports.getCountry = req =>
  req.headers['cf-ipcountry'] ? req.headers['cf-ipcountry'] : 'XX'

/**
 * Handles error by printing to console in development env and builds and sends an error response
 * @param {Object} res - response object
 * @param {Object} err - error object
 */
exports.handleError = (res, err) => {
  // Prints error in console
  if (process.env.NODE_ENV === 'development') {
    console.log(err)
  }
  if (err instanceof MongoError) {
    // Check MongoDB specific error codes and map them to appropriate HTTP status codes
    if (err.code === 17124) {
      // Example: Invalid aggregation error code
      err.code = 400; // Bad Request
      err.message = "Invalid data provided for aggregation.";
    } else if (err.code === 11000) {
      // Example: Duplicate key error
      err.code = 409; // Conflict
      err.message = "Duplicate key error.";
    } else {
      // Default MongoDB error mapping
      err.code = 500; // Internal Server Error
      err.message = "A database error occurred.";
    }
  }

  if ('statusCode' in err && "error" in err) {
    err.code = err?.statusCode;
    err.message = err?.error?.description
  }

  console.log("erorr", err)
  res.status(err?.code ?? 500).json({
    errors: {
      msg: err.message
    }
  })
}

/**
 * Builds error object
 * @param {number} code - error code
 * @param {string} message - error text
 */
exports.buildErrObject = (code, message) => {
  return {
    code,
    message
  }
}

/**
 * Builds error for validation files
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Object} next - next object
 */
exports.validationResult = (req, res, next) => {
  try {
    validationResult(req).throw()
    if (req.body.email) {
      req.body.email = req.body.email.toLowerCase()
    }
    return next()
  } catch (err) {
    return this.handleError(res, this.buildErrObject(422, err.array()))
  }
}

/**
 * Builds success object
 * @param {string} message - success text
 */
exports.buildSuccObject = message => {
  return {
    msg: message
  }
}

/**
 * Checks if given ID is good for MongoDB
 * @param {string} id - id to check
 */
exports.isIDGood = async id => {
  return new Promise((resolve, reject) => {
    const goodID = mongoose.Types.ObjectId.isValid(id)
    return goodID
      ? resolve(id)
      : reject(this.buildErrObject(422, 'ID_MALFORMED'))
  })
}

/**
 * Item not found
 * @param {Object} err - error object
 * @param {Object} item - item result object
 * @param {Object} reject - reject object
 * @param {string} message - message
 */
exports.itemNotFound = (err, item, reject, message) => {
  if (err) {
    reject(this.buildErrObject(422, err.message))
  }
  if (!item) {
    reject(this.buildErrObject(404, message))
  }
}

/**
 * Item already exists
 * @param {Object} err - error object
 * @param {Object} item - item result object
 * @param {Object} reject - reject object
 * @param {string} message - message
 */
exports.itemAlreadyExists = (err, item, reject, message) => {
  if (err) {
    reject(this.buildErrObject(422, err.message))
  }
  if (item) {
    reject(this.buildErrObject(422, message))
  }
}

function titleBoxLogin(self) {

  return new Promise(async (resolve, reject) => {
    try {

      const body = {
        "TbUser": {
          "username": process.env.TITLE_TOOL_BOX_USERNAME,
          "password": process.env.TITLE_TOOL_BOX_PASSWORD
        }
      }
      const headers = {
        "User-Agent": process.env.TITLE_TOOL_BOX_USER_AGENT,
        "Partner-Key": process.env.TITLE_TOOL_BOX_PARTNER_KEY
      }
      // url, body, headers = {}
      const URL = `${process.env.TITLE_TOOL_BOX_URL}login.json`
      var result = await POST(
        URL,
        body,
        headers
      );

      if (result.response.status == "OK") {
        resolve(result.response)
      } else {
        reject(self.buildErrObject(422, result.response.data.toString()))
      }

    } catch (err) {
      reject(self.buildErrObject(500, 'Internal Server Error'))
      console.log(err)
    }
  })
}

/**
 * Gets `ttbsid` from token
 * @param {string} token - Encrypted and encoded token
 */
exports.verifyToken = async token => {
  return new Promise((resolve, reject) => {
    // Decrypts, verifies and decode token
    jwt.verify(auth.decrypt(token), process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(this.buildErrObject(409, 'BAD_TOKEN'))
      }
      resolve(decoded.data.ttbsid)
    })
  })
}

/**
 * Generates a token
 * @param {Object} user - user object
 */
const generateToken = (ttbsid, mins = 240) => {
  // Gets expiration time
  const expiration =
    Math.floor(Date.now() / 1000) + 60 * mins

  // returns signed and encrypted token
  return auth.encrypt(
    jwt.sign(
      {
        data: {
          ttbsid: ttbsid
        },
        exp: expiration
      },
      process.env.JWT_SECRET
    )
  )
}



/**
 * Handle Cookie for Title Toolbox
 * @param {Object} req - request object
 * @param {Object} res - response object
 * @param {Object} next - next object
 */
exports.titleToolBoxAuth = async (req, res, next) => {
  try {


    if (req.headers && req.headers['oss-auth']) {
      const ttbsid = await this.verifyToken(req.headers['oss-auth']);
      req.TTBSID = ttbsid
    } else {
      const result = await titleBoxLogin(this);
      req.TTBSID = result.data.TTBSID;

      res.set('oss-auth', generateToken(req.TTBSID));
      res.set('Access-Control-Expose-Headers', 'oss-auth');
      // res.headers.TTBSID = res.TTBSID
      // res.cookie('oss-auth',result.data.TTBSID, { maxAge: 14400, httpOnly: false });
    }
    return next()
  } catch (err) {
    // console.log(err)
    return this.handleError(res, this.buildErrObject(err.code ? err.code : 422, err.message))
  }
}



/**
 * Notification
 */

exports.sendNotification = async (token, notificationData) => {
  try {
    // Ensure that the token is valid and not empty
    if (!token) {
      console.error("Invalid token provided.");
      return;
    }
    console.log('notificationData', notificationData)
    const message = {
      notification: {
        title: notificationData.title,
        body: notificationData.description,  // Corrected description field name to "body"
      },
      token: token  // This should be the user's FCM token
    };
    console.log("message : ", message)
    // Send the notification using Firebase Admin SDK
    await admin.messaging().send(message);
    console.log("Notification sent successfully to the user.");

  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

exports.sendPushNotification = async (
  tokens,
  notification
) => {
  try {

    // const notification = {
    //   title: title,
    //   body: body,
    //   // image: notificationData.icon
    //   //   ? notificationData.icon
    //   //   : `${process.env.NOTIFICATION_ICONS_PATH}/default.ico`,
    // };

    var message = {
      notification: notification,
      tokens: tokens,
    };


    console.log("final message", message);


    admin
      .messaging()
      .sendMulticast(message)
      .then((response) => {
        console.log("response", response.responses);
        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            // console.log("resp-->", resp);
            // console.log("idx-->", idx);
            if (!resp.success) {
              failedTokens.push(tokens[idx]);
            }
          });
          console.log("List of tokens that caused failures: " + failedTokens);
        }
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });

  } catch (err) {
    console.log(err);
    return false;
  }
};

const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

exports.sendNotificationsInBatches = async (token, notificationMessage) => {
  const batchSize = 500;
  const tokenChunks = chunkArray(token, batchSize);

  for (let chunk of tokenChunks) {
    const validTokens = chunk.filter(token => token && typeof token === 'string');
    if (validTokens.length === 0) continue;

    const sendPromises = validTokens.map(async (token) => {
      const message = {
        notification: {
          title: notificationMessage.title,
          body: notificationMessage.description,
        },
        token: token,
      };

      try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent to token:', token);
        console.log('Response:', response);
      } catch (error) {
        console.error('Error sending notification to token:', token, error);
        if (error.errorInfo && error.errorInfo.code === 'messaging/registration-token-not-registered') {
          console.log(`Removing invalid token: ${token}`);
          await fcm_devices.deleteOne({ token: token });
        }
      }
    });

    await Promise.all(sendPromises);
  }
};
