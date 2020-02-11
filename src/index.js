import Surf from './Surf'

/** AutoSurf Object
 * Schedules surf actions
 * @version 1.0
 * @author Ezra Obiwale <contact@ezraobiwale.com>
 * @param {string} url Path to JSON string to load and execute
 * @return {AutoSurf}
 */
const AutoSurf = function() {
  if (!this instanceof AutoSurf) {
    return new AutoSurf()
  }

  this.version = '0.1'
  this.storeName = location.origin + location.pathname + '_atsrf'
  this.actionables = []
  this.schedules = []
  this.results = []
  this.events = {}
}

AutoSurf.prototype = {
  __check: function(prop, index) {
    if (this.actionables.length === index) {
      this.actionables.push({
        toDo: [],
        toCheck: []
      })
    }

    const obj = {
      selector: null,
      action: prop,
      params: [],
      description:
        'Checking "' +
        prop.action +
        '" on [' +
        (prop.action == 'isOn' || prop.action == 'isNotOn'
          ? prop.params[0]
          : prop.selector) +
        ']'
    }

    Surfer.extend(obj, prop)
    this.actionables[index].toCheck.push(obj)

    return this
  },
  __checkNext: function(fresh) {
    try {
      this.currentAction = 'check'
      if (fresh) {
        this.currentIndex = 0
      } else {
        this.currentIndex++
      }

      if (
        this.ready &&
        !this.loading &&
        this.actionables[this.currentSchedule]
      ) {
        if (this.actionables[this.currentSchedule].toCheck.length) {
          const last = this.current || {}
          this.current = this.actionables[this.currentSchedule].toCheck.shift()

          if (this.current) {
            this.__logCheck(this.current.description).__startWorking()
            if (!this.current.selector) {
              if (last.selector) {
                this.current.selector = last.selector
              } else {
                this.__error(
                  'Selector to CHECK <b>' +
                    this.current.action +
                    ' on</b> not specified'
                )
                this.__checkNext()
                return
              }
            }

            const current = Surf(this.current.selector)
            if (!Array.isArray(this.current.selector)) {
              current.focus()
            }

            current.__setContext(this)
            let action = this.current.action

            if (action.toLowerCase().indexOf('not') !== -1) {
              action = action.replace(/not/i, '')
            }

            action = action[0].toLowerCase() + action.substring(1)
            this.ready = false
            this.__verify(
              this.current.action,
              current[action].apply(current, this.current.params)
            )
          }
        } else {
          if (!this.done) {
            this.trigger('scheduleFinish', {
              scheduleIndex: this.currentSchedule,
              lastSchedule: this.actionables.length === this.currentSchedule + 1
            })
          }
          this.done = true
          this.next()
        }
      } else {
        this.to_resume = 2
      }
    } catch (e) {
      this.__fail()
      this.ready = true
      this.__error(e.message)
      this.__checkNext()
    }
  },
  __do: function(prop, index) {
    const obj = {
      selector: null,
      action: prop,
      params: [],
      description: null
    }

    Surfer.extend(obj, prop)

    if (this.actionables.length == index) {
      this.actionables.push({
        toDo: [],
        toCheck: []
      })
    }

    this.actionables[index].toDo.push(obj)

    return this
  },
  __done: function(failed) {
    if (failed) {
      this.__fail()
    } else {
      this.__success()
    }

    if (!this.paused && !this.done && !this.waiting) {
      this.ready = true
      this.loading = false
      this.__doNext()
    }

    return this
  },
  __doNext: function(fresh) {
    try {
      this.currentAction = 'do'

      if (fresh) {
        this.currentIndex = 0
      } else {
        this.currentIndex++
      }

      if (
        this.ready &&
        !this.loading &&
        this.actionables[this.currentSchedule]
      ) {
        this.trigger('resetLogs', { currentSchedule: this.currentSchedule })

        if (this.actionables[this.currentSchedule].toDo.length) {
          const last = this.current || {}
          this.current = this.actionables[this.currentSchedule].toDo.shift()

          if (this.current) {
            try {
              this.__log(this.current.description).__startWorking()
            } catch (e) {
              console.error(e.message)
            }

            if (!this.current.selector) {
              if (last.selector) {
                this.current.selector = last.selector
              } else if (
                this.current.action !== 'wait' &&
                this.current.action !== 'pause' &&
                this.current.action !== 'refresh' &&
                this.current.action !== 'goto' &&
                this.current.action !== 'waitTillPageLoads'
              ) {
                this.__error(
                  'Selector to DO <b>' +
                    this.current.action +
                    ' on</b> not specified'
                )
                this.__doNext()
                return
              } else {
                this.current.selector = []
              }
            }
            try {
              this.__log(this.current.description).__startWorking()
            } catch (e) {
              console.error(e.message)
            }


            const current = Surf(this.current.selector)

            if (!Array.isArray(this.current.selector)) {
              current.focus()
            }

            current.__setContext(this)
            current[this.current.action].apply(current, this.current.params)
            this.ready = false
          }
        } else {
          // nothing to do
          this.__checkNext(true)
        }
      } else {
        this.to_resume = 1
      }
    } catch (e) {
      this.__error(e.message)
      this.__doNext()
    }
  },
  __error: function(msg) {
    try {
      this.__stopWorking()
      if (msg) {
        if (this.debug) {
          console.error(msg)
          console.warn('--> FAILED')
        }
      }
      this.trigger('actionError', {
        scheduleIndex: this.currentSchedule,
        actionIndex: this.currentIndex,
        action: this.currentAction,
        lastSchedule: this.actionables.length === this.currentSchedule + 1,
        message: msg
      })
    } catch (e) {}

    return this
  },
  __fail: function() {
    try {
      this.__stopWorking()
      if (this.debug) {
        console.warn('--> FAILED')
      }

      // save to result

      if (this.results.length <= this.currentSchedule) {
        this.results.push({
          title: this.schedules[this.currentSchedule].title,
          list: [],
          passed: 0,
          failed: 0
        })
      }
      this.results[this.currentSchedule]['failed']++
      this.results[this.currentSchedule]['list'].push({
        action: this.currentAction,
        description: this.current.description,
        status: false
      })

      // trigger failed

      this.trigger('actionFailed', {
        scheduleIndex: this.currentSchedule,
        actionIndex: this.currentIndex,
        action: this.currentAction,
        lastSchedule: this.actionables.length === this.currentSchedule + 1
      })
    } catch (e) {}

    return this
  },
  __goto: function(url, message) {
    if (!url) {
      return this.__done(true)
    }

    if (this.currentSchedule === undefined) {
      // only load page is started
      setTimeout(
        function() {
          this.__goto(url, message)
        }.bind(this),
        1000
      )
    } else {
      if (message !== false) {
        this.__log(message || 'Open page [' + url + ']').__startWorking()
      }

      this.url = url
      this.ready = false
      this.loading = true

      localStorage.setItem(this.storeName, JSON.stringify(this))
      location.href = url
    }

    return this
  },
  __log: function(msg, allDone = false) {
    if (msg) {
      if (this.debug) {
        !allDone
          ? console.debug('DO :: ' + msg)
          : console.debug(msg.toUpperCase())
      }

      this.trigger('log', { allDone, message: msg })
    }

    return this
  },
  __logCheck: function(msg) {
    if (msg) {
      if (this.debug) {
        console.debug('CHECK :: ' + msg)
      }

      this.trigger('log', { message: msg })
    }

    return this
  },
  __parseSchedules: function() {
    Surfer.each(
      this.schedules,
      function(schedule, i) {
        this.trigger('scheduleInit', {
          schedule,
          id: `_${i}`
        })

        Surfer.each(
          schedule.do,
          function(toDo) {
            if (schedule.url) {
              toDo['url'] = schedule.url
            }

            this.__do(toDo, i)
          }.bind(this)
        )

        Surfer.each(
          schedule.check,
          function(toCheck) {
            this.__check(toCheck, i)
          }.bind(this)
        )
      }.bind(this)
    )

    this.loading = false

    return this
  },
  __startWorking: function() {
    if (this.working) {
      return this
    }

    this.trigger('workStart', {
      scheduleIndex: this.currentSchedule,
      actionIndex: this.currentIndex,
      action: this.currentAction,
      lastSchedule: this.actionables.length === this.currentSchedule + 1
    })
    this.__working()
    this.lvlInt = setInterval(
      function() {
        this.__working()
      }.bind(this),
      100
    )

    return this
  },
  __stopWorking: function() {
    clearInterval(this.lvlInt)
    this.working = false
    this.trigger('workStop', {
      scheduleIndex: this.currentSchedule,
      actionIndex: this.currentIndex,
      action: this.currentAction,
      lastSchedule: this.actionables.length === this.currentSchedule + 1
    })

    return this
  },
  __success: function() {
    try {
      this.__stopWorking()
      if (this.debug) {
        console.log('--> SUCCESS')
      }

      // save to result

      if (this.results.length <= this.currentSchedule) {
        this.results.push({
          title: this.schedules[this.currentSchedule].title,
          list: [],
          passed: 0,
          failed: 0
        })
      }

      this.results[this.currentSchedule]['passed']++
      this.results[this.currentSchedule]['list'].push({
        action: this.currentAction,
        description: this.current.description,
        status: true
      })

      // trigger success

      this.trigger('actionSuccess', {
        scheduleIndex: this.currentSchedule,
        actionIndex: this.currentIndex,
        action: this.currentAction,
        lastSchedule: this.actionables.length === this.currentSchedule + 1
      })
    } catch (e) {}

    return this
  },
  __verify: function(action, bool) {
    try {
      if (action.toLowerCase().indexOf('not') !== -1) {
        // must not be true
        if (bool) {
          this.__fail()
        } else {
          this.__success()
        }
      } else {
        // must be true
        if (bool) {
          this.__success()
        } else {
          this.__fail()
        }
      }
    } catch (e) {
      this.__fail()
      this.__error(e.message)
    }
    this.ready = true
    this.__checkNext()

    return this
  },
  __waiting: function(status) {
    this.waiting = status !== undefined ? status : true

    return this
  },
  __working: function() {
    this.wk = this.wk || 0
    const lvls = ['.', '..', '...', '....']

    this.trigger('working', { text: lvls[this.wk] })
    this.wk++

    if (this.wk > 3) {
      this.wk = 0
    }

    this.working = true

    return this
  },
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
   * description (string) - To be logged while checking the given action
   *
   * @return {AutoSurf}
   */
  check: function(prop) {
    if (this.from_file) {
      if (this.debug) {
        console.error('FILE MODE ACTIVE')
      }
      return this
    }

    return this.__check(prop, 0)
  },
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
   * description (string) - To be logged while executing the given action
   *
   * @return {AutoSurf}
   */
  do: function(prop) {
    if (this.from_file && arguments.length < 2) {
      if (this.debug) {
        console.error('FILE MODE ACTIVE')
      }
      return this
    }

    return this.__do(prop, 0)
  },
  /**
   * Fetches the current url being worked on
   * @returns {string}
   */
  getCurrentUrl: function() {
    return location.href
  },
  /**
   * Checks if there's a next schedule after the current one
   * @returns {boolean}
   */
  hasNext: function() {
    return this.actionables[this.currentSchedule + 1] !== undefined
  },
  /**
   * Executes the next schedule
   * @returns {AutoSurf}
   */
  next: function() {
    if (!this.done) {
      if (this.debug) {
        console.warn('Cannot execute next until current schedule ends.')
      }
      return this
    }

    if (this.currentSchedule > -1) {
      this.__success()
    }

    if (!this.hasNext()) {
      if (this.current !== null) {
        this.current = null
        this.ready = false
        this.done = true
        this.__log(
          'All ' + (this.currentSchedule + 1) + ' schedules completed.',
          true
        ).__stopWorking()

        // trigger done

        this.trigger('done', this.results)
      }

      return this
    }

    this.currentSchedule++
    this.ready = true
    this.done = false

    this.trigger('scheduleStart', {
      scheduleIndex: this.currentSchedule,
      lastSchedule: this.actionables.length === this.currentSchedule + 1
    })
    this.__doNext(true)

    return this
  },
  /**
   *
   * @param {string} event paused | resumed | work.start | work.stop | schedule.start |
   * schedule.finish | action.success | action.failed | action.error | done
   * @param {function} callback
   * @returns {AutoSurf}
   */
  on: function(event, callback) {
    if (event === '*') {
      ;[
        'actionError',
        'actionFailed',
        'actionSuccess',
        'done',
        'log',
        'paused',
        'resetLogs',
        'resumed',
        'scheduleFinish',
        'scheduleInit',
        'scheduleStart',
        'working',
        'workStart',
        'workStop'
      ].map(
        function(evt) {
          this.events[evt] = callback
        }.bind(this)
      )
    } else {
      event.split(',').map(
        function(evt) {
          this.events[evt.trim()] = callback
        }.bind(this)
      )
    }

    return this
  },
  parse: function(obj) {
    if (obj === undefined || typeof obj !== 'object') {
      console.error('Surf.parseObject() requires an object parameter')
      return this
    }

    this.schedules = obj.schedules
    this.__parseSchedules()

    return this
  },
  /**
   * Pauses the execution of the schedules
   * @returns {AutoSurf}
   */
  pause: function() {
    if (this.paused) {
      return this
    }

    this.ready = false
    this.paused = true

    if (this.debug) {
      console.debug('SCHEDULE :: PAUSE')
    }

    this.trigger('paused', {
      scheduleIndex: this.currentSchedule,
      actionIndex: this.currentIndex,
      action: this.currentAction,
      lastSchedule: this.actionables.length === this.currentSchedule + 1
    })

    return this
  },
  /**
   * Called to inform AutoSurf that parent code is ready
   * @param {AutoSurf}
   */
  ready: function(callback) {
    let stored = localStorage.getItem(this.storeName)

    if (stored) {
      stored = JSON.parse(stored)

      for (let key in stored) {
        this[key] = stored[key]
      }

      localStorage.removeItem(this.storeName)

      if (this.debug) {
        console.info('URL -> ' + this.getCurrentUrl())
      }

      this.__done()
    }

    callback(stored !== null)

    return this
  },
  /**
   * Restarts execution
   * @returns {AutoSurf}
   */
  restart: function() {
    if (this.loading) {
      Surf('img#working', true).removeClass('hidden')
      Surf('#toggle_pause', true).removeClass('hidden')
      setTimeout(
        function() {
          this.restart()
        }.bind(this),
        1000
      )
    }
    console.clear()
    Surf('#schedules', true).html('')
    Surf('#project>.logs', true).html('')
    this.__parseSchedules()
    this.currentSchedule = -1
    Surf('td#frame', true).addClass('on')
    this.done = true
    this.results = []
    this.next()

    return this
  },
  /**
   * Resumes the execution of the schedules
   * @returns {AutoSurf}
   */
  resume: function() {
    if (!this.paused) {
      return this
    }

    this.ready = true
    this.paused = false

    if (this.to_resume === 2) {
      this.__checkNext()
    } else {
      this.__doNext()
    }

    if (this.debug) {
      console.debug('SCHEDULE :: RESUME')
    }

    this.trigger('resumed', {
      scheduleIndex: this.currentSchedule,
      actionIndex: this.currentIndex,
      action: this.currentAction,
      lastSchedule: this.actionables.length === this.currentSchedule + 1
    })

    return this
  },
  /** Initiates execution
   * @param {object} settings Keys include:
   * url (string) - path to file to load
   * description (string) - The description to log on screen
   * debug (bool) - Indicates whether to output messages
   * @return {AutoSurf}
   */
  start: function(settings) {
    this.debug = settings && settings.debug

    // Don't continue until loading is done
    if (this.loading) {
      setTimeout(
        function() {
          this.start(settings, false)
        }.bind(this),
        1000
      )

      return this
    }

    this.currentSchedule = -1
    this.done = true

    this.next()

    return this
  },
  /**
   * Triggers the given event
   * @param {string} event
   * @param {Object} detail The object to pass as parameter to the callback
   * @returns {AutoSurf}
   */
  trigger: function(event, detail) {
    try {
      this.events[event]({
        name: event,
        schedule: this.schedules[this.currentSchedule],
        detail
      })
    } catch (e) {}

    return this
  }
}

const Surfer = Surf.prototype

export default new AutoSurf()
