'use strict'

/**
 * Main class, containing the Algorithm.
 *
 * @remarks For more information on how the algorithm works, please refer to:
 * Maurizio Leotta, Andrea Stocco, Filippo Ricca, Paolo Tonella. ROBULA+:
 * An Algorithm for Generating Robust XPath Locators for Web Testing. Journal
 * of Software: Evolution and Process (JSEP), Volume 28, Issue 3, pp.177–204.
 * John Wiley & Sons, 2016.
 * https://doi.org/10.1002/smr.1771
 *
 * @param options - (optional) algorithm options.
 */
export class RobulaPlus {
  constructor (options) {
    this.attributePriorizationList = ['name', 'class', 'title', 'alt', 'value']
    this.attributeBlackList = [
      'href',
      'src',
      'onclick',
      'onload',
      'tabindex',
      'width',
      'height',
      'style',
      'size',
      'maxlength'
    ]
    if (options) {
      this.attributePriorizationList = options.attributePriorizationList
      this.attributeBlackList = options.attributeBlackList
    }

    this.getRobustXPath = this.getRobustXPath.bind(this)
    this.getElementByXPath = this.getElementByXPath.bind(this)
    this.uniquelyLocate = this.uniquelyLocate.bind(this)
  }
  /**
     * Returns an optimized robust XPath locator string.
     *
     * @param element - The desired element.
     * @param document - The document to analyse, that contains the desired element.
     *
     * @returns - A robust xPath locator string, describing the desired element.
     */
  getRobustXPath (element, document) {
    if (!document.body.contains(element)) {
      throw new Error('Document does not contain given element!')
    }
    const xPathList = [new XPath('//*')]
    while (xPathList.length > 0) {
      const xPath = xPathList.shift()
      let temp = []
      temp = temp.concat(this.transfConvertStar(xPath, element))
      temp = temp.concat(this.transfAddId(xPath, element))
      temp = temp.concat(this.transfAddText(xPath, element))
      temp = temp.concat(this.transfAddAttribute(xPath, element))
      temp = temp.concat(this.transfAddAttributeSet(xPath, element))
      temp = temp.concat(this.transfAddPosition(xPath, element))
      temp = temp.concat(this.transfAddLevel(xPath, element))
      temp = [...new Set(temp)] // removes duplicates
      for (const x of temp) {
        if (this.uniquelyLocate(x.getValue(), element, document)) {
          return x.getValue()
        }
        xPathList.push(x)
      }
    }
    throw new Error('Internal Error: xPathList.shift returns undefined')
  }
  /**
     * Returns an element in the given document located by the given xPath locator.
     *
     * @param xPath - A xPath string, describing the desired element.
     * @param document - The document to analyse, that contains the desired element.
     *
     * @returns - The first maching Element located.
     */
  getElementByXPath (xPath, document) {
    return document.evaluate(xPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      .singleNodeValue
  }
  /**
     * Returns, wheater an xPath describes only the given element.
     *
     * @param xPath - A xPath string, describing the desired element.
     * @param element - The desired element.
     * @param document - The document to analyse, that contains the desired element.
     *
     * @returns - True, if the xPath describes only the desired element.
     */
  uniquelyLocate (xPath, element, document) {
    const nodesSnapshot = document.evaluate(xPath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
    return nodesSnapshot.snapshotLength === 1 && nodesSnapshot.snapshotItem(0) === element
  }
  transfConvertStar (xPath, element) {
    const output = []
    const ancestor = this.getAncestor(element, xPath.getLength() - 1)
    if (xPath.startsWith('//*')) {
      output.push(new XPath('//' + ancestor.tagName.toLowerCase() + xPath.substring(3)))
    }
    return output
  }
  transfAddId (xPath, element) {
    const output = []
    const ancestor = this.getAncestor(element, xPath.getLength() - 1)
    if (ancestor.id && !xPath.headHasAnyPredicates()) {
      const newXPath = new XPath(xPath.getValue())
      newXPath.addPredicateToHead(`[@id='${ancestor.id}']`)
      output.push(newXPath)
    }
    return output
  }
  transfAddText (xPath, element) {
    const output = []
    const ancestor = this.getAncestor(element, xPath.getLength() - 1)
    if (ancestor.textContent && !xPath.headHasPositionPredicate() && !xPath.headHasTextPredicate()) {
      const newXPath = new XPath(xPath.getValue())
      newXPath.addPredicateToHead(`[contains(text(),'${ancestor.textContent}')]`)
      output.push(newXPath)
    }
    return output
  }
  transfAddAttribute (xPath, element) {
    const output = []
    const ancestor = this.getAncestor(element, xPath.getLength() - 1)
    if (!xPath.headHasAnyPredicates()) {
      // add priority attributes to output
      for (const priorityAttribute of this.attributePriorizationList) {
        for (const attribute of ancestor.attributes) {
          if (attribute.name === priorityAttribute) {
            const newXPath = new XPath(xPath.getValue())
            newXPath.addPredicateToHead(`[@${attribute.name}='${attribute.value}']`)
            output.push(newXPath)
            break
          }
        }
      }
      // append all other non-blacklist attributes to output
      for (const attribute of ancestor.attributes) {
        if (!this.attributeBlackList.includes(attribute.name) &&
          !this.attributePriorizationList.includes(attribute.name)) {
          const newXPath = new XPath(xPath.getValue())
          newXPath.addPredicateToHead(`[@${attribute.name}='${attribute.value}']`)
          output.push(newXPath)
        }
      }
    }
    return output
  }
  transfAddAttributeSet (xPath, element) {
    const output = []
    const ancestor = this.getAncestor(element, xPath.getLength() - 1)
    if (!xPath.headHasAnyPredicates()) {
      // add id to attributePriorizationList
      this.attributePriorizationList.unshift('id')
      let attributes = [...ancestor.attributes]
      // remove black list attributes
      attributes = attributes.filter(attribute => !this.attributeBlackList.includes(attribute.name))
      // generate power set
      let attributePowerSet = this.generatePowerSet(attributes)
      // remove sets with cardinality < 2
      attributePowerSet = attributePowerSet.filter(attributeSet => attributeSet.length >= 2)
      // sort elements inside each powerset
      for (const attributeSet of attributePowerSet) {
        attributeSet.sort(this.elementCompareFunction.bind(this))
      }
      // sort attributePowerSet
      attributePowerSet.sort((set1, set2) => {
        if (set1.length < set2.length) {
          return -1
        }
        if (set1.length > set2.length) {
          return 1
        }
        for (let i = 0; i < set1.length; i++) {
          if (set1[i] !== set2[i]) {
            return this.elementCompareFunction(set1[i], set2[i])
          }
        }
        return 0
      })
      // remove id from attributePriorizationList
      this.attributePriorizationList.shift()
      // convert to predicate
      for (const attributeSet of attributePowerSet) {
        let predicate = `[@${attributeSet[0].name}='${attributeSet[0].value}'`
        for (let i = 1; i < attributeSet.length; i++) {
          predicate += ` and @${attributeSet[i].name}='${attributeSet[i].value}'`
        }
        predicate += ']'
        const newXPath = new XPath(xPath.getValue())
        newXPath.addPredicateToHead(predicate)
        output.push(newXPath)
      }
    }
    return output
  }
  transfAddPosition (xPath, element) {
    const output = []
    const ancestor = this.getAncestor(element, xPath.getLength() - 1)
    if (!xPath.headHasPositionPredicate()) {
      let position = 1
      if (xPath.startsWith('//*')) {
        position = Array.from(ancestor.parentNode.children).indexOf(ancestor) + 1
      } else {
        for (const child of ancestor.parentNode.children) {
          if (ancestor === child) {
            break
          }
          if (ancestor.tagName === child.tagName) {
            position++
          }
        }
      }
      const newXPath = new XPath(xPath.getValue())
      newXPath.addPredicateToHead(`[${position}]`)
      output.push(newXPath)
    }
    return output
  }
  transfAddLevel (xPath, element) {
    const output = []
    if (xPath.getLength() - 1 < this.getAncestorCount(element)) {
      output.push(new XPath('//*' + xPath.substring(1)))
    }
    return output
  }
  generatePowerSet (input) {
    return input.reduce((subsets, value) => subsets.concat(subsets.map((set) => [value, ...set])), [[]])
  }
  elementCompareFunction (attr1, attr2) {
    for (const element of this.attributePriorizationList) {
      if (element === attr1.name) {
        return -1
      }
      if (element === attr2.name) {
        return 1
      }
    }
    return 0
  }
  getAncestor (element, index) {
    let output = element
    for (let i = 0; i < index; i++) {
      output = output.parentElement
    }
    return output
  }
  getAncestorCount (element) {
    let count = 0
    while (element.parentElement) {
      element = element.parentElement
      count++
    }
    return count
  }
}

export class XPath {
  constructor (value) {
    this.value = value
  }
  getValue () {
    return this.value
  }
  startsWith (value) {
    return this.value.startsWith(value)
  }
  substring (value) {
    return this.value.substring(value)
  }
  headHasAnyPredicates () {
    return this.value.split('/')[2].includes('[')
  }
  headHasPositionPredicate () {
    const splitXPath = this.value.split('/')
    const regExp = new RegExp('[[0-9]]')
    return splitXPath[2].includes('position()') || splitXPath[2].includes('last()') || regExp.test(splitXPath[2])
  }
  headHasTextPredicate () {
    return this.value.split('/')[2].includes('text()')
  }
  addPredicateToHead (predicate) {
    const splitXPath = this.value.split('/')
    splitXPath[2] += predicate
    this.value = splitXPath.join('/')
  }
  getLength () {
    const splitXPath = this.value.split('/')
    let length = 0
    for (const piece of splitXPath) {
      if (piece) {
        length++
      }
    }
    return length
  }
}

export class RobulaPlusOptions {
  constructor () {
    /**
         * @attribute - attributePriorizationList: A prioritized list of HTML attributes, which are considered in the given order.
         * @attribute - attributeBlackList: Contains HTML attributes, which are classified as too fragile and are ignored by the algorithm.
         */
    this.attributePriorizationList = ['name', 'class', 'title', 'alt', 'value']
    this.attributeBlackList = [
      'href',
      'src',
      'onclick',
      'onload',
      'tabindex',
      'width',
      'height',
      'style',
      'size',
      'maxlength'
    ]
  }
}
