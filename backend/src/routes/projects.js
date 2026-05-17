const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  getProjects, createProject, getProject, updateProject,
  deleteProject, addMember, removeMember
} = require('../controllers/projectController');

router.use(protect);

router.get('/', getProjects);
router.post('/',
  [body('name').trim().notEmpty().withMessage('Project name is required')],
  createProject
);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/members',
  [body('email').isEmail().withMessage('Valid email is required')],
  addMember
);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
