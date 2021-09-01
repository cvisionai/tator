class DataJobClusters {
   constructor(organizationId) {
      this.organizationId = organizationId;
      this.el = document.createElement("div");
   }

   _setList(data = "", update = false) {
      let promise;
      if (data == "") {
         promise = this.getJobClustersList(update);
      } else {
         promise = Promise.resolve(this.getListFromData(data));
      }
      return promise;
   }

   getListFromData(data) {
      const clusterList = [];
      for (let d of data) {
         // create reference list for later
         clusterList.push({
            "id": d.id,
            "name": d.name
         });
      }
      sessionStorage.setItem(`JobClusters_${this.organizationId}`, JSON.stringify(clusterList));

      return clusterList;
   }

   fetchJobClusters() {
      return fetch(`/rest/JobClusters/${this.organizationId}`, {
         method: "GET",
         credentials: "same-origin",
         headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
         }
      });
   }

   getJobClustersList(update) {
      const jobClustersListData = sessionStorage.getItem(`JobClusters_${this.organizationId}`);

      if (!update && jobClustersListData) {
         return Promise.resolve(JSON.parse(jobClustersListData));
      } else {
         this.fetchJobClusters().then(data => data.json()).then(data => {
            // console.log(data);
            return this.getListFromData(data);
         });
      }
   }

   // Returns an Array of Object with:
   // - job cluster id, name, and checked (bool)
   // - checked is true if the both lists contain the id
   getCompiledList(jobClusterIds){
      let newList = [];

      return this._setList().then((clusterList) => {
         // console.log(clusterList);

         clusterList.forEach((cluster, i) => {
            console.log(cluster);
            const checkObj = {
               value: cluster.id,
               label: cluster.name,
               selected: false
            };
            if (jobClusterIds !== null && jobClusterIds.includes(cluster.id)) {
               checkObj.selected = true;
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