import express from 'express';
import { 
  getLeads, 
  bulkUploadLeads, 
  updateLead, 
  deleteLead, 
  deleteLeadsByCampaign,
  toggleCampaignStatus 
} from '../controllers/marketingController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/leads')
  .get(protect, getLeads);

router.post('/bulk', protect, authorize('admin'), bulkUploadLeads);
router.delete('/campaign/:title', protect, authorize('admin'), deleteLeadsByCampaign);
router.put('/campaign/:title/toggle', protect, authorize('admin'), toggleCampaignStatus);

router.route('/leads/:id')
  .put(protect, updateLead)
  .delete(protect, authorize('admin'), deleteLead);

export default router;
