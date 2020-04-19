export default class BaseAdapter {
  /**
   * Backs up the application data. Should be called before the page reloads
   */
  static backup() {}

  /**
   * Checks that the given attribute of the current item contains the given text
   *
   *  @param {*} selector The selector of the target html element
   * @param {string} attri The attribute to check
   * @param {string} text The text to check against
   */
  static checkAttrContains(selector, attr, text) {
    this.#defaultResponse()
  }

  /**
   * Checks that the value of the given attribute current item is the given value
   *
   * @param {*} selector The selector of the target html element
   * @param {string} attr The attribute to check
   * @param {string} val The value to check against
   */
  static checkAttrIs(selector, attr, val) {
    this.#defaultResponse()
  }

  /**
   * Checks that the current item exists in the dom
   *
   * @param {*} selector The selector of the target html element
   */
  static checkExists(selector) {
    this.#defaultResponse()
  }

  /**
   * Checks if the page is on the given url
   *
   * @param {*} selector The selector of the target html element
   * @param {string} url The url string to check against
   */
  static checkIsOn(selector, url) {
    this.#defaultResponse()
  }

  /**
   * Checks that the text content of the current item contains the given text
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check against
   */
  static checkTextContains(selector, text) {
    this.#defaultResponse()
  }

  /**
   * Checks that the text content of the current item is the given text
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check against
   */
  static checkTextIs(selector, text) {
    this.#defaultResponse()
  }

  /**
   * Checks that the value of the current item contains the given text
   *
   * @param {*} selector The selector of the target html element
   * @param {string} text The text to check against
   */
  static checkValueContains(selector, text) {
    this.#defaultResponse()
  }

  /**
   * Checks that the value of the current item is the given value
   *
   * @param {*} selector The selector of the target html element
   * @param {string} value The value to check against
   */
  static checkValueIs(selector, value) {
    this.#defaultResponse()
  }

  /**
   * Clears any backed up application data
   *
   * @param {object} $autosurf An instance of AutoSurf
   */
  static clearBackup($autosurf) {}

  /**
   * Clicks on the current item
   *
   * @param {*} selector The selector of the target html element
   */
  static doClick(selector) {
    this.#defaultResponse()
  }

  /**
   * Navigates the browser back to the previous page
   */
  static doGoBack() {
    this.#defaultResponse()
  }

  /**
   * Pauses execution for the given miliseconds
   *
   * @param {int} milliseconds
   */
  static doWait(milliseconds) {
    this.#defaultResponse()
  }

  /**
   * Pauses execution until the page reloads
   */
  static doWaitTillPageLoads() {
    this.#defaultResponse()
  }

  /**
   * Focuses on the current item
   *
   * @param {*} selector The selector of the target html element
   */
  static doFocus(selector) {
    this.#defaultResponse()
  }

  /**
   * Navigate to the given url
   *
   * @param {string} url
   */
  static doGoto(url) {
    this.#defaultResponse()
  }

  /**
   * Refreshes the current page
   */
  static doRefresh() {
    this.#defaultResponse()
  }

  /**
   * Submits the form (self or closest parent) without clicking on the submit button
   *
   * @param {*} selector The selector of the target html element
   */
  static doSubmitForm(selector) {
    this.#defaultResponse()
  }

  /**
   * Types the given string into the current item
   *
   * @param {*} selector The selector of the target html element
   * @param {string} str The string to type
   * @param {integer} speed The speed at which to type
   */
  static doType(selector, str, speed = 500) {
    this.#defaultResponse()
  }

  /**
   * Indicates whether the framework requires backing up
   *
   * @param {object} $autosurf An instance of AutoSurf
   * @param {bool} status
   */
  static needsBackup($autosurf, status) {}

  /**
   * Called to inform AutoSurf that parent code is ready
   *
   * @param {object} $autosurf An instance of AutoSurf
   * @param {function} callback The function to call. Receives boolean param which indicates whether the page was reloaded or not.
   */
  static ready($autosurf, callback = () => {}) {}

  static #defaultResponse() {
    throw new Error()
  }
}
