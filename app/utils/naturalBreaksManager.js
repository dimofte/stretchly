import EventEmitter from 'events'
import log from 'electron-log/main.js'
import { desktopIdle } from 'node-desktop-idle-v2'
import { powerMonitor } from 'electron'

class NaturalBreaksManager extends EventEmitter {
  constructor (settings) {
    super()
    this.settings = settings
    this.usingNaturalBreaks = settings.get('naturalBreaks')
    this.naturalBreaksCheckInterval = settings.get('naturalBreaksCheckInterval')
    this.timer = null
    this.isOnNaturalBreak = false
    this.isSchedulerCleared = false
    this.isIdlePausing = false
    if (this.usingNaturalBreaks) {
      this.start()
    }
  }

  start () {
    if (this.timer) return
    this.usingNaturalBreaks = true
    desktopIdle.startMonitoring()
    this._checkIdleTime()
    log.info('Stretchly: starting Idle time monitoring')
  }

  stop () {
    if (!this.timer) return
    this._finishIdlePause()
    this.usingNaturalBreaks = false
    this.isOnNaturalBreak = false
    this.isSchedulerCleared = false
    clearInterval(this.timer)
    this.timer = null
    desktopIdle.stopMonitoring()
    log.info('Stretchly: stopping Idle time monitoring')
  }

  get idleTime () {
    if (this.usingNaturalBreaks) {
      return (powerMonitor.getSystemIdleTime() || desktopIdle.getIdleTime()) * 1000
    } else {
      return 0
    }
  }

  get pauseTime () {
    const pauseTime = this.settings.get('naturalBreaksInactivityPauseTime')
    const resetTime = this.settings.get('naturalBreaksInactivityResetTime')
    return pauseTime > 0 && pauseTime < resetTime ? pauseTime : 0
  }

  _finishIdlePause () {
    if (!this.isIdlePausing) return
    this.isIdlePausing = false
    this.emit('idlePauseFinished')
  }

  _checkIdleTime () {
    let lastIdleTime = 0
    this.timer = setInterval(() => {
      const idleTime = this.idleTime
      const pauseTime = this.pauseTime
      const threshold = pauseTime || 20000
      if (!this.isOnNaturalBreak && idleTime > threshold) {
        this.isOnNaturalBreak = true
      }
      if (this.isOnNaturalBreak && idleTime < threshold) {
        this.isOnNaturalBreak = false
        if (lastIdleTime > this.settings.get('naturalBreaksInactivityResetTime')) {
          this.isSchedulerCleared = false
          this.emit('naturalBreakFinished')
        }
      }
      if (this.isOnNaturalBreak && pauseTime) {
        this.isIdlePausing = true
        this.emit('idlePauseStarted', idleTime)
      } else {
        this._finishIdlePause()
      }
      if (this.isOnNaturalBreak && idleTime > this.settings.get('naturalBreaksInactivityResetTime')) {
        this.isSchedulerCleared = true
        this.emit('clearBreakScheduler')
      }
      lastIdleTime = idleTime
    }, this.naturalBreaksCheckInterval)
  }
}

export default NaturalBreaksManager
