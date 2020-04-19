import BaseAdapter from '../BaseAdapter'
import Surfer from './Surfer'

class WebSurf extends BaseAdapter {
  #storeName = location.origin + '_atsrf'
  #needsBackup = false
  #reloaded = false

  #maxLoadWaitTime = 30000 // 30 seconds
  #waitPollTime = 500
  #waited = 0

  /**
   * @inheritdoc
   */
  static backup($autosurf) {
    if (this.#needsBackup) {
      localStorage.setItem(this.#storeName, JSON.stringify($autosurf))
    }
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
  static clearBackup($autosurf) {
    localStorage.removeItem(this.#storeName)
  }

  /**
   * @inheritdoc
   */
  static doClick(selector) {
    if (selector) {
      new Surfer(select).click()
    } else {
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doGoBack() {
    if (window.history) {
      window.history.back()
    } else {
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doWait(milliseconds) {
    if (milliseconds) {
      setTimeout(() => {}, milliseconds)
    } else {
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doWaitTillPageLoads() {
    if (this.#reloaded) {
      this.#reloaded = false
    } else {
      if (this.#waited >= this.#maxLoadWaitTime) {
        throw new Error()
      }

      setTimeout(() => this.#doWaitTillPageLoads(), this.#waitPollTime)
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
    } else {
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doGoto(url) {
    location.href = url
  }

  /**
   * @inheritdoc
   */
  static doRefresh() {
    location.reload()
  }

  /**
   * @inheritdoc
   */
  static doSubmitForm(selector) {
    if (selector) {
      new Surfer(selector).item.submit()
    } else {
      throw new Error()
    }
  }

  /**
   * @inheritdoc
   */
  static doType(selector, str, speed = 500) {
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

  /**
   * @inheritdoc
   */
  static needsBackup($autosurf, status) {
    this.#needsBackup = status
  }

  /**
   * @inheritdoc
   */
  static ready($autosurf, beforeCallback, afterCallback) {
    let stored = localStorage.getItem(this.#storeName)

    if (stored) {
      stored = JSON.parse(stored)

      for (let key in stored) {
        this[key] = stored[key]
      }

      localStorage.removeItem(this.#storeName)

      if (typeof beforeCallback === 'function') {
        beforeCallback(true)
      }

      this.#reloaded = true
      $autosurf.#waiting(false)
      $autosurf.#done()
    } else if (typeof beforeCallback === 'function') {
      beforeCallback(false)
    }

    if (typeof afterCallback === 'function') {
      afterCallback(stored !== null)
    }

    return this
  }

  static #checked(status) {
    if (!status) {
      throw new Error()
    }
  }
}
