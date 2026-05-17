const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');

// GET /api/projects - Get all projects for current user
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id
    })
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Attach task counts
    const projectsWithCounts = await Promise.all(projects.map(async (project) => {
      const taskCount = await Task.countDocuments({ project: project._id });
      const completedCount = await Task.countDocuments({ project: project._id, status: 'done' });
      const p = project.toObject();
      p.taskCount = taskCount;
      p.completedCount = completedCount;
      // Get user's role in this project
      const member = project.members.find(m => m.user._id.toString() === req.user._id.toString());
      p.userRole = member ? member.role : 'member';
      return p;
    }));

    res.json({ projects: projectsWithCounts });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Failed to fetch projects.' });
  }
};

// POST /api/projects - Create a new project
const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  try {
    const { name, description, color } = req.body;

    const project = await Project.create({
      name,
      description,
      color: color || '#6366f1',
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    await project.populate('members.user', 'name email avatar');
    await project.populate('createdBy', 'name email');

    const p = project.toObject();
    p.userRole = 'admin';
    p.taskCount = 0;
    p.completedCount = 0;

    res.status(201).json({ message: 'Project created successfully', project: p });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Failed to create project.' });
  }
};

// GET /api/projects/:id - Get single project
const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      'members.user': req.user._id
    })
      .populate('members.user', 'name email avatar')
      .populate('createdBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found or access denied.' });
    }

    const member = project.members.find(m => m.user._id.toString() === req.user._id.toString());
    const p = project.toObject();
    p.userRole = member ? member.role : 'member';

    res.json({ project: p });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project.' });
  }
};

// PUT /api/projects/:id - Update project (Admin only)
const updateProject = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, 'members.user': req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (member?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });

    const { name, description, color } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;

    await project.save();
    await project.populate('members.user', 'name email avatar');

    const p = project.toObject();
    p.userRole = 'admin';

    res.json({ message: 'Project updated', project: p });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project.' });
  }
};

// DELETE /api/projects/:id - Delete project (Admin only)
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, 'members.user': req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (member?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ message: 'Project and all tasks deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete project.' });
  }
};

// POST /api/projects/:id/members - Add member (Admin only)
const addMember = async (req, res) => {
  try {
    const { email, role } = req.body;
    const project = await Project.findOne({ _id: req.params.id, 'members.user': req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const requestingMember = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (requestingMember?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) return res.status(404).json({ message: 'User with this email not found.' });

    const alreadyMember = project.members.some(m => m.user.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ message: 'User is already a member.' });

    project.members.push({ user: userToAdd._id, role: role || 'member' });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ message: `${userToAdd.name} added to project`, project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add member.' });
  }
};

// DELETE /api/projects/:id/members/:userId - Remove member (Admin only)
const removeMember = async (req, res) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, 'members.user': req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const requestingMember = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (requestingMember?.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });

    if (req.params.userId === project.createdBy.toString()) {
      return res.status(400).json({ message: 'Cannot remove the project creator.' });
    }

    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();

    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove member.' });
  }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject, addMember, removeMember };
