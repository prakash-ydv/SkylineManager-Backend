import User from '../models/User.js';
import Task from '../models/Task.js';
import Lead from '../models/Lead.js';

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' } });
  const activeTasks = await Task.countDocuments({ status: { $ne: 'Completed' } });
  const totalTasks = await Task.countDocuments({});
  const marketingLeads = await Lead.countDocuments({ isDeleted: false });
  
  const completedTasks = await Task.countDocuments({ status: 'Completed' });
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  res.json({
    totalEmployees,
    activeTasks,
    marketingLeads,
    revenue: 452000, // Still mock or calculated if models exist
    taskCompletionRate,
    avgResponseTime: '1.4h', // Mock for now
  });
};

// @desc    Get live employee status
// @route   GET /api/admin/live-employees
// @access  Private/Admin
const getLiveEmployees = async (req, res) => {
  const users = await User.find({ role: { $ne: 'admin' } });
  
  const liveEmployees = await Promise.all(users.map(async (user) => {
    const userTasks = await Task.find({ assignedTo: user._id });
    const currentTask = userTasks.find(t => t.status === 'In Progress') || userTasks[0];
    
    return {
      id: user._id,
      name: user.name,
      role: user.role,
      status: user.status === 'active' ? 'active' : 'idle',
      currentTask: currentTask ? currentTask.title : 'No active task',
      tasksCompleted: userTasks.filter(t => t.status === 'Completed').length,
      tasksTotal: userTasks.length,
      lastSeen: 'Now', // Should be tracked in User model
      avatar: user.name.charAt(0),
    };
  }));

  res.json(liveEmployees);
};

// @desc    Get performance leaderboard
// @route   GET /api/admin/performance
// @access  Private/Admin
const getPerformanceLeaderboard = async (req, res) => {
  const users = await User.find({ role: { $ne: 'admin' } });
  
  const leaderboard = await Promise.all(users.map(async (user) => {
    const tasksCompleted = await Task.countDocuments({ assignedTo: user._id, status: 'Completed' });
    const leadsConverted = user.role === 'marketing' ? await Lead.countDocuments({ assignedTo: user._id, status: 'Converted' }) : 0;
    
    return {
      id: user._id,
      name: user.name,
      role: user.role,
      score: tasksCompleted * 10 + leadsConverted * 20,
      tasksCompleted,
      callsMade: leadsConverted * 5 + Math.floor(Math.random() * 20), // Mock calls
      streak: 5,
      trend: 'up',
    };
  }));

  // Sort by score descending
  leaderboard.sort((a, b) => b.score - a.score);

  res.json(leaderboard.slice(0, 5));
};

// @desc    Get deadline alerts
// @route   GET /api/admin/deadlines
// @access  Private/Admin
const getDeadlineAlerts = async (req, res) => {
  const today = new Date();
  const tasks = await Task.find({ 
    status: { $ne: 'Completed' },
    dueDate: { $exists: true }
  }).populate('assignedTo', 'name');

  const alerts = tasks.map(task => {
    const diffTime = new Date(task.dueDate).getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let urgency = 'normal';
    let dueIn = `Due in ${diffDays} days`;

    if (diffDays < 0) {
      urgency = 'critical';
      dueIn = `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays <= 1) {
      urgency = 'warning';
      dueIn = diffDays === 0 ? 'Due today' : 'Due tomorrow';
    }

    return {
      id: task._id,
      title: task.title,
      assignedTo: task.assignedTo?.name || 'Unassigned',
      dueIn,
      urgency,
      dueDate: task.dueDate,
    };
  });

  // Sort by urgency
  const urgencyOrder = { critical: 0, warning: 1, normal: 2 };
  alerts.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  res.json(alerts.slice(0, 5));
};

// @desc    Get team insights
// @route   GET /api/admin/insights
// @access  Private/Admin
const getTeamInsights = async (req, res) => {
  // Weekly productivity (last 7 days)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyProductivity = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayName = days[date.getDay()];
    
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const completed = await Task.countDocuments({
      status: 'Completed',
      updatedAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const added = await Task.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    weeklyProductivity.push({ day: dayName, completed, added });
  }

  const leadsConverted = await Lead.countDocuments({ status: 'Converted' });
  const activeEmployees = await User.countDocuments({ status: 'active', role: { $ne: 'admin' } });

  res.json({
    weeklyProductivity,
    totalCallsToday: 86, // Mock or track if calls are logged
    leadsConverted,
    activeEmployees,
  });
};

// @desc    Get system logs
// @route   GET /api/admin/logs
// @access  Private/Admin
const getSystemLogs = async (req, res) => {
  // For now, we'll use recent task updates and lead updates as logs
  const tasks = await Task.find({}).sort({ updatedAt: -1 }).limit(5).populate('assignedTo', 'name');
  const leads = await Lead.find({}).sort({ updatedAt: -1 }).limit(5).populate('assignedTo', 'name');

  const logs = [
    ...tasks.map(t => ({
      id: `task-${t._id}`,
      action: `${t.assignedTo?.name || 'Someone'} updated task "${t.title}" to ${t.status}`,
      user: t.assignedTo?.name || 'System',
      time: 'Recent',
      type: 'assignment'
    })),
    ...leads.map(l => ({
      id: `lead-${l._id}`,
      action: `${l.assignedTo?.name || 'Someone'} updated lead "${l.name}" to ${l.status}`,
      user: l.assignedTo?.name || 'System',
      time: 'Recent',
      type: 'completion'
    }))
  ];

  // Sort by some criteria if we had real timestamps for all
  res.json(logs.slice(0, 5));
};

export {
  getAdminStats,
  getLiveEmployees,
  getPerformanceLeaderboard,
  getDeadlineAlerts,
  getTeamInsights,
  getSystemLogs
};
