import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 手势滑动 composable
 * @param {Object} options
 * @param {Function} options.onSwipeLeft - 左滑回调
 * @param {Function} options.onSwipeRight - 右滑回调
 * @param {Function} options.onSwipeUp - 上滑回调
 * @param {Function} options.onSwipeDown - 下滑回调
 * @param {Number} options.threshold - 触发阈值（默认50px）
 */
export function useSwipe(elementRef, options = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50
  } = options

  const startX = ref(0)
  const startY = ref(0)
  const startTime = ref(0)
  const isSwiping = ref(false)

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    startX.value = touch.clientX
    startY.value = touch.clientY
    startTime.value = Date.now()
    isSwiping.value = true
  }

  const handleTouchMove = (e) => {
    if (!isSwiping.value) return
    
    // 防止默认滚动（如果是水平滑动）
    const touch = e.touches[0]
    const deltaX = touch.clientX - startX.value
    const deltaY = touch.clientY - startY.value
    
    // 如果是水平滑动，阻止默认行为
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e) => {
    if (!isSwiping.value) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - startX.value
    const deltaY = touch.clientY - startY.value
    const deltaTime = Date.now() - startTime.value
    
    // 快速滑动检测（300ms内）
    const isQuickSwipe = deltaTime < 300
    const swipeThreshold = isQuickSwipe ? threshold / 2 : threshold
    
    // 水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        onSwipeRight?.()
      } else {
        onSwipeLeft?.()
      }
    }
    // 垂直滑动
    else if (Math.abs(deltaY) > swipeThreshold) {
      if (deltaY > 0) {
        onSwipeDown?.()
      } else {
        onSwipeUp?.()
      }
    }
    
    isSwiping.value = false
  }

  onMounted(() => {
    const element = elementRef.value || document
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    const element = elementRef.value || document
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)
  })

  return {
    isSwiping
  }
}

/**
 * 下拉刷新 composable
 */
export function usePullToRefresh(elementRef, options = {}) {
  const { onRefresh, threshold = 80 } = options
  
  const startY = ref(0)
  const currentY = ref(0)
  const isPulling = ref(false)
  const isRefreshing = ref(false)
  const pullDistance = ref(0)

  const handleTouchStart = (e) => {
    const element = elementRef.value
    if (element.scrollTop > 0) return
    
    startY.value = e.touches[0].clientY
    isPulling.value = true
  }

  const handleTouchMove = (e) => {
    if (!isPulling.value || isRefreshing.value) return
    
    const element = elementRef.value
    if (element.scrollTop > 0) {
      isPulling.value = false
      return
    }
    
    currentY.value = e.touches[0].clientY
    const delta = currentY.value - startY.value
    
    if (delta > 0) {
      e.preventDefault()
      // 阻尼效果
      pullDistance.value = Math.min(delta * 0.5, threshold * 1.5)
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling.value || isRefreshing.value) return
    
    if (pullDistance.value >= threshold) {
      isRefreshing.value = true
      await onRefresh?.()
      isRefreshing.value = false
    }
    
    pullDistance.value = 0
    isPulling.value = false
  }

  onMounted(() => {
    const element = elementRef.value
    if (!element) return
    
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    const element = elementRef.value
    if (!element) return
    
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)
  })

  return {
    isPulling,
    isRefreshing,
    pullDistance
  }
}

/**
 * 长按 composable
 */
export function useLongPress(elementRef, options = {}) {
  const { onLongPress, onPressEnd, delay = 500 } = options
  
  const pressTimer = ref(null)
  const isPressing = ref(false)

  const startPress = (e) => {
    isPressing.value = true
    pressTimer.value = setTimeout(() => {
      if (isPressing.value) {
        onLongPress?.(e)
      }
    }, delay)
  }

  const endPress = (e) => {
    isPressing.value = false
    if (pressTimer.value) {
      clearTimeout(pressTimer.value)
      pressTimer.value = null
    }
    onPressEnd?.(e)
  }

  const cancelPress = () => {
    isPressing.value = false
    if (pressTimer.value) {
      clearTimeout(pressTimer.value)
      pressTimer.value = null
    }
  }

  onMounted(() => {
    const element = elementRef.value
    if (!element) return
    
    element.addEventListener('mousedown', startPress)
    element.addEventListener('touchstart', startPress, { passive: true })
    element.addEventListener('mouseup', endPress)
    element.addEventListener('touchend', endPress)
    element.addEventListener('mouseleave', cancelPress)
    element.addEventListener('touchcancel', cancelPress)
  })

  onUnmounted(() => {
    const element = elementRef.value
    if (!element) return
    
    element.removeEventListener('mousedown', startPress)
    element.removeEventListener('touchstart', startPress)
    element.removeEventListener('mouseup', endPress)
    element.removeEventListener('touchend', endPress)
    element.removeEventListener('mouseleave', cancelPress)
    element.removeEventListener('touchcancel', cancelPress)
    
    if (pressTimer.value) {
      clearTimeout(pressTimer.value)
    }
  })

  return {
    isPressing
  }
}
