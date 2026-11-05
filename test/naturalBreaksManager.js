import { vi } from 'vitest'
import 'chai/register-should'
import { join } from 'path'
import NaturalBreaksManager from '../app/utils/naturalBreaksManager'
import Store from 'electron-store'
import defaultSettings from '../app/utils/defaultSettings'
import { rm } from 'node:fs/promises'

describe('naturalBreaksManager', function () {
  let settings = null
  let naturalBreaksManager = null

  beforeEach(() => {
    settings = new Store({
      cwd: join(__dirname),
      name: 'test-settings-naturalBreaksManager',
      defaults: defaultSettings
    })
    naturalBreaksManager = new NaturalBreaksManager(settings)
  })

  it('should be running with default settings', () => {
    naturalBreaksManager.isOnNaturalBreak.should.be.equal(false)
    naturalBreaksManager.isSchedulerCleared.should.be.equal(false)
    naturalBreaksManager.usingNaturalBreaks.should.be.equal(true)
  })

  it('should not be running with naturalBreaks: false', () => {
    settings.set('naturalBreaks', false)
    naturalBreaksManager.stop()
    naturalBreaksManager = null
    naturalBreaksManager = new NaturalBreaksManager(settings)
    naturalBreaksManager.isOnNaturalBreak.should.be.equal(false)
    naturalBreaksManager.isSchedulerCleared.should.be.equal(false)
    naturalBreaksManager.usingNaturalBreaks.should.be.equal(false)
  })

  it('should be running with naturalBreaks: true', () => {
    settings.set('naturalBreaks', true)
    naturalBreaksManager.stop()
    naturalBreaksManager = null
    naturalBreaksManager = new NaturalBreaksManager(settings)
    naturalBreaksManager.isOnNaturalBreak.should.be.equal(false)
    naturalBreaksManager.isSchedulerCleared.should.be.equal(false)
    naturalBreaksManager.usingNaturalBreaks.should.be.equal(true)
  })

  it('should start when start()', () => {
    naturalBreaksManager.stop()
    naturalBreaksManager.start()
    naturalBreaksManager.isOnNaturalBreak.should.be.equal(false)
    naturalBreaksManager.isSchedulerCleared.should.be.equal(false)
    naturalBreaksManager.usingNaturalBreaks.should.be.equal(true)
  })

  it('should stop when stop()', () => {
    naturalBreaksManager.stop()
    naturalBreaksManager.usingNaturalBreaks.should.be.equal(false)
    naturalBreaksManager.isSchedulerCleared.should.be.equal(false)
    naturalBreaksManager.isOnNaturalBreak.should.be.equal(false)
    naturalBreaksManager.idleTime.should.be.equal(0)
  })

  it('does not create a second timer when start() is called twice', () => {
    naturalBreaksManager.stop()
    naturalBreaksManager.start()
    const timer = naturalBreaksManager.timer
    naturalBreaksManager.start()
    naturalBreaksManager.timer.should.be.equal(timer)
  })

  afterEach(async () => {
    naturalBreaksManager.stop()
    naturalBreaksManager = null

    if (settings) {
      await rm(join(__dirname, '/test-settings-naturalBreaksManager.json'), { force: true })
      settings = null
    }
  })
})

describe('naturalBreaksManager idle pause', function () {
  let settings = null
  let manager = null
  let idle = 0
  let events = null

  const tick = (times = 1) => vi.advanceTimersByTime(1000 * times)
  const count = (name) => events.filter(e => e.name === name).length

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(NaturalBreaksManager.prototype, 'idleTime', 'get').mockImplementation(() => idle)
    settings = new Store({
      cwd: join(__dirname),
      name: 'test-settings-naturalBreaksManagerIdlePause',
      defaults: defaultSettings
    })
    settings.set('naturalBreaks', true)
    settings.set('naturalBreaksCheckInterval', 1000)
    settings.set('naturalBreaksInactivityResetTime', 300000)
    settings.set('naturalBreaksInactivityPauseTime', 30000)
    idle = 0
    events = []
    manager = new NaturalBreaksManager(settings)
    for (const name of ['idlePauseStarted', 'idlePauseFinished', 'clearBreakScheduler', 'naturalBreakFinished']) {
      manager.on(name, (...args) => events.push({ name, args }))
    }
  })

  afterEach(async () => {
    manager.stop()
    manager = null
    vi.restoreAllMocks()
    vi.useRealTimers()
    await rm(join(__dirname, '/test-settings-naturalBreaksManagerIdlePause.json'), { force: true })
    settings = null
  })

  it('pauseTime is 0 by default', () => {
    settings.set('naturalBreaksInactivityPauseTime', defaultSettings.naturalBreaksInactivityPauseTime)
    defaultSettings.naturalBreaksInactivityPauseTime.should.equal(0)
    manager.pauseTime.should.equal(0)
  })

  it('pauseTime is the setting when below the reset time', () => {
    manager.pauseTime.should.equal(30000)
  })

  it('pauseTime is 0 when not below the reset time', () => {
    settings.set('naturalBreaksInactivityPauseTime', 300000)
    manager.pauseTime.should.equal(0)
  })

  it('latches at 20s and emits no pause events when pause is off', () => {
    settings.set('naturalBreaksInactivityPauseTime', 0)
    idle = 25000
    tick()
    manager.isOnNaturalBreak.should.equal(true)
    count('idlePauseStarted').should.equal(0)
  })

  it('does not latch below the pause threshold', () => {
    idle = 25000
    tick()
    manager.isOnNaturalBreak.should.equal(false)
    count('idlePauseStarted').should.equal(0)
  })

  it('latches and emits idlePauseStarted with the idle time at the pause threshold', () => {
    idle = 31000
    tick()
    manager.isOnNaturalBreak.should.equal(true)
    events[0].should.deep.equal({ name: 'idlePauseStarted', args: [31000] })
  })

  it('emits idlePauseStarted on every tick while latched', () => {
    idle = 31000
    tick(3)
    count('idlePauseStarted').should.equal(3)
  })

  it('emits idlePauseFinished once when activity resumes', () => {
    idle = 31000
    tick()
    idle = 0
    tick(2)
    count('idlePauseFinished').should.equal(1)
    manager.isOnNaturalBreak.should.equal(false)
  })

  it('emits idlePauseFinished on the first active tick without another idlePauseStarted', () => {
    idle = 31000
    tick()
    idle = 0
    tick()
    count('idlePauseStarted').should.equal(1)
    count('idlePauseFinished').should.equal(1)
  })

  it('emits idlePauseFinished when the pause setting becomes inactive while latched', () => {
    idle = 31000
    tick()
    settings.set('naturalBreaksInactivityPauseTime', 0)
    tick()
    count('idlePauseFinished').should.equal(1)
  })

  it('emits idlePauseFinished on stop() while pausing', () => {
    idle = 31000
    tick()
    manager.stop()
    count('idlePauseFinished').should.equal(1)
  })

  it('keeps the reset behaviour with pause on', () => {
    idle = 301000
    tick()
    count('clearBreakScheduler').should.equal(1)
    idle = 0
    tick()
    count('naturalBreakFinished').should.equal(1)
  })
})
