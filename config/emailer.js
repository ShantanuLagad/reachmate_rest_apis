const app = require('express')()
const mailer = require('express-mailer')

const path = require('path')

const views = `${process.cwd()}/views`

const emailConf = {
  from: `${process.env.EMAIL_FROM_APP} <${process.env.EMAIL_FROM}>`,
  host: process.env.EMAIL_HOST, // hostname
  secureConnection: false, // use SSL
  port: 587, // port for secure SMTP
  transportMethod: process.env.EMAIL_TRANSPORT_METHOD, // default is SMTP. Accepts anything that nodemailer accepts
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD, //protjmsingh//maha@321
  },
}

mailer.extend(app, emailConf)

app.set('views', views)
app.set('view engine', 'ejs')

module.exports = {
  app,
  mailer
}

/*const app = require('express')()
const mailer = require('express-mailer')

const path = require('path')

const views = `${process.cwd()}/views`

mailer.extend(app, {
  from: `Sournois <${process.env.FROM_EMAIL}>`,
  host: 'smtp.gmail.com', // hostname
  secureConnection: true, // use SSL
  port: 465, // port for secure SMTP
  transportMethod: 'SMTP', // default is SMTP. Accepts anything that nodemailer accepts
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
})

app.set('views', views)
app.set('view engine', 'ejs')

module.exports = {
  app,
  mailer
}
*/