# Localization Gallery Guide

For the localization gallery, an attempt to use javascript-module style plugins was attempted. 

Each plug-in is loaded on page load and initialized. They get a callback on page load and when the menu item is activated.


## A living example

A fully functional localization gallery applet is located here:
https://github.com/cvisionai/tator-applets/blob/main/soi/dataset_gen.js

It is registered to the platform as a `localization-gallery` category. 

The relevant code to integrate into Tator:

```javascript
// Imports for the javascript code
const modulePath = `${STATIC_PATH}/scripts/packages/tator-js/src/utils`;
const uiPath = `${STATIC_PATH}/ui/src/js`;
const { fetchCredentials } = await import(`${modulePath}/fetch-credentials.js`);
const { ModalDialog} = await import(`${uiPath}/components/modal-dialog.js`);

// UI components can derive off of Tator components with ease
// Elements are also available via the custom registry:
//     e.g. document.create("enum-input")
// Elements are styled correctly via the page's CSS.
class StageDialog extends ModalDialog {
// REDACTED FOR BREVITY
}

// Snippet from dataset_gen.js to show applet module definition.
export default class DatasetGenApplet {
    constructor() {
      this.name = "Stage Localizations"; // This is the name used on the menu.
    }

    // This function gets called on page load
    async init(galleryHandle, modelData) {
      this.pageHandle = document.getElementsByTagName("analytics-localizations")[0];
      this.galleryHandle = galleryHandle;
      this.modelData = modelData;
      console.log("Applet initialized with model data:", modelData);

      // This 
      this._modal = new StageDialog();
      await this._modal.init(this);
      this.galleryHandle._shadow.appendChild(this._modal);
    }

    // This function get called ANY time the user selects it from the menu
    launch() {
      console.log("Launching applet:", this.name);
      this._modal.show();
    }
  }
```
