const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const { ROLES } = require('../config/constants');
const {
    createGroup, createSubGroup, getMyGroups, getSharedGroups, getGroupDetails,
    updateGroup, deleteGroup, addMember, editMemberExpense,
    updateMemberStatus, removeMember,
} = require('../controllers/groupController');

router.use(authMiddleware);

// Groups
router.post('/', roleMiddleware(ROLES.USER), createGroup);
router.get('/', getMyGroups);
router.get('/shared', getSharedGroups);
router.get('/:id', getGroupDetails);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Sub-groups
router.post('/:id/sub-groups', roleMiddleware(ROLES.USER), createSubGroup);
router.delete('/sub-groups/:id', deleteGroup);

// Members
router.post('/:id/members', addMember);
router.put('/:id/members/:memberId', editMemberExpense);
router.put('/:id/members/:memberId/status', updateMemberStatus);
router.put('/sub-groups/:id/members/:memberId/status', updateMemberStatus); // specific match
router.delete('/:id/members/:memberId', removeMember);

module.exports = router;
