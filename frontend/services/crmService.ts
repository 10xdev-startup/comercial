import { apiClient } from "@/services/apiClient"
import type {
  BoardResponse,
  ExperimentSummary,
  JobSummary,
  Lead,
  LeadDetailResponse,
  PublicCrmConfig,
  SystemState,
} from "@/types/crm"

export const crmService = {
  getBoard: () => apiClient.get<BoardResponse>("/crm/board"),
  getLead: (id: string) => apiClient.get<LeadDetailResponse>(`/crm/leads/${id}`),
  createLead: (input: { instagramHandle: string; displayName?: string; bio?: string }) =>
    apiClient.post<{ lead: Lead }>("/crm/leads", input),
  updateLead: (id: string, input: { pipelineState?: Lead["pipelineState"]; channelState?: Lead["channelState"] }) =>
    apiClient.patch<{ lead: Lead }>(`/crm/leads/${id}`, input),
  addNote: (id: string, body: string) =>
    apiClient.post<{ job: JobSummary }>(`/crm/leads/${id}/notes`, { body }),
  getJobs: () => apiClient.get<{ jobs: JobSummary[] }>("/crm/jobs"),
  getStatus: () => apiClient.get<SystemState>("/crm/status"),
  setPaused: (paused: boolean, reason?: string) =>
    apiClient.post<SystemState>("/crm/pause", reason ? { paused, reason } : { paused }),
  getConfig: () => apiClient.get<PublicCrmConfig>("/crm/config"),
  getExperiments: () => apiClient.get<{ experiments: ExperimentSummary[] }>("/crm/experiments"),
  enqueueDiscover: () => apiClient.post<{ job: JobSummary; duplicate: boolean }>("/crm/discover", {}),
  enqueueFirstContact: (id: string) =>
    apiClient.post<{ job: JobSummary; duplicate: boolean }>(`/crm/leads/${id}/first-contact`, {}),
}
