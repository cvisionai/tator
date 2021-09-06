class ProjectDelete {
    constructor({
        projectId
    }){
        this.projectId = projectId;
    }

    async deleteFetch(){     
        const response = await this._fetchPromise();
        const data = await response.json();

        return data;
    }

    _fetchPromise(){
        console.log(`Deleting project id ${this.projectId}`);
        
        return fetch(`/rest/Project/${this.projectId}`, {
            method: "DELETE",
            mode: "cors",
            credentials: "include",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Accept": "application/json",
                "Content-Type": "application/json"
            }
        });
    }
}