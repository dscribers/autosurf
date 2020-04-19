import AdapterBase from './adapters/AdapterBase'
import WebSurf from './adapters/WebSurf'

export default class AutoSurf {
  static #STATUS_SUCCESS = true
  static #STATUS_ERROR = false

  /**
   * @param {object} config The options. Keys include:
   * delayBetweenSchedules (int): The millisecond delay between schedules. Defaults to 500
   * @param {AdapterBase} Adapter A subclass of AdapterBase
   */
  static constructor(config = {}, Adapter) {
    this.version = '1.0.0'

    if (!Adapter) {
      Adapter = WebSurf
    } else if (typeof Adapter !== 'function') {
      throw new Error('Adapter must be a class')
    } else if (!(new Adapter() instanceof AdapterBase)) {
      throw new Error('Adapter must be a subclass of AdapterBase')
    }

    this.#Surf = Adapter

    this.config = {
      delayBetweenSchedules: 500,
      ...config,
    }

    this.#actionables = []
    this.#schedules = []
    this.#results = []
    this.#events = {}
    this.#allEvents = [
      'actionError',
      'actionFailed',
      'actionSuccess',
      'done',
      'paused',
      'restarting',
      'resumed',
      'scheduleFinish',
      'scheduleInit',
      'scheduleStart',
      'working',
      'workStart',
      'workStop',
    ]
    this.#noSelectorActions = [
      'wait',
      'pause',
      'refresh',
      'goto',
      'waitTillPageLoads',
    ]
  }

  /**
   * Backs up the application data. Should be called before the page reloads
   */
  backup() {
    this.#Surf.backup(this, ...arguments)

    return this
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

  /**
   * Clears any backed up application data
   */
  clearBackup() {
    this.#Surf.clearBackup(this, ...arguments)

    return this
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
    if (this.#paused) {
      return this
    }

    this.#ready = false
    this.#paused = true

    this.trigger('paused', {
      scheduleIndex: this.#currentSchedule,
      actionIndex: this.#currentIndex,
      action: this.#currentAction,
      lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
    })

    return this
  }

  /**
   * Called to inform AutoSurf that parent code is ready
   */
  ready() {
    this.#Surf.ready(this, ...arguments)

    return this
  }

  /**
   * Restarts execution
   * @returns {AutoSurf}
   */
  restart() {
    if (this.#loading) {
      setTimeout(() => this.restart(), 1000)
    }

    this.trigger('reset', {})

    this.#parseSchedules()

    this.#currentSchedule = -1
    this.#done = true
    this.#results = []

    this.#nextSchedule()

    return this
  }

  /**
   * Resumes the execution of the schedules
   * @returns {AutoSurf}
   */
  resume() {
    if (!this.#paused) {
      return this
    }

    this.#ready = true
    this.#paused = false

    if (this.#toResume === 2) {
      this.#checkNext()
    } else {
      this.#doNext()
    }

    this.trigger('resumed', {
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
    // Don't continue until loading is done
    if (this.#loading) {
      setTimeout(() => this.start(config, false), 1000)

      return this
    }

    this.#currentSchedule = -1
    this.#done = true
    this.#config = { ...this.#config, ...config }

    this.#nextSchedule()

    return this
  }

  /**
   * Triggers the given event
   * @param {string} event
   * @param {Object} detail The object to pass as parameter to the callback
   * @returns {AutoSurf}
   */
  trigger(event, detail) {
    try {
      this.#events[event]({
        name: event,
        schedule: this.#schedules[this.#currentSchedule],
        detail,
      })
    } catch (e) {}

    return this
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
        this.#ready &&
        !this.#loading &&
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

            this.#ready = false
            this.#handle(_action, params, selector, (status) =>
              this.#verify(action, status)
            )
          }
        } else {
          if (!this.#done) {
            this.trigger('scheduleFinish', {
              scheduleIndex: this.#currentSchedule,
              lastSchedule:
                this.#actionables.length === this.#currentSchedule + 1,
            })
          }
          this.#done = true
          this.#nextSchedule()
        }
      } else {
        this.#toResume = 2
      }
    } catch (e) {
      this.#fail()
      this.#ready = true
      this.#error(e.message)
      this.#checkNext()
    }
  }

  #done(status) {
    if (status === this.STATUS_SUCCESS) {
      this.#success()
    } else {
      this.#error()
    }

    if (!this.#paused && !this.#done && !this.#waiting) {
      this.#ready = true
      this.#loading = false
      this.#doNext()
    }

    return this
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
        this.#ready &&
        !this.#loading &&
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
              this.#done(status)
            )

            this.#ready = false
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
        this.trigger('actionError', {
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

      this.trigger('actionFailed', {
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

  #handleDoGoto(callback, selector, urlParams) {
    if (!urlParams.length) {
      return callback(this.STATUS_ERROR)
    }

    if (this.#currentSchedule === undefined) {
      // only load page if started
      setTimeout(() => this.#goto(callback, selector, urlParams), 1000)
    } else {
      this.#url = urlParams
      this.#ready = false
      this.#loading = true

      this.backup()
      this.#startWorking()

      try {
        this.#Surf.goto(...urlParams)

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

      this.#Surf.wait(...millisecondsParam)

      this.#waiting(false)

      callback(this.STATUS_SUCCESS)
    } catch (e) {
      callback(this.STATUS_ERROR)
    }
  }

  /**
   * Checks if there's a next schedule after the current one
   * @returns {boolean}
   */
  #hasNext() {
    return this.#actionables[this.#currentSchedule + 1] !== undefined
  }

  /**
   * Executes the next schedule
   * @returns {AutoSurf}
   */
  #nextSchedule() {
    if (!this.#done) {
      return this
    }

    if (this.#currentSchedule > -1) {
      this.#success()
    }

    if (!this.#hasNext()) {
      if (this.#current !== null) {
        this.#current = null
        this.#ready = false
        this.#done = true

        this.#stopWorking()

        // trigger done
        this.#Surf.needsBackup(false)
        this.trigger('done', this.#results)
      }

      return this
    }

    this.#Surf.needsBackup(true)
    setTimeout(
      () => {
        this.#currentSchedule++
        this.#ready = true
        this.#done = false

        this.trigger('scheduleStart', {
          scheduleIndex: this.#currentSchedule,
          lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
        })
        this.#doNext(true)
      },
      this.#nextSchedule > -1 ? this.#config.delayBetweenSchedules : 0
    )

    return this
  }

  #parseSchedules() {
    this.#schedules.forEach((schedule, i) => {
      this.trigger('scheduleInit', {
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

    this.#loading = false

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

    if (this.#actionables.length == index) {
      this.#actionables.push({
        toDo: [],
        toCheck: [],
      })
    }

    this.#actionables[index].toDo.push(obj)

    return this
  }

  #startWorking() {
    if (this.#working) {
      return this
    }

    this.trigger('workStart', {
      scheduleIndex: this.#currentSchedule,
      actionIndex: this.#currentIndex,
      action: this.#currentAction,
      lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
    })

    this.#working()
    this.#lvlInt = setInterval(() => this.#working(), 100)

    return this
  }

  #stopWorking() {
    clearInterval(this.#lvlInt)
    this.#working = false
    this.trigger('workStop', {
      scheduleIndex: this.#currentSchedule,
      actionIndex: this.#currentIndex,
      action: this.#currentAction,
      lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
    })

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

      this.trigger('actionSuccess', {
        scheduleIndex: this.#currentSchedule,
        actionIndex: this.#currentIndex,
        action: this.#currentAction,
        lastSchedule: this.#actionables.length === this.#currentSchedule + 1,
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

    this.#ready = true
    this.#checkNext()

    return this
  }

  #waiting(status) {
    this.#waiting = status !== undefined ? status : true

    return this
  }

  #working() {
    this.#wk = this.#wk || 0
    const lvls = ['.', '..', '...', '....']

    this.trigger('working', { text: lvls[this.#wk] })
    this.#wk++

    if (this.#wk > 3) {
      this.#wk = 0
    }

    this.#working = true

    return this
  }
}
