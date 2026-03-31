import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  type Task,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
  type TaskLink,
} from '../server/tasks.functions'
import {
  Film,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  SortAsc,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Circle,
  X,
  Pencil,
  User,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  loader: async () => {
    const tasks = await getTasks()
    return { tasks }
  },
  component: Home,
})

const CATEGORIES: { value: TaskCategory; label: string; color: string; bg: string }[] = [
  { value: 'casting', label: 'Casting', color: 'text-purple-700', bg: 'bg-purple-100' },
  { value: 'locations', label: 'Locations', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  { value: 'props', label: 'Props', color: 'text-amber-700', bg: 'bg-amber-100' },
  { value: 'script', label: 'Script', color: 'text-blue-700', bg: 'bg-blue-100' },
  { value: 'crew', label: 'Crew', color: 'text-rose-700', bg: 'bg-rose-100' },
  { value: 'budget', label: 'Budget', color: 'text-green-700', bg: 'bg-green-100' },
  { value: 'sceduale', label: 'Sceduale', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  { value: 'budget', label: 'Visuals', color: 'text-red-700', bg: 'bg-green-100' },
  { value: 'equipment', label: 'Equipment', color: 'text-cyan-700', bg: 'bg-cyan-100' },
  { value: 'post-production', label: 'Post-Production', color: 'text-indigo-700', bg: 'bg-indigo-100' },
]

const PRIORITIES: { value: TaskPriority; label: string; color: string; dot: string }[] = [
  { value: 'low', label: 'Low', color: 'text-gray-600', dot: 'bg-gray-400' },
  { value: 'medium', label: 'Medium', color: 'text-blue-600', dot: 'bg-blue-400' },
  { value: 'high', label: 'High', color: 'text-orange-600', dot: 'bg-orange-400' },
  { value: 'critical', label: 'Critical', color: 'text-red-600', dot: 'bg-red-500' },
]

const STATUSES: { value: TaskStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'not-started', label: 'Not Started', icon: <Circle className="w-4 h-4 text-gray-400" /> },
  { value: 'in-progress', label: 'In Progress', icon: <Clock className="w-4 h-4 text-blue-500" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
]

const PRIORITY_ORDER: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

function getCategoryMeta(cat: TaskCategory) {
  return CATEGORIES.find((c) => c.value === cat)!
}
function getPriorityMeta(p: TaskPriority) {
  return PRIORITIES.find((x) => x.value === p)!
}
function getStatusMeta(s: TaskStatus) {
  return STATUSES.find((x) => x.value === s)!
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isOverdue(dueDate: string, status: TaskStatus) {
  if (!dueDate || status === 'completed') return false
  return new Date(dueDate + 'T00:00:00') < new Date(new Date().toDateString())
}

interface TaskFormValues {
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  assignedTo: string
  links: TaskLink[]
  dueDate: string
}

const defaultForm: TaskFormValues = {
  title: '',
  description: '',
  category: 'script',
  priority: 'medium',
  assignedTo: '',
  links: [],
  dueDate: '',
}

function Home() {
  const { tasks: initialTasks } = Route.useLoaderData()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState<TaskFormValues>(defaultForm)
  const [submitting, setSubmitting] = useState(false)

  // Filters & sort
  const [filterCategory, setFilterCategory] = useState<TaskCategory | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'category' | 'createdAt'>('priority')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filteredTasks = useMemo(() => {
    let result = [...tasks]
    if (filterCategory !== 'all') result = result.filter((t) => t.category === filterCategory)
    if (filterPriority !== 'all') result = result.filter((t) => t.priority === filterPriority)
    if (filterStatus !== 'all') result = result.filter((t) => t.status === filterStatus)

    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'priority') cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      else if (sortBy === 'dueDate') cmp = (a.dueDate || 'z').localeCompare(b.dueDate || 'z')
      else if (sortBy === 'category') cmp = a.category.localeCompare(b.category)
      else if (sortBy === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [tasks, filterCategory, filterPriority, filterStatus, sortBy, sortDir])

  function openCreate() {
    setForm(defaultForm)
    setEditingTask(null)
    setShowForm(true)
  }

  function openEdit(task: Task) {
    setForm({
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      assignedTo: task.assignedTo || '',
      links: task.links || [],
      dueDate: task.dueDate,
    })
    setEditingTask(task)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    try {
      if (editingTask) {
        const updated = await updateTask({ data: { id: editingTask.id, ...form, status: editingTask.status } })
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      } else {
        const created = await createTask({ data: form })
        setTasks((prev) => [...prev, created])
      }
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    const updated = await updateTask({ data: { id: taskId, status } })
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  async function handleDelete(taskId: string) {
    await deleteTask({ data: { id: taskId } })
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(field); setSortDir('asc') }
  }

  const SortIcon = ({ field }: { field: typeof sortBy }) =>
    sortBy === field ? (
      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
    ) : null

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    inProgress: tasks.filter((t) => t.status === 'in-progress').length,
    critical: tasks.filter((t) => t.priority === 'critical' && t.status !== 'completed').length,
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Film className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Pre-Production Tracker</h1>
              <p className="text-xs text-gray-400">Film Production Task Manager</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Tasks', value: stats.total, color: 'text-white' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-400' },
            { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Critical', value: stats.critical, color: 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters & Sort */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TaskCategory | 'all')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Statuses</option>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            <div className="flex items-center gap-2 ml-auto">
              <SortAsc className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Sort by:</span>
              {(['priority', 'dueDate', 'category', 'createdAt'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => toggleSort(f)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    sortBy === f ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {f === 'createdAt' ? 'Date Added' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <SortIcon field={f} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task count */}
        <p className="text-sm text-gray-400 mb-4">
          Showing {filteredTasks.length} of {tasks.length} tasks
        </p>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Film className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm mt-1">Adjust filters or create a new task</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const catMeta = getCategoryMeta(task.category)
              const priMeta = getPriorityMeta(task.priority)
              const statusMeta = getStatusMeta(task.status)
              const overdue = isOverdue(task.dueDate, task.status)
              return (
                <div
                  key={task.id}
                  className={`bg-gray-900 border rounded-xl p-4 transition-all ${
                    task.status === 'completed'
                      ? 'border-gray-800 opacity-70'
                      : overdue
                      ? 'border-red-800'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Status toggle */}
                    <div className="mt-0.5 shrink-0">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        className="appearance-none bg-transparent cursor-pointer focus:outline-none"
                        title="Change status"
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="shrink-0 mt-0.5">{statusMeta.icon}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className={`font-semibold text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-white'}`}>
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => openEdit(task)}
                            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${catMeta.bg} ${catMeta.color}`}>
                          {catMeta.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${priMeta.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priMeta.dot}`} />
                          {priMeta.label}
                        </span>
                        {task.dueDate && (
                          <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'text-red-400' : 'text-gray-400'}`}>
                            {overdue && <AlertCircle className="w-3 h-3" />}
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          task.status === 'completed' ? 'bg-emerald-900 text-emerald-300' :
                          task.status === 'in-progress' ? 'bg-blue-900 text-blue-300' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {statusMeta.label}
                        </span>
                        {task.assignedTo && (
                          <span className="inline-flex items-center gap-1 text-xs text-violet-400">
                            <User className="w-3 h-3" />
                            {task.assignedTo}
                          </span>
                        )}
                      </div>
                      {task.links && task.links.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {task.links.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-full transition-colors"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {link.label || link.url}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="Task title..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Optional details..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TaskCategory }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Assigned To</label>
                <input
                  type="text"
                  value={form.assignedTo}
                  onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                  placeholder="Team member name..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-300">Links</label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, links: [...f.links, { label: '', url: '' }] }))}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Link
                  </button>
                </div>
                {form.links.map((link, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => {
                        const updated = [...form.links]
                        updated[i] = { ...updated[i], label: e.target.value }
                        setForm((f) => ({ ...f, links: updated }))
                      }}
                      placeholder="Label"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={(e) => {
                        const updated = [...form.links]
                        updated[i] = { ...updated[i], url: e.target.value }
                        setForm((f) => ({ ...f, links: updated }))
                      }}
                      placeholder="https://..."
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, links: f.links.filter((_, idx) => idx !== i) }))}
                      className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {editingTask && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask((t) => t ? { ...t, status: e.target.value as TaskStatus } : t)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  {submitting ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
