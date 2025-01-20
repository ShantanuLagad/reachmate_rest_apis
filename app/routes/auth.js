const controller = require('../controllers/auth')
// const validate = require('../controllers/auth.validate')
const AuthController = require('../controllers/auth')
const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
  session: false
})
const trimRequest = require('trim-request')

/*
 * Auth routes
 */


/*
 * Validate API key
 */
router.post(
  '/validate/api/key',
  trimRequest.all,
  controller.validateAPIKey
)

/*
 * Register route
 */


/////////////////////////////////////reachmate////////////////////////////////////////////
router.post(
  '/registerUser',
  trimRequest.all,
  controller.registerUser
)
//----------------9 Jan
router.put(
  '/editUser',
  requireAuth,
  trimRequest.all,
  controller.editUser
)
router.get(
  '/verifyEmail',
  trimRequest.all,
  controller.verifyEmail
)

router.post(
  '/verifyotpemail',
  trimRequest.all,
  controller.verifyotpemail
)
router.post(
  '/loginUser',
  trimRequest.all,
  controller.loginUser
)
router.get(
  '/emailexist',
  trimRequest.all,
  controller.emailexist
)
router.post(
  '/resetpassword',
  trimRequest.all,
  controller.resetpassword
)
router.post(
  '/changepassword',
  trimRequest.all,
  controller.changepassword
)
router.post(
  '/social/login',
  trimRequest.all,
  // validate.socialLogin,
  controller.socialLogin
)
router.post(
  '/send/otp/new',
  trimRequest.all,
  // validate.socialLogin,
  controller.sendotpnew
)
/////////////////////////////////////reachmate////////////////////////////////////////////

/*
 * Verify route
 */
router.post('/verify', trimRequest.all,
  // validate.verify,
  controller.verify)

/*
 * Forgot password route
 */
router.post(
  '/forgot',
  trimRequest.all,
  // validate.forgotPassword,
  controller.forgotPassword
)

router.post(
  '/resetpassword/web',
  trimRequest.all,
  // validate.forgotPassword,
  controller.resetPasswordWeb
)


router.post(
  '/admin/forgot',
  trimRequest.all,
  // validate.forgotPassword,
  controller.forgotAdminPassword
)

/*
 * Reset password route
 */
router.post(
  '/reset',
  trimRequest.all,
  // validate.resetPassword,
  controller.resetPassword
)

/*
 * Reset password route
 */
router.post(
  '/reset/admin',
  trimRequest.all,
  // validate.resetPassword,
  controller.resetAdminPassword
)

/*
 * Get new refresh token
 */
router.get(
  '/token',
  requireAuth,
  AuthController.roleAuthorization(['user', 'admin']),
  trimRequest.all,
  controller.getRefreshToken
)

/*
 * Login route
 */
router.post(
  '/login',
  trimRequest.all,
  //  validate.login,
  controller.login)

/*
 * Admin Login route
 */
router.post('/admin/login', trimRequest.all,
  //  validate.login,
  controller.adminLogin)


router.patch(
  '/updateProfile',
  requireAuth,
  // AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.updateItem,
  controller.updateProfile
)


router.post('/verifyotpemailNew', trimRequest.all,
  //  validate.login,
  controller.verifyotpemailNew)


router.post('/sendOTP', trimRequest.all,
  //  validate.login,
  controller.sendOTP)

router.post('/verifyOTP', trimRequest.all,
  //  validate.login,
  controller.verifyOTP)

router.post("/token",
  requireAuth,
  controller.token
)
//--------setPassword and create Company
router.post(
  "/createCompanyAccount",
  trimRequest.all,
  controller.createCompanyAccount
)

module.exports = router
