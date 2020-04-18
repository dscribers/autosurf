import SurfBase from './SurfBase'
import Surfer from './Surfer'

class Surf extends SurfBase {
  /** Checks that the given attribute of the current item contains the given text
   * @param {string} text The text to check against
   * @return {boolean}
   */
  static checkAttrContains(callback = () => {}, selector, attr, text) {
    this.#checked(
      new Surfer(selector).attr(attr).indexOf(text) !== -1,
      callback
    )
  }

  /** Checks that the value of the given attribute current item is the given value
   * @param {string} attr The attribute to check
   * @param {string} val The value to check against
   * @return {boolean}
   */
  static checkAttrIs(callback = () => {}, selector, attr, val) {
    this.#checked(new Surfer(selector).attr(attr) == val, callback)
  }

  /** Checks that the current item exists in the dom
   * @return {boolean}
   */
  static checkExists(callback = () => {}, selector) {
    this.#checked(new Surfer(selector).length > 0, callback)
  }

  /** Checks if the page is on the given url
   * @param {string} url The url string to check against
   * @return {boolean}
   */
  static checkIsOn(callback = () => {}, selector, url) {
    this.#checked(document.location.href === url.toLowerCase(), callback)
  }

  /** Checks that the text content of the current item contains the given text
   * @param {string} text The text to check against
   * @return {boolean}
   */
  static checkTextContains(callback = () => {}, selector, text) {
    this.#checked(new Surfer(selector).text().indexOf(text) !== -1, callback)
  }

  /** Checks that the text content of the current item is the given text
   * @param {string} text The text to check against
   * @return {boolean}
   */
  static checkTextIs(callback = () => {}, selector, text) {
    this.#checked(new Surfer(selector).text() === text, callback)
  }

  /** Checks that the value of the current item contains the given text
   * @param {string} text The text to check against
   * @return {boolean}
   */
  static checkValueContains(callback = () => {}, selector, text) {
    this.#checked(new Surfer(selector).value().indexOf(text) !== -1, callback)
  }

  /** Checks that the value of the current item is the given value
   * @param {string} value The value to check against
   * @return {boolean}
   */
  static checkValueIs(callback = () => {}, selector, value) {
    this.#checked(new Surfer(selector).value() === value, callback)
  }

  /**
   * Clicks on the current item
   */
  static doClick(callback = () => {}, selector) {
    if (selector) {
      new Surfer(select).click()

      callback(this.STATUS_SUCCESS)
    } else {
      callback(this.STATUS_ERROR)
    }
  }

  /**
   * Navigates the browser back to the previous page
   * @param {function} callback Param is either SurfBase.STATUS_SUCCESS or SurfBase.STATUS_ERROR
   */
  static doGoBack(callback = () => {}) {
    if (window.history) {
      window.history.back()

      callback(this.STATUS_SUCCESS)
    } else {
      callback(this.STATUS_ERROR)
    }
  }

  /**
   * Pauses execution for the given miliseconds
   * @param {function} callback Param is either SurfBase.STATUS_SUCCESS or SurfBase.STATUS_ERROR
   * @param {*} selector
   * @param {int} milliseconds
   */
  static doWait(callback = () => {}, selector, milliseconds) {
    if (milliseconds) {
      setTimeout(() => callback(this.STATUS_SUCCESS), milliseconds)
    } else {
      callback(this.STATUS_ERROR)
    }
  }

  /**
   * Pauses execution until the page reloads
   * @param {function} callback Param is either SurfBase.STATUS_SUCCESS or SurfBase.STATUS_ERROR
   */
  static doWaitTillPageLoads(callback = () => {}) {
    // requires no code
    setTimeout(() => callback(this.STATUS_SUCCESS), 1000)
  }

  /**
   * Focuses on the current item
   * @param {*} selector
   */
  static doFocus(callback = () => {}, selector) {
    if (selector) {
      const item = new Surfer(selector).item

      item.style.border = '2px solid magenta'
      item.style.color = '#0e90d2'
      item.style.backgroundColor = '#ffffff'
      item.focus()

      callback(this.STATUS_SUCCESS)
    } else {
      callback(this.STATUS_ERROR)
    }
  }

  /**
   * Navigate to the given url
   * @param {function} callback Param is either SurfBase.STATUS_SUCCESS or SurfBase.STATUS_ERROR
   * @param {*} selector
   * @param {string} url
   */
  static doGoto(callback = () => {}, selector, url) {
    location.href = url

    callback(this.STATUS_SUCCESS)
  }

  /**
   * Refreshes the current page
   */
  static doRefresh(callback = () => {}) {
    location.reload()

    callback(this.STATUS_SUCCESS)
  }

  /** Submits the form (self or closest parent) without clicking on the submit button
   * @return self
   */
  static doSubmitForm(callback = () => {}, selector) {
    if (selector) {
      new Surfer(selector).item.submit()

      callback(this.STATUS_SUCCESS)
    } else {
      callback(this.STATUS_ERROR)
    }
  }

  /** Types the given string into the current item
   * @param {string} str The string to type
   * @return {Surfer}
   */
  static doType(callback = () => {}, selector, str, speed = 100) {
    if (selector) {
      const item = new Surfer(selector)

      let index = 0

      const type = () => {
        item.value(item.value() + str[index])

        if (++index < str.length) {
          setTimeout(() => type(), speed)
        } else {
          callback(this.STATUS_SUCCESS)
        }
      }

      type()
    } else {
      callback(this.STATUS_ERROR)
    }
  }

  static #checked(status, callback = () => {}) {
    callback(status ? this.STATUS_SUCCESS : this.STATUS_ERROR)
  }
}
