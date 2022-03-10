export class DataMediaList{
    constructor(projectId){
      this.projectId = projectId;
      this.el = document.createElement("div");
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

        return this._setProjectMediaList().then(mediaList => {

          mediaList.forEach((media, i) => {
            const checkObj = {
              "id" : media.id,
              "name" : media.name,
              "checked" : false
            }
            if (mediaIds.includes(media.id)) {
              checkObj["checked"] = true;
            }
            newList.push(checkObj);
          });
          return newList;
        });
    }

    _clear() {
      localStorage.clear();
    }

}
