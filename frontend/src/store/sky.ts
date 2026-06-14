import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { STARS, CONSTELLATIONS } from '../data/stars'
import type { Star } from '../types'

export const useSkyStore = defineStore('sky', () => {
  const viewDate = ref(new Date())
  const zoom = ref(1.0)
  const panX = ref(0)
  const panY = ref(0)
  const showLabels = ref(true)
  const showConstLines = ref(true)
  const showGrid = ref(true)
  const selectedStar = ref<Star | null>(null)
  const searchQuery = ref('')
  const latitude = ref(39.9) // Beijing default

  const localSiderealTime = computed(() => {
    const d = viewDate.value
    const jd = d.getTime() / 86400000 + 2440587.5
    const T = (jd - 2451545.0) / 36525.0
    let lst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * (0.000387933 - T / 38710000)
    lst = ((lst % 360) + 360) % 360
    return lst / 15 // convert to hours
  })

  const filteredStars = computed(() => {
    if (!searchQuery.value) return []
    const q = searchQuery.value.toLowerCase()
    return STARS.filter(s => s.name.toLowerCase().includes(q)).slice(0, 5)
  })

  function projectStar(ra: number, dec: number, cx: number, cy: number, scale: number): [number, number] {
    const ha = (localSiderealTime.value - ra) * 15 * Math.PI / 180
    const decRad = dec * Math.PI / 180
    const latRad = latitude.value * Math.PI / 180

    const alt = Math.asin(Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha))
    const az = Math.atan2(-Math.cos(decRad) * Math.sin(ha), Math.sin(decRad) * Math.cos(latRad) - Math.cos(decRad) * Math.sin(latRad) * Math.cos(ha))

    if (alt < -0.1) return [-999, -999] // below horizon

    const r = (Math.PI / 2 - alt) * scale * 0.45
    const x = cx + panX.value + r * Math.sin(az)
    const y = cy + panY.value - r * Math.cos(az)
    return [x, y]
  }

  function starRadius(mag: number): number {
    return Math.max(1, 5 - mag) * zoom.value
  }

  function spectralColor(spectral: string): string {
    const colors: Record<string, string> = {
      'O': '#9bb0ff', 'B': '#aabfff', 'A': '#cad7ff',
      'F': '#f8f7ff', 'G': '#fff4ea', 'K': '#ffd2a1', 'M': '#ffcc6f'
    }
    return colors[spectral] || '#ffffff'
  }

  function selectStar(x: number, y: number, cx: number, cy: number, scale: number) {
    let closest: Star | null = null
    let minDist = 20
    for (const star of STARS) {
      const [sx, sy] = projectStar(star.ra, star.dec, cx, cy, scale)
      const dist = Math.hypot(sx - x, sy - y)
      if (dist < minDist) { minDist = dist; closest = star }
    }
    selectedStar.value = closest
  }

  const moonPhase = computed(() => {
    const d = viewDate.value
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth() + 1
    const day = d.getUTCDate()
    const c = Math.floor(year / 100)
    const y = year - 19 * Math.floor(year / 19)
    const k = Math.floor((c - 17) / 25)
    let i = c - Math.floor(c / 4) - Math.floor((c - k) / 3) + 19 * y + 15
    i = i - 30 * Math.floor(i / 30)
    i = i - Math.floor(i / 28) * (1 - Math.floor(i / 28) * Math.floor(29 / (i + 1)) * Math.floor((21 - y) / 11))
    let j = year + Math.floor(year / 4) + i + 2 - c + Math.floor(c / 4)
    j = j - 7 * Math.floor(j / 7)
    const l = i - j
    const moonMonth = month + Math.floor((l + day - 40) / 44) * 30 + (l + day - 40) % 44
    const synodicMonth = 29.53059
    const phase = ((moonMonth % synodicMonth) + synodicMonth) % synodicMonth
    return phase / synodicMonth
  })

  const moonIllumination = computed(() => {
    const p = moonPhase.value
    return (1 - Math.cos(2 * Math.PI * p)) / 2
  })

  const moonPhaseName = computed(() => {
    const p = moonPhase.value
    if (p < 0.0625 || p >= 0.9375) return '新月'
    if (p < 0.1875) return '蛾眉月'
    if (p < 0.3125) return '上弦月'
    if (p < 0.4375) return '盈凸月'
    if (p < 0.5625) return '满月'
    if (p < 0.6875) return '亏凸月'
    if (p < 0.8125) return '下弦月'
    return '残月'
  })

  function seededRandom(seed: number): number {
    let s = seed
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }

  const cloudCover = computed(() => {
    const d = viewDate.value
    const dateSeed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
    const base = seededRandom(dateSeed)
    const hourNoise = seededRandom(dateSeed + d.getHours() * 31) * 0.3
    return Math.min(1, Math.max(0, base * 0.6 + hourNoise))
  })

  const isNightTime = computed(() => {
    const hour = viewDate.value.getHours()
    return hour >= 19 || hour < 6
  })

  const nightQuality = computed(() => {
    if (!isNightTime.value) return 0
    const hour = viewDate.value.getHours()
    if (hour >= 22 || hour < 2) return 1.0
    if (hour >= 20 || hour < 4) return 0.8
    return 0.5
  })

  const lightPollutionFactor = computed(() => {
    const lat = Math.abs(latitude.value)
    const absLat = Math.abs(lat - 39.9)
    return Math.max(0.3, Math.min(0.95, 0.85 - absLat * 0.005))
  })

  const clearSkyIndex = computed(() => {
    const cloudScore = (1 - cloudCover.value) * 40
    const moonScore = (1 - moonIllumination.value) * 25
    const nightScore = nightQuality.value * 20
    const pollutionScore = lightPollutionFactor.value * 15
    return Math.round(Math.min(100, Math.max(0, cloudScore + moonScore + nightScore + pollutionScore)))
  })

  const stargazingSuitability = computed<'excellent' | 'good' | 'fair' | 'poor'>(() => {
    const idx = clearSkyIndex.value
    if (idx >= 80) return 'excellent'
    if (idx >= 60) return 'good'
    if (idx >= 40) return 'fair'
    return 'poor'
  })

  const stargazingTips = computed(() => {
    const tips: string[] = []
    if (!isNightTime.value) {
      tips.push('当前为白天，不适合观星')
      tips.push('建议在日落后1小时开始观测')
    } else {
      if (moonIllumination.value > 0.6) {
        tips.push('月光较亮，影响暗天体观测')
        tips.push('建议观测明亮的行星和星座')
      } else if (moonIllumination.value < 0.15) {
        tips.push('月光微弱，是观测深空天体的好时机')
      }
      if (cloudCover.value > 0.6) {
        tips.push('云层较厚，观测条件不佳')
      } else if (cloudCover.value < 0.2) {
        tips.push('天空晴朗，观测条件极佳')
      }
      if (clearSkyIndex.value >= 70) {
        tips.push('建议前往光污染少的郊外观测')
      }
    }
    return tips
  })

  return {
    viewDate, zoom, panX, panY, showLabels, showConstLines, showGrid,
    selectedStar, searchQuery, latitude, localSiderealTime, filteredStars,
    projectStar, starRadius, spectralColor, selectStar,
    STARS, CONSTELLATIONS,
    moonPhase, moonIllumination, moonPhaseName, cloudCover,
    isNightTime, nightQuality, lightPollutionFactor,
    clearSkyIndex, stargazingSuitability, stargazingTips
  }
})
