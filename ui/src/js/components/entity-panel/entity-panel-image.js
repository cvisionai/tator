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

            if (this._data.localizationData.typeName === "box") {
               this.showBoundingBox();
            } else if (this._data.localizationData.typeName === "poly") {
               this.showPoly();
            } else if (this._data.localizationData.typeName === "line") {
               this.showLine();
            } else if (this._data.localizationData.typeName === "dot") {
               this.showDot();
            } else {
               // TODO
               this.showLine();
            }
            
         } 

      } else {
         // clear the image and hide box
         this._imagePane.hidden = true;
         this._previewImg.src = "";
      }

   }

   showBoundingBox() {
      const viewBoxSize = `0 0 ${this._viewBox.width} ${this._viewBox.height}`;
      this._currentSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this._currentSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      this._currentSvg.setAttribute("viewBox", viewBoxSize);

      this._strokeWidth = Math.min(this._previewImg.naturalHeight, 1080) / 200;
      this._fontSize = Math.min(this._previewImg.naturalHeight, 1080) / 333 * 12;
      const strokeWidth = this._strokeWidth;

      const imageWidth = this._viewBox.width;
      const imageHeight = this._viewBox.height;

      const bounding_x1 = ((this._data.localizationData.x) * imageWidth) + (strokeWidth / 2);
      const bounding_y1 = ((this._data.localizationData.y) * imageHeight) + (2 * strokeWidth);
      const bounding_width = (this._data.localizationData.width * imageWidth ) + (strokeWidth / 2);
      const bounding_height = (this._data.localizationData.height * imageHeight) + (2 * strokeWidth);
      const colorString = `#fff`;

      /* Box */
      const rect = document.createElement("rect");
      rect.setAttribute("id", `Box`);
      rect.setAttribute("style", `color: ${colorString}; stroke: ${colorString}; stroke-width: ${strokeWidth}px; fill: none;`);
      rect.setAttribute("x", `${bounding_x1}`);
      rect.setAttribute("y", `${bounding_y1}`);
      rect.setAttribute("width", `${bounding_width}`);
      rect.setAttribute("height", `${bounding_height}`);
      rect.setAttribute("class", `concepts-figure__svg-group`);
      rect.setAttribute("active", `true`);
      rect.setAttribute("ref", `group`);
      this._currentSvg.appendChild(rect);

      this._svgDiv.innerHTML = this._currentSvg.outerHTML;
   }

   showLine() {
      const viewBoxSize = `0 0 ${this._viewBox.width} ${this._viewBox.height}`;
      this._currentSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this._currentSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      this._currentSvg.setAttribute("viewBox", viewBoxSize);

      this._strokeWidth = Math.min(this._previewImg.naturalHeight, 1080) / 200;
      this._fontSize = Math.min(this._previewImg.naturalHeight, 1080) / 333 * 12;
      const strokeWidth = this._strokeWidth;

      const imageWidth = this._viewBox.width;
      const imageHeight = this._viewBox.height;

      const bounding_x = Number(this._data.localizationData.x * imageWidth) + (strokeWidth / 2);
      const bounding_y = Number(this._data.localizationData.y * imageHeight) + (2 * strokeWidth);
      const bounding_u = Number(this._data.localizationData.u * imageWidth) + (strokeWidth / 2);
      const bounding_v = Number(this._data.localizationData.v * imageHeight) + (2 * strokeWidth);
      const colorString = `#fff`;

      /* Line */
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("id", `Line`);
      line.setAttribute("style", `color: ${colorString}; stroke: ${colorString}; stroke-width: ${strokeWidth}px;`);
      line.setAttribute("x1", `${bounding_x}`);
      line.setAttribute("y1", `${bounding_y}`);
      line.setAttribute("x2", `${bounding_u+bounding_x}`);
      line.setAttribute("y2", `${bounding_v+bounding_y}`);
      line.setAttribute("class", `concepts-figure__svg-group`);
      line.setAttribute("active", `true`);
      line.setAttribute("ref", `group`);
      this._currentSvg.appendChild(line);

      this._svgDiv.innerHTML = this._currentSvg.outerHTML;
   }

   showDot() {
      const viewBoxSize = `0 0 ${this._viewBox.width} ${this._viewBox.height}`;
      this._currentSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this._currentSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      this._currentSvg.setAttribute("viewBox", viewBoxSize);

      this._strokeWidth = Math.min(this._previewImg.naturalHeight, 1080) / 200;
      this._fontSize = Math.min(this._previewImg.naturalHeight, 1080) / 333 * 12;
      const strokeWidth = this._strokeWidth;

      const imageWidth = this._viewBox.width;
      const imageHeight = this._viewBox.height;

      const bounding_x = Number(this._data.localizationData.x * imageWidth) + (strokeWidth / 2);
      const bounding_y = Number(this._data.localizationData.y * imageHeight) + (2 * strokeWidth);
      const colorString = `#fff`;

      /* Dot */
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("id", `Dot`);
      circle.setAttribute("style", `color: ${colorString}; stroke: ${colorString}; stroke-width: ${strokeWidth * 5}px;`);
      circle.setAttribute("cx", `${bounding_x - 2}`);
      circle.setAttribute("cy", `${bounding_y - 2}`);
      circle.setAttribute("r", `4`);
      circle.setAttribute("class", `concepts-figure__svg-group`);
      circle.setAttribute("active", `true`);
      circle.setAttribute("ref", `group`);
      this._currentSvg.appendChild(circle);

      this._svgDiv.innerHTML = this._currentSvg.outerHTML;      
   }

   showPoly() {
      const viewBoxSize = `0 0 ${this._viewBox.width} ${this._viewBox.height}`;
      this._currentSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this._currentSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      this._currentSvg.setAttribute("viewBox", viewBoxSize);

      this._strokeWidth = Math.min(this._previewImg.naturalHeight, 1080) / 200;
      this._fontSize = Math.min(this._previewImg.naturalHeight, 1080) / 333 * 12;
      const strokeWidth = this._strokeWidth;
      const colorString = `#fff`;

      const imageWidth = this._viewBox.width;
      const imageHeight = this._viewBox.height;

      const polyPoints = []
      for (let [x,y] of this._data.localizationData.points) {
         const newX = x * imageWidth;
         const newY = y * imageHeight;

         polyPoints.push([newX, newY]);
      }

      const points = String(polyPoints.join(" "));
      console.log(points);

      /* Poly */
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("id", `Poly`);
      poly.setAttribute("style", `color: ${colorString}; stroke: ${colorString}; stroke-width: ${strokeWidth}px; fill: none;`);
      poly.setAttribute("points", `${points}`);
      this._currentSvg.appendChild(poly);

      this._svgDiv.innerHTML = this._currentSvg.outerHTML;
   }
}

customElements.define("entity-panel-image", EntityPanelImage);
