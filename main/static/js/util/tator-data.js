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

      Promise.all([localizationPromise])
        .then(([localizationResponse]) => {
          const localizationJson = localizationResponse.json();
          Promise.all([localizationJson])
        .then(([localizationTypes]) => {
          outData = [...localizationTypes];
          resolve();
        });
      });

    });

    await donePromise;
    return outData;
  }

  /**
   * Returns the list of media types associated with this project
   */
  async getAllMediaTypes() {

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

      Promise.all([mediaPromise])
        .then(([mediaResponse]) => {
          const mediaJson = mediaResponse.json();
          Promise.all([mediaJson])
        .then(([mediaTypes]) => {
          outData = [...mediaTypes];
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

  /* START - Rest calls with data manipulation */

  // Creates an object like:
  //  { "Test box type" : [ "attr1", "attr2", "attr3"], 
  //    "Test line type" : [ "attr1", "attr2", "attr3"]  }
  getAttributesByLocalizationType(){
    this.getAllLocalizationTypes().then((data) => {
      console.log(data);
      let newDataObj = {}
      for(let loc in data){
        newDataObj[loc.name] = [];
        for(let a in loc.attributeTypes){
          newDataObj[loc.name].push(a.name)
        }
      }
      console.log(newDataObj);
      return newDataObj;
    });
  }
}

