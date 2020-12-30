class LocalizationEdit extends SettingsSection {
  constructor() {
    super();

    this._shadow.appendChild(this.settingsSectionDiv);
  }

  _init(data){
    console.log(`${this.tagName} init.`);

    return this.settingsSectionDiv.innerHTML = "test";
  }

  _fetchGetPromise({id = this.projectId} = {}){
    return fetch("/rest/LocalizationTypes/" + id, {
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
    return fetch("/rest/LocalizationType/" + id, {
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
    return console.log("Get form localization type, id: "+id);;
  }

}

customElements.define("localization-edit", LocalizationEdit);
