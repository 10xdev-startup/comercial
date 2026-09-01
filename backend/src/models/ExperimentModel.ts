import { randomUUID } from 'crypto'
import { isDatabaseConfigured } from '@/database/isConfigured'
import { supabase } from '@/database/supabase'
import { getMemoryStore } from '@/store/memoryStore'

export type ExperimentStatus = 'draft' | 'running' | 'concluded'

export interface Experiment {
  id: string
  name: string
  hypothesis: string
  status: ExperimentStatus
  controlVariant: string
  variants: string[]
  sampleSize: number
  winner: string | null
  createdAt: string
  updatedAt: string
}

function useMemory(): boolean {
  return !isDatabaseConfigured()
}

function rowToExperiment(row: {
  id: string
  name: string
  hypothesis: string
  status: ExperimentStatus
  control_variant: string
  variants: string[]
  sample_size: number
  winner: string | null
  created_at: string
  updated_at: string
}): Experiment {
  return {
    id: row.id,
    name: row.name,
    hypothesis: row.hypothesis,
    status: row.status,
    controlVariant: row.control_variant,
    variants: row.variants,
    sampleSize: row.sample_size,
    winner: row.winner,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class EarlyWinnerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EarlyWinnerError'
  }
}

export const ExperimentModel = {
  async list(): Promise<Experiment[]> {
    if (useMemory()) return getMemoryStore().listExperiments()
    const { data, error } = await supabase.from('experiments').select('*').order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return ((data ?? []) as Parameters<typeof rowToExperiment>[0][]).map(rowToExperiment)
  },

  async findById(id: string): Promise<Experiment | null> {
    if (useMemory()) return getMemoryStore().findExperiment(id)
    const { data, error } = await supabase.from('experiments').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? rowToExperiment(data as Parameters<typeof rowToExperiment>[0]) : null
  },

  async create(input: {
    name: string
    hypothesis: string
    controlVariant?: string
    variants: string[]
    sampleSize: number
  }): Promise<Experiment> {
    if (input.variants.length !== 1) {
      throw new Error('experiments allow exactly one variable (one variant plus control)')
    }
    const now = new Date().toISOString()
    const experiment: Experiment = {
      id: randomUUID(),
      name: input.name,
      hypothesis: input.hypothesis,
      status: 'running',
      controlVariant: input.controlVariant ?? 'control',
      variants: input.variants,
      sampleSize: input.sampleSize,
      winner: null,
      createdAt: now,
      updatedAt: now,
    }
    if (useMemory()) return getMemoryStore().insertExperiment(experiment)
    const { data, error } = await supabase
      .from('experiments')
      .insert({
        id: experiment.id,
        name: experiment.name,
        hypothesis: experiment.hypothesis,
        status: experiment.status,
        control_variant: experiment.controlVariant,
        variants: experiment.variants,
        sample_size: experiment.sampleSize,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToExperiment(data as Parameters<typeof rowToExperiment>[0])
  },

  assignVariant(experiment: Experiment, leadId: string): string {
    const options = [experiment.controlVariant, ...experiment.variants]
    let hash = 0
    for (const char of leadId) hash = (hash + char.charCodeAt(0)) % 2147483647
    const picked = options[hash % options.length]
    return picked ?? experiment.controlVariant
  },

  async declareWinner(id: string, winner: string, assignedCount: number): Promise<Experiment> {
    const experiment = await ExperimentModel.findById(id)
    if (!experiment) throw new Error('Experiment not found')
    const allowed = [experiment.controlVariant, ...experiment.variants]
    if (!allowed.includes(winner)) throw new Error('unknown variant')
    if (assignedCount < experiment.sampleSize) {
      throw new EarlyWinnerError(`sample_too_small:${assignedCount}<${experiment.sampleSize}`)
    }
    const now = new Date().toISOString()
    if (useMemory()) return getMemoryStore().concludeExperiment(id, winner, now)
    const { data, error } = await supabase
      .from('experiments')
      .update({ winner, status: 'concluded', updated_at: now })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return rowToExperiment(data as Parameters<typeof rowToExperiment>[0])
  },
}
