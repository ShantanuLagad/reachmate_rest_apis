const { buildErrObject } = require("../middleware/utils");
var mongoose = require("mongoose");
const querystring = require('querystring');
const utils = require('../middleware/utils')
const Notification = require("../models/notification")
const fs = require("fs")
const path = require("path")


const AWS = require("aws-sdk");
const ACCESS_KEY = process.env.ACCESS_KEY
const SECRET_KEY = process.env.SECRET_KEY
const Bucket = process.env.BUCKET
const REGION = process.env.REGION

var bucket = new AWS.S3({
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_KEY,
  region: REGION,
});

module.exports = {

  /**
   * in case need to get id without requireAuth
   * @param {String} token - binary file with path
  */

  async getUserIdFromToken(token) {
    return new Promise((resolve, reject) => {
      const jwt = require("jsonwebtoken");
      const auth = require("../middleware/auth");
      jwt.verify(auth.decrypt(token), process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          reject(buildErrObject(401, "Unauthorized"));
        }
        resolve(decoded.data);
      });
    });
  },

  /**
   * upload file to server
   * @param {Object} object - binary file with path
  */

  async uploadFileToLocal(object) {
    console.log("object", object)
    return new Promise((resolve, reject) => {
      var obj = object.file;
      var name = Date.now() + obj.name;
      obj.mv(object.path + "/" + name, function (err) {
        if (err) {
          reject(buildErrObject(422, err.message));
        }
        resolve(name);
      });
    });
  },



  // S3 BUCKET
  async uploadFile(object) {
    return new Promise(async (resolve, reject) => {
      var file = object.file;
      var filename = Date.now() + file.name;

      console.log("OBJ in upload file is here---", file.data);
      console.log("OBJ in upload file is here---", file.mimetype);
      console.log("object.path + / + filename", object.path + "/" + filename);

      const params = {
        Bucket: Bucket,
        Key: object.path + "/" + filename,
        Body: file.data,
        ContentType: file.mimetype,
      };
      return bucket.upload(params, function (err, data) {
        if (err) {
          console.log("----err----", err);
          reject(buildErrObject(422, err.message));
        }
        console.log("data", data)
        resolve(filename);
      });
    });
  },

  async uploadExcelFile(excelFilePath) {
    const file = fs.readFileSync(excelFilePath);
    const filename = path.basename(excelFilePath);

    const params = {
      Bucket: Bucket,
      Key: excelFilePath,
      Body: file,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    return new Promise((resolve, reject) => {
      bucket.upload(params, function (err, data) {
        if (err) {
          console.error("Upload error: ", err);
          reject({ message: "File upload failed", error: err });
        } else {
          console.log("Upload success:", data);
          resolve(data.Location);
        }
      });
    });
  },


  //S3 BUCKET
  async uploadFilefromPath(object) {
    return new Promise(async (resolve, reject) => {
      var file = object.image_data;
      console.log("OBJ in upload file is here---", file);

      var filename = Date.now() + file.name;
      const params = {
        Bucket: Bucket,
        Key: object.path + "/" + filename,
        Body: file.data,
        ContentType: file.mimetype,
      };
      return bucket.upload(params, function (err, data) {
        if (err) {
          console.log("----err----", err);
          reject(buildErrObject(422, err.message));
        }
        resolve({ success: true, data: data });
      });
    });
  },

  /**
   * capitalize first letter of string
   * @param {string} string 
  */

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  /**
   * generate random string
   * @param {string} string 
  */

  async customRandomString(length, chars = 'abcdefghijklmnopqrstuvwxyz@1234567890!') {
    var result = "";
    for (var i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  },

  /**
   * generate random string
   * @param {string} string 
  */

  automatedString() {
    return Math.random().toString(36).slice(2);
  },

  /**
   * convert a given array of string to mongoose ids
   * @param {Array} array 
  */

  async convertToObjectIds(array) {
    return array.map(item => mongoose.Types.ObjectId(item));
  },

  /**
  * convert title to slug
  * @param {String} title 
 */
  async createSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  },

  /**
   * Validate the size
   * @param {File} file 
   * @param {Number} fize size in Byte 
  */
  async validateFileSize(file, size) {
    return new Promise(async (resolve, reject) => {

      try {

        if (file.size > size) {
          reject(buildErrObject(422, `File should be less than ${size / 1048576} MB`)); // convert byte to MB
        }
        resolve({
          success: true,
        })

      } catch (err) {
        reject(buildErrObject(422, err.message));
      }

    })

  },

  /**
   * Object to Query string
   * @param {Object} obj 
  */
  async objectToQueryString(obj) {

    let result = querystring.stringify(obj);

    return result

  }

};

