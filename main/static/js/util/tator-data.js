class TatorData {

  constructor(project) {
    this._project = project;
  }

  /**
   * Returns the list of localization types associated with this project
   */
  async getAllLocalizationTypes() {

    var outData;
    const restUrl = "/rest/LocalizationTypes/" + this._project;
    const algorithmPromise = fetchRetry(restUrl, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    })
    .then(response => { return response.json(); })
    .then(data => {
      outData = data;
    });

    await algorithmPromise;
    return outData;
  }
}