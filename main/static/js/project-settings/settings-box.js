/* Class with methods return content in a styled DIV boxes.*/
class SettingsBox {
  constructor( customClass) {
    this.customClass = customClass || ""; // Feature-related class(es) to customize form element. Applies to all elements.
  }

  boxWrapDefault( children ){
    let settingsBox = document.createElement("div");
    settingsBox.setAttribute("class", "new-project__config py-3 px-6 rounded-2 layout-max "+this.customClass);
    settingsBox.appendChild( children );

    return settingsBox;
  }

  headingWrap( headingText, descriptionText, level ){
    /* Div to apppend the a HEADING and DESCRIPTION to. */
    let headingDiv = document.createElement("div");
    headingDiv.setAttribute("class", "dflex flex-items-center py-2 px-2 "+this.customClass);

    /* 1. Make HEADING. */
    let heading = null;

    switch(level){
      case 1:
        heading = document.createElement("h1");
        break;
      case 2:
        heading = document.createElement("h2");
        break;
      case 3:
        heading = document.createElement("h3");
        break;
      case 4:
        heading = document.createElement("h4");
        break;
      default:
        heading = document.createElement("h2");
      }

    let _headingText = document.createTextNode("");
    _headingText.nodeValue = headingText;
    heading.setAttribute("class", "py-1 col-4 text-semibold d-inline-flex ");
    heading.appendChild( _headingText );

    /* 2. Make DESCRIPTION */
    let description = document.createElement("div");
    description.setAttribute("class", "f2 text-gray d-inline-flex ");

    let _descriptionText = document.createTextNode("");
    _descriptionText.nodeValue = descriptionText;
    description.appendChild( _descriptionText );

    /* 3. Append to parent DIV element. */
    headingDiv.appendChild(heading);
    headingDiv.appendChild(description);

    return headingDiv;
  }
}
