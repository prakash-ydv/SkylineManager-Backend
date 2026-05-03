import Task from '../models/Task.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private/Admin
const createTask = async (req, res) => {
  const { title, description, assignedTo, priority, dueDate } = req.body;

  const userExists = await User.findById(assignedTo);
  if (!userExists) {
    res.status(404);
    throw new Error('Assigned user not found');
  }

  const task = await Task.create({
    title,
    description,
    assignedTo,
    priority,
    dueDate,
    timeline: [{
      event: 'Task Created',
      description: `Task was created by ${req.user.name}`,
      user: req.user._id,
      userName: req.user.name,
    }]
  });

  if (task) {
    // Create notification for assigned user
    await Notification.create({
      user: assignedTo,
      text: `New task assigned: ${title}`,
      type: 'task_assigned',
      relatedId: task._id
    });

    res.status(201).json(task);
  } else {
    res.status(400);
    throw new Error('Invalid task data');
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  let tasks;
  
  if (req.user.role === 'admin') {
    // Admins see all tasks
    tasks = await Task.find({}).populate('assignedTo', 'name email role');
  } else {
    // Others only see their own tasks
    tasks = await Task.find({ assignedTo: req.user._id }).populate('assignedTo', 'name email role');
  }

  res.json(tasks);
};

// @desc    Update task status
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (task) {
    // Only admin or assigned user can update
    if (req.user.role !== 'admin' && task.assignedTo.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized to update this task');
    }

    if (req.body.status && req.body.status !== task.status) {
      task.timeline.push({
        event: 'Status Change',
        description: `Status changed from ${task.status} to ${req.body.status}`,
        user: req.user._id,
        userName: req.user.name,
      });
      
      if (req.body.status === 'Completed') {
        task.completedAt = new Date();
      } else if (task.status === 'Completed') {
        // If it was completed but now moved back
        task.completedAt = undefined;
      }
      
      task.status = req.body.status;
    }
    
    if (req.body.assignedTo && req.body.assignedTo !== task.assignedTo.toString()) {
      task.timeline.push({
        event: 'Task Reassigned',
        description: `Task reassigned by ${req.user.name}`,
        user: req.user._id,
        userName: req.user.name,
      });
      task.assignedTo = req.body.assignedTo;
    }
    
    task.priority = req.body.priority || task.priority;
    task.title = req.body.title || task.title;

    const updatedTask = await task.save();
    res.json(updatedTask);
  } else {
    res.status(404);
    throw new Error('Task not found');
  }
};

// @desc    Create multiple tasks
// @route   POST /api/tasks/bulk
// @access  Private/Admin
const createTasksBulk = async (req, res) => {
  const { tasks } = req.body;

  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of tasks');
  }

  const tasksWithTimeline = tasks.map(t => ({
    ...t,
    timeline: [{
      event: 'Task Created (Bulk)',
      description: `Task was created via bulk upload by ${req.user.name}`,
      user: req.user._id,
      userName: req.user.name,
    }]
  }));

  const createdTasks = await Task.insertMany(tasksWithTimeline);

  if (createdTasks) {
    res.status(201).json(createdTasks);
  } else {
    res.status(400);
    throw new Error('Invalid tasks data');
  }
};

// @desc    Get employee stats and heatmap
// @route   GET /api/tasks/stats
// @access  Private
const getEmployeeStats = async (req, res) => {
  const userId = req.user._id;
  
  // Fetch all tasks for this user
  const tasks = await Task.find({ assignedTo: userId });
  
  const tasksDone = tasks.filter(t => t.status === 'Completed').length;
  const completionRate = tasks.length > 0 ? Math.round((tasksDone / tasks.length) * 100) : 0;
  
  // Heatmap generation (last 84 days)
  const heatmap = [];
  const today = new Date();
  for (let i = 0; i < 84; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (83 - i));
    const dayStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Count tasks completed on this day
    const intensity = tasks.filter(t => {
      if (t.status !== 'Completed') return false;
      const completedAt = new Date(t.completedAt || t.updatedAt);
      return completedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) === dayStr;
    }).length;
    
    heatmap.push({ intensity, date: dayStr });
  }

  // Efficiency logic (based on on-time completions)
  const completedTasks = tasks.filter(t => t.status === 'Completed');
  const onTimeCompletions = completedTasks.filter(t => {
    if (!t.dueDate) return true;
    return new Date(t.completedAt || t.updatedAt) <= new Date(t.dueDate);
  }).length;
  
  const efficiency = tasks.length > 0 ? Math.round((onTimeCompletions / tasks.length) * 100) : 0;

  // Streak logic (consecutive days of completion)
  const completionDates = completedTasks.map(t => new Date(t.completedAt || t.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' }));
  const uniqueDates = [...new Set(completionDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  let streak = 0;
  if (uniqueDates.length > 0) {
    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });

    // A streak is valid if the most recent completion was today OR yesterday
    let currentCheckDate;
    if (uniqueDates.includes(todayStr)) {
      currentCheckDate = new Date();
    } else if (uniqueDates.includes(yesterdayStr)) {
      currentCheckDate = yesterday;
    }

    if (currentCheckDate) {
      let checkStr = currentCheckDate.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
      while (uniqueDates.includes(checkStr)) {
        streak++;
        currentCheckDate.setDate(currentCheckDate.getDate() - 1);
        checkStr = currentCheckDate.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
      }
    }
  }

  // Weekly performance (last 7 days)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyPerformance = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayName = days[date.getDay()];
    
    const count = completedTasks.filter(t => {
      const completedAt = new Date(t.completedAt || t.updatedAt);
      return completedAt.toLocaleDateString('en-US') === date.toLocaleDateString('en-US');
    }).length;
    
    weeklyPerformance.push({ name: dayName, tasks: count });
  }

  res.json({
    stats: {
      efficiency,
      streak,
      completionRate,
      tasksDone,
    },
    heatmap,
    weeklyPerformance
  });
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
const addComment = async (req, res) => {
  const { text } = req.body;
  const task = await Task.findById(req.params.id);

  if (task) {
    const comment = {
      user: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      text,
      time: new Date(),
    };

    task.comments.push(comment);
    
    // Also log to timeline
    task.timeline.push({
      event: 'Comment Added',
      description: `${req.user.name} added a comment`,
      user: req.user._id,
      userName: req.user.name,
    });

    await task.save();

    // Re-fetch task and populate assignedTo and comments users if possible
    // Actually, for a single comment, we can just return it with the current user info
    const newComment = task.comments[task.comments.length - 1].toObject();
    // Make it look like a populated user object for the frontend
    newComment.user = {
      _id: req.user._id,
      name: req.user.name,
      role: req.user.role
    };

    res.status(201).json(newComment);
  } else {
    res.status(404);
    throw new Error('Task not found');
  }
};

// @desc    Get global team activity (who is working on what)
// @route   GET /api/tasks/global-activity
// @access  Private
const getGlobalActivity = async (req, res) => {
  // All authenticated users can see what the team is working on
  const activity = await Task.find({ 
    status: { $ne: 'Completed' } 
  })
  .populate('assignedTo', 'name role')
  .sort({ updatedAt: -1 })
  .limit(20); // Limit to recent 20 active tasks for performance

  res.json(activity);
};

export { createTask, getTasks, updateTask, createTasksBulk, getEmployeeStats, addComment, getGlobalActivity };
