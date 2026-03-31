import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'

export type TaskCategory =
  | 'casting'
  | 'locations'
  | 'props'
  | 'script'
  | 'crew'
  | 'budget'
  | 'visuals'
  | 'sceduale'
  | 'equipment'
  | 'post-production'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'not-started' | 'in-progress' | 'completed'

export interface TaskLink {
  label: string
  url: string
}

export interface Task {
  id: string
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  assignedTo: string
  links: TaskLink[]
  dueDate: string
  createdAt: string
  updatedAt: string
}

const TASKS_KEY = 'all-tasks'

function getTaskStore() {
  return getStore({ name: 'film-tasks', consistency: 'strong' })
}

export const getTasks = createServerFn({ method: 'GET' }).handler(async () => {
  const store = getTaskStore()
  const tasks = await store.get(TASKS_KEY, { type: 'json' })
  return (tasks as Task[]) || []
})

export const createTask = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      title: string
      description: string
      category: TaskCategory
      priority: TaskPriority
      assignedTo: string
      links: TaskLink[]
      dueDate: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const store = getTaskStore()
    const tasks = ((await store.get(TASKS_KEY, { type: 'json' })) as Task[]) || []
    const now = new Date().toISOString()
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      status: 'not-started',
      assignedTo: data.assignedTo,
      links: data.links,
      dueDate: data.dueDate,
      createdAt: now,
      updatedAt: now,
    }
    tasks.push(newTask)
    await store.setJSON(TASKS_KEY, tasks)
    return newTask
  })

export const updateTask = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: string
      title?: string
      description?: string
      category?: TaskCategory
      priority?: TaskPriority
      status?: TaskStatus
      assignedTo?: string
      links?: TaskLink[]
      dueDate?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const store = getTaskStore()
    const tasks = ((await store.get(TASKS_KEY, { type: 'json' })) as Task[]) || []
    const idx = tasks.findIndex((t) => t.id === data.id)
    if (idx === -1) throw new Error('Task not found')
    const { id, ...updates } = data
    tasks[idx] = { ...tasks[idx], ...updates, updatedAt: new Date().toISOString() }
    await store.setJSON(TASKS_KEY, tasks)
    return tasks[idx]
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const store = getTaskStore()
    const tasks = ((await store.get(TASKS_KEY, { type: 'json' })) as Task[]) || []
    const filtered = tasks.filter((t) => t.id !== data.id)
    await store.setJSON(TASKS_KEY, filtered)
    return { success: true }
  })
