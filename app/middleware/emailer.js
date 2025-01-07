const nodemailer = require('nodemailer')
const mg = require('nodemailer-mailgun-transport')
const i18n = require('i18n')
const User = require('../models/user')
const { itemAlreadyExists } = require('../middleware/utils')
const { app } = require("../../config/emailer");
const APP_NAME = process.env.APP_NAME;
const { capitalizeFirstLetter } = require("../shared/helpers");
const VerificationToken=require("../models/verificationToken")
var jwt = require("jsonwebtoken");

const {
  handleError,
  getIP,
  buildErrObject,
  getCountryCode,
  sendPushNotification,
} = require("./utils");
/**
 * Sends email
 * @param {Object} data - data
 * @param {boolean} callback - callback
 */
const sendEmail = async (data, callback) => {
  const auth = {
    auth: {
      // eslint-disable-next-line camelcase
      api_key: process.env.EMAIL_SMTP_API_MAILGUN,
      domain: process.env.EMAIL_SMTP_DOMAIN_MAILGUN
    }
  }
  const transporter = nodemailer.createTransport(mg(auth))
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: `${data.user.name} <${data.user.email}>`,
    subject: data.subject,
    html: data.htmlMessage
  }
  transporter.sendMail(mailOptions, err => {
    if (err) {
      return callback(false)
    }
    return callback(true)
  })
}

/**
 * Prepares to send email
 * @param {string} user - user object
 * @param {string} subject - subject
 * @param {string} htmlMessage - html message
 */
const prepareToSendEmail = (user, subject, htmlMessage) => {
  user = {
    name: user.name,
    email: user.email,
    verification: user.verification
  }
  const data = {
    user,
    subject,
    htmlMessage
  }
  if (process.env.NODE_ENV === 'production') {
    sendEmail(data, messageSent =>
      messageSent
        ? console.log(`Email SENT to: ${user.email}`)
        : console.log(`Email FAILED to: ${user.email}`)
    )
  } else if (process.env.NODE_ENV === 'development') {
    console.log(data)
  }
}

module.exports = {
  /**
   * Checks User model if user with an specific email exists
   * @param {string} email - user email
   */
  async emailExists(email) {
    return new Promise((resolve, reject) => {
      User.findOne(
        {
          email
        },
        (err, item) => {
          itemAlreadyExists(err, item, reject, 'EMAIL_ALREADY_EXISTS')
          resolve(false)
        }
      )
    })
  },

  /**
   * Checks User model if user with an specific email exists but excluding user id
   * @param {string} id - user id
   * @param {string} email - user email
   */
  async emailExistsExcludingMyself(id, email) {
    return new Promise((resolve, reject) => {
      User.findOne(
        {
          email,
          _id: {
            $ne: id
          }
        },
        (err, item) => {
          itemAlreadyExists(err, item, reject, 'EMAIL_ALREADY_EXISTS')
          resolve(false)
        }
      )
    })
  },

  /**
   * Sends registration email
   * @param {string} locale - locale
   * @param {Object} user - user object
   */
  async sendRegistrationEmailMessage(locale, user) {
    i18n.setLocale(locale)
    const subject = i18n.__('registration.SUBJECT')
    const htmlMessage = i18n.__(
      'registration.MESSAGE',
      user.name,
      process.env.FRONTEND_URL,
      user.verification
    )
    prepareToSendEmail(user, subject, htmlMessage)
  },

  //------------------------------SEND EMAIL VERIFICATION URL----------

  async sendVerificationEmail(locale, user, template,Token) {
    return new Promise(async (resolve, reject) => {
      try {
        user = JSON.parse(JSON.stringify(user));
        console.log("user========", user,'tokennnnn>>>>',Token)
        //const token = jwt.sign({ data: user._id, }, process.env.JWT_SECRET, { expiresIn: "24h" });
        if (!user.first_name) {
          user.first_name = "user";
        }
        if (!user.last_name) {
          user.last_name = "";
        }

        const verificationToken = new VerificationToken({
          email: user.email,
          token: Token
        });
        await verificationToken.save();


        app.mailer.send(
          `${locale}/${template}`,
          {
            to: user.email,
            subject: `Verify Email - ${process.env.APP_NAME}`,
            name: `${user.first_name} ${user.last_name}`,
            verification_link: `https://reachmate.vercel.app/emailVerified?token=${Token}`,
            website_url: process.env.PRODUCTION_WEBSITE_URL,
            logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`
          },
          function (err) {
            if (err) {
              console.log("There was an error sending the email" + err);
            } else {
              console.log("VERIFICATION EMAIL SENT");
              resolve(true);
            }

          }
        );
      } catch (err) {
        reject(buildErrObject(422, err.message));
      }
    })
  },

  /**
   * Sends reset password email
   * @param {string} locale - locale
   * @param {Object} user - user object
   */
  async sendResetPasswordEmailMessage(locale, user) {
    i18n.setLocale(locale)
    const subject = i18n.__('forgotPassword.SUBJECT')
    const htmlMessage = i18n.__(
      'forgotPassword.MESSAGE',
      user.email,
      process.env.FRONTEND_URL,
      user.verification
    )
    prepareToSendEmail(user, subject, htmlMessage)
  },

  async sendResetPasswordMail(locale, user) {
    try {
      i18n.setLocale(locale);
      const subject = "Reset Password";

      app.mailer.send(
        "reset-password-admin.ejs",
        {
          to: 'promatics.rajkumar@gmail.com', //user.email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
          subject, // REQUIRED.
          ...user,
          verification: user.verification,
          // social : await getSocialLinks(),
          // token : token,
        },
        (err) => {
          if (err) {
            // handle error
            console.log(err);
          } else {
            console.log("Email Sent");
          }
        }
      );
    } catch (err) {
      console.log("err: ", err);
    }
  },


  async sendOtpOnEmail(data, subject) {
    var mailOptions = {
      to: data.email,
      subject,
      otp: data.otp,
      name: data.name,
      logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`
    };
    app.mailer.send(`otp`, mailOptions, function (err, message) {
      if (err) {
        console.log("There was an error sending the email" + err);
      } else {
        console.log("Mail sent to user");
      }
    });
  },


  async userExists(model, email, throwError = true) {
    return new Promise((resolve, reject) => {
      model.findOne({
        email: email
      })
        .then((item) => {
          var err = null;
          if (throwError) {
            itemAlreadyExists(err, item, reject, "EMAIL ALREADY EXISTS");
          }
          resolve(item ? item : false);
        })
        .catch((err) => {
          var item = null;
          itemAlreadyExists(err, item, reject, "ERROR");
          resolve(false);
        });
    });
  },

  async socialIdExists(model, social_id, social_type, throwError = false) {
    return new Promise((resolve, reject) => {
      model.findOne({
        social_id: social_id,
        social_type: social_type,
      })
        .then((item) => {
          var err = null;
          if (throwError) {
            itemAlreadyExists(err, item, reject, "USER ALREADY EXISTS");
          }
          resolve(item ? true : false);
        })
        .catch((err) => {
          var item = null;
          itemAlreadyExists(err, item, reject, "ERROR");
          resolve(false);
        });
    });
  },


  /**
     * Sends reset password email
     * @param {string} locale - locale
     * @param {Object} user - user object
     */

  // async sendResetPasswordEmailMessage(locale, user) {
  //   i18n.setLocale(locale);
  //   const subject = i18n.__("forgotPassword.SUBJECT");
  //   const htmlMessage = i18n.__(
  //     "forgotPassword.MESSAGE",
  //     user.email,
  //     process.env.FRONTEND_URL,
  //     user.verification
  //   );
  //   prepareToSendEmail(user, subject, htmlMessage);
  // },


  async sendForgetPasswordEmail(locale, user, template) {

    return new Promise(async (resolve, reject) => {

      try {
        user = JSON.parse(JSON.stringify(user));
        console.log(template);

        console.log("Inside emailer");
        if (!user.name) {
          user.name = "user";
        }


        console.log("user.url", user.url)
        app.mailer.send(
          `${locale}/${template}`,
          {
            to: user.email,
            subject: `Forgot Password - ${process.env.APP_NAME}`,
            name: capitalizeFirstLetter(user.name),
            verification_code: "",
            verification_link: user.url,
            website_url: process.env.PRODUCTION_FRONTEND_URL,
            logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`
          },
          function (err) {
            if (err) {
              console.log("There was an error sending the email" + err);
              reject(buildErrObject(422, err.message));
            } else {
              console.log("VERIFICATION EMAIL SENT");
              resolve("VERIFICATION EMAIL SENT");
            }

          }
        );

      } catch (err) {
        reject(buildErrObject(422, err.message));
      }

    })



  },

  async sendReplyEmail(locale, user, template) {

    console.log("user", user)
    return new Promise(async (resolve, reject) => {

      try {
        user = JSON.parse(JSON.stringify(user));
        console.log(template);

        console.log("Inside emailer");
        if (!user.full_name) {
          user.full_name = "user";
        }

        app.mailer.send(
          `${locale}/${template}`,
          {
            to: user.email,
            subject: `Reply from - ${process.env.APP_NAME}`,
            full_name: capitalizeFirstLetter(user.full_name),
            question: user.question,
            reply: user.reply,
            website_url: process.env.PRODUCTION_FRONTEND_URL,
            logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`
          },
          function (err) {
            if (err) {
              console.log("There was an error sending the email" + err);
              reject(buildErrObject(422, err.message));
            } else {
              console.log("Reply has been sent");
              resolve("Reply has been sent");
            }

          }
        );

      } catch (err) {
        reject(buildErrObject(422, err.message));
      }

    })
  },


  async sendAccountCreationEmail(locale, user, template) {

    console.log("user", user)
    return new Promise(async (resolve, reject) => {

      try {
        user = JSON.parse(JSON.stringify(user));
        console.log(template);
        console.log("user", user)
        console.log("Inside emailer");
        if (!user.company_name) {
          user.company_name = "User";
        }

        console.log("user.access_code" ,user.access_code)
        app.mailer.send(
          `${locale}/${template}`,
          {
            to: user.email,
            subject: `Company Account Credentials - ${process.env.APP_NAME}`,
            company_name: capitalizeFirstLetter(user.company_name),
            password: user.password,
            email: user.email,
            access_code: user.access_code,
            website_url: process.env.PRODUCTION_COMPANY_URL,
            logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`
          },
          function (err) {
            if (err) {
              console.log("There was an error sending the email" + err);
              reject(buildErrObject(422, err.message));
            } else {
              console.log("Email has been sent");
              resolve("Email has been sent");
            }

          }
        );

      } catch (err) {
        reject(buildErrObject(422, err.message));
      }

    })
  },



  async sendAccountCreationEmailSubAdmin(locale, user, template) {

    console.log("user", user)
    return new Promise(async (resolve, reject) => {

      try {
        user = JSON.parse(JSON.stringify(user));
        console.log(template);

        console.log("Inside emailer");
        if (!user.company_name) {
          user.company_name = "User";
        }

        app.mailer.send(
          `${locale}/${template}`,
          {
            to: user.email,
            subject: `Welcome to ${capitalizeFirstLetter(user.company_name)} - Your Sub-Admin Credentials`,
            company_name: capitalizeFirstLetter(user.company_name),
            password: user.password,
            email: user.email,
            name: user.name,
            website_url: process.env.PRODUCTION_COMPANY_URL,
            logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`
          },
          function (err) {
            if (err) {
              console.log("There was an error sending the email" + err);
              reject(buildErrObject(422, err.message));
            } else {
              console.log("Email has been sent");
              resolve("Email has been sent");
            }

          }
        );

      } catch (err) {
        reject(buildErrObject(422, err.message));
      }

    })
  },


  async sendApprovalEmail(locale, user, template) {

    console.log("user", user)
    return new Promise(async (resolve, reject) => {

      try {
        user = JSON.parse(JSON.stringify(user));
        console.log(template);

        console.log("Inside emailer");
        if (!user.company_name) {
          user.company_name = "User";
        }

        app.mailer.send(
          `${locale}/${template}`,
          {
            to: user.email,
            subject: user.subject,
            company_name: capitalizeFirstLetter(user.company_name),
            email: user.email,
            link: user.link,
            logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`
          },
          function (err) {
            if (err) {
              console.log("There was an error sending the email" + err);
              reject(buildErrObject(422, err.message));
            } else {
              console.log("Email has been sent");
              resolve("Email has been sent");
            }

          }
        );

      } catch (err) {
        reject(buildErrObject(422, err.message));
      }

    })
  },

  async sendReminderEmail(user, template) {

    console.log("user", user)
    return new Promise(async (resolve, reject) => {

      try {
        user = JSON.parse(JSON.stringify(user));
        console.log(template);

        console.log("Inside emailer");
        if (!user.full_name) {
          user.full_name = "User";
        }

        app.mailer.send(
          `${template}`,
          {
            to: user.email,
            subject: user.subject,
            full_name: capitalizeFirstLetter(user.full_name),
            email: user.email,
            day: user.day,
            app_name: process.env.APP_NAME,
            reachmate_link: process.env.PRODUCTION_WEBSITE_URL,
            logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`
          },
          function (err) {
            if (err) {
              console.log("There was an error sending the email" + err);
              reject(buildErrObject(422, err.message));
            } else {
              console.log("Email has been sent");
              resolve("Email has been sent");
            }

          }
        );

      } catch (err) {
        reject(buildErrObject(422, err.message));
      }

    })
  },


  async sendBuySubscriptionEmail(locale, user, template) {

    return new Promise(async (resolve, reject) => {

      try {
        user = JSON.parse(JSON.stringify(user));
        console.log(template);

        if (!user.full_name) {
          user.full_name = "User";
        }

        app.mailer.send(
          `${locale}/${template}`,
          {
            to: user.email,
            subject: `Subscription Purchased: - ${process.env.APP_NAME}`,
            full_name: capitalizeFirstLetter(user.full_name),
            email: user.email,
            app_name: process.env.APP_NAME,
            subscription_name: user.subscription_name,
            purchased_date: user.purchased_date,
            price: user.price,
            start_date: user.start_date,
            website_url: process.env.PRODUCTION_WEBSITE_URL,
            logo: `${process.env.STORAGE_PATH_HTTP_AWS}/logo/1710589801750LogoO.png`,
            year: new Date().getFullYear()
          },
          function (err) {
            if (err) {
              console.log("There was an error sending the email" + err);
              reject(buildErrObject(422, err.message));
            } else {
              console.log("Email has been sent");
              resolve("Email has been sent");
            }

          }
        );

      } catch (err) {
        reject(buildErrObject(422, err.message));
      }

    })
  },
}