import Surfer from './Surfer'

/** Surf Object
 * For navigating and manipulating the DOM
 * @version 1.0
 * @author Ezra Obiwale <contact@ezraobiwale.com>
 * @return {Surf}
 */
const Surf = function(selector) {
  if (selector instanceof Surf) {
    return selector
  } else if (!(this instanceof Surf)) {
    return new Surf(selector)
  }

  this.__elem(selector)
  this.version = '1.0'
}

/** Surf Object
 * For navigating and manipulating the DOM
 * @version 1.0
 * @author Ezra Obiwale <contact@ezraobiwale.com>
 * @return {Surf}
 */
Surf.prototype = {
  __done: function(action, failed) {
    if (this.context) {
      this.context.__done(failed)
    }

    return this
  },
  __elem: function (selector) {
    this.elem = new Surfer(selector)

    if (!this.elem.length) {
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
    return new Surf(selector)
  },
  __setContext: function(context) {
    this.context = context

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
  /**
   * Pauses execution until the page reloads
   * @returns {Surfer}
   */
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

    return this
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
    location.reload()

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
  type: function(str, speed = 5) {
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
            speed * (i + 1)
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
  /** Checks if the page is on the given url
   * @param {string} url The url string to check against
   * @return {boolean}
   */
  isOn: function(url) {
    return document.location.href == url.toLowerCase()
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
  return 'Surf(selector [] [, debug]) { [code] }'
}

export default Surf
