export default class AutoSurf {
  constructor(config = {}) {
    this.version = '1.0.0'

    this.config = {
      debug: false,
      delayBetweenSchedules: 500,
      ...config,
    }

    this.#needsBackup = true
    this.#storeName = location.origin + '_atsrf'
    this.#actionables = []
    this.#schedules = []
    this.#results = []
    this.#events = {}
    this.#reloaded = false
  }
}
