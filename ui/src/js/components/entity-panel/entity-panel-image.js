import { TatorElement } from "../tator-element.js";

export class EntityPanelImage extends TatorElement {
   constructor() {
      super();

      // 
      var template = document.getElementById("entity-panel-image");
      var clone = document.importNode(template.content, true);
      this._shadow.appendChild(clone);

      this._imagePane = this._shadow.getElementById("entity-panel-image--image_pane");
      this._previewImg = this._shadow.getElementById("entity-panel-image--preview");
      this._svgDiv = this._shadow.getElementById("entity-panel-image--svgDiv");
      this._viewBox = null;
   }

   /**
    * @param {
    *    imageSource: STRING (url to static image, or image frame),
    *    localizationData: OBJECT,
    *    mediaData: OBJECT...
    * } val
    */
   set data(val) {
      this._data = val;

      console.log("Entity panel image data",this._data);

      if (this._data !== null && this._data.imageSource) {
         // Setup the image, and overlay the annotation
         this._previewImg.src = this._data.imageSource;
            
         // show the box
         this._previewImg.onload = (e) => {
            this._imagePane.hidden = false;
            console.log("New preview loaded.....")
            this._viewBox = {
               width: this._previewImg.naturalWidth,
               height: this._previewImg.naturalHeight
            };

            if (this._data.localizationData.typeName = "Box") {
               this.showBoundingBox(this._data.localizationData);
            } else {
               // TODO
            }
            
         } 

      } else {
         // clear the image and hide box
         this._imagePane.hidden = true;
         this._previewImg.src = "";
      }

   }

   showBoundingBox(data) {
      const viewBoxSize = `0 0 ${this._viewBox.width} ${this._viewBox.height}`;
      this._currentSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this._currentSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      this._currentSvg.setAttribute("viewBox", viewBoxSize);

      this._strokeWidth = Math.min(this._previewImg.naturalHeight, 1080) / 200;
      this._fontSize = Math.min(this._previewImg.naturalHeight, 1080) / 333 * 12;
      const strokeWidth = this._strokeWidth;

      const imageWidth = this._data.mediaData.width;
      const imageHeight = this._data.mediaData.height;

      const bounding_x1 = Number(this._data.localizationData.x * imageWidth) + (strokeWidth / 2);
      const bounding_y1 = Number(this._data.localizationData.y * imageHeight) + (2 * strokeWidth);
      const bounding_width = data.width  * imageWidth;
      const bounding_height = data.height * imageHeight;
      const colorString = `#fff`;

      const box_G = document.createElement("g");
      box_G.setAttribute("id", `Box__${bounding_x1}__${bounding_x1}`);
      box_G.setAttribute("style", `color: ${colorString}; stroke: ${colorString}; stroke-width: ${strokeWidth}px;`);
      box_G.setAttribute("x", `${bounding_x1}`);
      box_G.setAttribute("y", `${bounding_y1}`);
      box_G.setAttribute("transform", `translate(${bounding_x1}, ${bounding_y1})`);
      box_G.setAttribute("class", `concepts-figure__svg-group`);
      box_G.setAttribute("active", `true`);
      box_G.setAttribute("ref", `group`);
      this._currentSvg.appendChild(box_G);

      const box_path = document.createElement("path");
      // box_path.setAttribute("data-v-601a8666", "");
      box_path.setAttribute("stroke", colorString);
      box_path.setAttribute("stroke-width", `${strokeWidth}px`);
      box_path.setAttribute("fill", "transparent");
      box_path.setAttribute("class", "concepts-figure__svg-shape");
      box_path.setAttribute("d", `m 0 0
                        h ${Math.floor(bounding_width)}
                        v ${Math.floor(bounding_height)}
                        h ${-Math.floor(bounding_width)}
                        z`);
      box_G.appendChild(box_path);


      this._svgDiv.innerHTML = this._currentSvg.outerHTML;
   }

}

customElements.define("entity-panel-image", EntityPanelImage);
