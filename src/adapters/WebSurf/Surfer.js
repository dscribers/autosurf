import { RobulaPlus } from './robula-plus'

const { getElementByXPath } = new RobulaPlus()

export default class Surfer {
  #items = []
  #readyEventHandlersInstalled = false
  #readyFired = false
  #readyList = []


  /**
   * @param {any} selector
   * @param {object} base
   * @returns {Surfer}
   */
  constructor(selector, base) {
    if (base && typeof base !== 'object') {
      throw new Error('Second parameter must be an object')
    }

    try {
      this.#elem(getElementByXPath(selector, base || document))
    } catch (e) {
      this.#elem(selector, base || document)
    }
  }

  /**
   * The first item that matches the given selector
   *
   * @returns {HTMLElement|undefined}
   */
  get item () {
    return this.#items[0]
  }

  /**
   * The number of items that match the given selector
   *
   * @returs {integer}
   */
  get length () {
    return this.#items.length
  }

  /**
   * The first item that matches the selector or an empty object
   */
  get #itemy () {
    return this.item || {}
  }

  /**
   * Selects an element
   * @param {any} selector
   * @param {object} base
   * @returns {Surfer}
   */
  static select (selector, base) {
    return new Surfer(selector, base)
  }

  /** Adds the given string to the class of the current item
   * @param {string} str The class string to add
   * @return {Surfer}
   */
  addClass (str) {
    if (this.#itemy && str) {
      this.each((item) => {
        str.split(' ').forEach((_str) => item.classList.add(str))
      })
    }

    return this
  }

  /**
   * Appends the given content to the html content of the current element
   * @param {string} content The content to append
   * @return {Surfer}
   */
  append (content) {
    return this.each((item) => (item.innerHTML += content))
  }

  /**
   * Sets or gets the given attribute of the current item
   *
   * @param {string} attr The attribute to set or get
   * @param {mixed} val If given, it would be set as the value of the attribute
   * @return {string|Surfer}
   */
  attr (attr, val) {
    if (val === undefined) {
      return this.#itemy[attr]
    }

    return this.each((item) => (item[attr] = val))
  }

  /**
   * Calls click on the item
   *
   * @returns {Surfer}
   */
  click () {
    return this.each((item) =>
      item.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        })
      )
    )
  }

  /**
   * Gets the nearest parent of the current item with the given selector
   * @param {type} selector
   * @returns {HTMLElement|undefined}
   */
  closest (selector) {
    if (this.item) {
      return this.item.closest(selector)
    }
  }

  /** Loops through the current items and passes each value and its index into the given function.
   * The function would parameters value first, and then the index
   * @param {function} func The function
   *
   * @return {Surfer}
   */
  each (func) {
    this.#items.forEach(func)

    return this
  }

  /** Finds the given selector in the current item
   * @param {string} selector The element to find
   * @return {Surfer} object of the item found
   */
  find (selector) {
    if (this.#items.length) {
      let items = []

      this.#items.forEach(item => (items = [...items, item.querySelectorAll(selector)]))

      return Surfer.select(items)
    }

    return Surfer.select(selector)
  }

  /**
   * Calls focus on the item
   *
   * @returns {Surfer}
   */
  focus () {
    return this.each((item) => item.focus())
  }

  /**
   * Checks if the current item has the given class
   * @param {string} str
   * @returns {boolean}
   */
  hasClass (str) {
    if (!this.item) {
      return false
    }

    let has = true

    str.split(' ').forEach((_str) => {
      if (has) {
        has = this.item.classList.contains(_str)
      }
    })

    return has
  }

  /** Sets or gets the html content of the current element
   * @param {string} str If given, it would be set as the element's html content
   * @return {string|Surfer}
   */
  html (content) {
    if (content === undefined) {
      return this.#itemy.innerHTML || ''
    }

    return this.each((item) => (item.innerHTML = content))
  }

  /**
   * Adds an event listener to the current item
   * @param {string} event The event to listen to e.g. click
   * @param {function} func The callback to execute when the event is executed
   * @param {scope} string The element to scope event to
   * @returns {Surfer}
   */
  on (event, func, scope) {
    let scopes = []

    if (!scope || !document.querySelector(scope)) {
      scopes = [document]
    } else {
      scopes = document.querySelectorAll(scope)
    }

    scopes.forEach(scope => {
      scope.addEventListener(
        event,
        (e) => {
          const listeningTarget = e.target.closest(this.selector)

          if (listeningTarget) {
            func.call(listeningTarget, e)
          }
        }
      )
    })

    return this
  }

  /** Executes the given function when the document and the page assets are loaded
   * @param {function} func The function to call
   * @return {Surfer}
   */
  onload (func) {
    return this.each((item) => {
      const onload = item.onload || (() => { })

      item.onload = () => {
        onload.call(item)
        func.call(item)
      }
    })
  }

  /** Prepends the given content to the html content of the current element
   * @param {string} content The content to prepend
   * @return {Surfer}
   */
  prepend (content) {
    return this.each((item) => (item.innerHTML = content + item.innerHTML))
  }

  /** Executes the given function when the document is loaded without waiting for page assets to load
   * @param {function} func The function to call
   * @return {Surfer}
   */
  ready (func) {
    if (this.#readyFired) {
      setTimeout(() => func.call(this), 1)

      return this
    } else {
      this.#readyList.push(func)
    }

    if (document.readyState === 'complete') {
      setTimeout(() => this.#fireReady(), 1)
    } else if (!this.#readyEventHandlersInstalled) {
      if (document.addEventListener) {
        document.addEventListener(
          'DOMContentLoaded',
          () => this.#fireReady(),
          false
        )
        window.addEventListener('load', () => this.#fireReady(), false)
      } else {
        document.attachEvent('onreadystatechange', () => {
          if (document.readyState === 'complete') {
            this.#fireReady()
          }
        })

        window.attachEvent('onload', () => this.#fireReady())
      }

      this.#readyEventHandlersInstalled = true
    }

    return this
  }

  /**
   * Removes the current item from the DOM
   * @returns {Surfer}
   */
  remove () {
    return this.each((item) => item.remove())
  }

  /** Removes the given string from the class of the current item
   * @param {string} str The class string to remove
   * @return {Surfer}
   */
  removeClass (str) {
    if (str && this.#itemy.className) {
      this.each((item) => {
        str.split(' ').forEach((_str) => item.classList.remove(_str))
      })
    }

    return this
  }

  /** Sets or gets the text conent of the current element
   * @param {string} str If given, it would be set as the element's text content
   * @return {string|Surfer}
   */
  text (str) {
    if (str === undefined) {
      return this.#itemy.innerText || ''
    }

    return this.each((item) => (item.innerText = str))
  }

  /**
   * Toggles the given class on the current item
   * @param {string} str
   * @returns {Surfer}
   */
  toggleClass (str) {
    this.each((item) => {
      const $item = new Surfer(item)

      if ($item.hasClass(str)) {
        $item.removeClass(str)
      } else {
        $item.addClass(str)
      }
    })

    return this
  }

  /** Sets or gets the value of the current item
   * @param {string} value If given, it would be set as the value
   * @return {Surfer}
   */
  value (value) {
    if (value === undefined) {
      return this.#itemy.value
    }

    return this.each((item) => (item.value = value))
  }

  #createSelector (item) {
    let selector = ''

    if (item.nodeName) {
      if (item.localName) {
        selector = item.localName
      }

      if (item.id) {
        selector += '#' + item.id
      } else if (item.name) {
        selector += `[name="${item.name}"]`
      } else {
        Array.from(item.attributes)
          .forEach(attr => {
            if (attr.localName === 'class') {
              return
            }

            selector += `[${attr.localName}="${attr.value}"]`
          })
        if (item.className) {
          selector += '.' + item.className.split(' ').filter(cls => !!cls).join('.')
        }
      }
    }

    return selector
  }

  #elem (selector, base) {
    if (typeof selector === 'object' && !Array.isArray(selector)) {
      if (selector instanceof Surfer) {
        return Surfer
      }

      this.selector = this.#createSelector(selector)
      this.#items = [selector]
    } else if (typeof selector === 'string') {
      this.selector = selector
      this.#items = base.querySelectorAll(selector)
    }

    return this
  }

  #fireReady () {
    if (!this.#readyFired) {
      this.#readyFired = true

      this.#readyList.forEach((func) => func.call(this))

      this.#readyList = []
    }
  }
}
