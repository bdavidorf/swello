export interface BuoyReading {
  station_id: string
  timestamp: string
  wvht_m: number | null
  wvht_ft: number | null
  dpd_s: number | null
  apd_s: number | null
  mwd_deg: number | null
  mwd_label: string | null
  wspd_ms: number | null
  wspd_mph: number | null
  wdir_deg: number | null
  wdir_label: string | null
  wtmp_c: number | null
  wtmp_f: number | null
  atmp_c: number | null
  pres_hpa: number | null
  data_age_minutes: number | null
}

export type WaveClassification =
  | 'flat' | 'ankle' | 'knee' | 'waist' | 'chest'
  | 'head' | 'overhead' | 'double-overhead' | 'XXL'

export interface WavePower {
  kw_per_meter: number
  classification: WaveClassification
  surf_rating: number
}

export type WindQualityType = 'offshore' | 'cross-offshore' | 'cross' | 'cross-onshore' | 'onshore'

export interface WindQuality {
  direction_deg: number
  direction_label: string
  speed_mph: number
  quality: WindQualityType
  quality_label: string
}

export type CrowdLevel = 'empty' | 'uncrowded' | 'moderate' | 'crowded' | 'packed'

export interface CrowdPrediction {
  score: number
  level: CrowdLevel
  confidence: number
  peak_hour_today: number | null
}

export interface TideEvent {
  event_type: 'high' | 'low'
  timestamp: string
  height_ft: number
  hours_away: number | null
}

export interface TidePrediction {
  timestamp: string
  height_ft: number
}

export interface TideWindow {
  station_id: string
  generated_at: string
  predictions: TidePrediction[]
  events: TideEvent[]
}

export interface BreakingConditions {
  buoy_hs_ft: number
  buoy_period_s: number
  buoy_dir_deg: number
  swell_type: string
  swell_type_short: string
  period_quality: 'excellent' | 'good' | 'fair' | 'poor'
  swell_angle_diff: number
  direction_rating: 'ideal' | 'good' | 'cross' | 'marginal' | 'blocked'
  direction_pct: number
  breaking_hs_ft: number
  face_height_min_ft: number
  face_height_max_ft: number
  face_height_label: string
  interpretation: string
  spot_context: string
}


export interface SunTimes {
  date: string
  first_light_display: string
  sunrise_display: string
  solar_noon_display: string
  sunset_display: string
  last_light_display: string
  minutes_to_sunrise: number
  minutes_to_sunset: number
  is_daytime: boolean
  is_dawn_patrol_window: boolean
  is_golden_hour_morning: boolean
}

export interface SwellComponent {
  label: string          // "Primary", "Secondary", "Third", "Wind Chop"
  height_ft: number
  period_s: number
  direction_deg: number
  direction_label: string
}

export interface SurfCondition {
  spot_id: string
  spot_name: string
  spot_short_name: string
  updated_at: string
  buoy: BuoyReading
  wave_power: WavePower | null
  breaking: BreakingConditions | null
  wind: WindQuality | null
  crowd: CrowdPrediction | null
  next_tide: TideEvent | null
  current_tide_ft: number | null
  sun: SunTimes | null
  swells: SwellComponent[]
}

export interface SpotMeta {
  id: string
  name: string
  short_name: string
  lat: number
  lon: number
  break_type: string
  difficulty: string
  facing_dir: string
  region: string
  description: string
  fame_score: number
}

export interface ForecastHour {
  timestamp: string
  date: string
  hour: number
  face_height_min_ft: number
  face_height_max_ft: number
  face_height_label: string
  swell_height_m: number | null
  swell_period_s: number | null
  swell_dir_deg: number | null
  swell_type_short: string
  period_quality: 'excellent' | 'good' | 'fair' | 'poor'
  direction_rating: string
  direction_pct: number
  wind_speed_mph: number
  wind_quality: WindQualityType
  wind_quality_label: string
  tide_ft: number | null
  combo_swell: boolean
  combo_label: string
  surf_rating: number
  crowd_score: number
  crowd_level: CrowdLevel
}

export interface ForecastDay {
  date: string
  day_label: string
  face_height_min_ft: number
  face_height_max_ft: number
  face_height_label: string
  peak_face_ft: number
  peak_hour: number
  swell_height_m: number | null
  swell_period_s: number | null
  swell_dir_label: string
  swell_type_short: string
  period_quality: 'excellent' | 'good' | 'fair' | 'poor'
  direction_rating: string
  best_wind_quality: WindQualityType
  avg_wind_speed_mph: number
  surf_rating: number
  crowd_score: number
  crowd_level: CrowdLevel
}

export interface SpotForecast {
  spot_id: string
  spot_name: string
  generated_at: string
  daily: ForecastDay[]
  hourly: ForecastHour[]
}

export interface UserPreferences {
  min_wave_height_ft: number
  max_wave_height_ft: number
  preferred_period_s: number
  max_wind_speed_mph: number
  max_crowd_score: number
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

export interface SpotWindow {
  spot_id: string
  spot_name: string
  start: string
  end: string
  wave_height_ft: number
  period_s: number
  crowd_score: number
  wind_quality: string
  composite_score: number
  why: string
}

export interface AIRankingResponse {
  ranked_windows: SpotWindow[]
  explanation: string
  top_pick: string
  top_pick_time: string
  generated_at: string
  model_used: string
}
