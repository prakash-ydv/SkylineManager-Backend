import Notification from '../models/Notification.js';
import Task from '../models/Task.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  // First, check for near deadlines and create notifications if they don't exist
  const tasks = await Task.find({ 
    assignedTo: req.user._id, 
    status: { $ne: 'Completed' },
    dueDate: { 
      $gte: new Date(), 
      $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Within 24 hours
    }
  });

  for (const task of tasks) {
    const exists = await Notification.findOne({ 
      user: req.user._id, 
      relatedId: task._id, 
      type: 'deadline_near' 
    });

    if (!exists) {
      await Notification.create({
        user: req.user._id,
        text: `Deadline approaching: ${task.title}`,
        type: 'deadline_near',
        relatedId: task._id
      });
    }
  }

  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(notifications);
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (notification && notification.user.toString() === req.user._id.toString()) {
    notification.read = true;
    await notification.save();
    res.json({ message: 'Notification marked as read' });
  } else {
    res.status(404);
    throw new Error('Notification not found');
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { read: true }
  );
  res.json({ message: 'All notifications marked as read' });
};

export { getNotifications, markAsRead, markAllAsRead };
