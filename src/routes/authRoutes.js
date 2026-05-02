import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  getUsers,
  updateUser,
  deleteUser,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';

const router = express.Router();

router.post(
  '/register',
  protect,
  authorize('admin'),
  [
    body('name', 'Name is required').not().isEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
    body('role', 'Role is required').isIn(['admin', 'developer', 'marketing']),
  ],
  registerUser
);

router.post('/login', loginUser);

router.post('/logout', logoutUser);

router.get('/me', protect, getUserProfile);
router.get('/users', protect, authorize('admin'), getUsers);
router.route('/users/:id')
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);

export default router;
