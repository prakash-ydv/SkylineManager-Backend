import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  text: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['task_assigned', 'deadline_near', 'system'],
    default: 'system',
  },
  read: {
    type: Boolean,
    required: true,
    default: false,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
  }
}, {
  timestamps: true,
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
