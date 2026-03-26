// 手势滑动指令
export default {
  install(app) {
    // 滑动切换指令
    app.directive('swipe', {
      mounted(el, binding) {
        let startX = 0
        let startY = 0
        let startTime = 0
        const threshold = 50 // 滑动阈值
        const restraint = 100 // 垂直方向限制
        const allowedTime = 500 // 允许的时间

        el.addEventListener('touchstart', (e) => {
          const touch = e.changedTouches[0]
          startX = touch.pageX
          startY = touch.pageY
          startTime = new Date().getTime()
        }, { passive: true })

        el.addEventListener('touchend', (e) => {
          const touch = e.changedTouches[0]
          const distX = touch.pageX - startX
          const distY = touch.pageY - startY
          const elapsedTime = new Date().getTime() - startTime

          if (elapsedTime <= allowedTime) {
            // 水平滑动
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
              if (distX > 0) {
                // 右滑
                binding.value?.right?.()
              } else {
                // 左滑
                binding.value?.left?.()
              }
            }
            // 垂直滑动
            if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) {
              if (distY > 0) {
                // 下滑
                binding.value?.down?.()
              } else {
                // 上滑
                binding.value?.up?.()
              }
            }
          }
        }, { passive: true })
      }
    })

    // 下拉刷新指令
    app.directive('pull-refresh', {
      mounted(el, binding) {
        let startY = 0
        let pullDistance = 0
        const threshold = 80

        const refreshIndicator = document.createElement('div')
        refreshIndicator.className = 'pull-refresh-indicator'
        refreshIndicator.innerHTML = '<span>↓ 下拉刷新</span>'
        el.insertBefore(refreshIndicator, el.firstChild)

        el.addEventListener('touchstart', (e) => {
          if (el.scrollTop === 0) {
            startY = e.touches[0].pageY
          }
        }, { passive: true })

        el.addEventListener('touchmove', (e) => {
          if (startY > 0 && el.scrollTop === 0) {
            pullDistance = e.touches[0].pageY - startY
            if (pullDistance > 0) {
              refreshIndicator.style.transform = `translateY(${Math.min(pullDistance * 0.5, threshold)}px)`
              refreshIndicator.style.opacity = Math.min(pullDistance / threshold, 1)
              if (pullDistance >= threshold) {
                refreshIndicator.innerHTML = '<span>↑ 释放刷新</span>'
              }
            }
          }
        }, { passive: true })

        el.addEventListener('touchend', () => {
          if (pullDistance >= threshold) {
            refreshIndicator.innerHTML = '<span>加载中...</span>'
            binding.value?.()
          }
          refreshIndicator.style.transform = 'translateY(0)'
          refreshIndicator.style.opacity = '0'
          startY = 0
          pullDistance = 0
        }, { passive: true })
      }
    })
  }
}
