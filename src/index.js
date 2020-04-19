import BaseAdapter from './adapters/BaseAdapter'
import WebSurf from './adapters/WebSurf'

export default class AutoSurf {
  static #STATUS_SUCCESS = true
  static #STATUS_ERROR = false

  #Surf = null

  #config = {
    delayBetweenSchedules: 500,
  }

  #actionables = []
  #schedules = []
  #results = []
  #events = {}
  #allEvents = [
    'done',
    'paused',
    'resumed',
    'scheduleFinish',
    'scheduleInit',
    'scheduleStart',
    'workError',
    'workFailed',
    'workStart',
    'workSuccess',
  ]
  #noSelectorActions = ['wait', 'pause', 'refresh', 'goto', 'waitTillPageLoads']

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
   * delayBetweenSchedules (int): The millisecond delay between schedules. Defaults to 500
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
      delayBetweenSchedules: 500,
      ...config,
    }
  }

  /** Checks the result of everything done
   * @param {object} prop  Keys include:
   *
   * selector (string) - The element to check e.g. input#firstName, div#nav >
   * ul li:last-child
   * action (string) - The check to execute. This may be any of:
   * 	- isOn - Checks if the page's location IS the given parameter,
   * 	- IsNotOn - Checks if the page's location IS NOT the given parameter,
   * 	- valueIs - Checks the value of the given selector IS the given parameter,
   * 	- ValueIsNot - Checks the value of the given selector IS NOT the given parameter,
   * 	- valueContains - Checks the value of the given selector CONTAINS the given
   * 	parameter,
   * 	- notValueContains - Checks the value of the given selector DOES NOT CONTAIN the
   * 	given parameter,
   * 	- textIs - Checks if the text of the given selector IS the given parameter
   * 	- TextIsNot - Checks if the text of the given selector IS NOT the given parameter
   * 	- containsText - Checks the text of the given selector CONTAINS the given
   * 	parameter
   * 	- notContainsText - Checks the text of the given selector DOES NOT CONTAIN the
   * 	 given parameter
   * 	- attrIs - Checks if the given attribute of the given selector IS the given
   * 	 parameter
   * 	- AttrIsNot - Checks if the given attribute of the given selector IS NOT the given
   * 	 parameter
   * 	- containsAttr - Checks the given attribute of the given selector CONTAINS the
   * 	given parameter
   * 	- notContainsAttr - Checks the given attribute of the given selector DOES NOT
   * 	CONTAIN the given parameter
   * 	- exists - Check if the given selector EXISTS on the page
   * 	- notExists - Check if the given selector EXISTS on the page
   * params (array) -  Parameters for the given action
   *
   * @return {AutoSurf}
   */
  check(prop) {
    return this.#runCheck(prop, 0)
  }

  /** Executes the given action
   * @param {object} prop Keys include:
   *
   * selector (string) - The element to check e.g. input#firstName, div#nav >
   * ul li:last-child
   * action (string) - The action to execute. This may include:
   *  - wait - Waits for the given MILISECONDS before continuing to the next action
   *  - focus - Focuses on the given selector
   *  - click - Clicks on the given selector
   *  - type - Types the given TEXT in the given selector
   *  - goBack - Navigates to previous page
   *  - submitForm - Submits the given form selector without clicking on the
   *  submit button
   * params (array) - Parameters for the given action
   *
   * @return {AutoSurf}
   */
  do(prop) {
    return this.#runDo(prop, 0)
  }

  /**
   *
   * @param {string} event paused | resumed | work.start | work.stop | schedule.start |
   * schedule.finish | action.success | action.failed | action.error | done
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

  parseFeature(obj) {
    if (obj === undefined || typeof obj !== 'object') {
      throw new Error('Parameter must be an object')
    }

    this.#schedules = obj.schedules
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
      lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
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
      lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
    })

    return this
  }

  /** Initiates execution
   * @param {object} config Keys include:
   * delayBetweenSchedules (int): The millisecond delay between schedules
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
          const last = this.#current || {}
          this.#current = this.#actionables[
            this.#currentSchedule
          ].toCheck.shift()

          if (this.#current) {
            this.#startWorking()

            if (!this.#current.selector) {
              if (last.selector) {
                this.#current.selector = last.selector
              } else {
                this.#error(
                  `Selector to CHECK <b>${
                    this.#current.action
                  } on</b> not specified`
                )
                this.#checkNext()

                return
              }
            }

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
              lastSchedule:
                this.#actionables.length === this.#currentSchedule + 1,
            })
          }
          this.#isDone = true
          this.#nextSchedule()
        }
      } else {
        this.#toResume = 2
      }
    } catch (e) {
      this.#fail()
      this.#isReady = true
      this.#error(e.message)
      this.#checkNext()
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
          const last = this.#current || {}
          this.#current = this.#actionables[this.#currentSchedule].toDo.shift()

          if (this.#current) {
            if (!this.#current.selector) {
              if (last.selector) {
                this.#current.selector = last.selector
              } else if (
                this.#noSelectorActions.indexOf(this.#current.action) === -1
              ) {
                this.#error(
                  `Selector to DO <b>${
                    this.#current.action
                  } on</b> not specified`
                )
                this.#doNext()

                return
              } else {
                this.#current.selector = []
              }
            }

            const { action, params, selector } = this.#current

            this.#handle(action, params, selector, (status) =>
              this.#handled(status)
            )

            this.#isReady = false
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
      this.#doNext()
    }
  }

  #error(msg) {
    try {
      this.#stopWorking()

      if (msg) {
        this.#trigger('workError', {
          scheduleIndex: this.#currentSchedule,
          actionIndex: this.#currentIndex,
          action: this.#currentAction,
          lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
          message: msg,
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

      this.#trigger('workFailed', {
        scheduleIndex: this.#currentSchedule,
        actionIndex: this.#currentIndex,
        action: this.#currentAction,
        lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
      })
    } catch (e) {}

    return this
  }

  #handle(action, params, selector, callback) {
    const ucase = (str) => str.replace(/^[a-z]/i, (chr) => chr.toUpperCase())
    const method = `${this.#currentAction}${ucase(action)}`
    const handler = `#handle${ucase(method)}`

    this.#startWorking()

    if (this[handler]) {
      this[handler](callback, selector, params)
    } else {
      try {
        this.#Surf[action](selector, ...params)

        callback(this.STATUS_SUCCESS)
      } catch (e) {
        callback(this.STATUS_ERROR)
      }

      try {
        this.#Surf.doFocus(selector)
      } catch (e) {}
    }
  }

  #handled(status) {
    if (status === this.STATUS_SUCCESS) {
      this.#success()
    } else {
      this.#error()
    }

    if (!this.#isPaused && !this.#isDone && !this.#isWaiting) {
      this.#isReady = true
      this.#isLoading = false
      this.#doNext()
    }

    return this
  }

  #handleDoGoto(callback, selector, urlParams) {
    if (!urlParams.length) {
      return callback(this.STATUS_ERROR)
    }

    if (this.#currentSchedule === undefined) {
      // only load page if started
      setTimeout(() => this.#handleDoGoto(callback, selector, urlParams), 1000)
    } else {
      this.#isReady = false
      this.#isLoading = true

      this.backup()

      try {
        this.#Surf.doGoto(...urlParams)

        callback(this.STATUS_SUCCESS)
      } catch (e) {
        callback(this.STATUS_ERROR)
      }
    }

    return this
  }

  #handleDoPause(callback) {
    this.pause()

    callback(this.STATUS_SUCCESS)
  }

  #handleDoWait(callback, selector, millisecondsParam) {
    try {
      this.#waiting()

      this.#Surf.doWait(...millisecondsParam)

      this.#waiting(false)

      callback(this.STATUS_SUCCESS)
    } catch (e) {
      callback(this.STATUS_ERROR)
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
          if (!allowedKeys.contains(key)) {
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

    if (this.#currentSchedule > -1) {
      this.#success()
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

    setTimeout(
      () => {
        this.#currentSchedule++
        this.#isReady = true
        this.#isDone = false

        this.#trigger('scheduleStart', {
          scheduleIndex: this.#currentSchedule,
          lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
        })

        this.#doNext(true)
      },
      this.#config.delayBetweenSchedules
    )

    return this
  }

  #parseSchedules() {
    this.#schedules.forEach((schedule, i) => {
      this.#trigger('scheduleInit', {
        schedule,
        id: `_${i}`,
      })

      schedule.do.forEach((toDo) => {
        if (schedule.url) {
          toDo['url'] = schedule.url
        }

        this.#runDo(toDo, i)
      })

      schedule.check.forEach((toCheck) => this.#runCheck(toCheck, i))
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

    this.#trigger('workStart', {
      scheduleIndex: this.#currentSchedule,
      actionIndex: this.#currentIndex,
      action: this.#currentAction,
      lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
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

      this.#trigger('workSuccess', {
        scheduleIndex: this.#currentSchedule,
        actionIndex: this.#currentIndex,
        action: this.#currentAction,
        lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
      })
    } catch (e) {}

    return this
  }

  #trigger(event, detail) {
    try {
      this.#events[event]({
        name: event,
        schedule: this.#schedules[this.#currentSchedule],
        detail,
      })
    } catch (e) {}

    return this
  }

  #verify(action, status) {
    try {
      if (action.toLowerCase().indexOf('not') !== -1) {
        // must not be true
        if (status === this.STATUS_SUCCESS) {
          this.#fail()
        } else {
          this.#success()
        }
      } else {
        // must be true
        if (status === this.STATUS_SUCCESS) {
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
    this.#checkNext()

    return this
  }

  #waiting(status) {
    this.#isWaiting = status !== undefined ? status : true

    return this
  }
}
