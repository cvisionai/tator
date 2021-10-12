class DataJobClusters {
   constructor(organizationId) {
      this.organizationId = organizationId;
      this.el = document.createElement("div");
   }

   async _setList(data = "", update = false) {
      let promise;
      if (data == "") {
         promise = await this.getJobClustersList(update);
      } else {
         promise = await Promise.resolve(this.getListFromData(data));
      }

      if (promise === null) return Promise.resolve(null);
      if (typeof promise === "undefined") return Promise.resolve(403);

      return promise;
   }

   getListFromData(data) {
      if (typeof data !== "undefined" && data !== null && data !== [] && data !== "Null" && data !== 403) {
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
         // then there is an issue with the data, don't try to store it
         this._clear();
         console.warn("Cannot get list from data.", data);
         return data;
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
            if (resp.status !== 200) {
               return resp.status;
            }

            return resp.json()
         }).then(data => {
            return this.getListFromData(data);
         }).catch(e => {
            console.warn("Cannot get job cluster list.", e);
            return "ERROR";
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
         if (typeof clusterList !== "undefined" && clusterList !== null && clusterList !== 403) {
            clusterList.forEach((cluster, i) => {
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
            return Promise.resolve(clusterList);
         }

      });
   }

   _clear() {
      localStorage.clear();
   }

}