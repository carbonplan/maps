# carbonplan / maps / docs

**docs site for `@carbonplan/maps` — [live](https://maps.docs.carbonplan.org/maps)**

## development

Assuming you already have `Node.js` installed, you can install the build dependencies as:

```shell
npm install .
```

To start a development version of the site, simply run:

```shell
npm run dev
```

and then visit `http://localhost:3001/maps` in your browser.

### prop types

The docs site uses the automatically generated prop definitions in `components/component-props.json` to render `PropsTable`s typed components. To regenerate these prop definitions in the main `maps` project, you can run:

```shell
npm run build-docs
```

and check in the updates to `component-props.json`.
