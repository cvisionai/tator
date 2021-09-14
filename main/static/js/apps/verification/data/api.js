class AppData {
   constructor(projectId) {
      this._modelData = new TatorData(projectId);
      this._projectId = projectId;
      this._submissionState = null;
   }

   /**
    * Returns attribute types JSON for "Submission" State Type
    */
   async _getSubmissionAttributes() {
      await this._modelData.getAllStateTypes();
      
      let states = this._modelData.getStoredMediaStateTypes();

      if (states && states.length > 0) {
         for (let state of states) {
            if (state.name == "Submission" && typeof state.attribute_types !== undefined) {
               this._submissionState = state;
               return state.attribute_types;
            }
         }
   
      }

      return null
   }

   async _getSubmissions() {
      if (this._submissionState !== null) {
         // get all the collections, and display data in table
         try {
            let restUrl = `/rest/States/${this._projectId}?type=${this._submissionState.id}`
            let resp = await fetchRetry(restUrl, {
               method: "GET",
               credentials: "same-origin",
               headers: {
               "X-CSRFToken": getCookie("csrftoken"),
               "Accept": "application/json",
               "Content-Type": "application/json"
               },
            });
   
            let data = resp.json();
   
            return data;
         } catch (e) {
            console.error("Error getting submission data.", e);
         }

      } else {
         console.error("No submissions state id.")
      }
      
   }

  
}