const crypto = require('crypto')
const algorithm = 'aes-256-ecb'
const secret = process.env.JWT_SECRET
const utils = require("./utils")

module.exports = {
  /**
   * Checks is password matches
   * @param {string} password - password
   * @param {Object} user - user object
   * @returns {boolean}
   */
  async checkPassword(password, user) {
    console.log("password",password)
    console.log("user",user)
    return new Promise((resolve, reject) => {
      user.comparePassword(password, (err, isMatch) => {
        console.log("err",err)
        if (err) {
          reject(utils.buildErrObject(422, err.message))
        }
        if (!isMatch) {
          resolve(false)
        }
        resolve(true)
      })
    })
  },


  /**
   * Encrypts text
   * @param {string} text - text to encrypt
   */
  encrypt(text) {
    const cipher = crypto.createCipher(algorithm, secret)
    let crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex')
    return crypted
  },

  /**
   * Decrypts text
   * @param {string} text - text to decrypt
   */
  decrypt(text) {
    const decipher = crypto.createDecipher(algorithm, secret)
    try {
      let dec = decipher.update(text, 'hex', 'utf8')
      dec += decipher.final('utf8')
      return dec
    } catch (err) {
      return err
    }
  }
}
