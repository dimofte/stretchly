import { vi } from 'vitest'
import 'chai/register-should'
import Scheduler from '../app/utils/scheduler'

const timeout = process.env.CI ? 30000 : 10000

let test

describe('scheduler', function () {
  vi.setConfig({ testTimeout: timeout })
  beforeEach(function () {
    test = true
  })

  it('kinda runs schedule on time', () =>
    new Promise((resolve) => {
      const time = 100
      const callback = function () {
        test = false
      }
      const schedule = new Scheduler(callback, time)
      schedule.plan()
      setTimeout(function () {
        test.should.equal(false)
        resolve()
      }, 200)
    }))

  it('kinda runs schedule on time with correct', () =>
    new Promise((resolve) => {
      const time = 1000
      const start = Date.now()
      const callback = function () {
        // allow margin due to event loop delay
        (Date.now() - start).should.be
          .within(time - 200, time + 200)
        test = false
      }
      const schedule = new Scheduler(callback, time)
      schedule.plan()
      setTimeout(function () {
        schedule.correct()
      }, 200)
      setTimeout(function () {
        test.should.equal(false)
        resolve()
      }, time + 100)
    }))

  it('it cancels schedule on cancel()', () =>
    new Promise((resolve) => {
      const time = 100
      const callback = function () {
        test = false
      }
      const schedule = new Scheduler(callback, time)
      schedule.plan()
      setTimeout(function () {
        schedule.cancel()
      }, 50)
      setTimeout(function () {
        test.should.equal(true)
        resolve()
      }, 200)
    }))

  it('it kinda gets the time left', () =>
    new Promise((resolve) => {
      const time = 100
      const callback = function () {
        test = false
      }
      const schedule = new Scheduler(callback, time)
      schedule.plan()
      setTimeout(function () {
        schedule.timeLeft.should.be.a('number').and.to.be.below(100)
      }, 50)
      setTimeout(function () {
        test.should.equal(false)
        resolve()
      }, 160)
    }))

  describe('pause and resume', function () {
    let calls
    let schedule

    beforeEach(function () {
      vi.useFakeTimers()
      calls = 0
      schedule = new Scheduler(() => { calls += 1 }, 1000)
    })

    afterEach(function () {
      vi.useRealTimers()
    })

    it('pause() stops the callback and freezes timeLeft', function () {
      schedule.plan()
      vi.advanceTimersByTime(300)
      schedule.pause()
      vi.advanceTimersByTime(5000)
      calls.should.equal(0)
      schedule.isPaused.should.equal(true)
      schedule.timeLeft.should.equal(700)
    })

    it('resume() continues from the frozen time', function () {
      schedule.plan()
      vi.advanceTimersByTime(300)
      schedule.pause()
      vi.advanceTimersByTime(5000)
      schedule.resume()
      schedule.isPaused.should.equal(false)
      vi.advanceTimersByTime(699)
      calls.should.equal(0)
      vi.advanceTimersByTime(1)
      calls.should.equal(1)
    })

    it('pause(extraTime) credits elapsed idle time', function () {
      schedule.plan()
      vi.advanceTimersByTime(600)
      schedule.pause(400)
      schedule.timeLeft.should.equal(800)
    })

    it('pause(extraTime) never exceeds the delay', function () {
      schedule.plan()
      vi.advanceTimersByTime(300)
      schedule.pause(5000)
      schedule.timeLeft.should.equal(1000)
    })

    it('cancel() clears paused state', function () {
      schedule.plan()
      schedule.pause()
      schedule.cancel()
      schedule.isPaused.should.equal(false)
      schedule.timeLeft.should.equal(false)
    })

    it('correct() keeps a paused scheduler paused', function () {
      schedule.plan()
      schedule.pause()
      schedule.correct()
      vi.advanceTimersByTime(5000)
      calls.should.equal(0)
    })

    it('pause() after the timer fired does nothing', function () {
      schedule.plan()
      vi.advanceTimersByTime(1100)
      calls.should.equal(1)
      schedule.pause()
      schedule.isPaused.should.equal(false)
      schedule.resume()
      vi.advanceTimersByTime(5000)
      calls.should.equal(1)
    })

    it('pause() on an unplanned or cancelled scheduler does nothing', function () {
      schedule.pause()
      schedule.isPaused.should.equal(false)
      schedule.plan()
      schedule.cancel()
      schedule.pause()
      schedule.isPaused.should.equal(false)
    })
  })
})
