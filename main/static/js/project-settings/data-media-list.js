class DataMediaList{
    constructor(projectId){
      this.projectId = projectId;
    }

    _setProjectMediaList(data = "", update = false){
      if(data == "") return this.projectMediaList = this.getProjectMediaList(update);
        
      return this.projectMediaList = this.getListFromData(data);
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
        return JSON.parse(mediaListData);      
      } else {
        let m = document.createElement("media-type-main-edit");
        m._fetchGetPromise({"id": this.projectId} )
        .then(data => data.json).then( data => {

          return this.getListFromData(data);
        }).catch(err => console.error("Could not get media types."));
      }      
    }

    // Returns an Array of Object with:
    // - media id, name, and checked (bool)
    // - checked is true if the both lists contain the id
    getCompiledMediaList( mediaIds ){
        let newList = [];

        this._setProjectMediaList();

        //if(mediaIds && mediaIds.length > 0){
          this.projectMediaList.forEach((media, i) => {
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
        //}
        return newList;
    }


}
