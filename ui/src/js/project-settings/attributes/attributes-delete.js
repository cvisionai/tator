import { getCookie } from "../../util/get-cookie.js";

export class AttributesDelete {
    constructor({
        type, typeId, attributeName
    }){
        this.type = type;
        this.typeId = typeId;
        this.attributeName = attributeName;
    }

    async deleteFetch(){     
        const response = await this._fetchPromise();
        const data = await response.json();
        data.status = response.status;
        return data;
    }

    _fetchPromise(){
        let formData = {
            "entity_type": this.type,
            "attribute_to_delete": this.attributeName
        };
    
        return fetch(`/rest/AttributeType/${this.typeId}`, {
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