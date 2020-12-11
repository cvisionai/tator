class MediaTypeMainEdit extends TatorElement {
  constructor() {
    super();
  }

  init(val, t){
    console.log(":: ProjectEditMediaTypes ::");
    console.log(val);

    // Temporary loading box until FETCH returns
    const settingsBoxHelper = new SettingsBox();
    const mediaTypesInputHelper = new SettingsInput();
    const mediaAttributes = new MediaTypeAttributeEdit();

    for(let i in val){
      let mediaTypes = settingsBoxHelper.headingWrap({"headingText" : "Media Type", "descriptionText" : "Edit media type.", "level": 1 });
      let boxOnPage = settingsBoxHelper.boxWrapDefault( { "children" : mediaTypes } );
      // append input for name and summary
      boxOnPage.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Name", "value": val[i].name}) );
      boxOnPage.appendChild( mediaTypesInputHelper.inputText( { "labelText": "Description", "value": val[i].description} ) );

      // default volume (video, multi)
      let showVolume = val[i].dtype != 'image' ? true : false;
      if (showVolume)  boxOnPage.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Default Volume", "value": val[i].default_volume, "type":"number"}) );

      // visible
      boxOnPage.appendChild( mediaTypesInputHelper.inputCheckbox( { "labelText": "Visible", "value": val[i].visible, "type":"checkbox"} ) );

      // attribute types
      let attributeTypes = val[i].attribute_types
      for(let a of attributeTypes){
        boxOnPage.appendChild( mediaAttributes.output( {"attributes": a }) );
      }

      t.after( boxOnPage )
    }
  }
}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
