# Tator UI

This folder contains the Tator UI code. It can be used standalone to do front end development independently from the Tator backend, however `tator-js` bindings and the backend docker image must still be built to do this.

## Build tator-js

From the top level directory in this repository (not the UI directory) run the following:
```
make js-bindings
```

Create a symlink to the `tator-js` `node_modules` directory:
```
ln -s scripts/packages/tator-js/pkg/node_modules node_modules
```

## Build the UI package

* For development:

```
npm run buildDev
```

* For minified code:

```
npm run build
```

## Serve the UI

* With a watch on changed files:

```
npm run watch -- --backend=https://yourbackend.tator.io --keycloak_enabled
```

* Without a watch:

```
npm run serve -- --backend=https://yourbackend.tator.io --keycloak_enabled
```
