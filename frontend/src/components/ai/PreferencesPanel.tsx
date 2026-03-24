import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, Sparkles } from 'lucide-react'
import { useSpotStore } from '../../store/spotStore'
import type { UserPreferences } from '../../types/surf'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
  color?: string
}

function Slider({ label, value, min, max, step, unit, onChange, color = '#00d4c8' }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="stat-label">{label}</label>
        <span className="text-ocean-50 font-bold text-sm font-mono">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, #123055 ${pct}%, #123055 100%)`,
        }}
      />
    </div>
  )
}

export function PreferencesPanel({ onSubmit }: { onSubmit: () => void }) {
  const { preferences, setPreferences, preferencesOpen, setPreferencesOpen } = useSpotStore()

  return (
    <AnimatePresence>
      {preferencesOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="card border-l-2 border-l-wave-400 p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-wave-400" />
              <h3 className="font-bold text-ocean-50">Your Preferences</h3>
            </div>
            <button
              onClick={() => setPreferencesOpen(false)}
              className="text-ocean-400 hover:text-ocean-50 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Experience level */}
            <div>
              <p className="stat-label mb-2">Experience Level</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setPreferences({ experience_level: lvl })}
                    className={`py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                      preferences.experience_level === lvl
                        ? 'bg-wave-400 text-ocean-950 border-wave-400'
                        : 'border-ocean-700 text-ocean-400 hover:border-wave-400/50 hover:text-ocean-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <Slider
              label="Min Wave Height"
              value={preferences.min_wave_height_ft}
              min={0} max={10} step={0.5} unit="ft"
              onChange={(v) => setPreferences({ min_wave_height_ft: v })}
            />

            <Slider
              label="Max Wave Height"
              value={preferences.max_wave_height_ft}
              min={2} max={20} step={0.5} unit="ft"
              onChange={(v) => setPreferences({ max_wave_height_ft: v })}
            />

            <Slider
              label="Preferred Period"
              value={preferences.preferred_period_s}
              min={5} max={22} step={1} unit="s"
              onChange={(v) => setPreferences({ preferred_period_s: v })}
              color="#6aa3d4"
            />

            <Slider
              label="Max Wind Speed"
              value={preferences.max_wind_speed_mph}
              min={0} max={30} step={1} unit="mph"
              onChange={(v) => setPreferences({ max_wind_speed_mph: v })}
              color="#84cc16"
            />

            <Slider
              label="Crowd Tolerance"
              value={preferences.max_crowd_score}
              min={10} max={100} step={5} unit=""
              onChange={(v) => setPreferences({ max_crowd_score: v })}
              color="#f59e0b"
            />
            <p className="text-ocean-500 text-xs -mt-3">
              {preferences.max_crowd_score < 35 ? 'Near empty only' :
               preferences.max_crowd_score < 55 ? 'Moderate crowds OK' :
               preferences.max_crowd_score < 75 ? 'Crowded is fine' :
               'Any crowd OK'}
            </p>

            <button
              onClick={onSubmit}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              <Sparkles size={15} />
              Ask Claude for Best Windows
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
