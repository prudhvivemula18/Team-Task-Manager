const Task = require('../models/Task');
const Project = require('../models/Project');

// GET /api/dashboard - Get dashboard stats
const getDashboard = async (req, res) => {
  try {
    // Get all user's projects
    const projects = await Project.find({ 'members.user': req.user._id });
    const projectIds = projects.map(p => p._id);

    const adminProjectIds = projects
      .filter(p => p.members.find(m => m.user.toString() === req.user._id.toString())?.role === 'admin')
      .map(p => p._id);

    // Build task filter based on role
    const taskFilter = {
      $or: [
        { project: { $in: adminProjectIds } },
        { assignedTo: req.user._id }
      ]
    };

    const allTasks = await Task.find(taskFilter)
      .populate('assignedTo', 'name email avatar')
      .populate('project', 'name color');

    const now = new Date();

    // Stats
    const totalTasks = allTasks.length;
    const todoTasks = allTasks.filter(t => t.status === 'todo').length;
    const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length;
    const doneTasks = allTasks.filter(t => t.status === 'done').length;
    const overdueTasks = allTasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'done'
    ).length;

    // Tasks per user (aggregated)
    const userTaskMap = {};
    allTasks.forEach(task => {
      if (task.assignedTo) {
        const userId = task.assignedTo._id.toString();
        if (!userTaskMap[userId]) {
          userTaskMap[userId] = {
            user: task.assignedTo,
            total: 0,
            done: 0
          };
        }
        userTaskMap[userId].total++;
        if (task.status === 'done') userTaskMap[userId].done++;
      }
    });

    // Recent tasks (last 5)
    const recentTasks = await Task.find(taskFilter)
      .populate('assignedTo', 'name email avatar')
      .populate('project', 'name color')
      .sort({ createdAt: -1 })
      .limit(5);

    // Tasks by project
    const projectStats = await Promise.all(projects.map(async (project) => {
      const filter = { project: project._id };
      const isAdmin = adminProjectIds.some(id => id.toString() === project._id.toString());
      if (!isAdmin) filter.assignedTo = req.user._id;

      const total = await Task.countDocuments(filter);
      const done = await Task.countDocuments({ ...filter, status: 'done' });
      const inProgress = await Task.countDocuments({ ...filter, status: 'in-progress' });
      const overdue = await Task.countDocuments({
        ...filter,
        dueDate: { $lt: now },
        status: { $ne: 'done' }
      });

      return {
        project: { _id: project._id, name: project.name, color: project.color },
        total,
        done,
        inProgress,
        todo: total - done - inProgress,
        overdue
      };
    }));

    res.json({
      stats: {
        totalProjects: projects.length,
        totalTasks,
        todoTasks,
        inProgressTasks,
        doneTasks,
        overdueTasks
      },
      tasksByUser: Object.values(userTaskMap),
      projectStats,
      recentTasks
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data.' });
  }
};

module.exports = { getDashboard };
