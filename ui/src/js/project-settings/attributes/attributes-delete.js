import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class AttributesDelete {
  constructor({ type, typeId, attributeName }) {
    this.type = type;
    this.typeId = typeId;
    this.attributeName = attributeName;
  }

  async deleteFetch() {
    const response = await this._fetchPromise();
    const data = await response.json();
    data.status = response.status;
    return data;
  }

  _fetchPromise() {
    let formData = {
      entity_type: this.type,
      name: this.attributeName,
    };

    return fetchCredentials(`/rest/AttributeType/${this.typeId}`, {
      method: "DELETE",
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(formData),
    });
  }
}
