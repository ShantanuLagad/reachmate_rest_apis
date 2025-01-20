const controller = require('../controllers/corporate')
const validate = require('../controllers/profile.validate')
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
 * Profile routes
 */

/*
 * Get profile route
 */
router.get(
  '/getProfile',
  requireAuth,
  trimRequest.all,
  controller.getProfile
)

router.get(
  '/getMyProfile',
  requireAuth,
  trimRequest.all,
  controller.getMyProfile
)

/*
 * Update profile route
 */
router.patch(
  '/',
  requireAuth,
  AuthController.roleAuthorization(['user', 'admin']),
  trimRequest.all,
  validate.updateProfile,
  controller.updateProfile
)

/*
 * Change password route
 */

router.post(
  '/changePassword',
  requireAuth,
  trimRequest.all,
  validate.changePassword,
  controller.changePassword
)


router.post(
  "/login",
  trimRequest.all,
  controller.login
)


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
  '/changePassword',
  trimRequest.all,
  requireAuth,
  controller.changePassword
)

router.post(
  "/uploadCorporateMedia",
  trimRequest.all,
  // requireAuth,
  controller.uploadCorporateMedia
);


router.get(
  "/getCountries",
  trimRequest.all,
  controller.getCountries
)

router.get(
  "/getStates",
  trimRequest.all,
  controller.getStates
)

router.patch(
  "/completeProfile",
  requireAuth,
  trimRequest.all,
  controller.completeProfile
)


router.patch(
  "/updateAccount",
  requireAuth,
  trimRequest.all,
  controller.updateAccount
)


router.get(
  "/dashboardData",
  requireAuth,
  trimRequest.all,
  controller.dashboardData
)

router.get(
  "/dashboardData",
  requireAuth,
  trimRequest.all,
  controller.dashboardData
)


router.get(
  "/getNotification",
  requireAuth,
  trimRequest.all,
  controller.getNotification
)

router.delete(
  "/deleteNotification",
  requireAuth,
  trimRequest.all,
  controller.deleteNotification
)

router.delete(
  "/deleteAllNotification",
  requireAuth,
  trimRequest.all,
  controller.deleteAllNotification
)

//----------get list of employees
router.get(
  "/corporateCardHolder",
  requireAuth,
  trimRequest.all,
  controller.corporateCardHolder
)
//---------add TeamMember by Business Team
router.post(
  "/addTeamMember",
  requireAuth,
  trimRequest.all,
  controller.addTeamMemberByBusinessTeam
)

//-------get all team members list
router.get(
  "/getTeamMembers",
  requireAuth,
  trimRequest.all,
  controller.getTeamMembersByBusinessTeam
)
//----get Team Member By ID
router.get(
  "/getTeamMemberById",
  requireAuth,
  trimRequest.all,
  controller.getTeamMemberByID
)
//-----update Team member
router.patch(
  "/updateTeamMember",
  requireAuth,
  trimRequest.all,
  controller.updateTeamMember
)
//----delete Team Member
router.delete(
  "/deleteTeamMember/:_id",
  requireAuth,
  trimRequest.all,
  controller.deleteTeamMemberByID
)
//----update status Team Member
router.patch(
  "/updateTeamMemberStatus",
  requireAuth,
  trimRequest.all,
  controller.updateTeamMemberStatus
)


//--------------------
router.delete(
  "/deleteCorporateCardHolders",
  requireAuth,
  trimRequest.all,
  controller.deleteCorporateCardHolders
)


router.post(
  "/addEmailInPiadByCompany",
  requireAuth,
  trimRequest.all,
  controller.addEmailInPiadByCompany
)

router.post(
  "/bulkUploadEmail",
  requireAuth,
  trimRequest.all,
  controller.bulkUploadEmail
)

router.delete(
  "/removeEmailfromPiadByCompany",
  requireAuth,
  trimRequest.all,
  controller.removeEmailfromPiadByCompany
)


router.get(
  "/getListOfPaidByComapny",
  requireAuth,
  trimRequest.all,
  controller.getListOfPaidByComapny
)

router.get(
  "/transactionHistory",
  requireAuth,
  trimRequest.all,
  controller.transactionHistory
)

router.get(
  "/plansList",
  requireAuth,
  trimRequest.all,
  controller.plansList
)

router.get(
  "/activeSubcription",
  requireAuth,
  trimRequest.all,
  controller.activeSubscription
)


router.post(
  "/createSubscription",
  requireAuth,
  trimRequest.all,
  controller.createSubscription
)

router.post(
  "/updateSubscription",
  requireAuth,
  trimRequest.all,
  controller.updateSubscription
)

router.post(
  "/cancelSubscription",
  requireAuth,
  trimRequest.all,
  controller.cancelSubscription
)

router.post(
  "/cancelScheduledUpdate",
  requireAuth,
  trimRequest.all,
  controller.cancelScheduledUpdate
)
router.post(
  "/createSubAdmin",
  trimRequest.all,
  requireAuth,
  controller.createSubAdmin
)

router.delete(
  "/removeSubAdmin/:id",
  trimRequest.all,
  requireAuth,
  controller.removeSubAdmin
)

router.get(
  "/subSubAdminList",
  trimRequest.all,
  requireAuth,
  controller.subSubAdminList
)

router.get(
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

module.exports = router
