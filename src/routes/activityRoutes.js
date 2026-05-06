import express from 'express';
import { logActivity, getActivitySummary, getUsersActivityList, getRawActivityLogs } from '../controllers/activityController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/log', protect, logActivity);
router.get('/summary', protect, authorize('admin'), getActivitySummary);
router.get('/users', protect, authorize('admin'), getUsersActivityList);
router.get('/raw', protect, authorize('admin'), getRawActivityLogs);

export default router;
