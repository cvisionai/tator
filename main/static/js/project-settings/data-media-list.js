class DataMediaList{
    constructor(projectId){
      this.projectId = projectId;
    }

    _setProjectMediaList(data = "", update = false) {
      let promise;
      if (data == "") {
        promise = this.getProjectMediaList(update);
      } else {
        promise = Promise.resolve(this.getListFromData(data));
      }
      return promise;
    }

    getListFromData(data){
      const mediaList = [];
      for(let d of data){
        // create reference list for later
        mediaList.push({
            "id" : d.id,
            "name" : d.name
        });
      }
      sessionStorage.setItem(`MediaData_${this.projectId}`, JSON.stringify(mediaList));

      return mediaList;
    }

    getProjectMediaList(update){     
      const mediaListData = sessionStorage.getItem(`MediaData_${this.projectId}`);

      if(!update && mediaListData){
        return Promise.resolve(JSON.parse(mediaListData));      
      } else {
        let m = document.createElement("media-type-main-edit");
        return m._fetchGetPromise({"id": this.projectId} )
        .then(data => data.json()).then( data => {
          return this.getListFromData(data);
        });
      }      
    }

    // Returns an Array of Object with:
    // - media id, name, and checked (bool)
    // - checked is true if the both lists contain the id
    getCompiledMediaList( mediaIds ){
        let newList = [];

        this._setProjectMediaList().then(mediaList => {

          mediaList.forEach((media, i) => {
            if(mediaIds && mediaIds.length > 0){
              for(let id of mediaIds ){
                if (media.id == id ) {
                  return newList.push({
                    "id" : media.id,
                    "name" : media.name,
                    "checked" : true
                  });
                }
              }
            }
            return newList.push({
              "id" : media.id,
              "name" : media.name,
              "checked" : false
            });
          });
        });
        return newList;
    }


}
