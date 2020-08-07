import BaseAdapter from './adapters/BaseAdapter'
import WebSurf from './adapters/WebSurf'

export default class AutoSurf {
  #STATUS_SUCCESS = true
  #STATUS_ERROR = false

  #Surf = null

  #config = {
    autoAdvance: true,
  }

  #actionables = []
  #schedules = []
  #results = []
  #events = {}
  #allEvents = [
    'actionError',
    'actionFailed',
    'actionStart',
    'actionSuccess',
    'done',
    'paused',
    'resumed',
    'scheduleFinish',
    'scheduleInit',
    'scheduleStart',
  ]
  #customHandlers = {}

  #canStart = false
  #isDone = false
  #isInitialized = false
  #isLoading = false
  #isPaused = false
  #isReady = false
  #isWorking = false
  #isWaiting = false

  #current = null
  #currentAction = null
  #currentIndex = null
  #currentSchedule = null
  #toResume = null

  /**
   * @param {object} config The options. Keys include:
   * autoAdvance (boolean): Indicates whether to automatically advance to the next step or not.
   * @param {BaseAdapter} Adapter A subclass of BaseAdapter
   */
  constructor(config = {}, Adapter) {
    this.version = '1.0.0'

    if (!Adapter) {
      Adapter = WebSurf
    } else if (typeof Adapter !== 'function') {
      throw new Error('Adapter must be a class')
    } else if (!(new Adapter() instanceof BaseAdapter)) {
      throw new Error('Adapter must be a subclass of BaseAdapter')
    }

    this.#Surf = Adapter

    this.#config = {
      ...this.#config,
      ...config,
    }

    this.#customHandlers.doGoto = this.#handleDoGoto
    this.#customHandlers.doPause = this.#handleDoPause
    this.#customHandlers.doWait = this.#handleDoWait
  }

  /**
   * @param {string} event paused | resumed | scheduleStart | scheduleInit |
   * scheduleFinish | actionStart | actionSuccess | actionFailed | actionError | done
   * @param {function} callback
   * @returns {AutoSurf}
   */
  on(event, callback) {
    if (event === '*') {
      this.#allEvents.forEach((evt) => (this.#events[evt] = callback))
    } else {
      event.split(',').forEach((evt) => (this.#events[evt.trim()] = callback))
    }

    return this
  }

  schedules(schedules) {
    if (!Array.isArray(schedules)) {
      throw new Error('Schedules must be an array')
    }

    this.#schedules = schedules
    this.#parseSchedules()

    return this
  }

  /**
   * Pauses the execution of the schedules
   * @returns {AutoSurf}
   */
  pause() {
    if (this.#isPaused) {
      return this
    }

    this.#isReady = false
    this.#isPaused = true

    this.#trigger('paused', {
      scheduleIndex: this.#currentSchedule,
      actionIndex: this.#currentIndex,
      action: this.#currentAction,
      on: this.#current,
    })

    return this
  }

  /**
   * Called to inform AutoSurf that parent code is ready
   * @param {function} callback The function to call when everything is ready
   */
  ready(callback = () => {}) {
    this.#initAdapter(callback)

    this.#canStart = true

    return this
  }

  /**
   * Restarts execution
   * @returns {AutoSurf}
   */
  restart() {
    if (this.#isLoading) {
      setTimeout(() => this.restart(), 1000)
    }

    this.#trigger('reset', {})

    this.#parseSchedules()

    this.#currentSchedule = -1
    this.#isDone = true
    this.#results = []

    this.#nextSchedule()

    return this
  }

  /**
   * Resumes the execution of the schedules
   * @returns {AutoSurf}
   */
  resume() {
    if (!this.#isPaused) {
      return this
    }

    this.#isReady = true
    this.#isPaused = false

    if (this.#toResume === 2) {
      this.#checkNext()
    } else {
      this.#doNext()
    }

    this.#trigger('resumed', {
      scheduleIndex: this.#currentSchedule,
      actionIndex: this.#currentIndex,
      action: this.#currentAction,
      on: this.#current,
    })

    return this
  }

  /** Initiates execution
   * @param {object} config Keys include:
   * autoAdvance (boolean): Indicates whether to automatically advance to the next step or not.
   * @return {AutoSurf}
   */
  start(config = {}) {
    if (!this.#canStart) {
      throw new Error('You have to call ready first')
    }

    // Don't continue until loading is done
    if (this.#isLoading) {
      setTimeout(() => this.start(config, false), 1000)

      return this
    }

    this.#currentSchedule = -1
    this.#isDone = true
    this.#config = { ...this.#config, ...config }

    this.#nextSchedule()

    return this
  }

  /**
   * @inheritdoc
   */
  toJSON() {
    return {
      _actionables: this.#actionables,
      _schedules: this.#schedules,
      _results: this.#results,
      _canStart: this.#canStart,
      _isDone: this.#isDone,
      _isInitialized: this.#isInitialized,
      _isLoading: this.#isLoading,
      _isPaused: this.#isPaused,
      _isReady: this.#isReady,
      _isWaiting: this.#isWaiting,
      _isWorking: this.#isWorking,
      _current: this.#current,
      _currentAction: this.#currentAction,
      _currentIndex: this.#currentIndex,
      _currentSchedule: this.#currentSchedule,
      _toResume: this.#toResume,
    }
  }

  #checkNext(fresh) {
    try {
      this.#currentAction = 'check'

      if (fresh) {
        this.#currentIndex = 0
      } else {
        this.#currentIndex++
      }

      if (
        this.#isReady &&
        !this.#isLoading &&
        this.#actionables[this.#currentSchedule]
      ) {
        if (this.#actionables[this.#currentSchedule].toCheck.length) {
          this.#current = this.#actionables[
            this.#currentSchedule
          ].toCheck.shift()

          if (this.#current) {
            this.#startWorking()

            const { action, params, selector } = this.#current

            let _action = action

            if (action.toLowerCase().indexOf('not') !== -1) {
              _action = action.replace(/not/i, '')
            }

            this.#isReady = false
            this.#handle(_action, params, selector, (status) =>
              this.#verify(action, status)
            )
          }
        } else {
          if (!this.#isDone) {
            this.#trigger('scheduleFinish', {
              scheduleIndex: this.#currentSchedule,
            })
          }

          this.#isDone = true

          if (this.#config.autoAdvance) {
            this.#nextSchedule()
          } else {
            this.pause()
          }
        }
      } else {
        this.#toResume = 2
      }
    } catch (e) {
      this.#fail()
      this.#isReady = true
      this.#error(e.message)

      if (this.#config.autoAdvance) {
        this.#checkNext()
      } else {
        this.pause()
      }
    }
  }

  #doNext(fresh) {
    try {
      this.#currentAction = 'do'

      if (fresh) {
        this.#currentIndex = 0
      } else {
        this.#currentIndex++
      }

      if (
        this.#isReady &&
        !this.#isLoading &&
        this.#actionables[this.#currentSchedule]
      ) {
        if (this.#actionables[this.#currentSchedule].toDo.length) {
          this.#current = this.#actionables[this.#currentSchedule].toDo.shift()

          if (this.#current) {
            const { action, params, selector } = this.#current

            this.#isReady = false

            this.#handle(action, params, selector, (status) =>
              this.#handled(status)
            )
          }
        } else {
          // nothing to do
          this.#checkNext(true)
        }
      } else {
        this.#toResume = 1
      }
    } catch (e) {
      this.#error(e.message)

      if (this.#config.autoAdvance) {
        this.#doNext()
      } else {
        this.pause()
      }
    }
  }

  #error(message = 'Something went wrong') {
    try {
      this.#stopWorking()

      if (message) {
        this.#trigger('actionError', {
          scheduleIndex: this.#currentSchedule,
          actionIndex: this.#currentIndex,
          action: this.#currentAction,
          on: this.#current,
          message,
        })
      }
    } catch (e) {}

    return this
  }

  #fail() {
    try {
      this.#stopWorking()

      // save to result

      if (this.#results.length <= this.#currentSchedule) {
        this.#results.push({
          title: this.#schedules[this.#currentSchedule].title,
          list: [],
          passed: 0,
          failed: 0,
        })
      }
      this.#results[this.#currentSchedule]['failed']++
      this.#results[this.#currentSchedule]['list'].push({
        action: this.#currentAction,
        description: this.#current.description,
        status: false,
      })

      // trigger failed

      this.#trigger('actionFailed', {
        scheduleIndex: this.#currentSchedule,
        actionIndex: this.#currentIndex,
        action: this.#currentAction,
        on: this.#current,
      })
    } catch (e) {}

    return this
  }

  #handle(action, params, selector, callback) {
    const ucase = (str) => str.replace(/^[a-z]/i, (chr) => chr.toUpperCase())
    const method = `${this.#currentAction}${ucase(action)}`

    this.#startWorking()

    if (this.#customHandlers[method]) {
      this.#customHandlers[method].call(this, callback, selector, params)
    } else {
      try {
        if (selector) {
          params.unshift(selector)
        }

        this.#Surf[method](...params)

        callback(this.#STATUS_SUCCESS)
      } catch (e) {
        if (e.message) {
          this.#error(e.message)
        }

        callback(this.#STATUS_ERROR)
      }

      try {
        this.#Surf.doFocus(selector)
      } catch (e) {}
    }
  }

  #handled(status) {
    if (status === this.#STATUS_SUCCESS) {
      this.#success()
    } else {
      this.#fail()
    }

    if (!this.#isPaused && !this.#isDone && !this.#isWaiting) {
      this.#isReady = true
      this.#isLoading = false

      if (this.#config.autoAdvance) {
        this.#doNext()
      } else {
        this.pause()
      }
    }

    return this
  }

  #handleDoGoto(callback, selector, urlParams) {
    if (!urlParams.length) {
      return callback(this.#STATUS_ERROR)
    }

    if (this.#currentSchedule === undefined) {
      // only load page if started
      setTimeout(() => this.#handleDoGoto(callback, selector, urlParams), 1000)
    } else {
      this.#isReady = false
      this.#isLoading = true

      try {
        this.#Surf.doGoto(...urlParams)

        callback(this.#STATUS_SUCCESS)
      } catch (e) {
        callback(this.#STATUS_ERROR)
      }
    }

    return this
  }

  #handleDoPause(callback) {
    this.pause()

    callback(this.#STATUS_SUCCESS)
  }

  #handleDoWait(callback, selector, millisecondsParam) {
    try {
      this.#waiting()

      this.#Surf.doWait(...millisecondsParam)

      this.#waiting(false)

      callback(this.#STATUS_SUCCESS)
    } catch (e) {
      this.#waiting(false)

      callback(this.#STATUS_ERROR)
    }
  }

  #hasNext() {
    return this.#actionables[this.#currentSchedule + 1] !== undefined
  }

  #initAdapter(callback) {
    this.#Surf.init(this, (fromStore) => {
      if (fromStore) {
        const allowedKeys = Object.keys(this.toJSON())

        for (let key in fromStore) {
          if (!allowedKeys.includes(key)) {
            return
          }

          if (!this.hasOwnProperty(key)) {
            if (key.startsWith('_')) {
              key = key.replace('_', '#')
            }
          }

          this[key] = fromStore[key]
        }
      }

      callback(!!fromStore)
    })
  }

  #nextSchedule() {
    if (!this.#isDone) {
      return this
    }

    if (!this.#hasNext()) {
      if (this.#current !== null) {
        this.#current = null
        this.#isReady = false
        this.#isDone = true

        this.#stopWorking()

        // trigger done
        this.#Surf.quit(this)
        this.#trigger('done', this.#results)
      }

      return this
    }

    this.#currentSchedule++
    this.#isReady = true
    this.#isDone = false

    this.#trigger('scheduleStart', {
      scheduleIndex: this.#currentSchedule,
    })

    this.#doNext(true)

    return this
  }

  #parseSchedules() {
    this.#schedules.forEach((schedule, i) => {
      schedule.do.forEach((toDo) => {
        if (schedule.url) {
          toDo['url'] = schedule.url
        }

        this.#runDo(toDo, i)
      })

      schedule.check.forEach((toCheck) => this.#runCheck(toCheck, i))

      this.#trigger('scheduleInit', {
        schedule,
        scheduleIndex: i,
      })
    })

    this.#isLoading = false

    return this
  }

  #runCheck(prop, index) {
    if (this.#actionables.length === index) {
      this.#actionables.push({
        toDo: [],
        toCheck: [],
      })
    }

    const obj = {
      selector: null,
      action: prop,
      params: [],
      description: `Checking "${prop.action}" on [${
        prop.action == 'isOn' || prop.action == 'isNotOn'
          ? prop.params[0]
          : prop.selector
      }]`,
      ...prop,
    }

    this.#actionables[index].toCheck.push(obj)

    return this
  }

  #runDo(prop, index) {
    const obj = {
      selector: null,
      action: prop,
      params: [],
      description: null,
      ...prop,
    }

    if (this.#actionables.length === index) {
      this.#actionables.push({
        toDo: [],
        toCheck: [],
      })
    }

    this.#actionables[index].toDo.push(obj)

    return this
  }

  #startWorking() {
    if (this.#isWorking) {
      return this
    }

    this.#trigger('actionStart', {
      scheduleIndex: this.#currentSchedule,
      actionIndex: this.#currentIndex,
      action: this.#currentAction,
      on: this.#current,
    })

    this.#isWorking = true

    return this
  }

  #stopWorking() {
    this.#isWorking = false

    return this
  }

  #success() {
    try {
      this.#stopWorking()

      // save to result
      if (this.#results.length <= this.#currentSchedule) {
        this.#results.push({
          title: this.#schedules[this.#currentSchedule].title,
          list: [],
          passed: 0,
          failed: 0,
        })
      }

      this.#results[this.#currentSchedule]['passed']++
      this.#results[this.#currentSchedule]['list'].push({
        action: this.#currentAction,
        description: this.#current.description,
        status: true,
      })

      // trigger success

      this.#trigger('actionSuccess', {
        scheduleIndex: this.#currentSchedule,
        actionIndex: this.#currentIndex,
        action: this.#currentAction,
        on: this.#current,
      })
    } catch (e) {}

    return this
  }

  #trigger(event, detail) {
    try {
      let schedule

      if (detail.schedule) {
        schedule = detail.schedule
        delete detail.schedule
      } else if (detail.scheduleIndex) {
        schedule = this.#schedules[detail.scheduleIndex]
      } else if (this.#currentSchedule > -1) {
        schedule = this.#schedules[this.#currentSchedule]
      }

      this.#events[event]({
        name: event,
        schedule,
        detail,
      })
    } catch (e) {}

    return this
  }

  #verify(action, status) {
    try {
      if (action.toLowerCase().indexOf('not') !== -1) {
        // must not be true
        if (status === this.#STATUS_SUCCESS) {
          this.#fail()
        } else {
          this.#success()
        }
      } else {
        // must be true
        if (status === this.#STATUS_SUCCESS) {
          this.#success()
        } else {
          this.#fail()
        }
      }
    } catch (e) {
      this.#fail()
      this.#error(e.message)
    }

    this.#isReady = true

    if (this.#config.autoAdvance) {
      this.#checkNext()
    } else {
      this.pause()
    }

    return this
  }

  #waiting(status) {
    this.#isWaiting = status !== undefined ? status : true

    return this
  }
}
