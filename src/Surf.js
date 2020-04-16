import Surfer from './Surfer'

class Surf {
  #item = null

  constructor(selector) {
    this.#item = new Surfer(selector)
  }

  /**
   * Act on elements that match the given selector
   * @param {any} selector
   * @returns {Surf}
   */
  static with(selector) {
    return new Surf(selector)
  }

  /**
   * Navigates the browser back to the previous page
   * @param {function} callback Params are statusText (string), isError (bool)
   * @returns {Surfer}
   */
  goBack(callback = () => {}) {
    if (window.history) {
      window.history.back()

      callback('Went back to previous page')
    } else {
      callback('Go back failed', true)
    }

    return this
  }
}
