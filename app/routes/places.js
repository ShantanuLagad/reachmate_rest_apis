const controller = require('../controllers/places')
const validate = require('../controllers/places.validate')
const AuthController = require('../controllers/auth')
const utils = require('../middleware/utils')
const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
  session: false
})
const trimRequest = require('trim-request')

/*
 * Places routes
 */

router.get(
  '/test',
  trimRequest.all,
  controller.test
)

/*
 * Places routes
 */

router.post(
  '/search',
  trimRequest.all,
  utils.titleToolBoxAuth,
  controller.search
)

module.exports = router
