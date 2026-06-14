<template>
  <div class="stargazing-weather">
    <h3 class="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-1">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
      观测天气提醒
    </h3>

    <div class="bg-gray-800 rounded-xl p-3 space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-gray-400 text-xs">晴空指数</span>
        <span class="text-lg font-bold" :class="indexColor">{{ store.clearSkyIndex }}</span>
      </div>

      <div class="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500"
          :style="{ width: store.clearSkyIndex + '%', background: barGradient }" />
      </div>

      <div class="flex items-center justify-between text-xs">
        <span class="px-2 py-0.5 rounded-full font-medium" :class="badgeClass">
          {{ suitabilityLabel }}
        </span>
        <span class="text-gray-500">{{ store.isNightTime ? '夜间' : '白天' }}</span>
      </div>

      <div class="border-t border-gray-700 pt-2 space-y-1.5">
        <div class="flex justify-between text-xs">
          <span class="text-gray-400">月相</span>
          <span class="text-amber-300">{{ moonEmoji }} {{ store.moonPhaseName }}</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-gray-400">月光亮度</span>
          <span class="text-gray-300">{{ Math.round(store.moonIllumination * 100) }}%</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-gray-400">云量</span>
          <span class="text-gray-300">{{ Math.round(store.cloudCover * 100) }}%</span>
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-gray-400">光污染</span>
          <span class="text-gray-300">{{ Math.round((1 - store.lightPollutionFactor) * 100) }}%</span>
        </div>
      </div>

      <div v-if="store.stargazingTips.length" class="border-t border-gray-700 pt-2 space-y-1">
        <p v-for="(tip, i) in store.stargazingTips" :key="i" class="text-xs text-yellow-300 flex items-start gap-1">
          <span class="mt-0.5 shrink-0">💡</span>
          <span>{{ tip }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSkyStore } from '../store/sky'

const store = useSkyStore()

const suitabilityLabel = computed(() => {
  const map = {
    excellent: '极佳 - 非常适合观星',
    good: '良好 - 适合观星',
    fair: '一般 - 观测条件受限',
    poor: '不佳 - 不建议观星',
  }
  return map[store.stargazingSuitability]
})

const indexColor = computed(() => {
  const idx = store.clearSkyIndex
  if (idx >= 80) return 'text-green-400'
  if (idx >= 60) return 'text-cyan-400'
  if (idx >= 40) return 'text-yellow-400'
  return 'text-red-400'
})

const badgeClass = computed(() => {
  const map = {
    excellent: 'bg-green-900 text-green-300',
    good: 'bg-cyan-900 text-cyan-300',
    fair: 'bg-yellow-900 text-yellow-300',
    poor: 'bg-red-900 text-red-300',
  }
  return map[store.stargazingSuitability]
})

const barGradient = computed(() => {
  const idx = store.clearSkyIndex
  if (idx >= 80) return 'linear-gradient(90deg, #22c55e, #4ade80)'
  if (idx >= 60) return 'linear-gradient(90deg, #06b6d4, #22d3ee)'
  if (idx >= 40) return 'linear-gradient(90deg, #eab308, #facc15)'
  return 'linear-gradient(90deg, #ef4444, #f87171)'
})

const moonEmoji = computed(() => {
  const p = store.moonPhase
  if (p < 0.0625 || p >= 0.9375) return '🌑'
  if (p < 0.1875) return '🌒'
  if (p < 0.3125) return '🌓'
  if (p < 0.4375) return '🌔'
  if (p < 0.5625) return '🌕'
  if (p < 0.6875) return '🌖'
  if (p < 0.8125) return '🌗'
  return '🌘'
})
</script>
