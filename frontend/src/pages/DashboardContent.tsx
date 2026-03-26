import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { useSpotStore } from '../store/spotStore'
import {
  fetchConditions, fetchForecast, fetchTides, fetchCrowdToday, fetchPinConditions,
} from '../api/client'
import { ConditionsCard } from '../components/conditions/ConditionsCard'
import { CrowdMeter } from '../components/crowd/CrowdMeter'
import { CrowdTimeline } from '../components/crowd/CrowdTimeline'
import { CrowdDataStatus } from '../components/crowd/CrowdDataStatus'
import { SwelloAIPanel } from '../components/ai/SwelloAIPanel'
import { TideChart } from '../components/forecast/TideChart'
import { HourlyChart } from '../components/forecast/HourlyChart'
import { ForecastPanel } from '../components/forecast/ForecastPanel'
import { SkeletonCard } from '../components/shared/SkeletonCard'
import type { SurfCondition, SpotForecast, TideWindow } from '../types/surf'

/** Show on desktop always; on mobile only when the given tab is active */
function Section({ tab, children }: { tab: string; children: React.ReactNode }) {
  const { mobileTab } = useSpotStore()
  return (
    <div className={clsx('md:block', mobileTab === tab ? 'block' : 'hidden')}>
      {children}
    </div>
  )
}

export function DashboardContent() {
  const { selectedSpotId, pinLatLon } = useSpotStore()
  const isPin = selectedSpotId === 'pin'

  const spotCondition = useQuery<SurfCondition>({
    queryKey: isPin
      ? ['pin-condition', pinLatLon?.lat, pinLatLon?.lon]
      : ['condition', selectedSpotId],
    queryFn: isPin
      ? () => fetchPinConditions(pinLatLon!.lat, pinLatLon!.lon, pinLatLon!.name)
      : () => fetchConditions(selectedSpotId),
    enabled: isPin ? !!pinLatLon : true,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })

  const forecast = useQuery<SpotForecast>({
    queryKey: ['forecast', selectedSpotId],
    queryFn: () => fetchForecast(selectedSpotId),
    staleTime: 30 * 60 * 1000,
  })

  const tides = useQuery<TideWindow>({
    queryKey: ['tides', selectedSpotId],
    queryFn: () => fetchTides(selectedSpotId),
    staleTime: 6 * 60 * 60 * 1000,
  })

  const crowdToday = useQuery({
    queryKey: ['crowd-today', selectedSpotId],
    queryFn: () => fetchCrowdToday(selectedSpotId),
    staleTime: 30 * 60 * 1000,
  })

  const condition = spotCondition.data

  return (
    <main
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 w-full"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
    >
      {/* ── Waves tab ── */}
      <Section tab="waves">
        {spotCondition.isLoading ? (
          <SkeletonCard height="h-64" />
        ) : condition ? (
          <>
            {isPin && !condition.wave_power && !condition.breaking && (
              <div className="card p-4 mb-4" style={{ borderColor: 'rgba(120,184,216,0.20)' }}>
                <p style={{ fontFamily: "'Bangers', Impact, system-ui", fontSize: 13, letterSpacing: '0.12em', color: '#78B8D8', margin: 0 }}>
                  LAND LOCATION — WIND DATA ONLY
                </p>
                <p style={{ fontFamily: "'Inter', system-ui", fontSize: 12, color: '#6AAED0', margin: '4px 0 0' }}>
                  No ocean swell detected at this pin. Move it to open water for full surf conditions.
                </p>
              </div>
            )}
            <ConditionsCard condition={condition} />
          </>
        ) : (
          <div className="card p-6 border-red-500/30">
            <p className="text-ocean-400 text-sm">
              Conditions unavailable — backend may be starting up. Check that the FastAPI server is running on port 8001.
            </p>
          </div>
        )}
      </Section>

      <Section tab="waves">
        {tides.data?.predictions && tides.data.predictions.length > 0 && (
          <TideChart
            predictions={tides.data.predictions}
            events={tides.data.events}
          />
        )}
      </Section>

      <Section tab="waves">
        {(condition?.crowd || crowdToday.data?.hourly) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {condition?.crowd && (
              <CrowdMeter
                score={condition.crowd.score}
                level={condition.crowd.level}
                confidence={condition.crowd.confidence}
                peakHour={condition.crowd.peak_hour_today}
              />
            )}
            {crowdToday.data?.hourly && (
              <CrowdTimeline data={crowdToday.data.hourly} />
            )}
          </div>
        )}
      </Section>

      {/* ── Forecast tab ── */}
      <Section tab="forecast">
        {forecast.data?.daily && forecast.data.daily.length > 0 && (
          <ForecastPanel daily={forecast.data.daily} hourly={forecast.data.hourly} />
        )}
      </Section>

      <Section tab="forecast">
        {forecast.data?.hourly && forecast.data.hourly.length > 0 && (
          <HourlyChart data={forecast.data.hourly} />
        )}
      </Section>

      {/* ── AI tab ── */}
      <Section tab="ai">
        <SwelloAIPanel />
      </Section>

      <div className="h-2" />
    </main>
  )
}
