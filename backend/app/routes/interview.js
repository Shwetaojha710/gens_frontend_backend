const express = require('express');
const router = express.Router();
const { Admin, WebcamAdmin } = require('../middleware/auth');
const { PanelUser } = require('../middleware/panelAuth');
const upload = require('../middleware/upload');
const {
  createInterviewRound,
  reorderInterviewRounds,
  deleteInterviewRound,
  listInterviewRounds,
  updateInterviewRound,
  interviewScheduleDetail,
  saveInterviewSchedule,
  saveInterviewFeedback,
  createInterviewPanelUser,
  updateInterviewPanelUser,
  listInterviewPanelUsers,
  deleteInterviewPanelUser,
  assignInterviewer,
  sendInterviewMail,
} = require('../controller/recruitment/interview');
const { createRoundType, updateRoundType, deleteRoundType, getRoundType, getRoundTypeDD } = require('../controller/recruitment/round_type');
const { panelUserLogin, panelUserLogout } = require('../controller/recruitment/panel_user_auth');
const {
  getMyInterviews,
  panelSaveFeedback,
  panelFeedbackDetail,
} = require('../controller/recruitment/interviewer_dashboard');

router.post('/createInterviewRound', Admin, createInterviewRound);
router.post('/updateInterviewRound', Admin, updateInterviewRound);
router.post('/deleteInterviewRound', Admin, deleteInterviewRound);
router.post('/listInterviewRounds', Admin, listInterviewRounds);
router.post('/reorderInterviewRounds', Admin, reorderInterviewRounds);

router.post('/createRoundType', Admin, createRoundType);
router.post('/updateRoundType', Admin, updateRoundType);
router.post('/deleteRoundType', Admin, deleteRoundType);
router.post('/listRoundTypes', Admin, getRoundType);
router.post('/listRoundTypesDD', Admin, getRoundTypeDD);

router.post('/interview-schedule-detail', Admin, interviewScheduleDetail);
router.post('/save-interview-schedule', Admin, saveInterviewSchedule);
router.post('/save-interview-feedback', Admin, saveInterviewFeedback);

router.post('/createInterviewPanelUser', Admin, createInterviewPanelUser);
router.post('/updateInterviewPanelUser', Admin, updateInterviewPanelUser);
router.post('/listInterviewPanelUsers', Admin, listInterviewPanelUsers);
router.post('/deleteInterviewPanelUser', Admin, deleteInterviewPanelUser);
router.post('/assign-interviewer', Admin, assignInterviewer);
router.post('/send-interview-mail', Admin, sendInterviewMail);

// Panel user (interviewer) routes
router.post('/panel-user-login', panelUserLogin);
router.post('/panel-user-logout', PanelUser, panelUserLogout);
router.post('/get-my-interviews', PanelUser, getMyInterviews);
router.post('/panel-save-feedback', PanelUser, panelSaveFeedback);
router.post('/panel-feedback-detail', PanelUser, panelFeedbackDetail);

module.exports = router;
