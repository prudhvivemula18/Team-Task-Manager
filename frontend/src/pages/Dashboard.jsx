import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format, isAfter } from 'date-fns';

const StatCard = ({ label, value, color, icon }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <span className="text-2xl">{icon}</span>
    </div>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    'todo': 'badge-todo',
    'in-progress': 'badge-in-progress',
    'done': 'badge-done',
  };
  const labels = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };
  return <span className={map[status]}>{labels[status]}</span>;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { stats, recentTasks, projectStats, tasksByUser } = data || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1">Here's what's happening with your projects.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Projects" value={stats?.totalProjects || 0} color="text-slate-100" icon="📁" />
        <StatCard label="Total Tasks" value={stats?.totalTasks || 0} color="text-slate-100" icon="📋" />
        <StatCard label="In Progress" value={stats?.inProgressTasks || 0} color="text-amber-300" icon="⚡" />
        <StatCard label="Completed" value={stats?.doneTasks || 0} color="text-emerald-300" icon="✅" />
        <StatCard label="Overdue" value={stats?.overdueTasks || 0} color="text-red-300" icon="🚨" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-base font-semibold text-slate-100 mb-4">Recent Tasks</h2>
          {recentTasks?.length === 0 ? (
            <p className="text-slate-500 text-sm">No tasks yet. Create a project and add tasks!</p>
          ) : (
            <div className="space-y-3">
              {recentTasks?.map(task => (
                <div key={task._id} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg hover:bg-surface-3 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{task.project?.name}</span>
                      {task.dueDate && (
                        <span className={`text-xs ${isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'done' ? 'text-red-400' : 'text-slate-500'}`}>
                          · Due {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Stats */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-100 mb-4">Projects Overview</h2>
          {projectStats?.length === 0 ? (
            <p className="text-slate-500 text-sm">No projects yet.</p>
          ) : (
            <div className="space-y-4">
              {projectStats?.map(p => {
                const progress = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                return (
                  <div key={p.project._id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <Link to={`/projects/${p.project._id}`} className="text-sm font-medium text-slate-200 hover:text-brand-400 transition-colors flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.project.color }} />
                        {p.project.name}
                      </Link>
                      <span className="text-xs text-slate-500">{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, background: p.project.color }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{p.done}/{p.total} tasks done</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tasks by user */}
      {tasksByUser?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-100 mb-4">Team Workload</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tasksByUser.map(({ user: u, total, done }) => (
              <div key={u._id} className="bg-surface-2 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-brand-500/30 flex items-center justify-center text-brand-300 text-xs font-semibold">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-200 truncate">{u.name}</span>
                </div>
                <p className="text-lg font-bold text-slate-100">{total} <span className="text-sm font-normal text-slate-400">tasks</span></p>
                <p className="text-xs text-emerald-400 mt-0.5">{done} completed</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
