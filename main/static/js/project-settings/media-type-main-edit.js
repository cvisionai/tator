class MediaTypeMainEdit extends TatorElement {
  constructor() {
    super();
  }

  init(val, t){
    console.log(":: ProjectEditMediaTypes ::");
    console.log(val);

    // Temporary loading box until FETCH returns
    const settingsBoxHelper = new SettingsBox("loading-settings");
    const mediaTypes = settingsBoxHelper.headingWrap("Media Types", "Edit media type description and attributes.", 1);
    const mediaTypesInputHelper = new SettingsInput("project-settings");
    const boxOnPage = settingsBoxHelper.boxWrapDefault( mediaTypes );

    console.log(val[0].name)

    for(let i in val){
      console.log(i);
      // append input for name
      let name = val[i].name;
      boxOnPage.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Name", "value": name}) );
      // append an input for descriptionText
      let description = val[i].description;
      boxOnPage.appendChild( mediaTypesInputHelper.inputText( { "labelText": "Description", "value": description} ) );
    }


    // attach the box to the page
    return t.after( boxOnPage );

  }
}

customElements.define("media-type-main-edit", MediaTypeMainEdit);
