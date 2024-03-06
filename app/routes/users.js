const controller = require('../controllers/users')
const validate = require('../controllers/users.validate')
// const AuthController = require('../controllers/auth')
const express = require('express')
const router = express.Router()
require('../../config/passport')
const passport = require('passport')
const requireAuth = passport.authenticate('jwt', {
  session: false
})

const trimRequest = require('trim-request')

/*
 * Users routes
 */

/*
 * Get items route
 */
router.get(
  '/',
  requireAuth,
  // AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  controller.getItems
)

/*
 * Create new item route
 */
router.post(
  '/',
  requireAuth,
  // AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  validate.createItem,
  controller.createItem
)

/*
 * Get item route
 */
router.get(
  '/:id',
  requireAuth,
  // AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  validate.getItem,
  controller.getItem
)

/*
 * Update item route
 */
router.patch(
  '/:id',
  requireAuth,
  // AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  validate.updateItem,
  controller.updateItem
)

/*
 * Delete item route
 */
router.delete(
  '/:id',
  requireAuth,
  // AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  validate.deleteItem,
  controller.deleteItem
)


router.patch(
  '/updateProfile',
  requireAuth,
  // AuthController.roleAuthorization(['admin']),
  trimRequest.all,
  // validate.updateItem,
  controller.updateProfile
)

router.post(
  '/editCardDetails',
  requireAuth,
  trimRequest.all,
  controller.editCardDetails
)

router.post(
  '/changePassword',
  requireAuth,
  trimRequest.all,
  controller.changePassword
)


router.post(
  '/addSharedCard',
  requireAuth,
  trimRequest.all,
  controller.addSharedCard
)

router.get(
  '/getSharedCardsForUser/:user_id',
  //requireAuth,
  trimRequest.all,
  controller.getSharedCardsForUser
)

router.post(
  "/uploadUserMedia",
  trimRequest.all,
  // requireAuth,
  controller.uploadUserMedia
);


router.post(
  '/addPersonalCard',
  requireAuth,
  trimRequest.all,
  controller.addPersonalCard
)

router.post(
  '/matchAccessCode',
  requireAuth,
  trimRequest.all,
  controller.matchAccessCode
)

router.post(
  '/addCorporateCard',
  requireAuth,
  trimRequest.all,
  controller.addCorporateCard
)

router.post(
  '/getProfile',
  requireAuth,
  trimRequest.all,
  controller.getProfile
)

router.post(
  '/enableOrDisableLink',
  requireAuth,
  trimRequest.all,
  controller.enableOrDisableLink
)

router.post(
  "/accountPrivacy",
  requireAuth,
  trimRequest.all,
  controller.accountPrivacy
)

router.post(
  "/getCountries",
  trimRequest.all,
  controller.getCountries
)

router.post(
  "/getStates",
  trimRequest.all,
  controller.getStates
)

router.post(
  '/getCard',
  requireAuth,
  trimRequest.all,
  controller.getCard
)
router.post(
  '/getCMS',
  trimRequest.all,
  controller.getCMS
)
router.post(
  '/getFAQ',
  requireAuth,
  trimRequest.all,
  controller.getFAQ
)
router.post(
  '/helpsupport',
  requireAuth,
  trimRequest.all,
  controller.helpsupport
)
router.post(
  '/feedback',
  requireAuth,
  trimRequest.all,
  controller.feedback
)

router.post(
  "/addFCMDevice",
  requireAuth,
  trimRequest.all,
  controller.addFCMDevice
)

router.post(
  "/deleteFCMDevice",
  requireAuth,
  trimRequest.all,
  controller.deleteFCMDevice
)


router.post(
  "/deleteAccount",
  requireAuth,
  trimRequest.all,
  controller.deleteAccount
)


router.post(
  "/getNotification",
  trimRequest.all,
  requireAuth,
  controller.getNotification
);

router.post(
  "/seenNotification",
  trimRequest.all,
  requireAuth,
  controller.seenNotification
);

router.get(
  "/unseenNotificationCount",
  trimRequest.all,
  requireAuth,
  controller.unseenNotificationCount
);

router.post(
  "/addNotificaiton",
  trimRequest.all,
  controller.addNotificaiton
)

router.post(
  "/changeNotificaitonSetting",
  requireAuth,
  trimRequest.all,
  controller.changeNotificaitonSetting
)

router.post(
  "/getNotificationSetting",
  requireAuth,
  trimRequest.all,
  controller.getNotificationSetting
)

router.post(
  "/exportCardToExcel",
  requireAuth,
  trimRequest.all,
  controller.exportCardToExcel
)
module.exports = router
