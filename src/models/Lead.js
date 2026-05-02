  import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    sNo: String,
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    phone: String,
    email: String,
    link: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Tracking fields
    pitched: {
      type: Boolean,
      default: false,
    },
    pitchDate: Date,
    pitchRemark: String,
    followUp: {
      type: Boolean,
      default: false,
    },
    followUpDate: Date,
    followUpRemark: String,
    isConverted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['New', 'Pitched', 'Follow-up', 'Converted', 'Dead'],
      default: 'New',
    },
    campaignTitle: String,
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
