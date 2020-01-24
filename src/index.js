/** AutoSurf Object
 * Schedules surf actions
 * @version 1.0
 * @author Ezra Obiwale <contact@ezraobiwale.com>
 * @param {string} url Path to JSON string to load and execute
 * @return {AutoSurf}
 */
const AutoSurf = function (url) {
    if (!this instanceof AutoSurf) {
        return new AutoSurf()
    }

    if (url) {
        this.load(url)
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

/** Surf Object
 * For navigating and manipulating the DOM
 * @version 1.0
 * @author Ezra Obiwale <contact@ezraobiwale.com>
 * @return {Surf}
 */
const Surf = function (selector, useThisWindow, debug) {
    if (selector instanceof Surf) {
        return selector
    }
    else if (!(this instanceof Surf)) {
        return new Surf(selector, useThisWindow, debug)
    }

    this.__init(selector, useThisWindow, debug)
    this.version = "1.0"
}

/** Surf Object
 * For navigating and manipulating the DOM
 * @version 1.0
 * @author Ezra Obiwale <contact@ezraobiwale.com>
 * @return {Surf}
 */
const Surfer = Surf.prototype = {
    __log: function (msg) {
        console.log(msg)
    },
    __done: function (action, failed) {
        if (this.context) {
            this.context.__done(failed)
        }
        else {
            this.__log('Done :: ' + action)
        }

        return this
    },
    __init: function (selector, userThisWindow) {
        this.window = userThisWindow ? window :
            window.document.querySelector('iframe').contentWindow
        const elem = this.__elem(selector)
        this.utw = userThisWindow || false
        return elem
    },
    __elem: function (selector) {
        if (typeof selector === 'object' && selector.nodeName) {
            if (selector.localName) {
                this.selector = selector.localName
            }

            if (selector.id) {
                this.selector += '#' + selector.id
            }

            if (selector.className) {
                this.selector += '.' + selector.className
            }

            this.item = selector
            this.length = 1
        } else if (typeof selector === 'object') {
            this.item = selector
            this.length = selector.length || 1
        } else if (typeof selector === 'string') {
            this.selector = selector
            this.item = this.window.document.querySelector(selector)
            this.length = this.item ? 1 : 0
        }

        if (this.item === null || this.item === undefined) {
            this.__noItemFound()
        }

        return this
    },
    __noItemFound: function () {
        if (this.debug) {
            console.error(this.selector + ' does not exist')
        }
    },
    __create: function (selector) {
        return new Surf(selector, this.utw)
    },
    __setContext: function (context) {
        this.context = context

        return this
    },
    __goto: function (url, func) {
        if (func) {
            this.onload(function () {
                func.call(this.context || this)
            }.bind(this))
        }

        this.item.src = url

        return this
    },
    /** Executes the given function when the document is loaded without waiting for page assets to load
     * @param {function} func The function to call
     * @return {Surfer}
     */
    ready: function (func) {
        self = this
        const readyList = []
        let readyFired = false
        let readyEventHandlersInstalled = false

        function ready() {
            if (!readyFired) {
                readyFired = true

                for (let i = 0; i < readyList.length; i++) {
                    readyList[i].fn.call(self)
                }

                readyList = []
            }
        }

        if (readyFired) {
            setTimeout(function () {
                func.call(self)
            }, 1)
            return this
        } else {
            readyList.push({
                fn: func
            })
        }

        if (this.window.document.readyState === "complete") {
            setTimeout(ready, 1)
        } else if (!readyEventHandlersInstalled) {
            if (this.window.document.addEventListener) {
                this.window.document.addEventListener("DOMContentLoaded", ready, false)
                this.window.addEventListener("load", ready, false)
            } else {
                this.window.document.attachEvent("onreadystatechange", function () {
                    if (this.window.document.readyState === "complete") {
                        ready()
                    }
                })
                this.window.attachEvent("onload", ready)
            }

            readyEventHandlersInstalled = true
        }

        return this
    },
    /**
     * Navigates the browser back to the previous page
     * @returns {Surfer}
     */
    goBack: function () {
        if (this.item.contentWindow.history) {
            this.item.contentWindow.history.back()
            this.__done('Went back to previous page')
        } else {
            this.__done('Go back failed', true)
        }

        return this
    },
    /**
     * Navigate to the given url
     * @param {string} url
     * @returns {Surfer}
     */
    goto: function (url) {
        this.context.__goto(url, false)

        return this
    },
    /**
     * Gets the nearest parent of the current item with the given selector
     * @param {type} selector
     * @returns {HTMLElement|null}
     */
    closest: function (selector) {
        return this.item.closest(selector)
    },
    /**
     * Adds an event listener to the current item
     * @param {string} event The event to listen to e.g. click
     * @param {function} func The callback to execute when the event is executed
     * @returns {Surfer}
     */
    on: function (event, func, scope) {
        (scope && document.querySelector(scope) || document)
        .addEventListener(event, function (e) {
            const listeningTarget = e.target.closest(this.selector)
            if (listeningTarget) {
                func.call(listeningTarget, e)
            }
        }.bind(this))

        return this
    },
    /** Executes the given function when the document and the page assets are loaded
     * @param {function} func The function to call
     * @return {Surfer}
     */
    onload: function (func) {
        this.item.onload = function () {
            func.call(this)
        }

        return this
    },
    /** Finds the given selector in the current item
     * @param {string} selector The element to find
     * @return {Surf} object of the item found
     */
    find: function (selector) {
        return this.selector ?
            this.__create(this.selector + ' ' + selector) :
            this.__create(selector)
    },
    /** Loops through the current items and passes each value and its index into the given function.
     * The function would parameters value first, and then the index
     * @param {function} func The function
     *
     * Usage 2 with 2 parameters
     * @param {array|object} obj
     * @param {function} func The function
     *
     * @return {Surfer}
     */
    each: function (func) {
        let args = Array.apply(null, arguments)
        let items = this.item

        if (args.length === 2) {
            items = args.shift()
            func = args.shift()
        }

        for (let a in items) {
            func.call(this, items[a], a)
        }

        return this
    },
    /** Coverts a JSON string to a JSON object
     * @param {string} str The JSON string
     * @return {object}
     */
    toJSON: function (str) {
        try {
            if (typeof JSON === 'object') {
                return JSON.parse(str)
            }

            return (new Function('return ' + str))()
        } catch (e) {
            console.error('JSON Error: ' + e.message)
        }
        return {}
    },
    /** Updates an object with another object.
     * Usage 1 - extend the current item with the given object
     * @param {object} obj
     *
     * Usage 2 - extend the first object with the second object
     * @param {object} obj1
     * @param {object} obj2
     *
     * @return {object} A new object containing everything from both objects
     */
    extend: function (obj) {
        const args = Array.apply(null, arguments)

        if (typeof obj === 'object') {
            const d_obj = args.length == 2 ? args[0] : this.item

            this.each(args[1] || args[0], function (v, i) {
                this[i] = v
            }.bind(d_obj))

            return d_obj
        }

        return this.item
    },
    /** Pauses execution for the given miliseconds
     * @param {int} milliseconds
     * @return {Surfer}
     */
    wait: function (milliseconds) {
        if (milliseconds) {
            if (this.context) {
                this.context.__waiting()
            }

            setTimeout(function () {
                this.context.__waiting(false)
                this.__done()
            }.bind(this), milliseconds)
        } else {
            this.__done()
        }

        return this
    },
    waitTillPageLoads: function () {
        // requires no code
        setTimeout(function () {
            if (!this.context.unloaded) {
                this.__done(null, true)
            }
            delete this.context.unloaded
        }.bind(this), 1000)
    },
    /**
     * Pauses the execution of the schedule
     * @returns {Surfer}
     */
    pause: function () {
        this.context.pause()
        this.__done('Paused execution')

        return this
    },
    /**
     * Refreshes the current page
     * @returns {Surfer}
     */
    refresh: function () {
        this.context.iframe.item.contentWindow.location.reload()

        return this
    },
    /** Focuses on the current item
     * @return {Surfer}
     */
    focus: function () {
        if (this.item) {
            this.item.style.border = "2px solid magenta"
            this.item.style.color = "#0e90d2"
            this.item.style.backgroundColor = "#ffffff"
            this.item.focus()
            this.__done('Focused on [' + this.selector + ']')
        } else {
            this.__done('Focus failed', true)
        }

        return this
    },
    /** Clicks on the current item
     * @return {Surfer}
     */
    click: function () {
        if (this.item) {
            this.item.click()
            this.__done('Clicked on [' + this.selector + ']')
        } else {
            this.__done('Click failed', true)
        }

        return this
    },
    /** Types the given string into the current item
     * @param {string} str The string to type
     * @return {Surfer}
     */
    type: function (str, speed) {
        if (this.item) {
            const args = Array.apply(null, arguments)

            if (args[2]) {
                this.item.value += str
                if (args[3]) {
                    this.__done('Typed "' + this.item.value + '" in [' + this.selector + ']')
                }
            } else {
                this.item.value = null
                const self = this

                for (let i in str) {
                    setTimeout(function () {
                        self.type(this.str, speed, true, this.final)
                    }.bind({
                        str: str[i],
                        final: (i == str.length - 1)
                    }), (speed || 10) * (i + 1))
                }
            }
        } else {
            this.__done('Type failed', true)
        }

        return this
    },
    /** Submits the form (self or closest parent) without clicking on the submit button
     * @return self
     */
    submitForm: function () {
        let parent = this.item
        let parent_name = this.item.localName
        while (parent_name != 'form') {
            if (parent_name == 'body') {
                break
            }

            parent = parent.parentNode
            parent_name = parent.localName
        }

        if (parent_name == 'form') {
            const submitButton = this.__create(parent).find('[type="submit"]')

            if (submitButton) {
                submitButton.click()
            }
            else {
                parent.submit()
            }

            this.__done('Submitted form [' + this.selector + ']')
        } else {
            this.__done('Submit form [' + this.selector + '] failed', true)
        }

        return this
    },
    /** Sets or gets the text conent of the current element
     * @param {string} str If given, it would be set as the element's text content
     * @return {string|Surfer}
     */
    text: function (str) {
        if (str === undefined) {
            return this.item.innerText
        }

        this.item.innerText = str

        return this
    },
    /** Sets or gets the html content of the current element
     * @param {string} str If given, it would be set as the element's html content
     * @return {string|Surfer}
     */
    html: function (content) {
        if (content === undefined) {
            return this.item.innerHTML
        }

        this.item.innerHTML = content

        return this
    },
    /** Prepends the given content to the html content of the current element
     * @param {string} content The content to prepend
     * @return {Surfer}
     */
    prepend: function (content) {
        this.html(content + this.html())

        return this
    },
    /** Appends the given content to the html content of the current element
     * @param {string} content The content to append
     * @return {Surfer}
     */
    append: function (content) {
        this.html(this.html() + content)

        return this
    },
    /**
     * Removes the current item from the DOM
     * @returns {Surfer}
     */
    remove: function () {
        this.item.remove()

        return this
    },
    /** Removes the given string from the class of the current item
     * @param {string} str The class string to remove
     * @return {Surfer}
     */
    removeClass: function (str) {
        if (str && this.item.className) {
            this.each(str.split(' '), function (str) {
                this.item.className = this.item.className.replace(str, '').replace('  ', ' ')
            })
        }

        return this
    },
    /** Adds the given string to the class of the current item
     * @param {string} str The class string to add
     * @return {Surfer}
     */
    addClass: function (str) {
        if (this.item && str) {
            this.each(str.split(' '), function (str) {
                if (this.item.className) {
                    if (this.item.className.indexOf(str) !== -1) {
                        return true
                    }
                    this.item.className += (' ' + str)
                } else {
                    this.item.className = str
                }
            })
        }

        return this
    },
    /**
     * Checks if the current item has the given class
     * @param {string} str
     * @returns {boolean}
     */
    hasClass: function (str) {
        return this.item.className.indexOf(str) !== -1
    },
    /**
     * Toggles the given class on the current item
     * @param {string} str
     * @returns {Surfer}
     */
    toggleClass: function (str) {
        if (this.hasClass(str)) {
            this.removeClass(str)
        }
        else {
            this.addClass(str)
        }

        return this
    },
    /** Sets or gets the value of the current item
     * @param {string} value If given, it would be set as the value
     * @return {Surfer}
     */
    value: function (value) {
        if (!value) {
            return this.item.value
        }

        this.item.value = value

        return this
    },
    /** Sets or gets the given attribute of the current item
     * @param {string} attr The attribute to set or get
     * @param {mixed} val If given, it would be set as the value of the attribute
     * @return {string|Surfer}
     */
    attr: function (attr, val) {
        if (!val) {
            return this.item[attr]
        }

        this.item[attr] = val

        return this
    },
    /** Checks if the page is on the given url
     * @param {string} url The url string to check against
     * @return {boolean}
     */
    isOn: function (url) {
        return this.window.document.location.href == url.toLowerCase()
    },
    /** Checks that the text content of the current item is the given text
     * @param {string} text The text to check against
     * @return {boolean}
     */
    textIs: function (text) {
        return (this.text() == text)
    },
    /** Checks that the text content of the current item contains the given text
     * @param {string} text The text to check against
     * @return {boolean}
     */
    textContains: function (text) {
        return (this.text().indexOf(text) !== -1)
    },
    /** Checks that the value of the current item is the given value
     * @param {string} value The value to check against
     * @return {boolean}
     */
    valueIs: function (value) {
        return (this.value() == value)
    },
    /** Checks that the value of the current item contains the given text
     * @param {string} text The text to check against
     * @return {boolean}
     */
    valueContains: function (text) {
        return (this.value().indexOf(text) !== -1)
    },
    /** Checks that the value of the given attribute current item is the given value
     * @param {string} attr The attribute to check
     * @param {string} val The value to check against
     * @return {boolean}
     */
    attrIs: function (attr, val) {
        return (this.attr(attr) == val)
    },
    /** Checks that the given attribute of the current item contains the given text
     * @param {string} text The text to check against
     * @return {boolean}
     */
    attrContains: function (attr, text) {
        return (this.attr(attr).indexOf(text) !== -1)
    },
    /** Checks that the current item exists in the dom
     * @return {boolean}
     */
    exists: function () {
        return this.item !== null && this.item !== undefined
    }
}

Surf.toString = function () {
    return 'Surf(selector [, useThisWindow] [, debug]) { [code] }'
}

module.exports.AutoSurf = module.exports.S = new AutoSurf()

module.exports._ = Surfer

module.exports.Surf = Surf;