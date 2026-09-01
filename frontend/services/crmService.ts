import { apiClient } from "@/services/apiClient"
import type { BoardResponse, CrmMetrics, Funnel, JobSummary, LeadDetailResponse, SystemState } from "@/types/crm"

export const crmService = {
  getBoard: (funnel: Funnel) => apiClient.get<BoardResponse>(`/crm/board?funnel=${funnel}`),
  getLead: (id: string) => apiClient.get<LeadDetailResponse>(`/crm/leads/${id}`),
  getMetrics: () => apiClient.get<CrmMetrics>("/crm/metrics"),
  getJobs: () => apiClient.get<{ jobs: JobSummary[] }>("/crm/jobs"),
  getStatus: () => apiClient.get<SystemState>("/crm/status"),
  setPaused: (paused: boolean, reason?: string) =>
    apiClient.post<SystemState>("/crm/pause", reason ? { paused, reason } : { paused }),
  enqueueFirstDm: (leadId: string) =>
    apiClient.post<{ job: JobSummary }>(`/crm/leads/${leadId}/first-dm`, {}),
}
