import { TatorElement } from "../../components/tator-element.js";
export class LeafItem extends TatorElement {
   constructor() {
      super();
      

      this.innerLeafBox = document.createElement("div");
      this.innerLeafBox.setAttribute("class", "leaves-edit py-3 d-flex flex-row f1 flex-items-center");
      this.innerLeafBox.style.borderBottom = "1px solid rgba(255, 255, 255, .4)";
      this._shadow.appendChild(this.innerLeafBox);

      this.minusIcon = document.createElement("span");
      this.minusIcon.setAttribute("class", "text-gray leaves-minus py-1");
      this.minusIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class=""><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
      this.minusIcon.hidden = true;

      this.addIcon = document.createElement("span");
      this.addIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class=""><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
      this.addIcon.setAttribute("class", "text-gray leaves-plus py-1");
      this.addIcon.hidden = true;
      
      this.leafIndent = document.createElement("span");
      this.leafIndent.setAttribute("class", "d-flex flex-align-center");

      this.leafName = document.createElement("span");
      this.leafName.setAttribute("draggable", "true");
      this.leafName.setAttribute("class", "py-2 px-2");

      this.leafCurrent = document.createElement("div");
      this.leafCurrent.appendChild(this.leafIndent);
      this.leafCurrent.setAttribute("class", "col-12 px-3");
      this.innerLeafBox.appendChild(this.leafCurrent);

      this.editIcon = document.createElement("div");
      this.editIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
      
      this.editIcon.setAttribute("class", "clickable text-gray hover-text-white py-2 px-2");
      this.innerLeafBox.appendChild(this.editIcon);

     this.deleteIcon = document.createElement("delete-button");
     this.deleteIcon.innerHTML = `<svg id="icon-trash" viewBox="0 0 24 24" height="24" width="24" stroke-width="1"><path d="M18 7v13c0 0.137-0.027 0.266-0.075 0.382-0.050 0.122-0.125 0.232-0.218 0.325s-0.203 0.167-0.325 0.218c-0.116 0.048-0.245 0.075-0.382 0.075h-10c-0.137 0-0.266-0.027-0.382-0.075-0.122-0.050-0.232-0.125-0.325-0.218s-0.167-0.203-0.218-0.325c-0.048-0.116-0.075-0.245-0.075-0.382v-13zM17 5v-1c0-0.405-0.081-0.793-0.228-1.148-0.152-0.368-0.375-0.698-0.651-0.974s-0.606-0.499-0.974-0.651c-0.354-0.146-0.742-0.227-1.147-0.227h-4c-0.405 0-0.793 0.081-1.148 0.228-0.367 0.152-0.697 0.375-0.973 0.651s-0.499 0.606-0.651 0.973c-0.147 0.355-0.228 0.743-0.228 1.148v1h-4c-0.552 0-1 0.448-1 1s0.448 1 1 1h1v13c0 0.405 0.081 0.793 0.228 1.148 0.152 0.368 0.375 0.698 0.651 0.974s0.606 0.499 0.974 0.651c0.354 0.146 0.742 0.227 1.147 0.227h10c0.405 0 0.793-0.081 1.148-0.228 0.368-0.152 0.698-0.375 0.974-0.651s0.499-0.606 0.651-0.974c0.146-0.354 0.227-0.742 0.227-1.147v-13h1c0.552 0 1-0.448 1-1s-0.448-1-1-1zM9 5v-1c0-0.137 0.027-0.266 0.075-0.382 0.050-0.122 0.125-0.232 0.218-0.325s0.203-0.167 0.325-0.218c0.116-0.048 0.245-0.075 0.382-0.075h4c0.137 0 0.266 0.027 0.382 0.075 0.122 0.050 0.232 0.125 0.325 0.218s0.167 0.203 0.218 0.325c0.048 0.116 0.075 0.245 0.075 0.382v1z"></path></svg>`;
     
     this.deleteIcon.setAttribute("class", "clickable text-gray hover-text-white py-2 px-2");
     this.innerLeafBox.appendChild(this.deleteIcon);


   }

   _init(leaf, leafMain) {
      this.leaf = leaf;
      this.innerLeafBox.setAttribute("leafid", leaf.id)
      this.leafMain = leafMain;

      if (leaf.expands) {
         this.leafIndent.appendChild(this.minusIcon);
         this.leafIndent.appendChild(this.addIcon);
         this.classList.add("clickable");
         if (leaf.indent > 0) {
            this.minusIcon.hidden = false;
         }
      }

      if (leaf.indent > 0) {
         this.leafIndent.setAttribute("style", `padding-left: ${(leaf.indent) * 30}px;`); 
         this.classList.add("hidden");
      } else {
         this.addIcon.hidden = false;
      }
      
      const leafNameText = document.createTextNode(`${leaf.name} (id: ${leaf.id})`);
      this.leafName.appendChild(leafNameText);
      this.leafIndent.appendChild(this.leafName);

      this.deleteIcon.setAttribute("title", `Delete ${leaf.name}`);
      this.editIcon.setAttribute("title", `Edit ${leaf.name}`); 

      // Draggable listeners
      this.leafName.addEventListener('dragstart', this.handleDragStart.bind(this));
      this.leafName.addEventListener('dragover', this.handleDragOver.bind(this));
      this.leafName.addEventListener('dragend', this.handleDragEnd.bind(this));
      this.leafName.addEventListener('dragenter', this.handleDragEnter.bind(this));
      this.leafName.addEventListener('dragleave', this.handleDragLeave.bind(this));
      this.leafName.addEventListener('drop', this.handleDrop.bind(this));
   }


   handleDragStart(e) {
      console.log("Start drag "+this.leaf.id)
      this.innerLeafBox.style.opacity = '0.4';

      e.dataTransfer.effectAllowed = 'move';
      
      const forLeaf = this.leaf.id;
      const newParent = null;
      const data = {forLeaf,newParent};

      console.log(`handleDragStart:Move ${forLeaf} to a no parent yet, newparent: ${newParent}`);
      this.leafMain.movingEl = forLeaf;
      e.dataTransfer.setData("text/plain", JSON.stringify(data));
   }
 
   handleDragEnd(e) {
      this.innerLeafBox.style.opacity = '1';
      this.leafName.style.border = "none";
      this.leafMain.leafBox.style.border = "none";
   }
   
   handleDragEnter(e) {
      this.leafName.style.border = "3px dotted #333";
      this.leafMain.leafBox.style.border = "none";
   }
   
   handleDragOver(e) {
      e.preventDefault();
      this.leafMain.leafBox.style.border = "none";
      return false;
    }
  
   handleDragLeave(e) {
      this.leafName.style.border = "none";
    }
   

   handleDrop(e) {
      e.stopPropagation(); // stops the browser from redirecting.
      console.log("Leaf Item handle drop");
      this.leafName.style.border = "none";
      
      const textData = e.dataTransfer.getData("text/plain");
      console.log(textData);

      const data = JSON.parse(textData);
      data.newParent = this.leaf.id;

      console.log(`Move ${data.forLeaf} to a new parent ${data.newParent}?`);
      this.dispatchEvent(new CustomEvent("new-parent", { detail: data }));

      return false;
   }

}

customElements.define("leaf-item", LeafItem);
