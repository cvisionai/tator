class LeafTypeEdit extends SettingsSection {
  constructor() {

    super();

    this._shadow.appendChild(this.settingsSectionDiv);
  }

  _init(data){
    console.log(`${this.tagName} init.`);

    return this.settingsSectionDiv.innerHTML = "test";
  }

  _fetchGetPromise({id = this.projectId} = {}){
    return fetch("/rest/LeafTypes/" + id, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  _fetchPatchPromise({id = -1 } = {}){
    console.log("Patch id: "+id);
    return fetch("/rest/LeafType/" + id, {
      method: "PATCH",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: this._getFormData(id)
    })
  }

  _getFormData(id){
    return console.log("Get form leaf type, id: "+id);;
  }

}

customElements.define("leaf-type-edit", LeafTypeEdit);
