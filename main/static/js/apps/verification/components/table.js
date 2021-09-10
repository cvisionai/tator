class appsTable extends TatorElement {
   constructor() {
      super();

      this._main = document.createElement("div");
      this._main.setAttribute("class", "px-6 mr-6");
      this._shadow.appendChild(this._main);

      this._tableCount = 0;

      //
      this._table = document.createElement("table");
      this._table.setAttribute("class", "apps__table")
      this._main.appendChild(this._table);

      // Keep track of rows
      this._rows = [];
      this._rowDataIndex = {}; // 1234 : 0, 12345 : 1

      this._sortRemember = {};
      this.headerNameMap = new Map();
   }

   /**
    * 
    * @param {json} data
    * @param {Node} panelContainer
    * 
    */
   init({ columns = null, panelContainer = null }) {
      this.panelContainer = panelContainer;

      for (let col of columns) {
         this.headerNameMap.set(col.name, col.name);
      }
   }

   /**
    * 
    * @param {json} data 
    */
   _refreshTable(data) {
      // console.log("Clearing out table");

      this._table.innerHTML = "";
      this._rows = [];
      this._rowDataIndex = {}; // 1234 : 0, 12345 : 1

      this._addTable(data);
   }

   /**
    * 
    * @param {json} data 
    */
   _addTable(data) {
      console.log(this.headerNameMap);
      // Heading row
      // Add a header and a row for all data
      let header = this.getRow(true);
      this._table.appendChild(header);
      
      for (let [label, path] of this.headerNameMap) {
         console.log(`label, path ${label}, ${path}`);
         let data = {
            name: path,
            value: label
         }
         
         this.addCol(data, header);
      }

      // Now for each data object....
      for (let item of data) {
         let rowObject = item.attributes;
         let row = this.getRow(false);
         row.setAttribute("class", "table-row")
         row.setAttribute("data", JSON.stringify(rowObject));
         row.setAttribute("id", item.id);

         this._rowDataIndex[item.id] = row;

         // #todo instead of going through data, prob should loop header items
         for (let [label, path] of this.headerNameMap) {
            let value = rowObject[path];

            if (typeof value === "undefined" || value === null) {
               value = "--";
            }

            // Add the data item
            let colObj = {
               name: path,
               value
            }

            this.addCol(colObj, row);
         }

         // row.addEventListener("click", () => {
         //    let evt = null;

         //    // open panel with this data....
         //    if (row.classList.contains("selected")) {
         //       evt = new CustomEvent("detail-click", { detail: { rowData: rowObject, row: row, openFlag: false } });

         //       this._deselectRows();
         //    } else {
         //       evt = new CustomEvent("detail-click", { detail: { rowData: rowObject, row: row, openFlag: true } });

         //       this._deselectRows();
         //       row.classList.add("selected");
         //    }
         //    this.dispatchEvent(evt);
         // });

         if (typeof rowObject.selectedFlag !== "undefined" && rowObject.selectedFlag) {
            row.classList.add("selected")
         }

         this._rows.push(row);
         this._table.appendChild(row);
      }

      this.updateTableCount();
   }

   _deselectRows() {
      this._table.querySelectorAll('.selected').forEach(row => {
         row.classList.remove("selected");
      });
   }

   findSelected() {
      let selectedRow = this._table.querySelector('.selected');
      if (selectedRow) return selectedRow.getAttribute("id");
      return false
   }

   /**
    * 
    * @param {Bool} headerRow 
    * @returns {Node}
    */
   getRow(headerRow) {
      let row = document.createElement("tr");
      this._table.appendChild(row);

      this._columns = [];
      row.setAttribute("isHeaderRow", headerRow);
      return row;
   }

   /**
    * 
    * @param {json} data 
    * @param {Node} row 
    */
   addCol(colObj, row) {
      let column = null;
      if (row.getAttribute("isHeaderRow") && row.getAttribute("isHeaderRow") == "true") {
         column = document.createElement("th");
         this._addColumnSort(column);
      } else {
         column = document.createElement("td");
      }

      console.log(colObj)

      column.setAttribute("name", colObj.name);

      // if (colObj.name == "name") {
      //    column.classList.add("wide");
      // }

      // if (colObj.name == "size" || data.name == "file_type") {
      //    column.classList.add("narrow");
      // }

      let textSpan = document.createElement("span")
      textSpan.appendChild(document.createTextNode(colObj.value));
      column.prepend(textSpan);

      this._columns.push(column);

      row.appendChild(column);
   }

   /**
    * 
    * @param {Node} column 
    */
   _addColumnSort(column) {
      let sortSVG = `<span class="sort-icon default-sort clickable"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M11 7H5l3-4zM5 9h6l-3 4z"/></svg></span>`;
      column.innerHTML += sortSVG;

      
      column.addEventListener("click", () => {
         let colName = column.getAttribute("name");
         let current = typeof this._sortRemember[colName] !== "undefined" ? this._sortRemember[colName] : "default";

         let direction = (current == "default" || current == "dsc") ? "asc" : "dsc";
         this._sortRemember[colName] = direction;

         let sortData = {
            sortType: direction,
            name: colName
         }

         let evt = new CustomEvent("sort", { detail: { sortData } });
         this.dispatchEvent(evt);
      });
   }

   /**
    * 
    * @param {Set} rowIds 
    */
   showOnly(rowIds) {
      this._deselectRows();
      // console.log(rowIds);
      for (let row of this._rows) {
         let id = row.getAttribute('id');
         // console.log(`is id ${id} in our index? ${rowIds.has(id)}`)
         if (!rowIds.has(Number(id))) {
            this._rowDataIndex[id].classList.add("hidden");
         } else {
            this._rowDataIndex[id].classList.remove("hidden");
         }
      }
      this.updateTableCount();
   }

   showAll(selectAll) {
      this._deselectRows();
      for (let row of this._rows) {
         if (selectAll) {
            row.classList.remove("hidden");
         } else {
            row.classList.add("hidden");
         }
         
      }
      this.updateTableCount();
   }

   updateTableCount() {
      let rowQuery = this._table.querySelectorAll(".table-row:not(.hidden)");
      let rowLength = rowQuery.length;
      for (let [i, row] of Object.entries(rowQuery)) {
         let odd = i % 2;
         if (odd) {
            row.classList.remove("even");
            row.classList.add("odd");
         } else {
            row.classList.add("even");
            row.classList.remove("odd");
         }
      }
      this._tableCount = rowLength;
      this.dispatchEvent(new Event("update-count"));
   }

}

customElements.define("verification-table", appsTable);
