class AttributesDelete {
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
        return data;
    }

    _fetchPromise(){
        console.log(`Deleting ${this.type} id ${this.typeId} attribute with name ${this.attributeName}`);

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