import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="w-full max-w-md card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors text-xl">×</button>
      </div>
      {children}
    </div>
  </div>
);

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
  const [saving, setSaving] = useState(false);

  const fetchProjects = () => {
    api.get('/projects').then(res => setProjects(res.data.projects)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/projects', form);
      setProjects(prev => [res.data.project, ...prev]);
      toast.success('Project created!');
      setShowCreate(false);
      setForm({ name: '', description: '', color: COLORS[0] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="text-slate-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New Project
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📁</p>
          <h3 className="text-lg font-semibold text-slate-200 mb-1">No projects yet</h3>
          <p className="text-slate-400 text-sm mb-4">Create your first project to get started</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary inline-flex">+ Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link
              key={project._id}
              to={`/projects/${project._id}`}
              className="card p-5 hover:border-white/10 hover:bg-surface-2 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: project.color + '33', border: `1px solid ${project.color}66` }}>
                    <span style={{ color: project.color }}>{project.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 group-hover:text-brand-300 transition-colors">{project.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${project.userRole === 'admin' ? 'bg-brand-500/20 text-brand-300' : 'bg-slate-700/60 text-slate-400'}`}>
                      {project.userRole}
                    </span>
                  </div>
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{project.members?.length} member{project.members?.length !== 1 ? 's' : ''}</span>
                <span>{project.taskCount} task{project.taskCount !== 1 ? 's' : ''}</span>
              </div>

              {project.taskCount > 0 && (
                <div className="mt-3">
                  <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((project.completedCount / project.taskCount) * 100)}%`,
                        background: project.color
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{project.completedCount}/{project.taskCount} done</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="Create Project" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Project Name *</label>
              <input
                className="input"
                placeholder="e.g. Website Redesign"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Brief description…"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-2 scale-110' : ''}`}
                    style={{ background: color }}
                    onClick={() => setForm({ ...form, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
