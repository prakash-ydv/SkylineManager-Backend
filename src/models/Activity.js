import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    type: {
      type: String,
      enum: ['open', 'heartbeat'],
      default: 'open',
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster queries on user and timestamp
activitySchema.index({ user: 1, timestamp: -1 });

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
