import { TatorPage } from "../components/tator-page.js";
import { hasPermission } from "../util/has-permission.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { TatorData } from "../util/tator-data.js";
import { svgNamespace } from "../components/tator-element.js";
import { LoadingSpinner } from "../components/loading-spinner.js";
import { FilterData } from "../components/filter-data.js";
import { v1 as uuidv1 } from "uuid";
import { store } from "./store.js";
import { api } from "./store.js";
import { FilterConditionData } from "../util/filter-utilities.js"
import { fetchRetry } from "../util/fetch-retry.js";
import Gear from "../../images/svg/gear.svg";

export class ProjectDetail extends TatorPage {
  constructor() {
    super();

    // Success and warning Utility hooks
    const utilitiesDiv = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    utilitiesDiv.setAttribute("class", "annotation__header d-flex flex-items-center flex-justify-between px-6 f3");
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(utilitiesDiv, user);

    this._lightSpacer = document.createElement("span");
    this._lightSpacer.style.width = "32px";
    utilitiesDiv.appendChild(this._lightSpacer);

    this._success = document.createElement("success-light");
    this._lightSpacer.appendChild(this._success);

    this._warning = document.createElement("warning-light");
    this._lightSpacer.appendChild(this._warning);

    // Wrapper to allow r.side bar to slide into left
    this.mainWrapper = document.createElement("div");
    this.mainWrapper.setAttribute("class", "analysis--main--wrapper col-12 d-flex");
    this._shadow.appendChild(this.mainWrapper);

    // Original main element
    this.main = document.createElement("main");
    this.main.setAttribute("class", "d-flex col-11");
    this.main.setAttribute("style", "padding-left: 390px;");
    this.mainWrapper.appendChild(this.main);

    /* LEFT*** Navigation Pane - Project Detail Viewer */
    this.aside = document.createElement("aside");
    this.aside.setAttribute("class", "entity-panel--container-left col-3"); //slide-close
    this.aside.hidden = true;
    this.mainWrapper.appendChild(this.aside);

    // Gallery navigation panel
    this._panelContainer = document.createElement("entity-panel-container");
    this.aside.appendChild(this._panelContainer);

    //
    const section = document.createElement("section");
    section.setAttribute("class", "sections-wrap py-6 col-3 px-5 text-gray"); //

    const folderHeader = document.createElement("div");
    folderHeader.setAttribute("class", "d-flex flex-justify-between flex-items-center py-4");
    section.appendChild(folderHeader);

    const folderText = document.createElement("h2");
    folderText.setAttribute("class", "h3 text-semibold");
    folderText.textContent = "Library";
    folderHeader.appendChild(folderText);

    const addFolderButton = document.createElement("button");
    addFolderButton.setAttribute("class", "px-0 f2 btn-clear text-gray hover-text-white");
    folderHeader.appendChild(addFolderButton);

    const addFolderSpan = document.createElement("span");
    addFolderSpan.setAttribute("class", "f1 px-1");
    addFolderSpan.textContent = "+";
    addFolderButton.appendChild(addFolderSpan);

    const addFolderText = document.createTextNode("Add folder");
    addFolderButton.appendChild(addFolderText);

    this._folders = document.createElement("ul");
    this._folders.setAttribute("class", "sections");
    section.appendChild(this._folders);

    const savedSearchHeader = document.createElement("div");
    savedSearchHeader.setAttribute("class", "d-flex flex-justify-between flex-items-center py-4");
    section.appendChild(savedSearchHeader);

    const savedSearchText = document.createElement("h2");
    savedSearchText.setAttribute("class", "h3 text-semibold");
    savedSearchText.textContent = "Saved Searches";
    savedSearchHeader.appendChild(savedSearchText);

    this._addSavedSearchButton = document.createElement("button");
    this._addSavedSearchButton.setAttribute("class", "px-0 f2 btn-clear text-gray hover-text-white");
    this._addSavedSearchButton.style.opacity = 0.5;
    this._addSavedSearchButton.style.cursor = "not-allowed";
    savedSearchHeader.appendChild(this._addSavedSearchButton);

    const addSavedSearchSpan = document.createElement("span");
    addSavedSearchSpan.setAttribute("class", "f1 px-1");
    addSavedSearchSpan.textContent = "+";
    this._addSavedSearchButton.appendChild(addSavedSearchSpan);

    const addSavedSearchText = document.createTextNode("Add current search");
    this._addSavedSearchButton.appendChild(addSavedSearchText);

    this._savedSearches = document.createElement("ul");
    this._savedSearches.setAttribute("class", "sections");
    section.appendChild(this._savedSearches);

    const bookmarkHeader = document.createElement("div");
    bookmarkHeader.setAttribute("class", "d-flex flex-justify-between flex-items-center py-4");
    section.appendChild(bookmarkHeader);

    const bookmarkText = document.createElement("h2");
    bookmarkText.setAttribute("class", "h3 text-semibold");
    bookmarkText.textContent = "Bookmarks";
    bookmarkHeader.appendChild(bookmarkText);

    this._bookmarks = document.createElement("ul");
    this._bookmarks.setAttribute("class", "sections");
    section.appendChild(this._bookmarks);

    const archivedFoldersButton = document.createElement("button");
    archivedFoldersButton.setAttribute("class", "collapsible px-0 f2 btn-clear text-gray hover-text-white py-4");
    section.appendChild(archivedFoldersButton);

    this.archivedFolderText = document.createElement("h2");
    this.archivedFolderText.setAttribute("class", "h3 text-semibold");
    this.archivedFolderText.textContent = "+ Archived Folders";
    archivedFoldersButton.appendChild(this.archivedFolderText);

    this._archivedFolders = document.createElement("ul");
    this._archivedFolders.setAttribute("class", "content sections");
    this._archivedFolders.style.display = "none";
    section.appendChild(this._archivedFolders);

    this._mainSection = document.createElement("section");
    this._mainSection.setAttribute("class", "py-3 px-6 flex-grow"); //project__main
    this.main.appendChild(this._mainSection);

    this.gallery = {};
    this.gallery._main = this._mainSection;

    const div = document.createElement("div");
    div.setAttribute("class", "py-6");
    this.gallery._main.appendChild(div);

    const header = document.createElement("div");
    header.setAttribute("class", "main__header d-flex flex-justify-between");
    div.appendChild(header);

    const nameDiv = document.createElement("div");
    nameDiv.setAttribute("class", "d-flex flex-row flex-items-center");
    header.appendChild(nameDiv);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    nameDiv.appendChild(h1);

    this._settingsButton = document.createElement("a");
    this._settingsButton.setAttribute("class", "px-2 h2 text-gray hover-text-white");
    this._settingsButton.style.marginTop = "6px";
    nameDiv.appendChild(this._settingsButton);

    const settingsSvg = document.createElementNS(svgNamespace, "svg");
    settingsSvg.setAttribute("viewBox", "0 0 24 24");
    settingsSvg.setAttribute("height", "1em");
    settingsSvg.setAttribute("width", "1em");
    this._settingsButton.appendChild(settingsSvg);

    const settingsPath = document.createElementNS(svgNamespace, "use");
    settingsPath.setAttribute("href", `${Gear}#path`);
    settingsSvg.appendChild(settingsPath);

    this._projectText = document.createTextNode("");
    h1.appendChild(this._projectText);

    const buttons = document.createElement("div");
    buttons.setAttribute("class", "d-flex");
    header.appendChild(buttons);

    this._analyticsButton = document.createElement("analytics-button");
    this._analyticsButton.style.marginRight = "10px";
    buttons.appendChild(this._analyticsButton);

    this._activityButton = document.createElement("activity-button");
    buttons.appendChild(this._activityButton);

    this._description = document.createElement("project-text");
    div.appendChild(this._description);

    const subheader = document.createElement("div");
    subheader.setAttribute("class", "d-flex flex-justify-right");
    this._mainSection.appendChild(subheader);

    // Hidden search input
    this._search = document.createElement("project-search");

    const filterdiv = document.createElement("div");
    filterdiv.setAttribute("class", "mt-3");
    this._mainSection.appendChild(filterdiv);

    this._filterView = document.createElement("filter-interface");
    filterdiv.appendChild(this._filterView);

    this._collaborators = document.createElement("project-collaborators");
    subheader.appendChild(this._collaborators);

    this._projects = document.createElement("div");
    this._mainSection.appendChild(this._projects);

    // Part of Gallery: Communicates between card + page
    this._bulkEdit = document.createElement("entity-gallery-bulk-edit");
    this._bulkEdit._selectionPanel.hidden = true;
    this._shadow.appendChild(this._bulkEdit);
    filterdiv.appendChild(this._bulkEdit._selectionPanel);

    // Media section
    this._mediaSection = document.createElement("media-section");
    this._projects.appendChild(this._mediaSection);
    this._mediaSection.addEventListener("runAlgorithm", this._openConfirmRunAlgoModal.bind(this));

    // Card attribute stuff related to mediaSection
    /**
    * CARD Label display options link for menu, and checkbox div
    */
    this._cardAttributeLabels = document.createElement("entity-gallery-labels");
    this._cardAttributeLabels.setAttribute("id", "showMediaAttributes")
    this._cardAttributeLabels.titleEntityTypeName = "media";
    this._cardAttributeLabels._titleText = document.createTextNode("Select media labels to display.");
    this._cardAttributeLabels.menuLinkTextSpan.innerHTML = "Show file attributes";

    this._mediaSection._hiddenMediaLabel.appendChild(this._cardAttributeLabels);
    this._mediaSection._more._cardLink.appendChild(this._cardAttributeLabels.menuLink);
    this._mediaSection._more.addEventListener("bulk-edit", this._openBulkEdit.bind(this));

    this._cardAttributeLabels.addEventListener("labels-update", (evt) => {
      // updates labels on cards
      this._mediaSection._files.dispatchEvent(new CustomEvent("labels-update", evt.detail));
      this._bulkEdit._updateShownAttributes({ typeId: evt.detail.typeId, values: evt.detail.value });
      this._mediaSection._files.cardLabelsChosenByType[evt.detail.typeId] = evt.detail.value;
    });

    // references inner for card setup and pagination checkbox clear
    this._mediaSection.bulkEdit = this._bulkEdit;
    this._mediaSection._files.bulkEdit = this._bulkEdit;


    // Confirm algorithm
    this._confirmRunAlgorithm = document.createElement("confirm-run-algorithm");
    this._projects.appendChild(this._confirmRunAlgorithm);
    this._confirmRunAlgorithm.addEventListener("close", this._closeConfirmRunAlgoModal.bind(this));

    const deleteSection = document.createElement("delete-section-form");
    this._projects.appendChild(deleteSection);

    this.deleteFileForm = document.createElement("delete-file-form");
    this._projects.appendChild(this.deleteFileForm);

    this.modalNotify = document.createElement("modal-notify");
    this._projects.appendChild(this.modalNotify);

    this.modal = document.createElement("modal-dialog");
    this._projects.appendChild(this.modal);

    const cancelJob = document.createElement("cancel-confirm");
    this._shadow.appendChild(cancelJob);

    this.moveFile = document.createElement("media-move-dialog");
    this._shadow.appendChild(this.moveFile);

    const newSectionDialog = document.createElement("name-dialog");
    this._projects.appendChild(newSectionDialog);

    this._uploadDialog = document.createElement("upload-dialog");
    this._projects.appendChild(this._uploadDialog);

    const attachmentDialog = document.createElement("attachment-dialog");
    attachmentDialog._header.classList.add("fixed-height-scroll");
    this._projects.appendChild(attachmentDialog);

    this._activityNav = document.createElement("activity-nav");
    this.main.appendChild(this._activityNav);

    // Class to hide and showing loading spinner
    this.loading = new LoadingSpinner();
    this._shadow.appendChild(this.loading.getImg())

    // Create store subscriptions
    store.subscribe(state => state.user, this._setUser.bind(this));
    store.subscribe(state => state.announcements, this._setAnnouncements.bind(this));

    window.addEventListener("beforeunload", evt => {
      if (this._uploadDialog.hasAttribute("is-open")) {
        evt.preventDefault();
        evt.returnValue = '';
        window.alert("Uploads are in progress. Still leave?");
      }
    });

    this.moveFile.addEventListener("reload", () => {
      this._mediaSection.reload();
      this._bulkEdit._clearSelection();
    });
    this.moveFile.addEventListener("new-section", (evt) => {
      this._sectionVisibilityEL(evt);
      this._bulkEdit._clearSelection();
    });

    addFolderButton.addEventListener("click", evt => {
      newSectionDialog.init("Add Folder", "folder");
      newSectionDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    archivedFoldersButton.addEventListener("click", evt => {
      this.classList.toggle("active");
      const content = this._archivedFolders
      if (content.style.display === "block") {
        content.style.display = "none";
        this.archivedFolderText.textContent = "+ Archived Folders";
      } else {
        content.style.display = "block";
        this.archivedFolderText.textContent = "- Archived Folders";
      }
    });

    this._addSavedSearchButton.addEventListener("click", evt => {
      if (this._addSavedSearchButton.style.cursor == "pointer") {
        newSectionDialog.init("Save current search", "savedSearch");
        newSectionDialog.setAttribute("is-open", "");
        this.setAttribute("has-open-modal", "");
      }
    });

    newSectionDialog.addEventListener("close", async evt => {
      if (newSectionDialog._confirm) {
        let spec;
        if (newSectionDialog._sectionType == "folder") {
          spec = {
            name: newSectionDialog._input.value,
            tator_user_sections: uuidv1(),
            visible: true
          };
        } else if (newSectionDialog._sectionType == "savedSearch") {
          spec = { visible: true };

          // Check if an existing section is selected.
          const params = new URLSearchParams(document.location.search.substring(1));
          if (params.has("section")) {
            const sectionId = Number(params.get("section"));
            await fetchCredentials(`/rest/Section/${sectionId}`)
              .then(response => response.json())
              .then(section => { spec = section; });
          }
          spec.name = newSectionDialog._input.value;

          if (params.has("encoded_search")) {
            let object_search = JSON.parse(atob(params.get("encoded_search")));
            if (spec.object_search) {
              let union_operation = {"method": "and", operations:[spec.object_search, object_search]}
              spec.object_search = union_operation;
            } else {
              spec.object_search = object_search;
            }
          }

          if (params.has("encoded_related_search")) {
            let related_search = JSON.parse(atob(params.get("encoded_related_search")));
            if (spec.related_search) {
              let union_operation = {"method": "and", operations:[spec.object_search, related_search]}
              spec.related_search = union_operation;
            } else {
              spec.related_search = related_search;
            }
          }

          delete spec.id;
          if (spec.tator_user_sections === null) {
            delete spec.tator_user_sections;
          }
        } else if (newSectionDialog._sectionType == "playlist") {
          //TODO: Handle adding playlist
        }
        const projectId = Number(this.getAttribute("project-id"));
        fetchCredentials(`/rest/Sections/${projectId}`, {
          method: "POST",
          body: JSON.stringify(spec),
        })
          .then(async response => {
            let section = await response.json();
            if (response.status != 201)
            {
              if (this._modalError == undefined)
              {
                this._modalError = document.createElement("modal-dialog");
                this._shadow.appendChild(this._modalError);
              }
              this._modalError._error(`Unable to create section '${spec.name}'. ${section.message}`, "Error");
              return;
            }
            const card = document.createElement("entity-card");
            const sectionObj = {
              id: section.id,
              project: projectId,
              ...spec
            };
            if (newSectionDialog._sectionType == "folder") {
              card.sectionInit(sectionObj, "folder");
              if (sectionObj.visible) {
                this._folders.appendChild(card);
              } else {
                this._archivedFolders.appendChild(card);
              }
              //
              card.addEventListener("click", () => {
                const clearPage = true;
                this._selectSection(sectionObj, projectId, clearPage);
                for (const child of this._allSections()) {
                  child.active = false;
                }
                card.active = true;
              });

              card.addEventListener("visibilityChange", this._sectionVisibilityEL.bind(this));

            } else if (newSectionDialog._sectionType == "savedSearch") {
              card.sectionInit(sectionObj, "savedSearch");
              this._savedSearches.appendChild(card);

              // Notifiy media section about section renames
              card.addEventListener("renameSection", (evt) => {
                // console.log(evt);
                this._mediaSection.dispatchEvent(new CustomEvent("renameSection", { detail: evt.detail }));
              });
              card.addEventListener("deleteSection", (evt) => {
                this._mediaSection.dispatchEvent(new CustomEvent("deleteSection", evt.detail));
              });

              card.addEventListener("click", () => {
                const clearPage = true;
                this._selectSection(sectionObj, projectId, clearPage);
                for (const child of this._allSections()) {
                  child.active = false;
                }
                card.active = true;
              });
            }
          });
      }
      this.removeAttribute("has-open-modal");
    });

    this._mediaSection.addEventListener("filesadded", evt => {
      this._uploadDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._uploadDialog.addEventListener("cancel", evt => {
      store.getState().uploadCancel();
      this.removeAttribute("has-open-modal");
    });

    this._uploadDialog.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal");
    });

    this._mediaSection.addEventListener("attachments", evt => {
      attachmentDialog.init(evt.detail);
      attachmentDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    attachmentDialog.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal");
    });

    this._mediaSection.addEventListener("newName", evt => {
      for (const child of this._allSections()) {
        if (child._section) {
          if (child._section.id == evt.detail.id) {
            child.rename(evt.detail.sectionName);
          }
        }
      }
    });

    this._activityButton.addEventListener("click", () => {
      this._activityNav.open();
      this._activityNav.reload();
      this.setAttribute("has-open-modal", "");
    });

    this._activityNav.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });

    this._activityNav.addEventListener("deleteJobs", evt => {
      cancelJob.init(evt.detail.uid, evt.detail.gid, this.getAttribute("project-id"));
      cancelJob.setAttribute("is-open", "");
    });

    this._moveFileCallback = evt => {
      // console.log(evt);
      this.moveFile.open(evt.detail.mediaId, evt.detail.mediaName, this.getAttribute("project-id"));
    };

    this._removeCallback = evt => {
      deleteSection.init(evt.detail.projectId, evt.detail.section, evt.detail.sectionParams,
        evt.detail.deleteMedia);
      deleteSection.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    deleteSection.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });

    deleteSection.addEventListener("confirmDelete", evt => {
      for (const child of this._allSections()) {
        if (child._section) {
          if (child._section.id == evt.detail.id) {
            child.parentNode.removeChild(child);
            this._folders.children[0].click();
          }
        }
      }
      this._bulkEdit._clearSelection();

      deleteSection.removeAttribute("is-open");
      this.removeAttribute("has-open-modal", "");

    });

    this._deleteFileCallback = evt => {
      this.deleteFileForm.setAttribute("media-id", evt.detail.mediaId);
      this.deleteFileForm.setAttribute("media-name", evt.detail.mediaName);
      this.deleteFileForm.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    this.deleteFileForm.addEventListener("close", evt => {
      this.removeAttribute("has-open-modal", "");
    });

    this.deleteFileForm.addEventListener("confirmFileDelete", evt => {
      this._mediaSection.removeMedia(evt.detail.mediaId);
      this.deleteFileForm.removeAttribute("is-open");
      this.removeAttribute("has-open-modal", "");
    });

    cancelJob.addEventListener("confirmGroupCancel", () => {
      cancelJob.removeAttribute("is-open");
    });

    cancelJob.addEventListener("close", () => {
      this.removeAttribute("has-open-modal");
    });

    this._loaded = 0;
    this._needScroll = true;

    this._lastQuery = null;


    /* Init after modal is defined */
    // Init panel side behavior
    this._panelContainer.init({
      main: this.main,
      aside: this.aside,
      pageModal: this.modal,
      modelData: null,
      gallery: this.gallery,
      contents: section,
      position: "left",
      isMediaSection: true
    });


    //
    this.modalNotify.addEventListener("open", this.showDimmer.bind(this));
    this.modalNotify.addEventListener("close", this.hideDimmer.bind(this));
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));

    // State of chosen labels for gallery
    this.cardLabelsChosenByType = {};
    this.mediaTypesMap = new Map();
  }

  connectedCallback() {
    this.setAttribute("project-id", Number(window.location.pathname.split('/')[1]));
    // Initialize store data
    store.getState().init();
    this._uploadDialog.init(store);
  }

  static get observedAttributes() {
    return ["project-id", "token"].concat(TatorPage.observedAttributes);
  }

  _openBulkEdit() {
    this._bulkEdit.startEditMode();
  }

  _sectionVisibilityEL(evt) {
    const section = evt.detail.section;
    const id = section.id;
    const visible = section.visible;

    // Remove section from current list
    for (const child of this._allSections()) {
      if (child._section) {
        if (child._section.id == id) {
          child.parentNode.removeChild(child);
          break;
        }
      }
    }

    // Create new section card and add to new list
    const card = document.createElement("entity-card");
    card.sectionInit(section, "folder");
    if (visible) {
      this._folders.appendChild(card);
    } else {
      this._archivedFolders.appendChild(card);
    }
    card.addEventListener("visibilityChange", evt => {
      this._sectionVisibilityEL(evt)
    });
    // Notifiy media section about section renames
    card.addEventListener("renameSection", (evt) => {
      this._mediaSection.dispatchEvent(new CustomEvent("renameSection", { detail: evt.detail }));
    });
    card.addEventListener("deleteSection", (evt) => {
      this._mediaSection.dispatchEvent(new CustomEvent("deleteSection", evt.detail));
    });
    card.addEventListener("click", () => {
      const clearPage = true;
      this._selectSection(section, section.project, clearPage);
      for (const child of this._allSections()) {
        child.active = false;
      }
      card.active = true;
    });
  }

  _allSections() {
    const folders = Array.from(this._folders.children);
    const hiddenFolders = Array.from(this._archivedFolders.children);
    const savedSearches = Array.from(this._savedSearches.children);
    return folders.concat(savedSearches).concat(hiddenFolders);
  }

  _notify(title, message, error_or_ok) {
    this.modalNotify.init(title, message, error_or_ok);
    this.modalNotify.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }

  _init() {
    this.showDimmer();
    this.loading.showSpinner();
    const projectId = this.getAttribute("project-id");
    this.projectId = projectId;
    this._settingsButton.setAttribute("href", `/${projectId}/project-settings`);
    this._activityNav.init(projectId);

    // Get info about the project.
    const projectPromise = fetchCredentials("/rest/Project/" + projectId);

    // Get sections
    const sectionPromise = fetchCredentials("/rest/Sections/" + projectId);

    // Get project bookmarks
    const bookmarkPromise = fetchCredentials("/rest/Bookmarks/" + projectId);

    // Get Algorithms
    const algoPromise = fetchCredentials("/rest/Algorithms/" + projectId);

    // Get MediaType data for attributes
    const mediaTypePromise = fetchCredentials("/rest/MediaTypes/" + projectId);

    // Run all above promises
    Promise.all([
      projectPromise,
      sectionPromise,
      bookmarkPromise,
      algoPromise,
      mediaTypePromise
    ])
      .then(([projectResponse, sectionResponse, bookmarkResponse, algoResponse, mediaTypeResponse]) => {
        const projectData = projectResponse.json();
        const sectionData = sectionResponse.json();
        const bookmarkData = bookmarkResponse.json();
        const algoData = algoResponse.json();
        const mediaTypeData = mediaTypeResponse.json();

        Promise.all([projectData, sectionData, bookmarkData, algoData, mediaTypeData])
          .then(([project, sections, bookmarks, algos, mediaTypes]) => {
            // First hide algorithms if needed. These are not appropriate to be
            // run at the project/this._section/media level.
            var hiddenAlgos = ['tator_extend_track', 'tator_fill_track_gaps'];
            const hiddenAlgoCategories = ['annotator-view', 'disabled'];

            this._cardAttributeLabels.init(projectId);
            this._sections = sections;

            //
            // Set up attributes for bulk edit
            for (let mediaTypeData of mediaTypes) {

              //init card labels with localization entity type definitions
              this._cardAttributeLabels.add({
                typeData: mediaTypeData,
                checkedFirst: false
              });

              //init panel with localization entity type definitions
              // console.log("ADDING MEDIA TYPE")
              this._bulkEdit._editPanel.addLocType(mediaTypeData);
              this.mediaTypesMap.set(mediaTypeData.id, mediaTypeData);
            }

            this._mediaSection.mediaTypesMap = this.mediaTypesMap;

            //
            const moveSelectedButton = document.createElement("media-move-button");
            moveSelectedButton.setAttribute("name", "Move selected files to folder");
            moveSelectedButton._span.textContent = "Move selected files to folder";
            // this._bulkEdit._otherTools.appendChild(moveSelectedButton);
            this._bulkEdit._editPanel._otherTools.appendChild(moveSelectedButton);

            moveSelectedButton.addEventListener("click", () => {
              const list = Array.from(this._bulkEdit._currentMultiSelection);
              if (list && list.length > 0) {
                const listString = String(list);
                this.moveFile.open(list, null, this.getAttribute("project-id"), false);
              } else {
                this._notify("Make a selection", "Nothing to move! Make a selection first.", "error");
              }
            });

            //
            const deleteSelectedButton = document.createElement("delete-button");
            deleteSelectedButton.setAttribute("name", "Delete selected files");
            deleteSelectedButton._span.textContent = "Delete selected files";
            // this._bulkEdit._otherTools.appendChild(deleteSelectedButton);
            this._bulkEdit._editPanel._otherTools.appendChild(deleteSelectedButton);

            deleteSelectedButton.addEventListener("click", this._deleteSelection.bind(this));

            //
            this._mediaSection._files._cardAttributeLabels = this._cardAttributeLabels;
            this._mediaSection._bulkEdit = this._bulkEdit;


            this._bulkEdit.init({
              page: this,
              gallery: this._mediaSection._files,
              type: "media",
              projectId,
              additionalTools: true,
              permission: project.permission
            });



            var parsedAlgos = algos.filter(function (alg) {
              if (Array.isArray(alg.categories)) {
                for (const category of alg.categories) {
                  if (hiddenAlgoCategories.includes(category)) {
                    return false;
                  }
                }
              }
              return !hiddenAlgos.includes(alg.name);
            });
            parsedAlgos.sort((a, b) => a.name.localeCompare(b.name));

            if (!hasPermission(project.permission, "Full Control")) {
              this._settingsButton.style.display = "none";
            }
            this._algorithms = parsedAlgos;
            this._mediaSection.project = project;
            this._mediaSection.algorithms = this._algorithms;
            this._projectText.nodeValue = project.name;
            // this._search.setAttribute("project-name", project.name);
            this._description.setAttribute("text", project.summary);
            this._collaborators.usernames = project.usernames;
            // this._search.autocomplete = project.filter_autocomplete;

            let projectParams = null;

            // Home folder
            const home = document.createElement("entity-card");
            home.sectionInit(null, false);
            home.addEventListener("click", () => {
              this._selectSection(null, projectId, true);
              for (const child of this._allSections()) {
                child.active = false;
              }
              home.active = true;
            });
            this._folders.appendChild(home);

            // Model data & filter setup
            try {
              this._modelData = new TatorData(projectId);
              this._modelData.init().then(() => {

                // Sorts sections into Folder (archive/not), and Saved Search
                this._makeFolders(sections, projectId);

                // Put "Last visited" bookmark on top
                const first = "Last visited";
                bookmarks.sort((a, b) => { return a.name == first ? -1 : b.name == first ? 1 : 0; });
                for (const bookmark of bookmarks) {
                  const card = document.createElement("entity-card");
                  card.sectionInit(bookmark, "bookmark");
                  this._bookmarks.appendChild(card);
                }

                // If there is a selected section click that otherwise
                const params = new URLSearchParams(document.location.search.substring(1));
                if (params.has("section")) {
                  const sectionId = Number(params.get("section"));
                  for (const child of this._allSections()) {
                    if (child._section) {
                      if (child._section.id == sectionId) {
                        for (const other of this._allSections()) {
                          other.active = false;
                        }
                        child.active = true;
                        try {
                          this._selectSection(child._section, child._section.project).then(() => {
                            this.loading.hideSpinner();
                            this.hideDimmer();
                          });
                        } catch (err) {
                          console.error("Error getting section.", err);
                          child.click();
                          this.loading.hideSpinner();
                          this.hideDimmer();
                        }

                        break;
                      }
                    }
                  }
                } else {
                  //
                  try {
                    home.active = true;
                    this._selectSection(null, projectId).then(async () => {
                      this.loading.hideSpinner();
                      this.hideDimmer();
                    });
                  } catch (err) {
                    console.error("Error getting home section.", err);
                    home.click();
                    this.loading.hideSpinner();
                    this.hideDimmer();
                  }
                }

                // Is there a search to apply?
                if (params.has("encoded_search")) {
                  // console.log(params.get("search"));
                  this._mediaSection.searchString = params.get("encoded_search");
                  this._addSavedSearchButton.style.opacity = 1.0;
                  this._addSavedSearchButton.style.cursor = "pointer";
                }


                // used to setup filter options & string utils
                this._mediaSection._modelData = this._modelData;
                this._mediaSection._files.memberships = this._modelData._memberships;

                this._filterDataView = new FilterData(
                  this._modelData, null, [], null);
                this._filterDataView.init();
                this._filterView.dataView = this._filterDataView;

                // Set UI and results to any url param conditions that exist (from URL)
                this._mediaSection._filterConditions = this._mediaSection.getFilterConditionsObject();
                this._bulkEdit.checkForFilters(this._mediaSection._filterConditions);
                if (this._mediaSection._filterConditions.length > 0) {
                  this._updateFilterResults({ detail: { conditions: this._mediaSection._filterConditions } });
                }

                // Listen for filter events
                this._filterView.addEventListener("filterParameters", this._updateFilterResults.bind(this));
              });

            } catch (err) {
              console.error("Could not initialize filter interface.", err);
              this.loading.hideSpinner();
              this.hideDimmer();
            }

          }).catch(err => {
            console.error("Error setting up page with all promises", err);
            this.loading.hideSpinner();
            this.hideDimmer();
          });

      }).catch(err => {
        console.error("Error setting up page with all promises", err);
        this.loading.hideSpinner();
        this.hideDimmer();
      });


  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "username":
        break;
      case "project-id":
        this._analyticsButton.setAttribute("project-id", newValue);
        this._init();
        break;
    }
  }

  async _selectSection(section, projectId, clearPage = false) {
    const params = new URLSearchParams(document.location.search);

    if (clearPage) {
      params.delete("page");
      params.delete("pagesize");
    }

    this._mediaSection.addEventListener("remove", this._removeCallback);
    this._mediaSection.addEventListener("moveFile", this._moveFileCallback);
    this._mediaSection.addEventListener("deleteFile", this._deleteFileCallback);

    params.delete("section");
    if (section !== null) {
      params.set("section", section.id);
    }

    const path = document.location.pathname;
    const searchArgs = params.toString();

    let newUrl = path;
    newUrl += "?" + searchArgs;
    let sectionName = "All Media";
    if (section !== null) {
      sectionName = section.name;
    }
    window.history.replaceState(`${this._projectText.textContent}|${sectionName}`, "Filter", newUrl);

    await this._mediaSection.init(projectId, section);

    if (params.has("page") && params.has("pagesize") && !clearPage) {
      let pageSize = Number(params.get("pagesize"));
      let page = Number(params.get("page"));

      const samePageSize = pageSize == this._mediaSection._defaultPageSize;
      const samePage = page == 1;

      if (!samePageSize) {
        this._mediaSection._paginator_bottom.pageSize = pageSize;
        this._mediaSection._paginator_top.pageSize = pageSize;
      }

      if (!samePage) {
        this._mediaSection._paginator_bottom._setPage(page - 1);
        this._mediaSection._paginator_top._setPage(page - 1);
      }

      if (!samePageSize || !samePage) {
        this._mediaSection._paginator_top._emit();
        this._mediaSection._paginator_bottom._emit();
      }
    }

    // Add section filter information
    this._filterView.sections = this._sections;
    this._filterView.section = section;

    return true;
  }

  /**
   * Callback when user clicks on an algorithm button.
   * This launches the confirm run algorithm modal window.
   */
  _openConfirmRunAlgoModal(evt) {

    this._confirmRunAlgorithm.init(
      evt.detail.algorithmName, evt.detail.projectId, evt.detail.mediaIds, evt.detail.section);
    this._confirmRunAlgorithm.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
    document.body.classList.add("shortcuts-disabled");
  }

  /**
   * Callback from confirm run algorithm modal choice
   * @async
   */
  async _closeConfirmRunAlgoModal(evt) {

    console.log(evt);

    this._confirmRunAlgorithm.removeAttribute("is-open");
    this.removeAttribute("has-open-modal");
    document.body.classList.remove("shortcuts-disabled");

    if (evt.detail == null) { return; }

    var that = this;
    var jobMediaIds = [];
    if (evt.detail.confirm) {

      // Retrieve media IDs first (if needed)
      if (evt.detail.mediaIds == null) {

        this.showDimmer();
        this.loading.showSpinner();

        var filterConditions = [];
        var mediaTypes = this._modelData.getStoredMediaTypes();
        if (evt.detail.section != null) {
          filterConditions.push(new FilterConditionData(mediaTypes[0].name, "$section", "==", `${evt.detail.section.id}`, ""))
        }

        var totalCounts = await this._modelData.getFilteredMedias("count", filterConditions);
        console.log(`mediaCounts: ${totalCounts}`);
        var afterMap = new Map();
        var pageSize = 5000;
        var pageStart = 0;
        var pageEnd = pageStart + pageSize;
        var allMedia = [];
        var numPages = Math.floor(totalCounts / pageSize) + 1;
        var pageCount = 1;
        while (allMedia.length < totalCounts) {

          console.log(`Processing media page ${pageCount} of ${numPages}`);
          var pageMedia = await this._modelData.getFilteredMedias(
            "objects",
            filterConditions,
            0,
            Math.min(totalCounts - allMedia.length, 5000),
            afterMap,
            true);
          allMedia.push(...pageMedia);
          pageStart = pageEnd;
          pageEnd = pageStart + pageSize;
          pageCount += 1;
        }

        for (const media of allMedia) {
          jobMediaIds.push(media.id);
        }

        this.loading.hideSpinner();
        this.hideDimmer();
      }
      else {
        jobMediaIds = evt.detail.mediaIds;
      }

      var body = JSON.stringify({
        "algorithm_name": evt.detail.algorithmName,
        "media_ids": jobMediaIds
      });
      console.log(`${jobMediaIds.length} | ${evt.detail.algorithmName}`);

      var response = await fetchCredentials("/rest/Jobs/" + evt.detail.projectId, {
        method: "POST",
        body: body,
      }, true);
      var data = await response.json();
      if (response.status == 201) {
        that._notify("Workflow launched!",
          `Successfully launched ${evt.detail.algorithmName}! Monitor progress by clicking the "Activity" button.`,
          "ok");
      }
      else {
        that._notify("Error launching workflow!",
          `Failed to launch ${evt.detail.algorithmName}: ${response.statusText}.`,
          "error");
      }
    }
  }

  async _updateFilterResults(evt) {
    this._filterConditions = evt.detail.conditions;
    this._filterView.setFilterConditions(this._filterConditions);
    this._bulkEdit.checkForFilters(this._filterConditions);
    this.showDimmer();
    this.loading.showSpinner();

    try {
      const query = await this._mediaSection.updateFilterResults(this._filterConditions);
      if (typeof query != "undefined" && query != this._lastQuery) {
        if (query !== "") {
          this._lastQuery = query;
          this._addSavedSearchButton.style.opacity = 1.0;
          this._addSavedSearchButton.style.cursor = "pointer";
        } else {
          this._lastQuery = null;
          this._addSavedSearchButton.style.opacity = 0.5;
          this._addSavedSearchButton.style.cursor = "not-allowed";
        }
      }
    } catch (err) {
      console.error("Couldn't update results with current filter.", err);
    }

    this.loading.hideSpinner();
    this.hideDimmer();
  }

  _deleteSelection() {
    const list = Array.from(this._bulkEdit._currentMultiSelection);

    if (list && list.length > 0) {
      this.deleteFileForm.setAttribute("media-id", list);
      this.deleteFileForm.setAttribute("project-id", this.projectId);
      this.deleteFileForm.setAttribute("media-name", "Selected files");
      this.deleteFileForm.setAttribute("media-id", String(list));
      this.deleteFileForm.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    } else {
      this._notify("Make a selection", "Nothing to delete! Make a selection first.", "error");
    }
  }

  // Modal for this page, and handlers
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }

  _makeFolders(sections, projectId) {
    for (const section of sections) {
      const hasSection = Boolean(section.tator_user_sections);
      const hasSearch = (Boolean(section.lucene_search)
        || Boolean(section.media_bools)
        || Boolean(section.annotation_bools));
      let sectionType;
      if (hasSection && !hasSearch) {
        sectionType = "folder";
      } else {
        sectionType = "savedSearch";
      }
      const card = document.createElement("entity-card");
      // Notifiy media section about section renames
      card.addEventListener("renameSection", (evt) => {
        console.log("HEARD RENAME SECTION!")
        const clearPage = true;
        this._selectSection(evt.detail.section, evt.detail.section.project, clearPage);
        for (const child of this._allSections()) {
          child.active = false;
        }
        card.active = true;
        this._mediaSection.dispatchEvent(new CustomEvent("renameSection", { detail: evt.detail }));
      });
      card.addEventListener("deleteSection", (evt) => {
        this._mediaSection.dispatchEvent(new CustomEvent("deleteSection", evt.detail));
      });

      card.sectionInit(section, sectionType);
      if (sectionType == "folder") {
        if (section.visible) {
          this._folders.appendChild(card);
        } else {
          this._archivedFolders.appendChild(card);
        }
        card.addEventListener("visibilityChange", evt => {
          this._sectionVisibilityEL(evt)
        });
      } else {
        this._savedSearches.appendChild(card);
      }
      card.addEventListener("click", () => {
        const clearPage = true;
        this._selectSection(section, projectId, clearPage);
        for (const child of this._allSections()) {
          child.active = false;
        }
        card.active = true;
      });
    }
  }

  reloadSections() {
    // Get sections
    const sectionPromise = fetchCredentials("/rest/Sections/" + projectId);
  }

}

customElements.define("project-detail", ProjectDetail);
