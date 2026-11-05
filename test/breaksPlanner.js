import { vi } from 'vitest'
import 'chai/register-should'
import { join } from 'path'
import { rm } from 'node:fs/promises'
import Store from 'electron-store'
import BreaksPlanner from '../app/breaksPlanner'
import defaultSettings from '../app/utils/defaultSettings'

describe('breaksPlanner idle pause', function () {
  let settings = null
  let planner = null
  let breaksStarted = 0
  let toolTipUpdates = 0

  const breakEvents = ['startMiniBreak', 'startMiniBreakNotification', 'startLongBreak', 'startLongBreakNotification']

  beforeEach(() => {
    vi.useFakeTimers()
    settings = new Store({
      cwd: join(__dirname),
      name: 'test-settings-breaksPlanner',
      defaults: defaultSettings
    })
    settings.set('naturalBreaks', false)
    settings.set('monitorDnd', false)
    planner = new BreaksPlanner(settings)
    breaksStarted = 0
    toolTipUpdates = 0
    for (const name of breakEvents) planner.on(name, () => { breaksStarted += 1 })
    planner.on('updateToolTip', () => { toolTipUpdates += 1 })
    planner.nextBreak()
  })

  afterEach(async () => {
    planner.clear()
    planner.naturalBreaksManager.stop()
    planner.dndManager.stop()
    planner.appExclusionsManager.stop()
    planner = null
    vi.useRealTimers()
    await rm(join(__dirname, '/test-settings-breaksPlanner.json'), { force: true })
    settings = null
  })

  const idleStarted = (idleTime) => planner.naturalBreaksManager.emit('idlePauseStarted', idleTime)
  const idleFinished = () => planner.naturalBreaksManager.emit('idlePauseFinished')

  it('freezes a running countdown and credits the idle time', () => {
    vi.advanceTimersByTime(10000)
    const before = planner.timeToNextBreak
    idleStarted(5000)
    planner.isIdlePaused.should.equal(true)
    planner.timeToNextBreak.should.equal(before + 5000)
    vi.advanceTimersByTime(3600000)
    breaksStarted.should.equal(0)
    toolTipUpdates.should.equal(1)
  })

  it('ignores repeated idlePauseStarted while frozen', () => {
    vi.advanceTimersByTime(10000)
    idleStarted(5000)
    const frozen = planner.timeToNextBreak
    idleStarted(7000)
    planner.timeToNextBreak.should.equal(frozen)
    toolTipUpdates.should.equal(1)
  })

  it('resumes on idlePauseFinished from the frozen time', () => {
    vi.advanceTimersByTime(10000)
    idleStarted(0)
    vi.advanceTimersByTime(3600000)
    const frozen = planner.scheduler.timeLeft
    idleFinished()
    planner.isIdlePaused.should.equal(false)
    toolTipUpdates.should.equal(2)
    vi.advanceTimersByTime(frozen - 1)
    breaksStarted.should.equal(0)
    vi.advanceTimersByTime(1)
    breaksStarted.should.equal(1)
  })

  it('freezes a new countdown created while already idle', () => {
    idleStarted(5000)
    planner.nextBreak()
    planner.isIdlePaused.should.equal(false)
    const fresh = planner.timeToNextBreak
    idleStarted(60000)
    planner.isIdlePaused.should.equal(true)
    planner.timeToNextBreak.should.equal(fresh)
  })

  it('does not freeze during a break', () => {
    planner.emit('miniBreakStarted', false)
    idleStarted(60000)
    planner.isIdlePaused.should.equal(false)
  })

  it('does not freeze when paused manually', () => {
    planner.pause(1)
    idleStarted(60000)
    planner.isIdlePaused.should.equal(false)
  })

  it('does not freeze during Do Not Disturb', () => {
    planner.dndManager.isOnDnd = true
    idleStarted(60000)
    planner.isIdlePaused.should.equal(false)
  })

  it('lets the reset win while frozen', () => {
    idleStarted(60000)
    planner.naturalBreaksManager.emit('clearBreakScheduler')
    planner.isIdlePaused.should.equal(false)
    ;(planner.scheduler.reference === null).should.equal(true)
    idleFinished()
    ;(planner.scheduler.reference === null).should.equal(true)
    vi.advanceTimersByTime(3600000)
    breaksStarted.should.equal(0)
  })
})
