class TatorData {

  constructor(project) {
    this._project = project;
  }

  /**
   * Returns the list of localization types associated with this project
   */
  async getAllLocalizationTypes() {

    var outData;
    var donePromise = new Promise(resolve => {

      const mediaRestUrl = "/rest/MediaTypes/" + this._project;
      const mediaPromise = fetchRetry(mediaRestUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });

      const localizationRestUrl = "/rest/LocalizationTypes/" + this._project;
      const localizationPromise = fetchRetry(localizationRestUrl, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });

      Promise.all([mediaPromise, localizationPromise])
        .then(([mediaResponse, localizationResponse]) => {
          const mediaJson = mediaResponse.json();
          const localizationJson = localizationResponse.json();
          Promise.all([mediaJson, localizationJson])
        .then(([mediaTypes, localizationTypes]) => {
          outData = [...mediaTypes, ...localizationTypes];
          resolve();
        });
      });

    });

    await donePromise;
    return outData;
  }
}