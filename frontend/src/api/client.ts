import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

export const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
})

export async function fetchConditions(spotId?: string) {
  const url = spotId ? `/conditions/${spotId}` : '/conditions'
  const { data } = await api.get(url)
  return data
}

export async function fetchAllConditions() {
  const { data } = await api.get('/conditions')
  return data
}

export async function fetchSpotMeta() {
  const { data } = await api.get('/conditions/meta/all')
  return data
}

export async function fetchSpotRatings() {
  const { data } = await api.get('/conditions/ratings')
  return data as { spot_id: string; rating: number | null; wave_height_str: string | null }[]
}

export async function fetchForecast(spotId: string, hours = 168) {
  const { data } = await api.get(`/forecast/${spotId}`, { params: { hours } })
  return data
}

export async function fetchTides(spotId: string, days = 7) {
  const { data } = await api.get(`/tides/${spotId}`, { params: { days } })
  return data
}

export async function fetchCrowdToday(spotId: string) {
  const { data } = await api.get(`/crowd/${spotId}/today`)
  return data
}

export async function fetchAIRanking(preferences: object, horizonHours = 48) {
  const { data } = await api.post('/ai/rank-spots', {
    preferences,
    forecast_horizon_hours: horizonHours,
  })
  return data
}

export async function fetchSpotAnalysis(condition: object, spotMeta: object) {
  const { data } = await api.post('/ai/spot-analysis', { condition, spot_meta: spotMeta })
  return data as { analysis: string; spot_id: string }
}

export async function fetchCrowdStatus() {
  const { data } = await api.get('/crowd/data-status')
  return data
}

export async function triggerCrowdCollect(spotId?: string) {
  const params = spotId ? { spot_id: spotId } : {}
  const { data } = await api.post('/crowd/collect', null, { params })
  return data
}


export async function fetchSwelloAI(
  profile: {
    skill: string
    board: string
    prefers_bigger: boolean
    prefers_cleaner: boolean
    prefers_uncrowded: boolean
  },
  location?: { lat: number; lon: number },
) {
  const { data } = await api.post('/swello-ai/recommend', { ...profile, ...location })
  return data
}

export async function fetchPinConditions(lat: number, lon: number, name = 'Dropped Pin') {
  const { data } = await api.get('/conditions/pin', { params: { lat, lon, name } })
  return data
}

export async function fetchAIChat(
  messages: { role: string; content: string }[],
  spotId: string,
) {
  const { data } = await api.post('/ai/chat', { messages, spot_id: spotId })
  return data as { reply: string; model_used: string }
}
