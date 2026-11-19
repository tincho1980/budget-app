import { apiRequest } from './client'

export type ProjectStatus = 'survey' | 'in_progress' | 'delivered' | 'closed'
export type BudgetStatus = 'sent' | 'approved' | 'rejected'

type ProjectBudget = {
  id: number
  version: number
  status: BudgetStatus
  total: string
}

export type Project = {
  id: number
  name: string
  description: string | null
  status: ProjectStatus
  started_on: string | null
  closed_on: string | null
  current_budget: (ProjectBudget & { pending_approval: boolean }) | null
}

export type ProjectDetail = Project & { budgets: ProjectBudget[] }

export const projectKeys = {
  list: ['projects'] as const,
  detail: (id: string) => ['projects', id] as const,
}

export async function getProjects(signal?: AbortSignal): Promise<Project[]> {
  const { projects } = await apiRequest<{ projects: Project[] }>('/projects', { signal })
  return projects
}

export async function getProject(id: string, signal?: AbortSignal): Promise<ProjectDetail> {
  const { project } = await apiRequest<{ project: ProjectDetail }>(`/projects/${encodeURIComponent(id)}`, { signal })
  return project
}
