class FilesPage extends TatorPage {
  constructor() {
    super();
    this._loading = document.createElement("img");
    this._loading.setAttribute("class", "loading");
    this._loading.setAttribute("src", "/static/images/tator_loading.gif");
    this._shadow.appendChild(this._loading);

    // Header
    // - Breadcrumbs shown on the top left
    // - FileType selector shown next to it (similar to version selector in annotator)
    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute("class", "annotation__header d-flex flex-items-center flex-justify-between px-6 f3");
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(header, user);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(div);

    this._breadcrumbs = document.createElement("analytics-breadcrumbs");
    div.appendChild(this._breadcrumbs);
    this._breadcrumbs.setAttribute("analytics-name", "Files");

    this._fileTypeButton = document.createElement("file-type-button");
    div.appendChild(this._fileTypeButton);

    // Main section of the page
    // - This will display the table of files associated with the currently selected FileType
    const main = document.createElement("main");
    main.setAttribute("class", "d-flex flex-column");
    this._shadow.appendChild(main);

    this._fileTypeModal = document.createElement("file-type-dialog");
    main.appendChild(this._fileTypeModal);

    this._fileTableDiv = document.createElement("div");
    this._fileTableDiv.setAttribute("class", "px-3 py-3");
    main.appendChild(this._fileTableDiv);

    // Event listeners
    this._fileTypeButton.addEventListener("click", () => {
      this._fileTypeModal.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
      document.body.classList.add("shortcuts-disabled");
    });

    this._fileTypeModal.addEventListener("close", () => {
      this.removeAttribute("has-open-modal");
      document.body.classList.remove("shortcuts-disabled");
    });

    this._fileTypeModal.addEventListener("fileTypeSelect", (evt) => {
      this.removeAttribute("has-open-modal");
      document.body.classList.remove("shortcuts-disabled");
      this._selectFileType(evt.detail.fileType);
    });
  }

  static get observedAttributes() {
    return["project-name", "project-id"].concat(TatorPage.observedAttributes);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "project-name":
        this._breadcrumbs.setAttribute("project-name", newValue);
        break;
      case "project-id":
        this._init(newValue);
        break;
    }
  }

  _init(projectId) {
    this._projectId = projectId;
    const fileTypesPromise = fetch("/rest/FileTypes/" + this._projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    fileTypesPromise.then((response) => {
      const fileTypesData = response.json();
      fileTypesData.then((fileTypes) => {

        // Grab the list of file types and display them as selectable options.
        if (fileTypes.length > 0) {
          this._fileTypeModal.init(fileTypes, 0);
          this._selectFileType(fileTypes[0]);
        }
        else {
          // Ready to rock and roll
          this._fileTypeButton.text = "No File Types";
          this._loading.style.display = "none";
        }
      });
    });
  }

  _selectFileType(fileType) {

    this._fileTypeButton.text = fileType.name;

    while (this._fileTableDiv.firstChild) {
      this._fileTableDiv.removeChild(this._fileTableDiv.firstChild);
    }

    this._loading.style.display = "block";

    const fileListPromise = fetch(`/rest/Files/${this._projectId}?meta=${fileType.id}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    fileListPromise.then((response) => {
      const fileListData = response.json();
      fileListData.then((fileList) => {

        const table = document.createElement("table");
        table.setAttribute("class", "file-table text-gray f2");
        this._fileTableDiv.appendChild(table);

        // Create the table header using the attributes of the current file type
        const thead = document.createElement("thead");
        thead.setAttribute("class", "text-white");
        table.appendChild(thead);
        const trHead = document.createElement("tr");
        thead.appendChild(trHead);

        var th;
        th = document.createElement("th");
        th.setAttribute("class", "py-2");
        th.textContent = "ID";
        trHead.appendChild(th);

        th = document.createElement("th");
        th.setAttribute("class", "py-2");
        th.textContent = "Name";
        trHead.appendChild(th);

        th = document.createElement("th");
        th.setAttribute("class", "py-2");
        th.textContent = "Description";
        trHead.appendChild(th);

        th = document.createElement("th");
        th.setAttribute("class", "py-2");
        th.textContent = "Created Datetime";
        trHead.appendChild(th);

        th = document.createElement("th");
        th.setAttribute("class", "py-2");
        th.textContent = "Modified Datetime";
        trHead.appendChild(th);

        var attrTypeNames = []
        for (const attrType of fileType.attribute_types) {
          attrTypeNames.push(attrType.name);

          th = document.createElement("th");
          th.setAttribute("class", "py-2");
          th.textContent = attrType.name;
          trHead.appendChild(th);
        }

        th = document.createElement("th");
        th.setAttribute("class", "py-2");
        th.textContent = "Link";
        trHead.appendChild(th);

        // Create the table data
        const tbody = document.createElement("tbody");
        table.appendChild(tbody);

        for (const fileData of fileList) {
          const trData = document.createElement("tr");
          tbody.appendChild(trData);

          var td;
          td = document.createElement("td");
          td.textContent = `${fileData.id}`;
          trData.appendChild(td);

          td = document.createElement("td");
          td.textContent = `${fileData.name}`;
          trData.appendChild(td);

          td = document.createElement("td");
          td.textContent = `${fileData.description}`;
          trData.appendChild(td);

          td = document.createElement("td");
          td.textContent = `${fileData.created_datetime}`;
          trData.appendChild(td);

          td = document.createElement("td");
          td.textContent = `${fileData.modified_datetime}`;
          trData.appendChild(td);

          for (const attrName of attrTypeNames) {
            var td;
            td = document.createElement("td");
            if (attrName in fileData.attributes) {
              td.textContent = `${fileData.attributes[attrName]}`;
            }
            else {
              td.textContent = "";
            }
            trData.appendChild(td);
          }

          td = document.createElement("td");
          var linksWrapper = document.createElement("div");
          linksWrapper.setAttribute("class", "d-flex flex-column");
          td.appendChild(linksWrapper);
      
          let action = document.createElement("a");
          action.setAttribute("class", "clickable text-purple text-bold");
          action.setAttribute("target", "_blank");
          action.setAttribute("href", `${fileData.path}`);
          action.appendChild(document.createTextNode("Link"));
          linksWrapper.appendChild(action);
          trData.appendChild(td);
        }

        // Ready to rock and roll
        this._loading.style.display = "none";

      });
    });
  }
}

customElements.define("files-page", FilesPage);
