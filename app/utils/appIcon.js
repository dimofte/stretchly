class AppIcon {
  constructor ({
    platform,
    paused,
    idlePaused,
    monochrome,
    inverted,
    darkMode,
    trayIconStyle,
    timeToBreak,
    percentage,
    reference
  }) {
    this.platform = platform
    this.paused = paused
    this.idlePaused = idlePaused
    this.monochrome = monochrome
    this.inverted = inverted
    this.darkMode = darkMode
    this.trayIconStyle = trayIconStyle
    this.timeToBreak = timeToBreak
    this.percentage = percentage
    this.reference = reference
  }

  get trayIconFileName () {
    const pausedString = this.paused ? 'Paused' : ''
    const idleString = !this.paused && this.idlePaused ? 'Idle' : ''
    const monochromePausedString = this.paused || this.idlePaused ? 'Paused' : ''
    const invertedMonochromeString = this.inverted ? 'Inverted' : ''
    const darkModeString = this.darkMode ? 'Dark' : ''
    let suffixString = ''

    if (!(this.paused || this.idlePaused || this.reference === 'finishMiniBreak' || this.reference === 'finishLongBreak')) {
      if (this.trayIconStyle === 'progress' && Number.isInteger(this.percentage) && this.percentage >= 0 && this.percentage <= 100) {
        suffixString = `Progress${this.percentage}`
      } else if (this.trayIconStyle === 'time' && Number.isInteger(this.timeToBreak) && this.timeToBreak >= 0 && this.timeToBreak <= 99) {
        suffixString = `Number${this.timeToBreak}`
      }
    }

    if (this.monochrome) {
      if (this.platform === 'darwin') {
        return `trayMacMonochrome${monochromePausedString}${suffixString}Template.png`
      } else {
        const extString = this.platform === 'win32' ? 'ico' : 'png'
        return `trayMonochrome${invertedMonochromeString}${monochromePausedString}${suffixString}.${extString}`
      }
    } else {
      if (this.platform === 'darwin') {
        return `trayMac${pausedString}${idleString}${darkModeString}${suffixString}.png`
      } else {
        const extString = this.platform === 'win32' ? 'ico' : 'png'
        return `tray${pausedString}${idleString}${darkModeString}${suffixString}.${extString}`
      }
    }
  }

  get windowIconFileName () {
    const darkModeString = this.darkMode ? 'Dark' : ''

    return `tray${darkModeString}.png`
  }
}

export default AppIcon
