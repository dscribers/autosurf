import AdapterBase from '../AdapterBase'
import Surfer from './Surfer'

class Surf extends AdapterBase {
  /**
   * Checks that the given attribute of the current item contains the given text
   *
   *  @param {*} selector The selector of the target html element
   * @param {string} attri The attribute to check
   * @param {string} text The text to check against
   */
  static checkAttrContains(selector, attr, text) {
    this.#checked(new Surfer(selector).attr(attr).indexOf(text) !== -1)
  }

  /**
   * Checks that the value of the given attribute current item is the given value
   *
   * @param {*} selector The selector of the target html element
   * @param {string} attr The attribute to check
   * @param {string} val The value to check against
   */
  static checkAttrIs(selector, attr, val) {
    this.#checked(new Surfer(selector).attr(attr) == val)
  }

  /**
   * Checks that the current item exists in the dom
   *
   * @param {*} selector The selector of the target html element
   */
  static checkExists(selector) {
    this.#checked(new Surfer(selector).length > 0)
  }

  /**
   * Checks if the page is on the given url
   *
   * @param {*} selector The selector of the target html element
   * @param {string} url The url string to check against
   */
  static checkIsOn(selector, url) {
    this.#checked(document.location.href === url.toLowerCase())
  }

  /**
   * Checks that the text content of the current item contains the given text
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check against
   */
  static checkTextContains(selector, text) {
    this.#checked(new Surfer(selector).text().indexOf(text) !== -1)
  }

  /**
   * Checks that the text content of the current item is the given text
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check against
   */
  static checkTextIs(selector, text) {
    this.#checked(new Surfer(selector).text() === text)
  }

  /**
   * Checks that the value of the current item contains the given text
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check against
   */
  static checkValueContains(selector, text) {
    this.#checked(new Surfer(selector).value().indexOf(text) !== -1)
  }

  /**
   * Checks that the value of the current item is the given value
   *
   * @param {*} selector The selector of the target html element
   * @param {string} value The value to check against
   */
  static checkValueIs(selector, value) {
    this.#checked(new Surfer(selector).value() === value)
  }

  /**
   * Clicks on the current item
   * @param {*} selector The selector of the target html element
   */
  static doClick(selector) {
    if (selector) {
      new Surfer(select).click()
    } else {
      throw new Error()
    }
  }

  /**
   * Navigates the browser back to the previous page
   */
  static doGoBack() {
    if (window.history) {
      window.history.back()
    } else {
      throw new Error()
    }
  }

  /**
   * Pauses execution for the given miliseconds
   * @param {*} selector Not required
   * @param {int} milliseconds
   */
  static doWait(selector, milliseconds) {
    if (milliseconds) {
      setTimeout(() => {}, milliseconds)
    } else {
      throw new Error()
    }
  }

  /**
   * Pauses execution until the page reloads
   */
  static doWaitTillPageLoads() {
    // requires no code
    setTimeout(() => {}, 1000)
  }

  /**
   * Focuses on the current item
   * @param {*} selector The selector of the target html element
   */
  static doFocus(selector) {
    if (selector) {
      const item = new Surfer(selector).item

      item.style.border = '2px solid magenta'
      item.style.color = '#0e90d2'
      item.style.backgroundColor = '#ffffff'
      item.focus()
    } else {
      throw new Error()
    }
  }

  /**
   * Navigate to the given url
   * @param {*} selector Not required
   * @param {string} url
   */
  static doGoto(selector, url) {
    location.href = url
  }

  /**
   * Refreshes the current page
   */
  static doRefresh() {
    location.reload()
  }

  /**
   * Submits the form (self or closest parent) without clicking on the submit button
   * @param {*} selector The selector of the target html element
   */
  static doSubmitForm(selector) {
    if (selector) {
      new Surfer(selector).item.submit()
    } else {
      throw new Error()
    }
  }

  /**
   * Types the given string into the current item
   * @param {*} selector The selector of the target html element
   * @param {string} str The string to type
   */
  static doType(selector, str, speed = 100) {
    if (selector) {
      const item = new Surfer(selector)

      let index = 0

      const type = () => {
        item.value(item.value() + str[index])

        if (++index < str.length) {
          setTimeout(() => type(), speed)
        }
      }

      type()
    } else {
      throw new Error()
    }
  }

  static #checked(status) {
    if (!status) {
      throw new Error()
    }
  }
}
