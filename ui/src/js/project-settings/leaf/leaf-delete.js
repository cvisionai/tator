import { getCookie } from "../../util/get-cookie.js";

export class LeafDelete {
    constructor({
        type, typeId, leafName
    }){
        this.type = type;
        this.typeId = typeId;
        this.leafName = leafName;
    }

    async deleteFetch(){     
        const response = await this._fetchPromise();
        const data = await response.json();
        return data;
    }

    _fetchPromise(){
        console.log(`Deleting ${this.type} id ${this.typeId} leaf with name ${this.leafName}`);

        let formData = {
            "entity_type": this.type,
            "leaf_to_delete": this.leafName
        };
    
        return fetch(`/rest/LeafType/${this.typeId}`, {
        method: "DELETE",
        mode: "cors",
        credentials: "include",
        headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body : JSON.stringify(formData)
        })
    }
}