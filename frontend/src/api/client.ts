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
