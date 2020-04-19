# autosurf

## Usage

### Include on page to test

```html
<script src="https://cdn.jsdelivr.net/npm/@dscribers/autosurf/dist/autosurf.min.js"></script>

<script>
  const $surf = new AutoSurf()
  $surf.on('*', handleAllEvents).ready(() => {
    $surf.parseFeature(featureObject).start()
  })
</script>
```

### Use nodejs

```bash
yarn add @dscribers/autosurf
```

```js
import AutoSurf from '@dscribers/autosurf'

const $surf = new AutoSurf()
$surf.on('*', handleAllEvents).ready(() => {
  $surf.parseFeature(featureObject).start()
})
```
