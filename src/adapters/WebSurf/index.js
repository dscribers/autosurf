import BaseAdapter from '../BaseAdapter'
import Surfer from './Surfer'

export default class WebSurf extends BaseAdapter {
  static #storeName = location.origin + '_atsrf'
  static #shouldBackup = false
  static #isReloaded = false

  static #maxLoadWaitTime = 30000 // 30 seconds
  static #waitPollTime = 500
  static #waited = 0

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
        stored = JSON.parse(stored)

        localStorage.removeItem(this.#storeName)

        this.#isReloaded = true
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
   * @inheritdoc
   */
  static checkAttrContains(selector, attr, text) {
    this.#checked(new Surfer(selector).attr(attr).indexOf(text) !== -1)
  }

  /**
   * @inheritdoc
   */
  static checkAttrIs(selector, attr, val) {
    this.#checked(new Surfer(selector).attr(attr) == val)
  }

  /**
   * @inheritdoc
   */
  static checkExists(selector) {
    this.#checked(new Surfer(selector).length > 0)
  }

  /**
   * @inheritdoc
   */
  static checkIsOn(selector, url) {
    this.#checked(document.location.href === url.toLowerCase())
  }

  /**
   * @inheritdoc
   */
  static checkTextContains(selector, text) {
    this.#checked(new Surfer(selector).text().indexOf(text) !== -1)
  }

  /**
   * @inheritdoc
   */
  static checkTextIs(selector, text) {
    this.#checked(new Surfer(selector).text() === text)
  }

  /**
   * @inheritdoc
   */
  static checkValueContains(selector, text) {
    this.#checked(new Surfer(selector).value().indexOf(text) !== -1)
  }

  /**
   * @inheritdoc
   */
  static checkValueIs(selector, value) {
    this.#checked(new Surfer(selector).value() === value)
  }

  /**
   * @inheritdoc
   */
  static doClick(selector) {
    if (selector) {
      new Surfer(select).click()
      this.acted()
    } else {
      this.acted()
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doGoBack() {
    if (window.history) {
      window.history.back()
      this.acted()
    } else {
      this.acted()
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doWait(milliseconds) {
    if (milliseconds) {
      setTimeout(() => {}, milliseconds)
      this.acted()
    } else {
      this.acted()
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doWaitTillPageLoads() {
    if (this.#isReloaded) {
      this.#isReloaded = false
      this.acted()
    } else {
      if (this.#waited >= this.#maxLoadWaitTime) {
        this.acted()
        throw new Error()
      }

      setTimeout(() => this.doWaitTillPageLoads(), this.#waitPollTime)
      this.#waited += this.#waitPollTime
    }
  }

  /**
   * @inheritdoc
   */
  static doFocus(selector) {
    if (selector) {
      const item = new Surfer(selector).item

      item.style.border = '2px solid magenta'
      item.style.color = '#0e90d2'
      item.style.backgroundColor = '#ffffff'
      item.focus()

      this.acted()
    } else {
      this.acted()
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doGoto(url) {
    this.acted()
    location.href = url
  }

  /**
   * @inheritdoc
   */
  static doRefresh() {
    this.acted()
    location.reload()
  }

  /**
   * @inheritdoc
   */
  static doSubmitForm(selector) {
    if (selector) {
      new Surfer(selector).item.submit()
      this.acted()
    } else {
      this.acted()
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doType(selector, str, speed = 500) {
    if (selector) {
      const item = new Surfer(selector)

      item.value('')

      let index = 0

      const type = () => {
        item.value(item.value() + str[index])

        if (++index < str.length) {
          setTimeout(() => type(), speed)
        } else {
          this.acted()
        }
      }

      type()
    } else {
      this.acted()
      throw new Error()
    }
  }

  static #acted() {
    this.#needsBackup(true)
  }

  static #backup($autosurf) {
    if (this.#shouldBackup) {
      localStorage.setItem(this.#storeName, JSON.stringify($autosurf))
    }
  }

  static #checked(status) {
    this.#acted()

    if (!status) {
      throw new Error()
    }
  }

  static #clearBackup() {
    localStorage.removeItem(this.#storeName)
  }

  static #needsBackup(status) {
    this.#shouldBackup = status
  }
}
