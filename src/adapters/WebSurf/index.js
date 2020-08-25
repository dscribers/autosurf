import BaseAdapter from '../BaseAdapter'
import Surfer from './Surfer'

export default class WebSurf extends BaseAdapter {
  static #storeName = location.origin + '_atsrf'
  static #shouldBackup = false
  static #isReloaded = false

  static #maxLoadWaitTime = 30000 // 30 seconds
  static #waitPollTime = 500
  static #waited = 0

  static #blur = () => {}

  static #errorCallback = () => {}
  static #successCallback = () => {}

  /**
   * @inheritdoc
   */
  static checkAttrContains(selector, attr, text) {
    this.#focus(selector)
    this.#checked(new Surfer(selector).attr(attr).indexOf(text) !== -1)
  }

  /**
   * @inheritdoc
   */
  static checkAttrIs(selector, attr, val) {
    this.#focus(selector)
    this.#checked(new Surfer(selector).attr(attr) == val)
  }

  /**
   * @inheritdoc
   */
  static checkExists(selector) {
    this.#focus(selector)
    this.#checked(new Surfer(selector).length > 0)
  }

  /**
   * @inheritdoc
   */
  static checkIsOn(url) {
    this.#checked(document.location.href === url.toLowerCase())
  }

  /**
   * @inheritdoc
   */
  static checkTextContains(selector, text) {
    this.#focus(selector)
    this.#checked(new Surfer(selector).text().indexOf(text) !== -1)
  }

  /**
   * @inheritdoc
   */
  static checkTextIs(selector, text) {
    this.#focus(selector)
    this.#checked(new Surfer(selector).text() === text)
  }

  /**
   * @inheritdoc
   */
  static checkValueContains(selector, text) {
    this.#focus(selector)
    this.#checked(new Surfer(selector).value().indexOf(text) !== -1)
  }

  /**
   * @inheritdoc
   */
  static checkValueIs(selector, value) {
    this.#focus(selector)
    this.#checked(new Surfer(selector).value() === value)
  }

  /**
   * @inheritdoc
   */
  static doClick(selector) {
    if (selector) {
      this.#focus(selector)

      new Surfer(selector).click()
      this.#done(true)
    } else {
      this.#done(false, 'Selector not provided')
    }
  }

  /**
   * @inheritdoc
   */
  static doGoBack() {
    if (window.history) {
      this.#done()
      window.history.back()
    } else {
      this.#done(false, 'Cannot go back. History not supported.')
    }
  }

  /**
   * @inheritdoc
   */
  static doGoto(url) {
    this.#done()
    setTimeout(() => (location.href = url))
  }

  /**
   * @inheritdoc
   */
  static doRefresh() {
    this.#done()
    location.reload()
  }

  /**
   * @inheritdoc
   */
  static doSubmitForm(selector) {
    if (selector) {
      this.#focus(selector)

      new Surfer(selector).item.submit()
      this.#done(true)
    } else {
      this.#done(false, 'Selector not provided')
    }
  }

  /**
   * @inheritdoc
   */
  static doType(selector, str, speed = 100) {
    if (selector) {
      this.#focus(selector)

      const item = new Surfer(selector)

      item.value('')

      let index = 0

      const type = () => {
        item.value(item.value() + str[index])

        if (++index < str.length) {
          setTimeout(type, speed)
        } else {
          this.#done(true)
        }
      }

      type()
    } else {
      this.#done(false, 'Selector not provided')
    }
  }

  /**
   * @inheritdoc
   */
  static doWait(milliseconds) {
    if (milliseconds) {
      setTimeout(() => this.#done(true), milliseconds)
    } else {
      this.#done(false, 'Wait period not provided')
    }
  }

  /**
   * @inheritdoc
   */
  static doWaitTillPageLoads() {
    if (this.#isReloaded) {
      this.#isReloaded = false
      this.#done(true)
    } else {
      if (this.#waited >= this.#maxLoadWaitTime) {
        this.#done(
          false,
          `No response after ${this.#maxLoadWaitTime / 1000} seconds`
        )
      }

      setTimeout(() => this.doWaitTillPageLoads(), this.#waitPollTime)
      this.#waited += this.#waitPollTime
    }
  }

  /**
   * @inheritdoc
   */
  static init($autosurf, callback) {
    const oldLoadFunc = window.onload

    window.onload = () => {
      if (typeof oldLoadFunc === 'function') {
        oldLoadFunc()
      }

      let stored = localStorage.getItem(this.#storeName)

      if (stored) {
        try {
          stored = JSON.parse(stored)

          localStorage.removeItem(this.#storeName)

          this.#isReloaded = true
        } catch (e) {
          stored = undefined
        }
      }

      if (typeof callback === 'function') {
        callback(stored)
      }
    }

    const oldBeforeUnloadFunc = window.onbeforeunload

    window.onbeforeunload = () => {
      if (typeof oldBeforeUnloadFunc === 'function') {
        oldBeforeUnloadFunc()
      }

      this.#backup($autosurf)
    }
  }

  /**
   * @inheritdoc
   */
  static quit($autosurf) {
    this.#needsBackup(false)
    this.#clearBackup()
  }

  /**
   * Sets the function to call when an action fails
   * @param {Function} callback
   */
  static setErrorCallback(callback) {
    this.#errorCallback = callback
  }

  /**
   * Sets the function to call when an action was performed successfully
   * @param {Function} callback
   */
  static setSuccessCallback(callback) {
    this.#successCallback = callback
  }

  static #backup($autosurf) {
    if (this.#shouldBackup) {
      localStorage.setItem(
        this.#storeName,
        JSON.stringify($autosurf.getBackupData())
      )
    }
  }

  static #checked(status) {
    this.#blur()

    if (!status) {
      return this.#done(false)
    }

    this.#done(true)
  }

  static #clearBackup() {
    localStorage.removeItem(this.#storeName)
  }

  static #done(status, errorMessage) {
    this.#needsBackup(true)

    this.#blur()

    if (typeof status === 'boolean') {
      setTimeout(
        status ? this.#successCallback : this.#errorCallback,
        0,
        errorMessage
      )
    }
  }

  /**
   * Focuses on the current item
   *
   * @param {*} selector The selector of the target html element
   */
  static #focus(selector) {
    if (selector) {
      const item = new Surfer(selector).item

      const focusData = {
        backgroundColor: item.style.backgroundColor,
        border: item.style.border,
        color: item.style.color,
      }

      this.#blur = () => {
        for (let key in focusData) {
          item.style[key] = focusData[key]
        }
      }

      item.style.border = '2px solid magenta'
      item.style.color = '#0e90d2'
      item.style.backgroundColor = '#ffffff'
      item.focus()
    } else {
      throw new Error('Selector not provided')
    }
  }

  static #needsBackup(status) {
    this.#shouldBackup = status
  }
}
