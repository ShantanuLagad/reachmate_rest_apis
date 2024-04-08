require('dotenv-safe').config()
const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const compression = require('compression')
const helmet = require('helmet')
const cors = require('cors')
const passport = require('passport')
const app = express()
const i18n = require('i18n')
const initMongo = require('./config/mongo')
const path = require('path')
const https = require('https')
const fs = require('fs')
var fileUpload = require('express-fileupload');

// Setup express server port from ENV, default: 3000
app.set('port', process.env.PORT || 3000)

// Enable only in development HTTP request logger middleware

// if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
// }

// Redis cache enabled by env variable
if (process.env.USE_REDIS === 'true') {
  const getExpeditiousCache = require('express-expeditious')
  const cache = getExpeditiousCache({
    namespace: 'expresscache',
    defaultTtl: '30 minutes',
    engine: require('expeditious-engine-redis')({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    })
  })
  app.use(cache)
}

app.use(express.json())

app.get('/ping', (req, res) => {
  setTimeout(() => {
    res.end('pong');
  }, 2000);
});

// app.get('/payment-redirect', (req, res) => {
//   res.redirect("https://reachmate.app/Dashboard?tab=3");
// });


// for parsing json
app.use(
  bodyParser.json({
    limit: '20mb'
  })
)
// for parsing application/x-www-form-urlencoded
app.use(
  bodyParser.urlencoded({
    limit: '20mb',
    extended: true
  })
)

// i18n
i18n.configure({
  locales: ['en', 'es'],
  directory: `${__dirname}/locales`,
  defaultLocale: 'en',
  objectNotation: true
})
app.use(i18n.init)

// Init all other stuff
app.use(cors())
app.use(passport.initialize())
app.use(compression())
app.use(helmet())
app.use(fileUpload());
app.use(express.static('public'))
app.set('views', path.join(__dirname, 'views'))
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'html')
app.use(require('./app/routes'))
// app.listen(app.get('port'))

if (process.env.NODE_ENV == 'development') {
    app.listen(app.get('port'))
  } else {
    var options = {
      key: fs.readFileSync('/etc/letsencrypt/live/uat.reachmate.app/privkey.pem', 'utf8'),
      cert: fs.readFileSync('/etc/letsencrypt/live/uat.reachmate.app/fullchain.pem', 'utf8')
    };

    const httpsServer = https.createServer(options, app)
    httpsServer.listen(app.get('port'), () => {
      // console.log('socket running on port no : '+app.get('port'));
    })
  }

// Init MongoDB
initMongo()

module.exports = app // for testing
