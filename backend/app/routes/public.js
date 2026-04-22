const express = require("express");
const router = express.Router();
const { getPublicLanding } = require("../controller/landing");
const { postPublicContact } = require("../controller/publicContact");
const { getPublicPlan, postRazorpaySubscriptionStart } = require("../controller/publicPayment");

router.get("/public/landing", getPublicLanding);
router.post("/public/contact", postPublicContact);
router.get("/public/plan/:planId", getPublicPlan);
router.post("/public/razorpay/subscription-start", postRazorpaySubscriptionStart);

module.exports = router;
