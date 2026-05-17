import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format, isAfter } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="w-full max-w-md card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl transition-colors">×</button>
      </div>
      {children}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = { 'todo': 'badge-todo', 'in-progress': 'badge-in-progress', 'done': 'badge-done' };
  const labels = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };
  return <span className={map[status]}>{labels[status]}</span>;
};

const PriorityBadge = ({ priority }) => {
  const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' };
  return <span className={map[priority]}>{priority}</span>;
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
  const [memberEmail, setMemberEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?project=${id}`)
      ]);
      setProject(projRes.data.project);
      setTasks(taskRes.data.tasks);
    } catch {
      toast.error('Project not found');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const isAdmin = project?.userRole === 'admin';

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'all') return true;
    if (activeTab === 'todo') return t.status === 'todo';
    if (activeTab === 'in-progress') return t.status === 'in-progress';
    if (activeTab === 'done') return t.status === 'done';
    if (activeTab === 'overdue') return t.dueDate && isAfter(new Date(), new Date(t.dueDate)) && t.status !== 'done';
    if (activeTab === 'mine') return t.assignedTo?._id === user?._id;
    return true;
  });

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/tasks', {
        ...taskForm,
        projectId: id,
        assignedTo: taskForm.assignedTo || undefined,
        dueDate: taskForm.dueDate || undefined,
      });
      setTasks(prev => [res.data.task, ...prev]);
      toast.success('Task created!');
      setShowAddTask(false);
      setTaskForm({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, updates);
      setTasks(prev => prev.map(t => t._id === taskId ? res.data.task : t));
      toast.success('Task updated');
      setEditTask(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post(`/projects/${id}/members`, { email: memberEmail });
      setProject(res.data.project);
      toast.success(res.data.message);
      setShowAddMember(false);
      setMemberEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setProject(prev => ({ ...prev, members: prev.members.filter(m => m.user._id !== userId) }));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch {
      toast.error('Failed to delete project');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { id: 'all', label: `All (${tasks.length})` },
    { id: 'todo', label: `To Do (${tasks.filter(t => t.status === 'todo').length})` },
    { id: 'in-progress', label: `In Progress (${tasks.filter(t => t.status === 'in-progress').length})` },
    { id: 'done', label: `Done (${tasks.filter(t => t.status === 'done').length})` },
    { id: 'mine', label: 'My Tasks' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{ background: project.color + '22', border: `1px solid ${project.color}55` }}>
            <span style={{ color: project.color }}>{project.name.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{project.name}</h1>
            {project.description && <p className="text-slate-400 mt-0.5">{project.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button onClick={() => setShowAddTask(true)} className="btn-primary">+ Add Task</button>
              <button onClick={() => setShowAddMember(true)} className="btn-secondary">👥 Members</button>
              <button onClick={() => setShowDeleteProject(true)} className="btn-danger">🗑️</button>
            </>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Team:</span>
        {project.members?.map(m => (
          <div key={m.user._id} className="flex items-center gap-1.5 bg-surface-2 rounded-full px-3 py-1">
            <div className="w-5 h-5 rounded-full bg-brand-500/30 flex items-center justify-center text-brand-300 text-xs font-semibold">
              {m.user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-slate-300">{m.user.name}</span>
            <span className={`text-xs ${m.role === 'admin' ? 'text-brand-400' : 'text-slate-500'}`}>·{m.role}</span>
            {isAdmin && m.user._id !== project.createdBy._id && m.user._id !== user?._id && (
              <button onClick={() => handleRemoveMember(m.user._id)} className="text-slate-600 hover:text-red-400 ml-1 transition-colors">×</button>
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks */}
      {filteredTasks.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-slate-400">No tasks here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => {
            const overdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'done';
            return (
              <div key={task._id} className="card p-4 hover:border-white/10 transition-all animate-slide-in">
                <div className="flex items-start gap-4">
                  {/* Status toggle */}
                  <button
                    onClick={() => handleUpdateTask(task._id, {
                      status: task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo'
                    })}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                      task.status === 'done' ? 'bg-emerald-500 border-emerald-500' :
                      task.status === 'in-progress' ? 'border-amber-400 bg-amber-400/20' : 'border-slate-600 hover:border-brand-400'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                        {task.title}
                      </p>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      {overdue && <span className="badge-high text-xs">Overdue</span>}
                    </div>

                    {task.description && (
                      <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      {task.assignedTo && (
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-brand-500/30 inline-flex items-center justify-center text-brand-300 text-xs font-semibold">
                            {task.assignedTo.name?.charAt(0)}
                          </span>
                          {task.assignedTo.name}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className={overdue ? 'text-red-400' : ''}>
                          Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setEditTask(task); }} className="text-slate-500 hover:text-slate-200 p-1.5 rounded hover:bg-surface-3 transition-all text-sm">✏️</button>
                      <button onClick={() => handleDeleteTask(task._id)} className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-surface-3 transition-all text-sm">🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showAddTask && (
        <Modal title="Create Task" onClose={() => setShowAddTask(false)}>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
              <input className="input" placeholder="Task title" value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea className="input resize-none" rows={2} placeholder="Optional details…"
                value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                <select className="input" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Due Date</label>
                <input type="date" className="input" value={taskForm.dueDate}
                  onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Assign To</label>
              <select className="input" value={taskForm.assignedTo} onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}>
                <option value="">Unassigned</option>
                {project.members?.map(m => (
                  <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAddTask(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Creating…' : 'Create Task'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Task Modal */}
      {editTask && (
        <Modal title="Edit Task" onClose={() => setEditTask(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
              <input className="input" value={editTask.title}
                onChange={e => setEditTask({ ...editTask, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea className="input resize-none" rows={2} value={editTask.description || ''}
                onChange={e => setEditTask({ ...editTask, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                <select className="input" value={editTask.status}
                  onChange={e => setEditTask({ ...editTask, status: e.target.value })}>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                <select className="input" value={editTask.priority}
                  onChange={e => setEditTask({ ...editTask, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Due Date</label>
                <input type="date" className="input"
                  value={editTask.dueDate ? editTask.dueDate.split('T')[0] : ''}
                  onChange={e => setEditTask({ ...editTask, dueDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Assign To</label>
                <select className="input" value={editTask.assignedTo?._id || ''}
                  onChange={e => setEditTask({ ...editTask, assignedTo: { _id: e.target.value } })}>
                  <option value="">Unassigned</option>
                  {project.members?.map(m => (
                    <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditTask(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleUpdateTask(editTask._id, {
                title: editTask.title,
                description: editTask.description,
                status: editTask.status,
                priority: editTask.priority,
                dueDate: editTask.dueDate || null,
                assignedTo: editTask.assignedTo?._id || null,
              })} className="btn-primary flex-1">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <Modal title="Add Member" onClose={() => setShowAddMember(false)}>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Member Email</label>
              <input type="email" className="input" placeholder="colleague@example.com"
                value={memberEmail} onChange={e => setMemberEmail(e.target.value)} required />
              <p className="text-xs text-slate-500 mt-1.5">User must have a TaskFlow account</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAddMember(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Adding…' : 'Add Member'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Project Modal */}
      {showDeleteProject && (
        <Modal title="Delete Project" onClose={() => setShowDeleteProject(false)}>
          <p className="text-slate-400 mb-5">Are you sure you want to delete <strong className="text-slate-200">{project.name}</strong>? This will also delete all {tasks.length} task(s). This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteProject(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDeleteProject} className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex-1">Delete Project</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
