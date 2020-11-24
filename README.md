# autosurf

## Installation

### Include on page to test

```html
<script src="https://cdn.jsdelivr.net/npm/@dscribers/autosurf/dist/autosurf.min.js"></script>
```

### Use nodejs

```bash
yarn add @dscribers/autosurf
```

## Usage

```html
<script>
  const $surf = new AutoSurf()
  $surf
    .on('*', handleAllEvents)
    // This function directly passed to the init method of the adapter
    .ready(() => {
      $surf.schedules(schedulesArray).start()
    })
</script>
```

### Config

```js

const $surf = new AutoSurf({
  autoAdvance: false, // Indicates whether to automatically advance to the next step or not. Defaults to TRUE,
  defaultFailMessage: 'Something went wrong', // The default message for failed actions. It may be overridden by a more specific message, if available.
  typingSpeed: 500, // The speed for the typing action in milliseconds. Defaults to 100
})

```

All possible lists of dos and checks are properly documented in the BaseAdapter.

### Methods

Method | Params | Description
-------|--------|------------
on | (string) event, (function) callback | Adds an event listener
schedules | (array) schedules | An array of schedules to execute (See [below](#schedules))
pause | - | Pauses the execution
getBackupData | - | Fetches data that needs to be backed up
quit | - | Cleans up AutoSurf
ready | (function) callback | Sets the function to call when AutoSurf is ready to use
reconfigure | (object) config | Updates the configuration on the fly
restart | - | Restarts the execution from the beginning
resume | - | Resumes a paused execution
start | (object) config | Starts the execution

### Schedules

A schedules array consists of schedule objects which have the following structure:

```json
// a schedule object

{
  "do": [
    {
      "action": "type",
      "params": ["John Doe"],
      "selector": "#inputName"
    }
  ],
  "check": [
    {
      "action": "valueIs",
      "selector": "#name",
      "params": ["John Doe"]
    }
  ]
}
```

### Events

Events are triggered at different points of the execution. These can be used to monitor the execution.

The following is the list of events:

Event | Description
------|------------
actionFailed | Triggered when an action (do \| check) fails
actionStart | Triggered when starting to execute an action (do \| check)
actionSuccess | Triggered when an action executes successfully
done | Triggered when all the schedules have been executed
paused | Triggered when execution is paused
resumed | Triggered when execution is resumed
scheduleFinish | Triggered when all dos and checks in a schedule have been executed
scheduleInit | Triggered when a schedule has been processed which is almost immediately after method `schedules` is called.
scheduleStart | Triggered when starting to execute a schedule

## Adapters

AutoSurf can work with different adapters to surf different devices and platforms. By default, AutoSurf uses the in-built WebSurf adapter but a custom adapter can be used.

### How to build

Adapters are classes which must extend the BaseAdapter class.

```js
import BaseAdapter from '@dscribers/autosurf/dist/baseadapter'

export default class MobileAdapter extends BaseAdapter {
  static init($autosurf, callback) {
    // initialize the adapter
  }

  static quit($autosurf) {
    // clean up the process
  }

  static doType(selector, str, speed = 500) {
    // select the element
    // type the str into the element at the given speed
    // throw new Error if something goes wrong
  }

  static checkValueIs(selector, value) {
    // select the element
    // check that the value of the element is the same as the given value
    // throw new Error if not the same
  }

  // ...
}
```

### Usage

```js
import AutoSurf from '@dscribers/autosurf'
import MobileSurf from 'mobile-surf-adapter'

$autosurf = new AutoSurf(config, MobileSurf)
```

### Methods

All methods in the BaseAdapter should be overridden as they are designed to fail by default.

Method | Params | Description
-------|--------|------------
init | (AutoSurf) $autosurf, (function) callback | Called to initialize the adapter
quite | (AutoSurf) $autosurf | Called when AutoSurf finishes all executions
checkAttrContains | (string) selector, (string) attribute, (string) text | Called to check if an element's attributes contains the given text
checkAttrIs | (string) selector, (string) attribute, (string) text | Called to check if an element's attribute is the same as the given text
checkExists | (string) selector | Called to check if an element exists on the page
checkIsOn | (string) url | Called to check if the page is on the given url
checkElementIs | (string) selector, (string) display | Called to check if an element is either visible or hidden
checkTextContains | (string) selector, (string) text | Called to check if the element's text contains the given text
checkTextIs | (string) selector, (string) text | Called to check if element's text is matches the given text
checkValueContains | (string) selector, (string) text | Called to check if the element's value contains the given text
checkValueIs | (string) selector, (string) text | Called to check if the element's value matches the given text
doClick | (string) selector | Called to click on an element
doGoBack | - | Called to go back to a previous page
doWait | (integer) milliseconds | Called to make pause the execution for the given milliseconds
doWaitTillPageLoads | - | Called to make the next execution wait until after the page finishes loading
doGoto | (string) url | Called to go to a url
doRefresh | - | Called to refresh the page
doSubmitForm | (string) selector | Called to submit the form with the given selector
doType | (string) selector, (string) str, (integer) speed | Called to type the given string in the given element at the given speed.
