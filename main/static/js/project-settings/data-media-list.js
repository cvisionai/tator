class DataMediaList{
    constructor(mediaData){
        this.projectMediaList = this._setProjectMediaList(mediaData);
    }

    _setProjectMediaList(mediaData){
        const mediaList = [];
        for(let i in mediaData){
            // create reference list for later
            mediaList.push({
                "id" : mediaData[i].id,
                "name" : mediaData[i].name
            });
        }
        return mediaList;
    }

    getProjectMediaList(){
       return this.projectMediaList;
    }

    // Returns an Array of Object with:
    // - media id, name, and checked (bool)
    // - checked is true if the both lists contain the id
    getCompiledMediaList( mediaIds ){
        let newList = [];
    
        this.projectMediaList.forEach((media, i) => {
          for(let id of mediaIds ){
            if (media.id == id ) {
              return newList.push({
                "id" : media.id,
                "name" : media.name,
                "checked" : true
              });
            }
          }
          return newList.push({
            "id" : media.id,
            "name" : media.name,
            "checked" : false
          });
        });
    
        return newList;
    }


}
