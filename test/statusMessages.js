import 'chai/register-should'
import StatusMessages from '../app/utils/statusMessages'

describe('statusMessages', function () {
  const settings = {
    get: (key) => ({ language: 'en', longBreak: false, longBreakInterval: 2 })[key]
  }
  const i18next = { t: (key) => key }
  const humanizeDuration = () => '1 minute'

  const messageFor = (isIdlePaused) => new StatusMessages({
    breakPlanner: {
      scheduler: { reference: 'startMiniBreak', timeLeft: 60000 },
      dndManager: { isOnDnd: false },
      appExclusionsManager: { isSchedulerCleared: false },
      timeToNextBreak: 60000,
      isPaused: false,
      isIdlePaused,
      breakNumber: 1
    },
    settings,
    i18next,
    humanizeDuration
  }).trayMessage

  it('adds an idle line to the next break message while idle paused', function () {
    const lines = messageFor(true).split('\n')
    lines[0].should.contain('statusMessages.nextMiniBreak')
    lines[lines.length - 1].should.equal('statusMessages.idlePaused')
  })

  it('does not add the idle line when not idle paused', function () {
    messageFor(false).should.not.contain('statusMessages.idlePaused')
  })
})
