import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format, isAfter } from 'date-fns';

const StatusBadge = ({ status }) => {
  const map = { 'todo': 'badge-todo', 'in-progress': 'badge-in-progress', 'done': 'badge-done' };
  const labels = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };
  return <span className={map[status]}>{labels[status]}</span>;
};

const PriorityBadge = ({ priority }) => {
  const map = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high' };
  return <span className={map[priority]}>{priority}</span>;
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '' });

  useEffect(() => {
    api.get('/tasks')
      .then(res => setTasks(res.data.tasks))
      .finally(() => setLoading(false));
  }, []);

  const handleStatusUpdate = async (taskId, status) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status });
      setTasks(prev => prev.map(t => t._id === taskId ? res.data.task : t));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const filtered = tasks.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    return true;
  });

  const grouped = {
    overdue: filtered.filter(t => t.dueDate && isAfter(new Date(), new Date(t.dueDate)) && t.status !== 'done'),
    todo: filtered.filter(t => t.status === 'todo' && !(t.dueDate && isAfter(new Date(), new Date(t.dueDate)))),
    inProgress: filtered.filter(t => t.status === 'in-progress' && !(t.dueDate && isAfter(new Date(), new Date(t.dueDate)))),
    done: filtered.filter(t => t.status === 'done'),
  };

  const TaskRow = ({ task }) => {
    const overdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'done';
    return (
      <div className="flex items-start gap-4 p-4 card hover:border-white/10 transition-all animate-slide-in">
        <button
          onClick={() => handleStatusUpdate(task._id, task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'todo')}
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
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
            <Link to={`/projects/${task.project?._id}`} className="hover:text-brand-400 transition-colors flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: task.project?.color }} />
              {task.project?.name}
            </Link>
            {task.dueDate && (
              <span className={overdue ? 'text-red-400' : ''}>
                Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
                {overdue && ' · Overdue'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Section = ({ title, tasks, color }) => {
    if (tasks.length === 0) return null;
    return (
      <div>
        <h3 className={`text-sm font-semibold mb-2 ${color}`}>{title} <span className="text-slate-500 font-normal">({tasks.length})</span></h3>
        <div className="space-y-2">
          {tasks.map(t => <TaskRow key={t._id} task={t} />)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Tasks</h1>
          <p className="text-slate-400 mt-1">{tasks.length} total task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        {/* Filters */}
        <div className="flex gap-3">
          <select className="input text-sm py-2" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select className="input text-sm py-2" value={filter.priority} onChange={e => setFilter({ ...filter, priority: e.target.value })}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No tasks found</h3>
          <p className="text-slate-400 text-sm">Tasks assigned to you will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="⚠️ Overdue" tasks={grouped.overdue} color="text-red-400" />
          <Section title="⚡ In Progress" tasks={grouped.inProgress} color="text-amber-300" />
          <Section title="📋 To Do" tasks={grouped.todo} color="text-slate-300" />
          <Section title="✅ Done" tasks={grouped.done} color="text-emerald-400" />
        </div>
      )}
    </div>
  );
}
