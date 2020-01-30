/** Surf Object
 * For navigating and manipulating the DOM
 * @version 1.0
 * @author Ezra Obiwale <contact@ezraobiwale.com>
 * @return {Surf}
 */
const Surf = function(selector, useThisWindow, debug) {
  if (selector instanceof Surf) {
    return selector
  } else if (!(this instanceof Surf)) {
    return new Surf(selector, useThisWindow, debug)
  }

  this.__init(selector, useThisWindow, debug)
  this.version = '1.0'
}

/** Surf Object
 * For navigating and manipulating the DOM
 * @version 1.0
 * @author Ezra Obiwale <contact@ezraobiwale.com>
 * @return {Surf}
 */
Surf.prototype = {
  __log: function(msg) {
    console.log(msg)
  },
  __done: function(action, failed) {
    if (this.context) {
      this.context.__done(failed)
    } else {
      this.__log('Done :: ' + action)
    }

    return this
  },
  __init: function(selector, userThisWindow) {
    this.window = userThisWindow
      ? window
      : window.document.querySelector('iframe').contentWindow
    const elem = this.__elem(selector)
    this.utw = userThisWindow || false
    return elem
  },
  __elem: function(selector) {
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
  __noItemFound: function() {
    if (this.debug) {
      console.error(this.selector + ' does not exist')
    }
  },
  __create: function(selector) {
    return new Surf(selector, this.utw)
  },
  __setContext: function(context) {
    this.context = context

    return this
  },
  __goto: function(url, func) {
    if (func) {
      this.onload(
        function() {
          func.call(this.context || this)
        }.bind(this)
      )
    }

    this.item.src = url

    return this
  },
  /** Executes the given function when the document is loaded without waiting for page assets to load
   * @param {function} func The function to call
   * @return {Surfer}
   */
  ready: function(func) {
    self = this
    let readyList = []
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
      setTimeout(function() {
        func.call(self)
      }, 1)
      return this
    } else {
      readyList.push({
        fn: func
      })
    }

    if (this.window.document.readyState === 'complete') {
      setTimeout(ready, 1)
    } else if (!readyEventHandlersInstalled) {
      if (this.window.document.addEventListener) {
        this.window.document.addEventListener('DOMContentLoaded', ready, false)
        this.window.addEventListener('load', ready, false)
      } else {
        this.window.document.attachEvent('onreadystatechange', function() {
          if (this.window.document.readyState === 'complete') {
            ready()
          }
        })
        this.window.attachEvent('onload', ready)
      }

      readyEventHandlersInstalled = true
    }

    return this
  },
  /**
   * Navigates the browser back to the previous page
   * @returns {Surfer}
   */
  goBack: function() {
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
  goto: function(url) {
    this.context.__goto(url, false)

    return this
  },
  /**
   * Gets the nearest parent of the current item with the given selector
   * @param {type} selector
   * @returns {HTMLElement|null}
   */
  closest: function(selector) {
    return this.item.closest(selector)
  },
  /**
   * Adds an event listener to the current item
   * @param {string} event The event to listen to e.g. click
   * @param {function} func The callback to execute when the event is executed
   * @returns {Surfer}
   */
  on: function(event, func, scope) {
    ;((scope && document.querySelector(scope)) || document).addEventListener(
      event,
      function(e) {
        const listeningTarget = e.target.closest(this.selector)
        if (listeningTarget) {
          func.call(listeningTarget, e)
        }
      }.bind(this)
    )

    return this
  },
  /** Executes the given function when the document and the page assets are loaded
   * @param {function} func The function to call
   * @return {Surfer}
   */
  onload: function(func) {
    this.item.onload = function() {
      func.call(this)
    }

    return this
  },
  /** Finds the given selector in the current item
   * @param {string} selector The element to find
   * @return {Surf} object of the item found
   */
  find: function(selector) {
    return this.selector
      ? this.__create(this.selector + ' ' + selector)
      : this.__create(selector)
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
  each: function(func) {
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
  toJSON: function(str) {
    try {
      if (typeof JSON === 'object') {
        return JSON.parse(str)
      }

      return new Function('return ' + str)()
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
  extend: function(obj) {
    const args = Array.apply(null, arguments)

    if (typeof obj === 'object') {
      const d_obj = args.length == 2 ? args[0] : this.item

      this.each(
        args[1] || args[0],
        function(v, i) {
          this[i] = v
        }.bind(d_obj)
      )

      return d_obj
    }

    return this.item
  },
  /** Pauses execution for the given miliseconds
   * @param {int} milliseconds
   * @return {Surfer}
   */
  wait: function(milliseconds) {
    if (milliseconds) {
      if (this.context) {
        this.context.__waiting()
      }

      setTimeout(
        function() {
          this.context.__waiting(false)
          this.__done()
        }.bind(this),
        milliseconds
      )
    } else {
      this.__done()
    }

    return this
  },
  waitTillPageLoads: function() {
    // requires no code
    setTimeout(
      function() {
        if (!this.context.unloaded) {
          this.__done(null, true)
        }
        delete this.context.unloaded
      }.bind(this),
      1000
    )
  },
  /**
   * Pauses the execution of the schedule
   * @returns {Surfer}
   */
  pause: function() {
    this.context.pause()
    this.__done('Paused execution')

    return this
  },
  /**
   * Refreshes the current page
   * @returns {Surfer}
   */
  refresh: function() {
    this.context.iframe.item.contentWindow.location.reload()

    return this
  },
  /** Focuses on the current item
   * @return {Surfer}
   */
  focus: function() {
    if (this.item) {
      this.item.style.border = '2px solid magenta'
      this.item.style.color = '#0e90d2'
      this.item.style.backgroundColor = '#ffffff'
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
  click: function() {
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
  type: function(str, speed) {
    if (this.item) {
      const args = Array.apply(null, arguments)

      if (args[2]) {
        this.item.value += str
        if (args[3]) {
          this.__done(
            'Typed "' + this.item.value + '" in [' + this.selector + ']'
          )
        }
      } else {
        this.item.value = null
        const self = this

        for (let i in str) {
          setTimeout(
            function() {
              self.type(this.str, speed, true, this.final)
            }.bind({
              str: str[i],
              final: i == str.length - 1
            }),
            (speed || 10) * (i + 1)
          )
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
  submitForm: function() {
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
      } else {
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
  text: function(str) {
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
  html: function(content) {
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
  prepend: function(content) {
    this.html(content + this.html())

    return this
  },
  /** Appends the given content to the html content of the current element
   * @param {string} content The content to append
   * @return {Surfer}
   */
  append: function(content) {
    this.html(this.html() + content)

    return this
  },
  /**
   * Removes the current item from the DOM
   * @returns {Surfer}
   */
  remove: function() {
    this.item.remove()

    return this
  },
  /** Removes the given string from the class of the current item
   * @param {string} str The class string to remove
   * @return {Surfer}
   */
  removeClass: function(str) {
    if (str && this.item.className) {
      this.each(str.split(' '), function(str) {
        this.item.className = this.item.className
          .replace(str, '')
          .replace('  ', ' ')
      })
    }

    return this
  },
  /** Adds the given string to the class of the current item
   * @param {string} str The class string to add
   * @return {Surfer}
   */
  addClass: function(str) {
    if (this.item && str) {
      this.each(str.split(' '), function(str) {
        if (this.item.className) {
          if (this.item.className.indexOf(str) !== -1) {
            return true
          }
          this.item.className += ' ' + str
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
  hasClass: function(str) {
    return this.item.className.indexOf(str) !== -1
  },
  /**
   * Toggles the given class on the current item
   * @param {string} str
   * @returns {Surfer}
   */
  toggleClass: function(str) {
    if (this.hasClass(str)) {
      this.removeClass(str)
    } else {
      this.addClass(str)
    }

    return this
  },
  /** Sets or gets the value of the current item
   * @param {string} value If given, it would be set as the value
   * @return {Surfer}
   */
  value: function(value) {
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
  attr: function(attr, val) {
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
  isOn: function(url) {
    return this.window.document.location.href == url.toLowerCase()
  },
  /** Checks that the text content of the current item is the given text
   * @param {string} text The text to check against
   * @return {boolean}
   */
  textIs: function(text) {
    return this.text() == text
  },
  /** Checks that the text content of the current item contains the given text
   * @param {string} text The text to check against
   * @return {boolean}
   */
  textContains: function(text) {
    return this.text().indexOf(text) !== -1
  },
  /** Checks that the value of the current item is the given value
   * @param {string} value The value to check against
   * @return {boolean}
   */
  valueIs: function(value) {
    return this.value() == value
  },
  /** Checks that the value of the current item contains the given text
   * @param {string} text The text to check against
   * @return {boolean}
   */
  valueContains: function(text) {
    return this.value().indexOf(text) !== -1
  },
  /** Checks that the value of the given attribute current item is the given value
   * @param {string} attr The attribute to check
   * @param {string} val The value to check against
   * @return {boolean}
   */
  attrIs: function(attr, val) {
    return this.attr(attr) == val
  },
  /** Checks that the given attribute of the current item contains the given text
   * @param {string} text The text to check against
   * @return {boolean}
   */
  attrContains: function(attr, text) {
    return this.attr(attr).indexOf(text) !== -1
  },
  /** Checks that the current item exists in the dom
   * @return {boolean}
   */
  exists: function() {
    return this.item !== null && this.item !== undefined
  }
}

Surf.toString = function() {
  return 'Surf(selector [, useThisWindow] [, debug]) { [code] }'
}

export default Surf