class DataVersionList{
    constructor(projectId){
      this.projectId = projectId;
      this.el = document.createElement("div");
    }

    _setVersionList(data = "", update = false) {
      let promise;
      if (data == "") {
        promise = this.getVersionList(update);
      } else {
        promise = Promise.resolve(this.getListFromData(data));
      }
      return promise;
    }

    getListFromData(data){
      const VersionList = [];
      for(let d of data){
        // create reference list for later
        VersionList.push({
            "id" : d.id,
            "name" : d.name
        });
      }
      sessionStorage.setItem(`VersionData_${this.projectId}`, JSON.stringify(VersionList));

      return VersionList;
    }

    getVersionList(update){     
      const versionListData = sessionStorage.getItem(`VersionData_${this.projectId}`);

      if(!update && versionListData){
        return Promise.resolve(JSON.parse(versionListData));      
      } else {
        let m = document.createElement("versions-edit");
        return m._fetchGetPromise({"id": this.projectId} )
        .then(data => data.json()).then( data => {
          return this.getListFromData(data);
        });
      }      
    }

    // Returns an Array of Object with:
    // - Version id, name, and checked (bool)
    // - checked is true if the both lists contain the id
    getCompiledVersionList( ids, currentId ){
      let newList = [];
      let versionIds = ids;

      return this._setVersionList().then(versionList => {

        versionList.forEach((version, i) => {
          const skip = version.id == currentId ? true : false;

          if (!skip) {
            const checkObj = {
              "id" : version.id,
              "name" : version.name,
              "checked": false
            }
            if (typeof versionIds !== "undefined" && versionIds.length > 0 && versionIds.includes(version.id)) {
              checkObj["checked"] = true;
            }
            newList.push(checkObj);
          }

        });
        return newList;
      });
    }


}
