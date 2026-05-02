import express from 'express';
import { createTask, getTasks, updateTask, createTasksBulk, getEmployeeStats, addComment } from '../controllers/taskController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, getEmployeeStats);

router.route('/')
  .get(protect, getTasks)
  .post(protect, authorize('admin'), createTask);

router.post('/bulk', protect, authorize('admin'), createTasksBulk);

router.route('/:id')
  .put(protect, updateTask);

router.post('/:id/comments', protect, addComment);

export default router;
