import express from 'express';
import {
  getAdminStats,
  getLiveEmployees,
  getPerformanceLeaderboard,
  getDeadlineAlerts,
  getTeamInsights,
  getSystemLogs
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes here are admin only
router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/live-employees', getLiveEmployees);
router.get('/performance', getPerformanceLeaderboard);
router.get('/deadlines', getDeadlineAlerts);
router.get('/insights', getTeamInsights);
router.get('/logs', getSystemLogs);

export default router;
