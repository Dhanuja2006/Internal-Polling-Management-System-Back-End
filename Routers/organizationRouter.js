import express from 'express';
import * as organizationController from '../Controller/organizationController.js';
import { authMiddleware, adminMiddleware } from '../Middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/', adminMiddleware, organizationController.createOrganization);
router.post('/join', organizationController.joinOrganization);
router.get('/my', organizationController.getMyOrganizations);
router.get('/:orgId/members', organizationController.getOrganizationMembers);
router.get('/:orgId/logs', organizationController.getOrgLogs);
router.put('/:orgId/members/:userId/role', organizationController.updateMemberRole);
router.delete('/:orgId/leave', organizationController.leaveOrganization);

export default router;
