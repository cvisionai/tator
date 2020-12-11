class MediaTypeAttributeEdit {
  constructor() {
    //super();
  }

  output({
    attributes = []
  } = {}){
    const settingsBoxHelper = new SettingsBox();
    const mediaTypesInputHelper = new SettingsInput();

    let attributeCurrent = settingsBoxHelper.headingWrap({"headingText" : "Attribute", "descriptionText" : "Edit attribute.", "level":3 });

    let boxOnPage = settingsBoxHelper.boxWrapDefault( {"children" : attributeCurrent, "level":2} );

    // append input for name and description
    boxOnPage.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Name", "value": attributes.name}) );
    boxOnPage.appendChild( mediaTypesInputHelper.inputText( { "labelText": "Description", "value": attributes.description} ) );

    //required
    boxOnPage.appendChild( mediaTypesInputHelper.inputCheckbox({ "labelText": "Required", "value": attributes.required, "type":"checkbox"}) );

    // default
    let showDefault = (attributes.dtype != 'datetime' && attributes.dtype != 'geopos')? true : false;
    if (showDefault)  boxOnPage.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Default", "value": attributes.default, "type":"text"}) );

    // visible
    boxOnPage.appendChild( mediaTypesInputHelper.inputCheckbox({ "labelText": "Visible", "value": attributes.visible, "type":"checkbox"}) );

    // int, float	minimum & maximum
    let showMinMax = (attributes.dtype == 'int' || attributes.dtype == 'float') ? true : false;
    if (showMinMax)  {
      boxOnPage.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Minimum", "value": attributes.minimum, "type":"number"}) );
      boxOnPage.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Maximum", "value": attributes.maximum, "type":"number"}) );
    }

    let showChoiceAndLabels = attributes.dtype == 'enum' ? true : false;
    if (showChoiceAndLabels){
      boxOnPage.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Choice", "value": attributes.choices}) );
      boxOnPage.appendChild( mediaTypesInputHelper.inputText({ "labelText": "Labels", "value": attributes.labels}) );
    }


    return boxOnPage;
  }
}
