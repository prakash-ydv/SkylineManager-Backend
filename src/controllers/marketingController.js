import Lead from '../models/Lead.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Get all leads for the current marketer
// @route   GET /api/marketing/leads
// @access  Private/Marketing or Admin
const getLeads = async (req, res) => {
  let leads;
  if (req.user.role === 'admin') {
    leads = await Lead.find({}).populate('assignedTo', 'name email');
  } else {
    leads = await Lead.find({ 
      assignedTo: req.user._id
    });
  }
  res.json(leads);
};

// @desc    Bulk upload leads
// @route   POST /api/marketing/bulk
// @access  Private/Admin
const bulkUploadLeads = async (req, res) => {
  const { leads, assignedTo, campaignTitle, batchNumber } = req.body;

  if (!leads || !Array.isArray(leads)) {
    res.status(400);
    throw new Error('Please provide an array of leads');
  }

  let user;
  if (mongoose.Types.ObjectId.isValid(assignedTo)) {
    user = await User.findById(assignedTo);
  }

  if (!user) {
    user = await User.findOne({ name: assignedTo });
  }

  if (!user) {
    res.status(404);
    throw new Error('Assigned marketer not found');
  }

  const leadsWithAssignment = leads.map(lead => ({
    ...lead,
    assignedTo: user._id,
    campaignTitle: campaignTitle || 'Untitled Campaign',
    batchNumber: batchNumber || `BATCH-${Date.now()}`,
  }));

  const createdLeads = await Lead.insertMany(leadsWithAssignment);
  res.status(201).json(createdLeads);
};

// @desc    Update lead details (pitching, follow-up, conversion)
// @route   PUT /api/marketing/leads/:id
// @access  Private
const updateLead = async (req, res) => {
  const { pitched, pitchRemark, followUp, followUpRemark, isConverted, status } = req.body;
  
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    res.status(404);
    throw new Error('Lead not found');
  }

  // Ensure user is authorized
  if (req.user.role !== 'admin' && lead.assignedTo.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this lead');
  }

  if (lead.isDeleted) {
    res.status(400);
    throw new Error('Cannot update a lead that has been deleted by admin');
  }

  // Update fields
  if (pitched !== undefined) lead.pitched = pitched;
  if (pitchRemark !== undefined) lead.pitchRemark = pitchRemark;
  if (followUp !== undefined) lead.followUp = followUp;
  if (followUpRemark !== undefined) lead.followUpRemark = followUpRemark;
  if (isConverted !== undefined) lead.isConverted = isConverted;
  if (status !== undefined) lead.status = status;

  // Track dates if status changed or features toggled
  if (pitched && !lead.pitchDate) lead.pitchDate = new Date();
  if (followUp && !lead.followUpDate) lead.followUpDate = new Date();

  const updatedLead = await lead.save();
  res.json(updatedLead);
};

// @desc    Delete a lead
// @route   DELETE /api/marketing/leads/:id
// @access  Private/Admin
const deleteLead = async (req, res) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    res.status(404);
    throw new Error('Lead not found');
  }

  lead.isDeleted = true;
  await lead.save();
  res.json({ message: 'Lead soft-deleted' });
};

// @desc    Delete all leads by campaign title (Soft Delete)
// @route   DELETE /api/marketing/campaign/:title
// @access  Private/Admin
const deleteLeadsByCampaign = async (req, res) => {
  const { title } = req.params;

  if (!title) {
    res.status(400);
    throw new Error('Please provide a campaign title');
  }

  const result = await Lead.updateMany({ campaignTitle: title }, { $set: { isDeleted: true } });
  res.json({ message: `${result.modifiedCount} leads soft-deleted from campaign: ${title}` });
};

// @desc    Toggle campaign activation status
// @route   PUT /api/marketing/campaign/:title/toggle
// @access  Private/Admin
const toggleCampaignStatus = async (req, res) => {
  const { title } = req.params;
  const { deactivate } = req.body;

  if (!title) {
    res.status(400);
    throw new Error('Please provide a campaign title');
  }

  await Lead.updateMany({ campaignTitle: title }, { $set: { isDeactivated: deactivate } });
  res.json({ message: `Campaign ${title} has been ${deactivate ? 'deactivated' : 'activated'}` });
};

// @desc    Delete all leads by batch number
// @route   DELETE /api/marketing/batch/:batchNumber
// @access  Private/Admin
const deleteLeadsByBatch = async (req, res) => {
  const { batchNumber } = req.params;

  if (!batchNumber) {
    res.status(400);
    throw new Error('Please provide a batch number');
  }

  const result = await Lead.deleteMany({ batchNumber });
  res.json({ message: `${result.deletedCount} leads permanently deleted from batch: ${batchNumber}` });
};

export { 
  getLeads, 
  bulkUploadLeads, 
  updateLead, 
  deleteLead, 
  deleteLeadsByCampaign,
  toggleCampaignStatus,
  deleteLeadsByBatch
};
