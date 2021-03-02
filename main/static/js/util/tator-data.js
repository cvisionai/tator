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

  /**
   * Returns data for getFrame with project ID
   */
  async getFrame( frameId ){     
    const response = await fetch(`/rest/GetFrame/${frameId}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();

    return data;
  }

    /**
   * Returns data for getFrame with project ID
   */
  async getLocalizationGraphic( localizationID ){     
    const response = await fetch(`/rest/LocalizationGraphic/${localizationID}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "image/*",
        "Content-Type": "image/*"
      }
    });

    const data = await response.blob();

    return data;
  }


  /**
   * Returns a data for user with user ID
   */
  async getUser( userId ){     
    const response = await fetch(`/rest/User/${userId}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    
    return data;
  }


  /**
   * Returns a data for user with user ID
   */
  async getLocalizationCount({params = ""} = {}){     
    const response = await fetch(`/rest/LocalizationCount/${this._project}${params}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    
    return data;
  }


  /**
   * Returns a data for user with user ID
   */
  async getLocalizations({ params = "", start = 0, stop = 20} = {}){     
    const response = await fetch(`/rest/Localizations/${this._project}?start=${start}&stop=${stop}${params}`, {
      method: "GET",
      mode: "cors",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    
    return data;
  }
}