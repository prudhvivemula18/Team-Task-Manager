const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');

router.use(protect);

router.get('/', getTasks);
router.post('/',
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('projectId').notEmpty().withMessage('Project ID is required')
  ],
  createTask
);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;
