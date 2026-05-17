const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');

const getProjectAndRole = async (projectId, userId) => {
  const project = await Project.findOne({
    _id: projectId,
    'members.user': userId
  });
  if (!project) return { project: null, role: null };
  const member = project.members.find(m => m.user.toString() === userId.toString());
  return { project, role: member?.role || 'member' };
};

// GET /api/tasks?project=:id - Get tasks for a project
const getTasks = async (req, res) => {
  try {
    const { project: projectId, status, priority, assignedTo } = req.query;

    const filter = {};

    if (projectId) {
      const { project, role } = await getProjectAndRole(projectId, req.user._id);
      if (!project) return res.status(404).json({ message: 'Project not found or access denied.' });

      filter.project = projectId;
      // Members only see assigned tasks
      if (role === 'member') filter.assignedTo = req.user._id;
    } else {
      // Get all tasks across all user's projects
      const projects = await Project.find({ 'members.user': req.user._id });
      const projectIds = projects.map(p => p._id);
      filter.project = { $in: projectIds };

      // Members only see their own tasks
      const adminProjects = projects
        .filter(p => p.members.find(m => m.user.toString() === req.user._id.toString())?.role === 'admin')
        .map(p => p._id.toString());

      if (adminProjects.length < projectIds.length) {
        // Has some member-only projects
        filter.$or = [
          { project: { $in: adminProjects } },
          { assignedTo: req.user._id }
        ];
        delete filter.project;
      }
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('project', 'name color')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
};

// POST /api/tasks - Create a task (Admin only)
const createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  try {
    const { title, description, status, priority, dueDate, projectId, assignedTo } = req.body;

    const { project, role } = await getProjectAndRole(projectId, req.user._id);
    if (!project) return res.status(404).json({ message: 'Project not found or access denied.' });
    if (role !== 'admin') return res.status(403).json({ message: 'Only admins can create tasks.' });

    // Validate assignedTo is a project member
    if (assignedTo) {
      const isMember = project.members.some(m => m.user.toString() === assignedTo);
      if (!isMember) return res.status(400).json({ message: 'Assigned user must be a project member.' });
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      project: projectId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id
    });

    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name color');

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Failed to create task.' });
  }
};

// PUT /api/tasks/:id - Update a task
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const { project, role } = await getProjectAndRole(task.project._id, req.user._id);
    if (!project) return res.status(403).json({ message: 'Access denied.' });

    const { title, description, status, priority, dueDate, assignedTo } = req.body;

    if (role === 'admin') {
      // Admins can update everything
      if (title) task.title = title;
      if (description !== undefined) task.description = description;
      if (status) task.status = status;
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    } else {
      // Members can only update status of their own tasks
      if (task.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only update your own tasks.' });
      }
      if (status) task.status = status;
    }

    await task.save();
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name color');

    res.json({ message: 'Task updated', task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Failed to update task.' });
  }
};

// DELETE /api/tasks/:id - Delete a task (Admin only)
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const { project, role } = await getProjectAndRole(task.project, req.user._id);
    if (!project) return res.status(403).json({ message: 'Access denied.' });
    if (role !== 'admin') return res.status(403).json({ message: 'Only admins can delete tasks.' });

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete task.' });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
