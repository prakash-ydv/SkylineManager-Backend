import express from 'express';
import { 
  createTask, getTasks, updateTask, createTasksBulk, 
  getEmployeeStats, addComment, getGlobalActivity,
  deleteTask, updateAllTasksStatus
} from '../controllers/taskController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getEmployeeStats);
router.get('/global-activity', protect, getGlobalActivity);

router.route('/')
  .get(protect, getTasks)
  .post(protect, authorize('admin'), createTask);

router.post('/bulk', protect, authorize('admin'), createTasksBulk);
router.put('/bulk-status', protect, authorize('admin'), updateAllTasksStatus);

router.route('/:id')
  .put(protect, updateTask)
  .delete(protect, authorize('admin'), deleteTask);

router.post('/:id/comments', protect, addComment);

export default router;
