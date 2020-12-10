class MediaTypeAttributeEdit extends TatorElement {
  constructor() {
    super();
  }

  init(val, t){
    console.log(":: ProjectEditMediaTypes ::");
    console.log(val);

  }
}

customElements.define("media-type-attribute-edit", MediaTypeAttributeEdit);
