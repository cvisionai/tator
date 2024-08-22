import { TatorPage } from "../../components/tator-page.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { store } from "./store.js";

export class FilesPage extends TatorPage {
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
    header.setAttribute(
      "class",
      "annotation__header d-flex flex-items-center flex-justify-between px-6 f3"
    );
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

    // Create store subscriptions
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );
    store.subscribe((state) => state.project, this._init.bind(this));

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

  connectedCallback() {
    TatorPage.prototype.connectedCallback.call(this);
    // Initialize store data
    store.getState().init();
  }

  static get observedAttributes() {
    return TatorPage.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
  }

  _init(project) {
    this._breadcrumbs.setAttribute("project-name", project.name);
    this._projectId = project.id;
    const fileTypesPromise = fetchCredentials(
      "/rest/FileTypes/" + this._projectId
    );
    fileTypesPromise.then((response) => {
      const fileTypesData = response.json();
      fileTypesData.then((fileTypes) => {
        // Grab the list of file types and display them as selectable options.
        if (fileTypes.length > 0) {
          var params = new URLSearchParams(window.location.search);
          var selectedIndex = 0;
          if (params.has("fileType")) {
            var fileTypeId = Number(params.get("fileType"));
            for (let index = 0; index < fileTypes.length; index++) {
              if (fileTypes[index].id == fileTypeId) {
                selectedIndex = index;
                break;
              }
            }
          }

          this._fileTypeModal.init(fileTypes, selectedIndex);
          this._selectFileType(fileTypes[selectedIndex]);
        } else {
          // Ready to rock and roll
          this._fileTypeButton.text = "No File Types";
          this._loading.style.display = "none";
        }
      });
    });
  }

  _getSortedList(fileList, field, ascending) {
    var outList = [];
    for (const data of fileList) {
      outList.push(data);
    }

    const built_in_fields = [
      "id",
      "name",
      "description",
      "created_datetime",
      "modified_datetime",
    ];
    if (built_in_fields.includes(field)) {
      if (ascending) {
        outList.sort((a, b) => (a[field] > b[field] ? 1 : -1));
      } else {
        outList.sort((a, b) => (a[field] > b[field] ? -1 : 1));
      }
    } else {
      if (ascending) {
        outList.sort((a, b) =>
          a.attributes[field] > b.attributes[field] ? 1 : -1
        );
      } else {
        outList.sort((a, b) =>
          a.attributes[field] > b.attributes[field] ? -1 : 1
        );
      }
    }

    return outList;
  }

  _createTable(fileType, fileList) {
    const sortSVG = `<span class="sort-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M11 7H5l3-4zM5 9h6l-3 4z"/></svg></span>`;

    while (this._fileTableDiv.firstChild) {
      this._fileTableDiv.removeChild(this._fileTableDiv.firstChild);
    }

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
    th.setAttribute("class", "py-2 clickable");
    th.textContent = "ID";
    th.innerHTML += sortSVG;
    th.addEventListener("click", () => {
      this._sortAscending = !this._sortAscending;
      const sortedList = this._getSortedList(
        fileList,
        "id",
        this._sortAscending
      );
      this._createTable(fileType, sortedList);
    });
    trHead.appendChild(th);

    th = document.createElement("th");
    th.setAttribute("class", "py-2 clickable");
    th.textContent = "Name";
    th.innerHTML += sortSVG;
    th.addEventListener("click", () => {
      this._sortAscending = !this._sortAscending;
      const sortedList = this._getSortedList(
        fileList,
        "name",
        this._sortAscending
      );
      this._createTable(fileType, sortedList);
    });
    trHead.appendChild(th);

    th = document.createElement("th");
    th.setAttribute("class", "py-2 clickable");
    th.textContent = "Description";
    th.innerHTML += sortSVG;
    th.addEventListener("click", () => {
      this._sortAscending = !this._sortAscending;
      const sortedList = this._getSortedList(
        fileList,
        "description",
        this._sortAscending
      );
      this._createTable(fileType, sortedList);
    });
    trHead.appendChild(th);

    th = document.createElement("th");
    th.setAttribute("class", "py-2 clickable");
    th.textContent = "Created Datetime";
    th.innerHTML += sortSVG;
    th.addEventListener("click", () => {
      this._sortAscending = !this._sortAscending;
      const sortedList = this._getSortedList(
        fileList,
        "created_datetime",
        this._sortAscending
      );
      this._createTable(fileType, sortedList);
    });
    trHead.appendChild(th);

    th = document.createElement("th");
    th.setAttribute("class", "py-2 clickable");
    th.textContent = "Modified Datetime";
    th.innerHTML += sortSVG;
    th.addEventListener("click", () => {
      this._sortAscending = !this._sortAscending;
      const sortedList = this._getSortedList(
        fileList,
        "modified_datetime",
        this._sortAscending
      );
      this._createTable(fileType, sortedList);
    });
    trHead.appendChild(th);

    var attrTypeNames = [];
    for (const attrType of fileType.attribute_types) {
      attrTypeNames.push(attrType.name);

      th = document.createElement("th");
      th.setAttribute("class", "py-2 clickable");
      th.textContent = attrType.name;
      th.innerHTML += sortSVG;
      th.addEventListener("click", () => {
        this._sortAscending = !this._sortAscending;
        const sortedList = this._getSortedList(
          fileList,
          attrType.name,
          this._sortAscending
        );
        this._createTable(fileType, sortedList);
      });
      trHead.appendChild(th);
    }

    th = document.createElement("th");
    th.setAttribute("class", "py-2 clickable");
    th.textContent = "Download";
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
        } else {
          td.textContent = "";
        }
        trData.appendChild(td);
      }

      td = document.createElement("td");
      var linksWrapper = document.createElement("div");
      td.appendChild(linksWrapper);

      if (fileData.path) {
        let svgDiv = document.createElement("div");
        svgDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
        let action = document.createElement("a");
        action.setAttribute("class", "clickable text-gray align-center");
        action.setAttribute("target", "_blank");
        action.addEventListener("click", () => {
          // Get a presigned URL if the file object has a non-blank path
          if (fileData.path.includes("media")) {
            // Legacy path where the path is not an object
            var url = fileData.path;
            action.setAttribute("href", url);
            window.open(url, "_blank").focus();
          } else {
            // Path is an object key
            fetchCredentials(
              `/rest/DownloadInfo/${fileType.project}?expiration=3600`,
              {
                method: "POST",
                body: JSON.stringify({ keys: [fileData.path] }),
              }
            )
              .then((response) => {
                return response.json();
              })
              .then((result) => {
                var url = result[0].url;
                action.setAttribute("href", url);
                window.open(url, "_blank").focus();
              });
          }
        });
        action.appendChild(svgDiv);
        linksWrapper.appendChild(action);
      }
      trData.appendChild(td);
    }

    // Ready to rock and roll
    this._loading.style.display = "none";
  }

  _selectFileType(fileType) {
    const url = new URL(window.location.href);
    url.searchParams.delete("fileType");
    url.searchParams.set("fileType", fileType.id);
    window.history.replaceState(null, null, url);

    this._fileTypeButton.text = fileType.name;
    this._loading.style.display = "block";

    const fileListPromise = fetchCredentials(
      `/rest/Files/${this._projectId}?type=${fileType.id}`
    );
    fileListPromise.then((response) => {
      const fileListData = response.json();
      fileListData.then((fileList) => {
        // Default is to show the newest ID at the top of the table
        this._sortOrder = "id";
        this._sortAscending = false;
        const sortedFileList = this._getSortedList(
          fileList,
          this._sortOrder,
          this._sortAscending
        );
        this._createTable(fileType, sortedFileList);
      });
    });
  }
}

customElements.define("files-page", FilesPage);
