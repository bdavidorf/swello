export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'
export type BoardType  = 'longboard' | 'funboard' | 'fish' | 'shortboard'

export interface UserProfile {
  skill:             SkillLevel
  board:             BoardType
  prefers_bigger:    boolean
  prefers_cleaner:   boolean
  prefers_uncrowded: boolean
}

export interface ScoreBreakdown {
  direction: number  // 0-1
  wind:      number
  power:     number
  size:      number
  period:    number
  tide:      number
}

export interface SpotPick {
  spot_id:           string
  spot_name:         string
  spot_short_name:   string
  score:             number   // 0-10
  confidence:        number   // 0-100
  breakdown:         ScoreBreakdown
  face_height_label: string
  wave_power_label:  string
  crowd:             string
  best_window_start: string
  best_window_end:   string
  reasons:           string[]
  warnings:          string[]
  data_age_minutes:  number | null
}

export interface SwelloAIResponse {
  top_picks:          SpotPick[]
  generated_at:       string
  conditions_summary: string
}
