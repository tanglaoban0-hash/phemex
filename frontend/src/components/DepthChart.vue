<template>
  <div class="depth-chart" ref="chartRef"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  bids: { type: Array, default: () => [] },
  asks: { type: Array, default: () => [] },
  currentPrice: { type: Number, default: 0 }
})

const chartRef = ref(null)
let chart = null

const initChart = () => {
  if (!chartRef.value) return
  
  chart = echarts.init(chartRef.value)
  updateChart()
  
  window.addEventListener('resize', handleResize)
}

const handleResize = () => {
  chart?.resize()
}

const updateChart = () => {
  if (!chart) return
  
  // 处理买单数据（累计）
  const bidsData = [...props.bids]
    .sort((a, b) => b.price - a.price)
    .slice(0, 20)
    .reverse()
  
  let bidAccumulated = 0
  const bidSeriesData = bidsData.map(item => {
    bidAccumulated += parseFloat(item.amount)
    return [parseFloat(item.price), bidAccumulated]
  })
  
  // 处理卖单数据（累计）
  const asksData = [...props.asks]
    .sort((a, b) => a.price - b.price)
    .slice(0, 20)
  
  let askAccumulated = 0
  const askSeriesData = asksData.map(item => {
    askAccumulated += parseFloat(item.amount)
    return [parseFloat(item.price), askAccumulated]
  })
  
  const option = {
    backgroundColor: 'transparent',
    grid: {
      top: 10,
      left: 50,
      right: 50,
      bottom: 30
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: '#161b22',
      borderColor: '#30363d',
      textStyle: {
        color: '#fff'
      },
      formatter: (params) => {
        const data = params[0]
        const color = data.seriesName === '买单' ? '#00d4aa' : '#ff6b6b'
        return `
          <div style="color: ${color}; font-weight: bold;">${data.seriesName}</div>
          <div>价格: ${data.value[0].toFixed(2)}</div>
          <div>累计: ${data.value[1].toFixed(4)}</div>
        `
      }
    },
    xAxis: {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: '#30363d' } },
      axisLabel: { 
        color: '#8b949e',
        formatter: (val) => val.toFixed(2)
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: '#8b949e' },
      splitLine: { 
        lineStyle: { 
          color: '#21262d',
          type: 'dashed'
        } 
      }
    },
    series: [
      {
        name: '买单',
        type: 'line',
        data: bidSeriesData,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#00d4aa',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0, 212, 170, 0.3)' },
            { offset: 1, color: 'rgba(0, 212, 170, 0.05)' }
          ])
        }
      },
      {
        name: '卖单',
        type: 'line',
        data: askSeriesData,
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#ff6b6b',
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
            { offset: 1, color: 'rgba(255, 107, 107, 0.05)' }
          ])
        }
      }
    ]
  }
  
  chart.setOption(option)
}

watch(() => [props.bids, props.asks], updateChart, { deep: true })

onMounted(initChart)
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.depth-chart {
  width: 100%;
  height: 200px;
}
</style>
