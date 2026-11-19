/** The card's status: running, waiting on the person, finished, or failed. */
export type JobStatus = 'working' | 'input' | 'done' | 'error'

/** One request to Claude, from the prompt to the answer. */
export type Job = {
  status: JobStatus
  /** The request as typed (read aloud by screen readers, not drawn). */
  task: string
  /** While waiting on the person: what Claude is asking ("Allow Bash: npm test?"). */
  question: string | null
  /** True when the person stopped the request (shown as "Stopped"). */
  stopped: boolean
  startedAt: number
  endedAt: number | null
  /** Tool calls on the main thread: the card's steps. */
  tools: number
}

export type Meter = { percent: number; resetsAt?: string }

export type Usage = {
  /** Context window fill, 0 to 100. */
  context?: number
  fiveHour?: Meter
  week?: Meter
  /** What the session has cost so far, in US dollars. */
  cost?: number
}

declare module 'claude-code' {
  interface PluginState {
    presto: {
      job: Job | null
      usage: Usage
    }
  }
}
