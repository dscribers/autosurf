export default class BaseAdapter {
  /**
   * Called to initialize the adapter
   *
   * @param {object} $autosurf An instance of AutoSurf
   * @param {function} callback The function to call. Receives boolean param which indicates whether the page was reloaded or not.
   */
  init($autosurf, callback = () => {}) {}

  /**
   * Called when AutoSurf finishes all executions
   *
   * @param {object} $autosurf An instance of AutoSurf
   */
  quit($autosurf) {}

  /**
   * Checks that the given attribute of the current item contains the given text
   *
   *  @param {*} selector The selector of the target html element
   * @param {string} attri The attribute to check
   * @param {string} text The text to check against
   */
  checkAttrContains(selector, attr, text) {
    this.#defaultResponse()
  }

  /**
   * Checks that the value of the given attribute current item is the given value
   *
   * @param {*} selector The selector of the target html element
   * @param {string} attr The attribute to check
   * @param {string} val The value to check against
   */
  checkAttrIs(selector, attr, val) {
    this.#defaultResponse()
  }

  /**
   * Checks that the current item exists in the dom
   *
   * @param {*} selector The selector of the target html element
   */
  checkExists(selector) {
    this.#defaultResponse()
  }

  /**
   * Checks if an element is visible or hidden
   *
   * @param {string} selector The selector of the target html element
   * @param {string} display visible | hidden
   */
  checkElementIs (selector, display) {
    this.#defaultResponse()
  }

  /**
   * Checks if the page is on the given url
   *
   * @param {*} selector The selector of the target html element
   * @param {string} url The url string to check against
   */
  checkIsOn(selector, url) {
    this.#defaultResponse()
  }

  /**
   * Checks if the page contains the given text anywhere
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check
   */
  checkPageContains (selector, text) {
    return this.#defaultResponse()
  }

  /**
   * Checks that the text content of the current item contains the given text
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check against
   */
  checkTextContains(selector, text) {
    this.#defaultResponse()
  }

  /**
   * Checks that the text content of the current item is the given text
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check against
   */
  checkTextIs(selector, text) {
    this.#defaultResponse()
  }

  /**
   * Checks that the value of the current item contains the given text
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check against
   */
  checkValueContains(selector, text) {
    this.#defaultResponse()
  }

  /**
   * Checks that the value of the current item is the given value
   *
   * @param {*} selector The selector of the target html element
   * @param {string} value The value to check against
   */
  checkValueIs(selector, value) {
    this.#defaultResponse()
  }

  /**
   * Clicks on the current item
   *
   * @param {*} selector The selector of the target html element
   */
  doClick(selector) {
    this.#defaultResponse()
  }

  /**
   * Navigates the browser back to the previous page
   */
  doGoBack() {
    this.#defaultResponse()
  }

  /**
   * Pauses execution for the given miliseconds
   *
   * @param {int} milliseconds
   */
  doWait(milliseconds) {
    this.#defaultResponse()
  }

  /**
   * Pauses execution until the page reloads
   */
  doWaitTillPageLoads() {
    this.#defaultResponse()
  }

  /**
   * Navigate to the given url
   *
   * @param {string} url
   */
  doGoto(url) {
    this.#defaultResponse()
  }

  /**
   * Refreshes the current page
   */
  doRefresh() {
    this.#defaultResponse()
  }

  /**
   * Sets the value of the dropdown select
   * @param {string} selector The select of the target html element
   * @param {any} value The value of the select field
   */
  doSelect (selector, value) {
    this.#defaultResponse()
  }

  /**
   * Submits the form (self or closest parent) without clicking on the submit button
   *
   * @param {*} selector The selector of the target html element
   */
  doSubmitForm(selector) {
    this.#defaultResponse()
  }

  /**
   * Types the given string into the current item
   *
   * @param {*} selector The selector of the target html element
   * @param {string} str The string to type
   * @param {integer} speed The speed at which to type
   */
  doType(selector, str, speed = 500) {
    this.#defaultResponse()
  }

  #defaultResponse() {
    throw new Error('Not implemented')
  }
}
