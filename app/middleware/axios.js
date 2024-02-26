const axios = require("axios").default;
/* const {
  buildSuccObject,
  buildErrObject,
  itemNotFound,
} = require("../middleware/utils");
const utils = require("../middleware/utils"); */

exports.POST = (url, body, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const resp = await axios({
        method: "post",
        url,
        headers,
        data: body,
      });

      console.log(resp)

      // console.log("resp", resp.data);
      resolve(resp.data);
    } catch (err) {
      console.log(err);
      reject(err.response)
      // resolve(err.data)
    }
  });
};

exports.GET = (url, body, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const resp = await axios({
        method: "get",
        url,
        headers,
      });

      resolve(resp);
    } catch (err) {
      console.log(err);

      reject(err.response)
    }
  });
};

exports.GET_FILE = (url, body, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const image = await axios.get(url, { responseType: "arraybuffer" });
      const returnedB64 = Buffer.from(image.data).toString("base64");

      resolve(returnedB64);
    } catch (err) {
      console.log(err.response);
      reject(err.response)
    }
  });
};
