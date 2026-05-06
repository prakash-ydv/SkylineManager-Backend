import express from 'express';
import { logActivity, getActivitySummary, getUsersActivityList } from '../controllers/activityController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/log', protect, logActivity);
router.get('/summary', protect, authorize('admin'), getActivitySummary);
router.get('/users', protect, authorize('admin'), getUsersActivityList);

export default router;
