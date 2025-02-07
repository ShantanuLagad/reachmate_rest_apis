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
// router.get(
//   '/:id',
//   requireAuth,
//   // AuthController.roleAuthorization(['admin']),
//   trimRequest.all,
//   validate.getItem,
//   controller.getItem
// )

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
// router.delete(
//   '/:id',
//   requireAuth,
//   // AuthController.roleAuthorization(['admin']),
//   trimRequest.all,
//   validate.deleteItem,
//   controller.deleteItem
// )


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

router.get(
  '/getCardAndUserDetails',
  //requireAuth,
  trimRequest.all,
  controller.getCardAndUserDetails
)

router.post(
  '/makeIndividualCardPrimary',
  requireAuth,
  trimRequest.all,
  controller.makeIndividualCardPrimary
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
  "/uploadUserMediaForIOS",
  trimRequest.all,
  // requireAuth,
  controller.uploadUserMediaForIOS
);

// router.post(
//   "/removebg",
//   trimRequest.all,
//   controller.removebg
// )


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
  '/verifyOtpAndFetchCompany',
  requireAuth,
  trimRequest.all,
  controller.verifyOtpAndFetchCompany
)
router.get(
  '/getAllAccessCards',
  requireAuth,
  trimRequest.all,
  controller.getAllAccessCards
)
router.get(
  '/updateAccessCard',
  requireAuth,
  trimRequest.all,
  controller.updateAccessCard
)


router.post(
  "/isPaidByCompany",
  requireAuth,
  trimRequest.all,
  controller.isPaidByCompany
)

router.post(
  "/haveSubscription",
  requireAuth,
  trimRequest.all,
  controller.haveSubscription
)

router.post(
  '/addCorporateCard',
  requireAuth,
  validate.addCorporateCard,
  trimRequest.all,
  controller.addCorporateCard
)

router.get(
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

router.get(
  '/getCard',
  requireAuth,
  trimRequest.all,
  controller.getCard
)
//----------9 Jan-------
router.get(
  '/getPersonalCards',
  requireAuth,
  trimRequest.all,
  controller.getPersonalCards
)

router.post(
  '/getCMS',
  trimRequest.all,
  controller.getCMS
)
router.post(
  '/getFAQ',
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

router.post(
  "/isSubscriptionActive",
  requireAuth,
  trimRequest.all,
  controller.isSubscriptionActive
)

router.post(
  "/removeLogo",
  requireAuth,
  trimRequest.all,
  controller.removeLogo
)

router.post(
  "/createSubscription",
  requireAuth,
  trimRequest.all,
  controller.createSubscription
)

router.post("/webhook_payments", controller.webhook)

router.post(
  "/plansList",
  requireAuth,
  trimRequest.all,
  controller.plansList
)


router.post(
  "/saveCard",
  requireAuth,
  trimRequest.all,
  controller.saveCard
)

router.post(
  "/getSavedCard",
  requireAuth,
  trimRequest.all,
  controller.getSavedCard
)


router.post(
  "/isPaymentDone",
  requireAuth,
  trimRequest.all,
  controller.isPaymentDone
)


router.post(
  "/cancelSubscription",
  requireAuth,
  trimRequest.all,
  controller.cancelSubscription
)

router.post(
  "/updateSubscription",
  requireAuth,
  trimRequest.all,
  controller.updateSubscription
)

router.post(
  "/cancelScheduledUpdate",
  requireAuth,
  trimRequest.all,
  controller.cancelScheduledUpdate
)
//--------BT registration
router.post(
  "/registration",
  trimRequest.all,
  controller.registration
)

// router.post(
//   "/sendEmailOnCompany",
//   trimRequest.all,
//   requireAuth,
//   controller.sendEmailOnCompany
// )
router.post(
  "/contactUs",
  trimRequest.all,
  controller.contactUs
)

// router.get(
//   "/sendMail",
//   trimRequest.all,
//   controller.sendMail
// )

router.post(
  '/sendMail/:user_id',
  //requireAuth,
  trimRequest.all,
  controller.sendMail
)


router.delete(
  '/deleteCard',
  requireAuth,
  trimRequest.all,
  controller.deleteCard
)


router.delete(
  '/deleteUserCards',
  requireAuth,
  trimRequest.all,
  controller.deleteUserCards
)

router.post(
  "/addSubscription",
  requireAuth,
  trimRequest.all,
  controller.addSubscription
)

router.post(
  "/getPaymentDetails",
  requireAuth,
  trimRequest.all,
  controller.getPaymentDetails
)

router.post(
  "/getPaymentMethod",
  requireAuth,
  trimRequest.all,
  controller.getPaymentMethod
)

router.post(
  "/editBillingAddress",
  requireAuth,
  trimRequest.all,
  controller.editBillingAddress
)
router.put(
  "/updateAccessCard",
  requireAuth,
  trimRequest.all,
  controller.updateAccessCard
)

router.get(
  "/getUserIndivaidualPlans",
  trimRequest.all,
  controller.getUserPlans
)

router.get(
  "/getMyBillingAddress",
  trimRequest.all,
  requireAuth,
  controller.getMyBillingAddress
)

router.get(
  "/getPaymentHistory",
  trimRequest.all,
  requireAuth,
  controller.getPaymentHistoryByUser
)

module.exports = router
