import { getCookie } from "../../util/get-cookie.js";

export class LeafDelete {
    constructor({
        leafId
    }){
        this.leafId = leafId;
    }

    async deleteFetch(){     
        const response = await this._fetchPromise();
        const data = await response.json();
        return data;
    }

    _fetchPromise(){
        console.log(`Deleting Leaf ${this.leafId}.`);
    
        return fetch(`/rest/Leaf/${this.leafId}`, {
            method: "DELETE",
            mode: "cors",
            credentials: "include",
            headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
        })
    }
}