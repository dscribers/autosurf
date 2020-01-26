import Surf from './Surf'

/** AutoSurf Object
 * Schedules surf actions
 * @version 1.0
 * @author Ezra Obiwale <contact@ezraobiwale.com>
 * @param {string} url Path to JSON string to load and execute
 * @return {AutoSurf}
 */
const AutoSurf = function () {
    if (!this instanceof AutoSurf) {
        return new AutoSurf()
    }

    this.version = "1.0"
}

AutoSurf.prototype = {
    actionables: [],
    schedules: [],
    results: [],
    events: {},
    __doNext: function (reset) {
        try {
            this.currentAction = 'do'
            if (reset) {
                this.currentIndex = 0
            } else {
                this.currentIndex++
            }
            if (this.ready && !this.loading && this.actionables[this.currentSchedule]) {
                if (!this.logs || !this.logs.closest('#_' + this.currentSchedule)) {
                    this.logs = Surf('#schedules #_' + this.currentSchedule + ' ul.logs',
                        true).addClass('on')
                }

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
                            }
                            else if (this.current.action !== 'wait' &&
                                this.current.action !== 'pause' &&
                                this.current.action !== 'refresh' &&
                                this.current.action !== 'goto' &&
                                this.current.action !== 'waitTillPageLoads') {
                                this.__error('Selector to DO <b>' + this.current.action +
                                    ' on</b> not specified')
                                this.__doNext()
                                return
                            } else {
                                this.current.selector = []
                            }
                        }

                        const current = Surf(this.current.selector)

                        if (!this.current.selector instanceof Array) {
                            current.focus()
                        }

                        current.__setContext(this)
                        current[this.current.action].apply(current, this.current.params)
                        this.ready = false
                    }
                } else { // nothing to do
                    this.__checkNext(true)
                }
            } else
                this.to_resume = 1
        } catch (e) {
            this.__error(e.message)
            this.__doNext()
        }
    },
    __checkNext: function (reset) {
        try {
            this.currentAction = 'check'
            if (reset) {
                this.currentIndex = 0
            } else {
                this.currentIndex++
            }

            if (this.ready && !this.loading && this.actionables[this.currentSchedule]) {
                if (this.actionables[this.currentSchedule].toCheck.length) {
                    const last = this.current || {}
                    this.current = this.actionables[this.currentSchedule].toCheck.shift()

                    if (this.current) {
                        this.__logCheck(this.current.description).__startWorking()
                        if (!this.current.selector) {
                            if (last.selector) {
                                this.current.selector = last.selector
                            }
                            else {
                                this.__error('Selector to CHECK <b>' +
                                    this.current.action + ' on</b> not specified')
                                this.__checkNext()
                                return
                            }
                        }

                        const current = Surf(this.current.selector)
                        if (!this.current.selector instanceof Array) {
                            current.focus()
                        }

                        current.__setContext(this)
                        let action = this.current.action

                        if (action.toLowerCase().indexOf('not') !== -1) {
                            action = action.replace(/not/i, '')
                        }

                        action = action[0].toLowerCase() + action.substring(1)
                        this.ready = false
                        this.__verify(this.current.action, current[action]
                            .apply(current, this.current.params))
                    }
                } else {
                    if (!this.done) {
                        this.trigger('schedule.finish', {
                            scheduleIndex: this.currentSchedule,
                            lastSchedule: this.actionables.length ===
                                (this.currentSchedule + 1)
                        })
                    }
                    this.done = true
                    this.next()
                }
            } else
                this.to_resume = 2
        } catch (e) {
            this.__fail()
            this.ready = true
            this.__error(e.message)
            this.__checkNext()
        }
    },
    __verify: function (action, bool) {
        try {
            if (action.toLowerCase().indexOf('not') !== -1) {
                // must not be true
                if (bool) {
                    this.__fail()
                }
                else {
                    this.__success()
                }
            } else {
                // must be true
                if (bool) {
                    this.__success()
                }
                else {
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
    __log: function (msg, allDone) {
        if (msg) {
            if (this.debug) {
                !allDone ? console.debug('DO :: ' + msg) : console.debug(msg.toUpperCase())
            }

            this.logs.append('<li class="' + (allDone ? 'success' : 'info') +
                ' last"><span class="status">&' + (allDone ? 'check' : 'DoubleRightArrow') +
                ';</span> ' + msg + ' <span class="loading"></span></li>')
        }

        return this
    },
    __logCheck: function (msg) {
        if (msg) {
            if (this.debug) {
                console.debug('CHECK :: ' + msg)
            }

            this.logs.append('<li class="check info last"><span class="status">&DoubleRightArrow;</span> ' + msg + ' <span class="loading"></span></li>')
        }

        return this
    },
    __success: function () {
        try {
            this.__stopWorking()
            if (this.debug) {
                console.log('--> SUCCESS')
            }

            this.logs.find('li.last').removeClass('info')
                .addClass('success').find('.status').html('&check;')
            this.logs.find('li.last .loading').text('')
            this.logs.find('li.last').removeClass('last')

            // save to result

            if (this.results.length <= this.currentSchedule) {
                this.results.push({
                    "title": this.schedules[this.currentSchedule].title,
                    "list": [],
                    "passed": 0,
                    "failed": 0
                })
            }

            console.log('passed')
            this.results[this.currentSchedule]['passed']++
            this.results[this.currentSchedule]['list'].push({
                action: this.currentAction,
                description: this.current.description,
                status: true
            })

            // trigger success

            this.trigger('action.success', {
                scheduleIndex: this.currentSchedule,
                actionIndex: this.currentIndex,
                action: this.currentAction,
                lastSchedule: this.actionables.length === (this.currentSchedule + 1)
            })
        } catch (e) {}

        return this
    },
    __fail: function () {
        try {
            this.__stopWorking()
            if (this.debug) {
                console.warn('--> FAILED')
            }

            this.logs.find('li.last').removeClass('info').addClass('error')
                .find('.status').html('&chi;')
            this.logs.find('li.last .loading').text('')
            this.logs.find('li.last').removeClass('last')

            // save to result

            if (this.results.length <= this.currentSchedule) {
                this.results.push({
                    "title": this.schedules[this.currentSchedule].title,
                    "list": [],
                    "passed": 0,
                    "failed": 0
                })
            }
            console.log('failed')
            this.results[this.currentSchedule]['failed']++
            this.results[this.currentSchedule]['list'].push({
                action: this.currentAction,
                description: this.current.description,
                status: false
            })

            // trigger failed

            this.trigger('action.failed', {
                scheduleIndex: this.currentSchedule,
                actionIndex: this.currentIndex,
                action: this.currentAction,
                lastSchedule: this.actionables.length === (this.currentSchedule + 1)
            })
        } catch (e) {}

        return this
    },
    __error: function (msg) {
        try {
            this.__stopWorking()
            if (msg) {
                if (this.debug) {
                    console.error(msg)
                    console.warn('--> FAILED')
                }
                this.logs.find('li.last').removeClass('info').addClass('error')
                    .find('.status').html('&chi;')
                this.logs.find('li.last .loading').text('')
                this.logs.find('li.last').removeClass('last')
                this.logs.append('<li class="error_msg"><span class="status">' +
                    '&DoubleRightArrow;</span> ' + msg +
                    '<span class="loading"></span></li>')
            }
            this.trigger('action.error', {
                scheduleIndex: this.currentSchedule,
                actionIndex: this.currentIndex,
                action: this.currentAction,
                lastSchedule: this.actionables.length === (this.currentSchedule + 1),
                message: msg
            })
        } catch (e) {}

        return this
    },
    __startWorking: function () {
        if (this.working) {
            return this
        }

        this.trigger('work.start', {
            scheduleIndex: this.currentSchedule,
            actionIndex: this.currentIndex,
            action: this.currentAction,
            lastSchedule: this.actionables.length === (this.currentSchedule + 1)
        })
        this.__working()
        this.lvlInt = setInterval(function () {
            this.__working()
        }.bind(this), 100)

        return this
    },
    __working: function () {
        this.wk = this.wk || 0
        const lvls = ['.', '..', '...', '....']

        this.logs.find('li.last .loading').text(lvls[this.wk])
        this.wk++

        if (this.wk > 3) {
            this.wk = 0
        }

        this.working = true

        return this
    },
    __stopWorking: function () {
        clearInterval(this.lvlInt)
        this.working = false
        this.trigger('work.stop', {
            scheduleIndex: this.currentSchedule,
            actionIndex: this.currentIndex,
            action: this.currentAction,
            lastSchedule: this.actionables.length === (this.currentSchedule + 1)
        })

        return this
    },
    __init: function (title, description, id) {
        const tmpl = Surf('#template', true).html()
            .replace(/\{id\}/, id)
            .replace(/\{title\}/, title || 'NO TITLE')
            .replace(/\{description\}/, description || 'No description')
        Surf('#project #schedules', true).append(tmpl)

        return this
    },
    __do: function (prop, index) {
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
    __check: function (prop, index) {
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
            description: 'Checking "' + prop.action + '" on [' + (prop.action == "isOn" ||
                prop.action == "isNotOn" ? prop.params[0] : prop.selector) + ']',
        }

        Surfer.extend(obj, prop)
        this.actionables[index].toCheck.push(obj)

        return this
    },
    __parseSchedules: function () {
        Surfer.each(this.schedules, function (schedule, i) {
            this.__init(schedule.title, schedule.description, '_' + i)
            Surfer.each(schedule.do, function (toDo) {
                if (schedule.url) {
                    toDo['url'] = schedule.url
                }
                this.__do(toDo, i)
            }.bind(this))
            Surfer.each(schedule.check, function (toCheck) {
                this.__check(toCheck, i)
            }.bind(this))
        }.bind(this))

        this.loading = false

        return this
    },
    __done: function (failed) {
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
    __goto: function (url, message) {
        if (!url) {
            return this.__done(true)
        }

        if (this.currentSchedule === undefined) { // only load page is started
            setTimeout(function () {
                this.__goto(url, message)
            }.bind(this), 1000)

            return this
        }
        if (message !== false) {
            this.__log(message || 'Open page [' + url + ']').__startWorking()
        }

        if (!this.iframe) {
            this.iframe = Surf('iframe', true).__setContext(this)
        }

        this.url = url
        this.ready = false
        this.loading = true
        this.iframe.__goto(url, function () {
            if (this.debug) {
                console.info('URL -> ' + this.getCurrentUrl())
            }

            this.iframe.item.contentWindow.onbeforeunload = function () {
                this.unloaded = true
            }.bind(this)
            delete this.unloaded
            this.__done()
        }.bind(this))

        return this
    },
    __waiting: function (status) {
        this.waiting = (status !== undefined) ? status : true

        return this
    },
    /** Initializes the project
     * @param {object} project Keys include:
     *
     * name (string) - The name of the project,
     * description (string) - The description of the project,
     * url (string) - The project url. It should be on the same origin as that of the
     * autosurf project
     *
     * @return {AutoSurf}
     */
    init: function (project) {
        const info = Surf('#project', true)
        info.find('#title').text(project.title || 'NO TITLE')
        info.find('.description').text(project.description || 'No description')

        return this
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
    do: function (prop) {
        if (this.from_file && arguments.length < 2) {
            if (this.debug) {
                console.error('FILE MODE ACTIVE')
            }
            return this
        }

        return this.__do(prop, 0)
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
    check: function (prop) {
        if (this.from_file) {
            if (this.debug) {
                console.error('FILE MODE ACTIVE')
            }
            return this
        }

        return this.__check(prop, 0)
    },
    /** Initiates execution
     * @param {object} settings Keys include:
     * url (string) - path to file to load
     * description (string) - The description to log on screen
     * debug (bool) - Indicates whether to output messages
     * @return {AutoSurf}
     */
    start: function (settings) {
        this.debug = (settings && settings.debug)

        // required for real starting when done loading
        if (arguments.length <= 1) {
            console.clear()
            Surf('img#working', true).removeClass('hidden')
            Surf('#toggle_pause', true).removeClass('hidden')
            this.logs = Surf('#project > ul.logs', true)
        }

        // Don't continue until loading is done
        if (this.loading) {
            setTimeout(function () {
                this.start(settings, false)
            }.bind(this), 1000)

            return this
        }

        Surf('.schedule', true).on('click', function () {
            Surf('ul.logs.on', true).removeClass('on')
            Surf(this, true).find('ul.logs').toggleClass('on')
        }, '#schedules')
        this.currentSchedule = -1
        Surf('td#frame', true).addClass('on')
        this.done = true
        if (settings && settings.url) {
            this.load(settings.url)
        }

        this.next()

        return this
    },
    /**
     * Restarts execution
     * @returns {AutoSurf}
     */
    restart: function () {
        if (this.loading) {
            Surf('img#working', true).removeClass('hidden')
            Surf('#toggle_pause', true).removeClass('hidden')
            setTimeout(function () {
                this.restart()
            }.bind(this), 1000)
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
     * Executes the next schedule
     * @returns {AutoSurf}
     */
    next: function () {
        if (!this.done) {
            if (this.debug) {
                console.warn('Cannot execute next until current schedule ends.')
            }
            return this
        }

        if (this.currentSchedule > -1) {
            this.__success()
        }

        this.logs.removeClass('on')

        if (!this.hasNext()) {
            if (this.current !== null) {
                this.current = null
                this.ready = false
                this.done = true
                Surf('#_0 ul.logs', true).addClass('on')
                this.logs = Surf('#project > ul.logs:last-child', true)
                this.__log('All ' + (this.currentSchedule + 1) + ' schedules completed.',
                    true).__stopWorking()

                // trigger done

                this.trigger('done', this.results)
                Surf('img#working', true).addClass('hidden')
                Surf('#toggle_pause', true).addClass('hidden')
            }

            return this
        }
        this.currentAction = 'do'
        this.currentSchedule++
        this.ready = true
        this.done = false

        this.trigger('schedule.start', {
            scheduleIndex: this.currentSchedule,
            lastSchedule: this.actionables.length === (this.currentSchedule + 1)
        })
        this.__doNext(true)

        return this
    },
    parseObject: function (obj) {
        if (obj === undefined || typeof obj !== 'object') {
            console.error('Surf.parseObject() requires an object parameter')
            return this
        }
        this.init(obj)
        this.schedules = obj.schedules
        this.__parseSchedules()

        return this
    },
    /**
     * Triggers the given event
     * @param {string} event
     * @param {Object} details The object to pass as parameter to the callback
     * @returns {AutoSurf}
     */
    trigger: function (event, details) {
        try {
            this.events[event].call({
                event,
                schedule: this.schedules[this.currentSchedule],
                details
            })
        } catch (e) {}

        return this
    },
    /**
     * Checks if there's a next schedule after the current one
     * @returns {boolean}
     */
    hasNext: function () {
        return this.actionables[this.currentSchedule + 1] !== undefined
    },
    /**
     * Pauses the execution of the schedules
     * @returns {AutoSurf}
     */
    pause: function () {
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
            lastSchedule: this.actionables.length === (this.currentSchedule + 1)
        })

        return this
    },
    /**
     * Resumes the execution of the schedules
     * @returns {AutoSurf}
     */
    resume: function () {
        if (!this.paused) {
            return this
        }

        this.ready = true
        this.paused = false

        if (this.to_resume === 2) {
            this.__checkNext()
        }
        else {
            this.__doNext()
        }

        if (this.debug) {
            console.debug('SCHEDULE :: RESUME')
        }

        this.trigger('resumed', {
            scheduleIndex: this.currentSchedule,
            actionIndex: this.currentIndex,
            action: this.currentAction,
            lastSchedule: this.actionables.length === (this.currentSchedule + 1)
        })

        return this
    },
    /**
     *
     * @param {string} event paused | resumed | work.start | work.stop | schedule.start |
     * schedule.finish | action.success | action.failed | action.error | done
     * @param {function} callback
     * @returns {AutoSurf}
     */
    on: function (event, callback) {
        if (event === '*') {
            ['paused', 'resumed', 'work.start', 'work.stop', 'schedule.start', 'schedule.finish', 'action.success', 'action.error', 'done']
            .map(function (evt) {
                this.events[evt] = callback
            }.bind(this))
        } else {
            event.split(',').map(function (evt) {
                this.events[evt.trim()] = callback
            }.bind(this))
        }

        return this
    },
    /**
     * Fetches the current url being worked on
     * @returns {string}
     */
    getCurrentUrl: function () {
        return (this.iframe) ? this.iframe.attr('contentDocument').location.href : null
    }
}

const Surfer = Surf.prototype

export default new AutoSurf()
