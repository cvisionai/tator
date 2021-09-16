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
      if (promise == null) return Promise.resolve(null);
      return promise;
   }

   getListFromData(data) {
      if (typeof data !== "undefined" && data !== null && data !== [] && data !== "Null") {
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
      } else {
         this._clear();
      }
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
         this.fetchJobClusters().then(resp => {
            // console.log(resp);
            if (resp.status !== 200) {
               return false;
            }

            return resp.json()
         }).then(data => {
            // console.log(data);
            return this.getListFromData(data);
         }).catch(e => {
            return false;
         });
      }
   }

   // Returns an Array of Object with:
   // - job cluster id, name, and checked (bool)
   // - checked is true if the both lists contain the id
   getCompiledList(jobClusterId) {
      let newList = [];

      return this._setList().then((clusterList) => {
         // console.log(clusterList);
         if (clusterList) {
            clusterList.forEach((cluster, i) => {
               // console.log(cluster);
               const checkObj = {
                  value: cluster.id,
                  label: cluster.name,
                  selected: false
               };
               if (jobClusterId !== null && jobClusterId == cluster.id) {
                  checkObj.selected = true;
               }
               newList.push(checkObj);
            });

            return newList;
         } else {
            return null;
         }

      });
   }

   _clear() {
      localStorage.clear();
   }

}