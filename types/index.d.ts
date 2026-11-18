/** Where the current request stands. */
export type JobStatus = 'working' | 'done' | 'stopped'

/** One request to Claude, from the prompt to the answer. */
export type Job = {
  status: JobStatus
  startedAt: number
  endedAt: number | null
  /** What Claude is doing now, in a few words ("Editing register.tsx"). */
  activity: string | null
  /** Files Claude wrote or edited during the request. */
  files: string[]
  /** Tool calls on the main thread. */
  tools: number
}

export type Meter = { percent: number; resetsAt?: string }

export type Usage = {
  /** Context window fill, 0 to 100. */
  context?: number
  fiveHour?: Meter
  week?: Meter
}

declare module 'claude-code' {
  interface PluginState {
    presto: {
      job: Job | null
      usage: Usage
    }
  }
}
