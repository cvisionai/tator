class VersionDialog extends ModalDialog {
  constructor() {
    super();

    this._title.nodeValue = "Version History";

    const table = document.createElement("table");
    table.setAttribute("class", "table col-12");
    this._main.appendChild(table);

    const 
  }

  init(versions) {
    // Initializes the dialog.
    // versions: returned object from Version endpoint.
  }

  set versions(val) {
    for (const version of val) {
    }
  }
}

customElements.define("version-dialog", VersionDialog);
