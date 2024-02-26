const controller = require('../controllers/admins')
const validate = require('../controllers/admins.validate')
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
  controller.addNewKey
)

router.post(
  "/addAdmin",
  trimRequest.all,
  controller.addAdmin
);

router.post(
  "/login",
  trimRequest.all,
  controller.login
);

router.post(
  '/forgotPassword',
  trimRequest.all,
  // validate.email,
  controller.forgotPassword
)

router.post(
  '/resetPassword',
  trimRequest.all,
  // validate.email,
  controller.resetPassword
)

router.post(
  "/uploadAdminMedia",
  trimRequest.all,
  // requireAuth,
  controller.uploadAdminMedia
);

router.get(
  "/getPersonalUser",
  requireAuth,
  trimRequest.all,
  controller.getPersonalUser
)

router.get(
  "/getCorporateUser",
  requireAuth,
  trimRequest.all,
  controller.getCorporateUser
)

router.get(
  "/getSingleCardHolder/:id",
  trimRequest.all,
  controller.getSingleCardHolder
)


router.post(
  "/addCompany",
  trimRequest.all,
  controller.addCompany
)

router.get(
  "/getCompanyList",
  trimRequest.all,
  controller.getCompanyList
)

router.get(
  "/getSingleCompany/:id",
  trimRequest.all,
  controller.getSingleCompany
)

router.get(
  "/dashBoardCard",
  requireAuth,
  trimRequest.all,
  controller.dashBoardCard
)

router.post(
  "/addFaq",
  requireAuth,
  trimRequest.all,
  controller.addFaq
)

router.get(
  "/getFaqList",
  requireAuth,
  trimRequest.all,
  controller.getFaqList
)

router.get(
  "/getSingleFaq/:id",
  requireAuth,
  trimRequest.all,
  controller.getSingleFaq
)

router.delete(
  "/deleteFaq/:id",
  requireAuth,
  trimRequest.all,
  controller.deleteFaq
)

router.patch(
  "/editFaq/:id",
  requireAuth,
  trimRequest.all,
  controller.editFaq
)


router.put(
  "/addCMS",
  requireAuth,
  trimRequest.all,
  controller.addCMS
)

router.get(
  "/getCMS",
  requireAuth,
  trimRequest.all,
  controller.getCMS
)

router.get(
  "/getFeedbackList",
  requireAuth,
  trimRequest.all,
  controller.getFeedbackList
)

router.get(
  "/getSingleFeedback/:id",
  requireAuth,
  trimRequest.all,
  controller.getSingleFeedback
)

router.get(
  "/getNotification",
  requireAuth,
  trimRequest.all,
  controller.getNotification
)


/*
 * API Key
 */
router.post(
  '/api/key',
  trimRequest.all,
  requireAuth,
  validate.addNewKeyValidate,
  controller.addNewKey
)


router.put(
  '/api/key',
  trimRequest.all,
  requireAuth,
  validate.editNewKey,
  controller.editNewKey
)

router.get(
  '/api/key',
  trimRequest.all,
  requireAuth,
  controller.getAPIKeys
)

router.delete(
  '/api/key/:api_key_id',
  trimRequest.all,
  requireAuth,
  controller.deleteAPIKey
)

router.get(
  '/api/key/:api_key_id',
  trimRequest.all,
  requireAuth,
  controller.addKeyDetails
)

module.exports = router
