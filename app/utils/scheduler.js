class Scheduler {
  constructor (func, delay, reference = null) {
    this.timer = null
    this.pausedTimeLeft = null
    this.delay = delay
    this.func = func
    this.reference = reference
  }

  get isPaused () {
    return this.pausedTimeLeft !== null
  }

  get timeLeft () {
    if (this.isPaused) return this.pausedTimeLeft
    if (this.timer === null) return false
    return this.now + this.delay - Date.now()
  }

  plan () {
    this.now = Date.now()
    this.timer = setTimeout(this.func, this.delay)
  }

  correct () {
    if (this.timer === null) return
    clearTimeout(this.timer)
    this.timer = setTimeout(this.func, this.timeLeft)
  }

  pause (extraTime = 0) {
    if (this.timer === null || this.timeLeft <= 0) return
    this.pausedTimeLeft = Math.min(this.delay, this.timeLeft + extraTime)
    clearTimeout(this.timer)
    this.timer = null
  }

  resume () {
    if (!this.isPaused) return
    const timeLeft = this.pausedTimeLeft
    this.pausedTimeLeft = null
    this.now = Date.now() - (this.delay - timeLeft)
    this.timer = setTimeout(this.func, timeLeft)
  }

  cancel () {
    clearTimeout(this.timer)
    this.timer = null
    this.pausedTimeLeft = null
    this.reference = null
    this.func = null
  }
}

export default Scheduler
