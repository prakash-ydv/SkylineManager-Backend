import mongoose from 'mongoose';
import Activity from '../models/Activity.js';
import User from '../models/User.js';

// @desc    Log user activity (site open)
// @route   POST /api/activity/log
// @access  Private
export const logActivity = async (req, res) => {
  try {
    const type = req.body.type || 'open';
    
    // Check if user has already logged an activity of this type in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingActivity = await Activity.findOne({
      user: req.user._id,
      type: type,
      timestamp: { $gte: fiveMinutesAgo }
    });

    if (existingActivity) {
      return res.status(200).json({
        success: true,
        message: 'Activity already logged recently',
        data: existingActivity
      });
    }

    const activity = await Activity.create({
      user: req.user._id,
      type: type,
    });

    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get activity summary for all users or a specific user
// @route   GET /api/activity/summary
// @access  Private/Admin
export const getActivitySummary = async (req, res) => {
  try {
    const { userId, date } = req.query;
    
    // Default to today if no date provided
    const searchDate = date ? new Date(date) : new Date();
    searchDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(searchDate);
    nextDay.setDate(searchDate.getDate() + 1);

    const matchQuery = {
      timestamp: {
        $gte: searchDate,
        $lt: nextDay,
      }
    };

    if (userId) {
      matchQuery.user = new mongoose.Types.ObjectId(userId);
    }

    // Interval in minutes (default 20)
    const intervalMinutes = parseInt(req.query.interval) || 20;
    const intervalMs = intervalMinutes * 60 * 1000;

    const activityData = await Activity.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            user: "$user",
            interval: {
              $subtract: [
                { $toLong: "$timestamp" },
                { $mod: [{ $toLong: "$timestamp" }, intervalMs] }
              ]
            }
          },
          count: { $sum: 1 },
          lastSeen: { $max: "$timestamp" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id.user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 0,
          userId: "$_id.user",
          userName: "$userInfo.name",
          userEmail: "$userInfo.email",
          intervalStart: { $toDate: "$_id.interval" },
          count: 1,
          lastSeen: 1
        }
      },
      { $sort: { intervalStart: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: activityData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all users list with their last activity
// @route   GET /api/activity/users
// @access  Private/Admin
export const getUsersActivityList = async (req, res) => {
    try {
        const { date } = req.query;
        const searchDate = date ? new Date(date) : new Date();
        searchDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(searchDate);
        nextDay.setDate(searchDate.getDate() + 1);

        const users = await User.find({}).select('name email role');
        
        const userActivity = await Activity.aggregate([
            {
                $match: {
                    timestamp: {
                        $gte: searchDate,
                        $lt: nextDay
                    }
                }
            },
            {
                $sort: { timestamp: -1 }
            },
            {
                $group: {
                    _id: "$user",
                    lastActivity: { $first: "$timestamp" },
                    todayCount: { $sum: 1 }
                }
            }
        ]);

        const combined = users.map(user => {
            const activity = userActivity.find(a => a._id.toString() === user._id.toString());
            return {
                ...user._doc,
                lastActivity: activity ? activity.lastActivity : null,
                todayCount: activity ? activity.todayCount : 0
            };
        });

        res.status(200).json({
            success: true,
            data: combined
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

// @desc    Get raw activity logs for a specific user and date
// @route   GET /api/activity/raw
// @access  Private/Admin
export const getRawActivityLogs = async (req, res) => {
  try {
    const { userId, date } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const searchDate = date ? new Date(date) : new Date();
    searchDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(searchDate);
    nextDay.setDate(searchDate.getDate() + 1);

    // Also include a small buffer for potential timezone variations if needed, 
    // but standardizing on the same searchDate/nextDay logic as getUsersActivityList is key.

    const logs = await Activity.find({
      user: new mongoose.Types.ObjectId(userId),
      timestamp: {
        $gte: searchDate,
        $lt: nextDay,
      }
    }).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
