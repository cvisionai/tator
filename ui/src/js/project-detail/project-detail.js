import { TatorPage } from "../components/tator-page.js";
import { hasPermission } from "../util/has-permission.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { TatorData } from "../util/tator-data.js";
import { svgNamespace } from "../components/tator-element.js";
import { FilterData } from "../components/filter-data.js";
import { v1 as uuidv1 } from '../../../node_modules/uuid/dist/esm-browser/index.js';
import { store } from "./store.js";
import { FilterConditionData } from "../util/filter-utilities.js";
import { SectionData } from "../util/section-utilities.js";

/**
 * Main project detail page
 */
export class ProjectDetail extends TatorPage {
  constructor() {
    super();

    document.body.setAttribute("class", "no-padding-bottom");

    // Success and warning Utility hooks
    const utilitiesDiv = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    utilitiesDiv.setAttribute(
      "class",
      "annotation__header d-flex flex-items-center flex-justify-between px-6 f3"
    );
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
    this.mainWrapper.setAttribute("class", "analysis--main--wrapper d-flex");
    this.mainWrapper.style.minHeight = "calc(100vh - 62px)";
    this._shadow.appendChild(this.mainWrapper);

    //
    // Left area of the page
    //
    this.createSidebarNav();
    this.createLeftPanel();

    //
    // Central area of the page
    //
    this.main = document.createElement("main");
    this.main.setAttribute("class", "d-flex flex-grow col-12 mr-3");
    this.mainWrapper.appendChild(this.main);

    this._mainSection = document.createElement("section");
    this._mainSection.setAttribute("class", "py-3 px-3 ml-3 flex-grow");
    this.main.appendChild(this._mainSection);

    this.gallery = {};
    this.gallery._main = this._mainSection;

    const div = document.createElement("div");
    this.gallery._main.appendChild(div);

    const header = document.createElement("div");
    header.setAttribute("class", "main__header d-flex flex-justify-between");
    div.appendChild(header);

    const headerWrapperDiv = document.createElement("div");
    headerWrapperDiv.setAttribute("class", "d-flex flex-column");
    header.appendChild(headerWrapperDiv);

    const nameDiv = document.createElement("div");
    nameDiv.setAttribute("class", "d-flex flex-row flex-items-center mt-1");
    headerWrapperDiv.appendChild(nameDiv);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    nameDiv.appendChild(h1);

    this._settingsButton = document.createElement("a");
    this._settingsButton.setAttribute(
      "class",
      "px-2 h2 text-gray hover-text-white"
    );
    this._settingsButton.style.marginTop = "6px";
    nameDiv.appendChild(this._settingsButton);

    const settingsSvg = document.createElementNS(svgNamespace, "svg");
    settingsSvg.setAttribute("viewBox", "0 0 24 24");
    settingsSvg.setAttribute("height", "1em");
    settingsSvg.setAttribute("width", "1em");
    this._settingsButton.appendChild(settingsSvg);

    const settingsPath = document.createElementNS(svgNamespace, "use");
    settingsPath.setAttribute("href", `${STATIC_PATH}/ui/src/images/gear.svg`);
    settingsSvg.appendChild(settingsPath);

    this._projectText = document.createTextNode("");
    h1.appendChild(this._projectText);

    const buttons = document.createElement("div");
    buttons.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(buttons);

    this._topExportDataButton = document.createElement("button");
    this._topExportDataButton.setAttribute(
      "class",
      "d-flex flex-column py-1 flex-items-center rounded-2 project-topbar-button btn-clear text-gray"
    );
    this._topExportDataButton.setAttribute("tooltip", "Download Metadata");
    buttons.appendChild(this._topExportDataButton);

    var buttonIcon = document.createElement("div");
    buttonIcon.setAttribute(
      "class",
      "project-topbar-button-icon px-1 d-flex flex-items-center flex-justify-center rounded-2 flex-grow"
    );
    buttonIcon.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    `;
    this._topExportDataButton.appendChild(buttonIcon);

    var buttonTitle = document.createElement("span");
    buttonTitle.setAttribute("class", "f3 text-center py-1");
    buttonTitle.innerHTML = "Metadata";
    this._topExportDataButton.appendChild(buttonTitle);

    this._topLocGalleryButton = document.createElement("button");
    this._topLocGalleryButton.setAttribute(
      "class",
      "d-flex flex-column py-1 flex-items-center rounded-2 project-topbar-button btn-clear text-gray"
    );
    this._topLocGalleryButton.setAttribute(
      "tooltip",
      "Open Localization Gallery"
    );
    buttons.appendChild(this._topLocGalleryButton);

    var buttonIcon = document.createElement("div");
    buttonIcon.setAttribute(
      "class",
      "project-topbar-button-icon px-1 d-flex flex-items-center flex-justify-center rounded-2 flex-grow"
    );
    buttonIcon.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    `;
    this._topLocGalleryButton.appendChild(buttonIcon);

    var buttonTitle = document.createElement("span");
    buttonTitle.setAttribute("class", "f3 text-center py-1");
    buttonTitle.innerHTML = "Localizations";
    this._topLocGalleryButton.appendChild(buttonTitle);

    this._topDashboardsButton = document.createElement("button");
    this._topDashboardsButton.setAttribute(
      "class",
      "d-flex flex-column py-1 flex-items-center rounded-2 project-topbar-button btn-clear text-gray"
    );
    this._topDashboardsButton.setAttribute("tooltip", "Open Dashboards Portal");
    buttons.appendChild(this._topDashboardsButton);

    var buttonIcon = document.createElement("div");
    buttonIcon.setAttribute(
      "class",
      "project-topbar-button-icon px-1 d-flex flex-items-center flex-justify-center rounded-2 flex-grow"
    );
    buttonIcon.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    `;
    this._topDashboardsButton.appendChild(buttonIcon);

    var buttonTitle = document.createElement("span");
    buttonTitle.setAttribute("class", "f3 text-center py-1");
    buttonTitle.innerHTML = "Dashboards";
    this._topDashboardsButton.appendChild(buttonTitle);

    this._topFilesButton = document.createElement("button");
    this._topFilesButton.setAttribute(
      "class",
      "d-flex flex-column py-1 flex-items-center rounded-2 project-topbar-button btn-clear text-gray"
    );
    this._topFilesButton.setAttribute("tooltip", "Open Data Files Portal");
    buttons.appendChild(this._topFilesButton);

    var buttonIcon = document.createElement("div");
    buttonIcon.setAttribute(
      "class",
      "project-topbar-button-icon px-1 d-flex flex-items-center flex-justify-center rounded-2 flex-grow"
    );
    buttonIcon.innerHTML = `
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline>
      </svg>
    `;
    this._topFilesButton.appendChild(buttonIcon);

    var buttonTitle = document.createElement("span");
    buttonTitle.setAttribute("class", "f3 text-center py-1");
    buttonTitle.innerHTML = "Data Files";
    this._topFilesButton.appendChild(buttonTitle);

    this._topActivityButton = document.createElement("button");
    this._topActivityButton.setAttribute(
      "class",
      "d-flex flex-column py-1 flex-items-center rounded-2 project-topbar-button btn-clear text-gray"
    );
    this._topActivityButton.setAttribute("tooltip", "View Active Workflows");
    buttons.appendChild(this._topActivityButton);

    var buttonIcon = document.createElement("div");
    buttonIcon.setAttribute(
      "class",
      "project-topbar-button-icon px-1 d-flex flex-items-center flex-justify-center rounded-2 flex-grow"
    );
    buttonIcon.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    `;
    this._topActivityButton.appendChild(buttonIcon);

    var buttonTitle = document.createElement("span");
    buttonTitle.setAttribute("class", "f3 text-center py-1");
    buttonTitle.innerHTML = "Activity";
    this._topActivityButton.appendChild(buttonTitle);

    this._description = document.createElement("project-text");
    headerWrapperDiv.appendChild(this._description);

    const subheader = document.createElement("div");
    subheader.setAttribute("class", "d-flex flex-justify-right");
    this._mainSection.appendChild(subheader);

    const filterdiv = document.createElement("div");
    filterdiv.setAttribute("class", "mt-3");
    this._mainSection.appendChild(filterdiv);

    this._filterView = document.createElement("filter-interface");
    filterdiv.appendChild(this._filterView);

    this._sectionSearchDisplay = document.createElement(
      "section-search-display"
    );
    this._sectionSearchDisplay.setAttribute("class", "mt-2");
    this._sectionSearchDisplay.style.display = "none";
    filterdiv.appendChild(this._sectionSearchDisplay);

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

    // Card attribute stuff related to mediaSection
    /**
     * CARD Label display options link for menu, and checkbox div
     */
    this._cardAttributeLabels = document.createElement("entity-gallery-labels");
    this._cardAttributeLabels.setAttribute("id", "showMediaAttributes");
    this._cardAttributeLabels.titleEntityTypeName = "media";
    this._cardAttributeLabels._titleText = document.createTextNode(
      "Select media labels to display."
    );
    this._cardAttributeLabels.menuLinkTextSpan.innerHTML =
      "Show file attributes";

    this._mediaSection._hiddenMediaLabel.appendChild(this._cardAttributeLabels);
    this._mediaSection._more._cardLink.appendChild(
      this._cardAttributeLabels.menuLink
    );
    this._mediaSection._more.addEventListener(
      "bulk-edit",
      this._openBulkEdit.bind(this)
    );

    this._cardAttributeLabels.addEventListener("labels-update", (evt) => {
      // updates labels on cards
      this._mediaSection._files.dispatchEvent(
        new CustomEvent("labels-update", evt.detail)
      );
      this._bulkEdit._updateShownAttributes({
        typeId: evt.detail.typeId,
        values: evt.detail.value,
      });
    });

    // references inner for card setup and pagination checkbox clear
    this._mediaSection.bulkEdit = this._bulkEdit;
    this._mediaSection._files.bulkEdit = this._bulkEdit;

    // Confirm algorithm
    this._confirmRunAlgorithm = document.createElement("confirm-run-algorithm");
    this._projects.appendChild(this._confirmRunAlgorithm);
    this._confirmRunAlgorithm.addEventListener(
      "close",
      this._closeConfirmRunAlgoModal.bind(this)
    );

    this._deleteSectionDialog = document.createElement("delete-section-form");
    this._projects.appendChild(this._deleteSectionDialog);

    this.deleteFileForm = document.createElement("delete-file-form");
    this._projects.appendChild(this.deleteFileForm);

    this.modalNotify = document.createElement("modal-notify");
    this._projects.appendChild(this.modalNotify);

    this.modal = document.createElement("modal-dialog");
    this._projects.appendChild(this.modal);

    this._cancelJob = document.createElement("cancel-confirm");
    this._shadow.appendChild(this._cancelJob);

    this._mediaMoveDialog = document.createElement("media-move-dialog");
    this._shadow.appendChild(this._mediaMoveDialog);

    this._modalError = document.createElement("modal-dialog");
    this._shadow.appendChild(this._modalError);

    this._folderDialog = document.createElement("folder-dialog");
    this._projects.appendChild(this._folderDialog);

    this._mediaSearchDialog = document.createElement("media-search-dialog");
    this._projects.appendChild(this._mediaSearchDialog);

    this._searchDeleteDialog = document.createElement("search-delete-modal");
    this._projects.appendChild(this._searchDeleteDialog);

    this._bookmarkEditDialog = document.createElement("bookmark-edit-dialog");
    this._projects.appendChild(this._bookmarkEditDialog);

    this._bookmarkDeleteDialog = document.createElement(
      "bookmark-delete-dialog"
    );
    this._projects.appendChild(this._bookmarkDeleteDialog);

    this._uploadDialog = document.createElement("upload-dialog");
    this._projects.appendChild(this._uploadDialog);

    this._attachmentDialog = document.createElement("attachment-dialog");
    this._attachmentDialog._header.classList.add("fixed-height-scroll");
    this._projects.appendChild(this._attachmentDialog);

    this._activityNav = document.createElement("activity-nav");
    this.main.appendChild(this._activityNav);

    this._sectionData = new SectionData();

    // Create store subscriptions
    store.subscribe((state) => state.user, this._setUser.bind(this));
    store.subscribe(
      (state) => state.announcements,
      this._setAnnouncements.bind(this)
    );

    window.addEventListener("beforeunload", (evt) => {
      if (this._uploadDialog.hasAttribute("is-open")) {
        evt.preventDefault();
        evt.returnValue = "";
        window.alert("Uploads are in progress. Still leave?");
      }
    });

    this._modalError.addEventListener("close", () => {
      this._modalError.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    this.setTopNavBarCallbacks();
    this.setActivityPanelCallbacks();
    this.setFolderDialogCallbacks();
    this.setMediaSearchDialogCallbacks();
    this.setBookmarkDialogCallbacks();
    this.setDeleteSectionDialogCallbacks();
    this.setMediaMoveDialogCallbacks();
    this.setMediaSectionCallbacks();

    this._filterView.addEventListener(
      "filterParameters",
      this._updateFilterResults.bind(this)
    );

    this._uploadDialog.addEventListener("cancel", (evt) => {
      store.getState().uploadCancel();
      this.removeAttribute("has-open-modal");
    });

    this._uploadDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal");
    });

    this._attachmentDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal");
    });

    this._deleteFileCallback = (evt) => {
      this.deleteFileForm.setAttribute("media-id", evt.detail.mediaId);
      this.deleteFileForm.setAttribute("media-name", evt.detail.mediaName);
      this.deleteFileForm.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    };

    this.deleteFileForm.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    this.deleteFileForm.addEventListener("confirmFileDelete", (evt) => {
      this._mediaSection.removeMedia(evt.detail.mediaId);
      this.deleteFileForm.removeAttribute("is-open");
      this.removeAttribute("has-open-modal", "");
    });

    this._cancelJob.addEventListener("confirmGroupCancel", () => {
      this._cancelJob.removeAttribute("is-open");
    });

    this._cancelJob.addEventListener("close", () => {
      this.removeAttribute("has-open-modal");
    });

    this._lastQuery = null;

    this.modalNotify.addEventListener("open", this.showDimmer.bind(this));
    this.modalNotify.addEventListener("close", this.hideDimmer.bind(this));
    this.modal.addEventListener("open", this.showDimmer.bind(this));
    this.modal.addEventListener("close", this.hideDimmer.bind(this));
  }

  /**
   * Expected to be run once in the constructor
   */
  setTopNavBarCallbacks() {
    this._topExportDataButton.addEventListener("click", () => {
      this._topExportDataButton.blur();
      window.location.href = `/${this._projectId}/analytics/export?`;
    });

    this._topLocGalleryButton.addEventListener("click", () => {
      this._topLocGalleryButton.blur();
      window.location.href = `/${this._projectId}/analytics/localizations?`;
    });

    this._topDashboardsButton.addEventListener("click", () => {
      this._topDashboardsButton.blur();
      window.location.href = `/${this._projectId}/dashboards?`;
    });

    this._topFilesButton.addEventListener("click", () => {
      this._topFilesButton.blur();
      window.location.href = `/${this._projectId}/analytics/files?`;
    });

    this._topActivityButton.addEventListener("click", () => {
      this._topActivityButton.blur();
      this._activityNav.open();
      this._activityNav.reload();
      this.setAttribute("has-open-modal", "");
    });
  }

  /**
   * Expected to be run once in the constructor
   */
  setActivityPanelCallbacks() {
    this._activityNav.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    this._activityNav.addEventListener("deleteJobs", (evt) => {
      this._cancelJob.init(
        evt.detail.uid,
        evt.detail.gid,
        this.getAttribute("project-id")
      );
      this._cancelJob.setAttribute("is-open", "");
    });
  }

  /**
   * Expected to be run once in the constructor
   */
  setBookmarkDialogCallbacks() {
    this._bookmarkDeleteDialog.addEventListener("close", () => {
      this._bookmarkDeleteDialog.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    this._bookmarkDeleteDialog.addEventListener("delete", async (evt) => {
      this._bookmarkDeleteDialog.removeAttribute("is-open");

      var response = await fetchCredentials(
        `/rest/Bookmark/${evt.detail.data.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.status == 200) {
        var response = await fetchCredentials(
          `/rest/Bookmarks/${this._projectId}`,
          {
            method: "GET",
          }
        );
        this._bookmarks = await response.json();
        this.makeBookmarks();
        this.removeAttribute("has-open-modal");
      } else {
        var data = await response.json();
        this._modalError._error(
          `Unable to patch bookmark. Error: ${data.message}`,
          "Error"
        );
      }
    });

    this._bookmarkEditDialog.addEventListener("close", () => {
      this._bookmarkEditDialog.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    this._bookmarkEditDialog.addEventListener("edit", async (evt) => {
      this._bookmarkEditDialog.removeAttribute("is-open");

      var response = await fetchCredentials(`/rest/Bookmark/${evt.detail.id}`, {
        method: "PATCH",
        body: JSON.stringify(evt.detail.spec),
      });

      if (response.status == 200) {
        var response = await fetchCredentials(
          `/rest/Bookmarks/${this._projectId}`,
          {
            method: "GET",
          }
        );
        this._bookmarks = await response.json();
        this.makeBookmarks();
        this.removeAttribute("has-open-modal");
      } else {
        var data = await response.json();
        this._modalError._error(
          `Unable to patch bookmark. Error: ${data.message}`,
          "Error"
        );
      }
    });
  }

  /**
   * Expected to be run once in the constructor
   */
  setDeleteSectionDialogCallbacks() {
    this._deleteSectionDialog.addEventListener("close", (evt) => {
      this.removeAttribute("has-open-modal", "");
    });

    this._deleteSectionDialog.addEventListener("confirmDelete", async (evt) => {
      // Remove the dialog, but then wait for the operation(s) to complete before removing
      // the modal + finishing up the UI updates
      this._deleteSectionDialog.removeAttribute("is-open");

      // If the media needed to also be deleted, delete it too. Use the section parameter.
      if (evt.detail.deleteMedia) {
        var response = await fetchCredentials(
          `/rest/Medias/${this._projectId}?section=${evt.detail.id}`,
          { method: "DELETE" }
        );

        if (response.status != 200) {
          var data = await response.json();
          this._modalError._error(
            `Unable to delete media. Section retained. Error: ${data.message}`,
            "Error"
          );
          return;
        }
      }

      // Delete the section
      var response = await fetchCredentials(`/rest/Section/${evt.detail.id}`, {
        method: "DELETE",
      });

      if (response.status != 200) {
        var data = await response.json();
        this._modalError._error(
          `Unable to delete section. Error: ${data.message}`,
          "Error"
        );
      } else {
        // Refresh the UI
        await this.getSections();
        this._bulkEdit._clearSelection();
        this.selectSection();
      }

      this.removeAttribute("has-open-modal", "");
    });
  }

  /**
   * Expected to be run once in the constructor
   */
  setFolderDialogCallbacks() {
    // Close without any modifications
    this._folderDialog.addEventListener("close", () => {
      this._folderDialog.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    // Edit current folder
    // May need to update child folders too, so loop over specs
    this._folderDialog.addEventListener("edit", async (evt) => {
      this._folderDialog.removeAttribute("is-open");

      for (const spec of evt.detail.specs) {
        var response = await fetchCredentials(`/rest/Section/${spec.id}`, {
          method: "PATCH",
          body: JSON.stringify(spec.spec),
        });

        if (response.status != 200) {
          var data = await response.json();
          this._modalError._error(
            `Unable to patch section ${spec}. Error: ${data.message}`,
            "Error"
          );
          return;
        }
      }

      await this.getSections();
      this.selectSection(evt.detail.mainSectionId);
      this.removeAttribute("has-open-modal");
      this._bulkEdit._clearSelection();
    });

    // Add new folder
    this._folderDialog.addEventListener("add", async (evt) => {
      this._folderDialog.removeAttribute("is-open");

      var spec = {
        name: evt.detail.name,
        path: evt.detail.path,
        tator_user_sections: uuidv1(),
        visible: true,
      };

      var response = await fetchCredentials(
        `/rest/Sections/${this._projectId}`,
        {
          method: "POST",
          body: JSON.stringify(spec),
        }
      );

      if (response.status == 201) {
        var data = await response.json();
        await this.getSections();
        this.selectSection(data.id);
        this.removeAttribute("has-open-modal");
        this._bulkEdit._clearSelection();
      } else {
        var data = await response.json();
        this._modalError._error(
          `Unable to create section '${spec.name}'. Error: ${data.message}`,
          "Error"
        );
      }
    });
  }

  /**
   * Expected to be run once in the constructor
   */
  setMediaSearchDialogCallbacks() {
    // Close without any modifications
    this._mediaSearchDialog.addEventListener("close", () => {
      this._mediaSearchDialog.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    // Edit current folder
    // May need to update child folders too, so loop over specs
    this._mediaSearchDialog.addEventListener("edit", async (evt) => {
      this._mediaSearchDialog.removeAttribute("is-open");

      for (const spec of evt.detail.specs) {
        var response = await fetchCredentials(`/rest/Section/${spec.id}`, {
          method: "PATCH",
          body: JSON.stringify(spec.spec),
        });

        if (response.status != 200) {
          var data = await response.json();
          this._modalError._error(
            `Unable to patch section ${spec}. Error: ${data.message}`,
            "Error"
          );
          return;
        }
      }

      await this.getSections();
      this.selectSection(evt.detail.mainSectionId);
      this._bulkEdit._clearSelection();
      this.removeAttribute("has-open-modal");
    });

    // Add new folder
    this._mediaSearchDialog.addEventListener("add", async (evt) => {
      this._mediaSearchDialog.removeAttribute("is-open");

      var response = await fetchCredentials(
        `/rest/Sections/${this._projectId}`,
        {
          method: "POST",
          body: JSON.stringify(evt.detail.spec),
        }
      );

      if (response.status == 201) {
        var data = await response.json();
        await this.getSections();
        this.selectSection(data.id);
        this._bulkEdit._clearSelection();
        this.removeAttribute("has-open-modal");
      } else {
        var data = await response.json();
        this._modalError._error(
          `Unable to create section '${spec.name}'. Error: ${data.message}`,
          "Error"
        );
      }
    });
  }

  /**
   * Expected to be run once in the constructor
   */
  setMediaMoveDialogCallbacks() {
    // Close without any modifications
    this._mediaMoveDialog.addEventListener("close", () => {
      this._mediaMoveDialog.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    // Move media to a new folder
    this._mediaMoveDialog.addEventListener("move", async (evt) => {
      this._mediaMoveDialog.removeAttribute("is-open");

      var destTatorUserSections = "";
      var section = null;
      if (evt.detail.destSectionId != null) {
        section = this._sectionData.getSectionFromID(evt.detail.destSectionId);
        destTatorUserSections = section.tator_user_sections;
      }

      var response = await fetchCredentials(
        `/rest/Medias/${this._projectId}?media_id=${evt.detail.mediaIds}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            attributes: {
              tator_user_sections: destTatorUserSections,
            },
          }),
        }
      );

      if (response.status == 200) {
        if (section != null) {
          this.selectSection(section.id);
        } else {
          this.selectSection();
        }
        this._bulkEdit._clearSelection();
        this.removeAttribute("has-open-modal");
      } else {
        var data = await response.json();
        this._modalError._error(
          `Unable to move media. Error: ${data.message}`,
          "Error"
        );
      }

      this.removeAttribute("has-open-modal");
    });
  }

  /**
   * Expected to be run once in the constructor
   */
  setMediaSectionCallbacks() {
    this._mediaSection.addEventListener(
      "runAlgorithm",
      this._openConfirmRunAlgoModal.bind(this)
    );

    this._mediaSection.addEventListener("moveFile", (evt) => {
      this._mediaMoveDialog.updateUI([evt.detail.mediaId]);
      this._mediaMoveDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._mediaSection.addEventListener("deleteFile", (evt) => {
      this.deleteFileForm.setAttribute("media-id", evt.detail.mediaId);
      this.deleteFileForm.setAttribute("media-name", evt.detail.mediaName);
      this.deleteFileForm.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._mediaSection.addEventListener("moveMedia", (evt) => {
      this._mediaMoveDialog.updateUI(evt.detail.mediaIds);
      this._mediaMoveDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._mediaSection.addEventListener("deleteMedia", () => {
      this._deleteSectionDialog.init(this._selectedSection, true);
      this._deleteSectionDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._mediaSection.addEventListener("filesadded", (evt) => {
      this._uploadDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._mediaSection.addEventListener("attachments", (evt) => {
      this._attachmentDialog.init(evt.detail);
      this._attachmentDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });
  }

  connectedCallback() {
    this.setAttribute(
      "project-id",
      Number(window.location.pathname.split("/")[1])
    );
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

  _notify(title, message, error_or_ok) {
    this.modalNotify.init(title, message, error_or_ok);
    this.modalNotify.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
  }

  _init() {
    const projectId = this.getAttribute("project-id");
    this._projectId = projectId;
    this._settingsButton.setAttribute("href", `/${projectId}/project-settings`);
    this._activityNav.init(projectId);

    // Get info about the project.
    const projectPromise = fetchCredentials("/rest/Project/" + projectId);
    const sectionPromise = fetchCredentials("/rest/Sections/" + projectId);
    const bookmarkPromise = fetchCredentials("/rest/Bookmarks/" + projectId);
    const algoPromise = fetchCredentials("/rest/Algorithms/" + projectId);
    const mediaTypePromise = fetchCredentials("/rest/MediaTypes/" + projectId);
    const membershipPromise = fetchCredentials(
      "/rest/Memberships/" + projectId
    );
    const versionPromise = fetchCredentials("/rest/Versions/" + projectId);

    // Run all above promises
    Promise.all([
      projectPromise,
      sectionPromise,
      bookmarkPromise,
      algoPromise,
      mediaTypePromise,
      membershipPromise,
      versionPromise,
    ])
      .then(
        ([
          projectResponse,
          sectionResponse,
          bookmarkResponse,
          algoResponse,
          mediaTypeResponse,
          membershipResponse,
          versionResponse,
        ]) => {
          const projectData = projectResponse.json();
          const sectionData = sectionResponse.json();
          const bookmarkData = bookmarkResponse.json();
          const algoData = algoResponse.json();
          const mediaTypeData = mediaTypeResponse.json();
          const membershipData = membershipResponse.json();
          const versionData = versionResponse.json();

          Promise.all([
            projectData,
            sectionData,
            bookmarkData,
            algoData,
            mediaTypeData,
            membershipData,
            versionData,
          ])
            .then(
              async ([
                project,
                sections,
                bookmarks,
                algos,
                mediaTypes,
                memberships,
                versions,
              ]) => {
                // Save retrieved REST data
                this._project = project;
                this._sections = sections;
                this._bookmarks = bookmarks;
                this._mediaTypes = mediaTypes;
                this._memberships = memberships;
                this._versions = versions;

                // Hide algorithms if needed from the project detail page.
                // There are a standard list of algorithm names to hide as well as categories
                var hiddenAlgos = [
                  "tator_extend_track",
                  "tator_fill_track_gaps",
                ];
                const hiddenAlgoCategories = ["annotator-view", "disabled"];
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
                this._algorithms = parsedAlgos;

                // Set page header and title
                this._projectText.nodeValue = this._project.name;
                this._description.setAttribute("text", this._project.summary);
                this._collaborators.usernames = this._project.usernames;

                // Initialize bulk edit and the card attribute labels
                this._cardAttributeLabels.init(project.id);
                for (let mediaTypeData of this._mediaTypes) {
                  this._cardAttributeLabels.add({
                    typeData: mediaTypeData,
                    checkedFirst: false,
                  });
                  this._bulkEdit._editPanel.addLocType(mediaTypeData);
                }

                this.initBulkEdit();

                // Hide the settings button if the user does not have full control
                if (!hasPermission(this._project.permission, "Full Control")) {
                  this._settingsButton.style.display = "none";
                }

                // Update the media section with the project data
                this._mediaSection.mediaTypes = this._mediaTypes;
                this._mediaSection.project = this._project;
                this._mediaSection._files._cardAttributeLabels =
                  this._cardAttributeLabels;
                this._mediaSection._bulkEdit = this._bulkEdit;
                this._mediaSection.algorithms = this._algorithms;

                // Initialize folder/search/bookmark data
                this._sectionData.init(this._sections);

                // Initialize the search section object/related search display
                this._sectionSearchDisplay.init(
                  this._memberships,
                  this._sections,
                  this._versions
                );

                // Initialize media move dialog with current section information
                this._mediaMoveDialog.initSectionOptions(this._sectionData);

                // Fill in the left panel area with section information
                this.makeFolders();
                this.makeMediaSearches();
                this.makeBookmarks();
                this.displayPanel("library");

                // Pull URL search parameters.
                // If there are search parameters, apply them to the filterView
                const searchParams = new URLSearchParams(
                  window.location.search
                );
                if (searchParams.has("filterConditions")) {
                  this._filterURIString = searchParams.get("filterConditions");
                  this._filterConditions = JSON.parse(
                    decodeURIComponent(this._filterURIString)
                  );
                } else {
                  this._filterConditions = [];
                  this._filterURIString = null;
                }

                // Setup the filter UI
                this._modelData = new TatorData(projectId);
                await this._modelData.init();

                this._filterDataView = new FilterData(
                  this._modelData,
                  null,
                  [],
                  null
                );
                this._filterDataView.init();
                this._filterView.dataView = this._filterDataView;

                this._mediaSection._modelData = this._modelData;
                this._mediaSection._files.memberships = this._memberships;

                // Select the section if provided in the URL
                // Also get the page information for the initial setup
                var initPage = null;
                if (searchParams.has("page")) {
                  initPage = Number(searchParams.get("page"));
                }
                var initPageSize = null;
                if (searchParams.has("pagesize")) {
                  initPageSize = Number(searchParams.get("pagesize"));
                }
                if (searchParams.has("section")) {
                  const sectionId = Number(searchParams.get("section"));
                  this.selectSection(sectionId, initPage, initPageSize);
                } else {
                  this.selectSection(null, initPage, initPageSize);
                }

                if (this._filterConditions.length > 0) {
                  this._updateFilterResults({
                    detail: {
                      conditions: this._filterConditions,
                    },
                  });
                }
              }
            )
            .catch((err) => {
              console.error("Error setting up page with all promises", err);
              this.hideDimmer();
            });
        }
      )
      .catch((err) => {
        console.error("Error setting up page with all promises", err);
        this.hideDimmer();
      });
  }

  /**
   * Initialize the media bulk edit portion of the page
   */
  initBulkEdit() {
    const moveSelectedButton = document.createElement("media-move-button");
    moveSelectedButton.setAttribute("name", "Move selected media to folder");
    moveSelectedButton._span.textContent = "Move selected media to folder";
    this._bulkEdit._editPanel._otherTools.appendChild(moveSelectedButton);

    moveSelectedButton.addEventListener("click", () => {
      const mediaIds = Array.from(this._bulkEdit._currentMultiSelection);
      if (mediaIds && mediaIds.length > 0) {
        this._mediaMoveDialog.updateUI(mediaIds);
        this._mediaMoveDialog.setAttribute("is-open", "");
        this.setAttribute("has-open-modal", "");
      } else {
        this._notify(
          "Make a selection",
          "Nothing to move! Make a selection first.",
          "error"
        );
      }
    });

    const deleteSelectedButton = document.createElement("delete-button");
    deleteSelectedButton.setAttribute("name", "Delete selected media");
    deleteSelectedButton._span.textContent = "Delete selected media";
    this._bulkEdit._editPanel._otherTools.appendChild(deleteSelectedButton);

    deleteSelectedButton.addEventListener(
      "click",
      this._deleteSelection.bind(this)
    );

    this._bulkEdit.init({
      page: this,
      gallery: this._mediaSection._files,
      projectId: this._project.id,
      type: "media",
      additionalTools: true,
      permission: this._project.permission,
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(
      this,
      name,
      oldValue,
      newValue
    );
    switch (name) {
      case "username":
        break;
      case "project-id":
        this._init();
        break;
    }
  }

  /**
   * Callback when user clicks on an algorithm button.
   * This launches the confirm run algorithm modal window.
   */
  _openConfirmRunAlgoModal(evt) {
    this._confirmRunAlgorithm.init(
      evt.detail.algorithmName,
      evt.detail.projectId,
      evt.detail.mediaIds,
      evt.detail.section
    );
    this._confirmRunAlgorithm.setAttribute("is-open", "");
    this.setAttribute("has-open-modal", "");
    document.body.classList.add("shortcuts-disabled");
  }

  /**
   * Callback from confirm run algorithm modal choice
   */
  async _closeConfirmRunAlgoModal(evt) {
    console.log(evt);

    this._confirmRunAlgorithm.removeAttribute("is-open");
    this.removeAttribute("has-open-modal");
    document.body.classList.remove("shortcuts-disabled");

    if (evt.detail == null) {
      return;
    }

    var that = this;
    var jobMediaIds = [];
    var jobMediaIdSet = new Set();
    if (evt.detail.confirm) {
      // Retrieve media IDs first (if needed)
      if (evt.detail.mediaIds == null) {
        this.showDimmer();

        var filterConditions = [];
        var mediaTypes = this._modelData.getStoredMediaTypes();
        if (evt.detail.section != null) {
          filterConditions.push(
            new FilterConditionData(
              mediaTypes[0].name,
              "$section",
              "==",
              `${evt.detail.section.id}`,
              ""
            )
          );
        }

        var totalCounts = await this._modelData.getFilteredMedias(
          "count",
          filterConditions
        );
        console.log(`mediaCounts: ${totalCounts}`);
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
            allMedia.length,
            allMedia.length + pageSize,
            true
          );
          allMedia.push(...pageMedia);
          pageStart = pageEnd;
          pageEnd = pageStart + pageSize;
          pageCount += 1;
        }

        for (const media of allMedia) {
          jobMediaIds.push(media.id);
          jobMediaIdSet.add(media.id);
        }

        this.hideDimmer();
      } else {
        jobMediaIds = evt.detail.mediaIds;
      }

      var body = JSON.stringify({
        algorithm_name: evt.detail.algorithmName,
        media_ids: jobMediaIds,
      });
      console.log(
        `${jobMediaIds.length} | ${evt.detail.algorithmName} (Unique IDs: ${jobMediaIdSet.size})`
      );

      var response = await fetchCredentials(
        "/rest/Jobs/" + evt.detail.projectId,
        {
          method: "POST",
          body: body,
        },
        true
      );
      var data = await response.json();
      if (response.status == 201) {
        that._notify(
          "Workflow launched!",
          `Successfully launched ${evt.detail.algorithmName}! Monitor progress by clicking the "Activity" button.`,
          "ok"
        );
      } else {
        that._notify(
          "Error launching workflow!",
          `Failed to launch ${evt.detail.algorithmName}: ${response.statusText}.`,
          "error"
        );
      }
    }
  }

  /**
   * Change UI based on current filter operations
   * Expected to be called whenever the filter UI is updated.
   *
   * @postcondition URL is updated with latest filter conditions and resetted page/pageSize
   * @postcondition Media section area is updated using the filter
   */
  async _updateFilterResults(evt, noReload) {
    this._filterConditions = evt.detail.conditions;
    this._filterView.setFilterConditions(this._filterConditions);
    this._bulkEdit.checkForFilters(this._filterConditions);

    try {
      const query = await this._mediaSection.updateFilterResults(
        this._filterConditions,
        evt.detail.noReload
      );
      if (typeof query != "undefined" && query != this._lastQuery) {
        if (query !== "") {
          this._lastQuery = query;
          this._addSavedSearchButton.removeAttribute("disabled");
          this._addSavedSearchButton.style.cursor = "pointer";
          this._addSavedSearchButton.setAttribute(
            "tooltip",
            "Save current media search."
          );
        } else {
          this._addSavedSearchButton.setAttribute("disabled", "");
          this._addSavedSearchButton.style.cursor = "not-allowed";
          this._addSavedSearchButton.setAttribute(
            "tooltip",
            "No media search to save."
          );
        }
      }
    } catch (err) {
      console.error("Couldn't update results with current filter.", err);
    }

    this.hideDimmer();
  }

  _deleteSelection() {
    const list = Array.from(this._bulkEdit._currentMultiSelection);

    if (list && list.length > 0) {
      this.deleteFileForm.setAttribute("media-id", list);
      this.deleteFileForm.setAttribute("project-id", this._projectId);
      this.deleteFileForm.setAttribute("media-name", "Selected files");
      this.deleteFileForm.setAttribute("media-id", String(list));
      this.deleteFileForm.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    } else {
      this._notify(
        "Make a selection",
        "Nothing to delete! Make a selection first.",
        "error"
      );
    }
  }

  /**
   * Displays the background dimmer. Call when a modal is open.
   */
  showDimmer() {
    return this.setAttribute("has-open-modal", "");
  }

  /**
   * Hides the background dimmer. Call when a modal is closed..
   */
  hideDimmer() {
    return this.removeAttribute("has-open-modal");
  }

  //
  // Section data functions
  //

  /**
   * Get the sections for the project and set the UI
   */
  async getSections() {
    var response = await fetchCredentials(`/rest/Sections/${this._projectId}`, {
      method: "GET",
    });
    this._sections = await response.json();
    this._sectionData.init(this._sections);
    this._sectionSearchDisplay.init(
      this._memberships,
      this._sections,
      this._versions
    );
    this.makeFolders();
    this.makeMediaSearches();
    this._mediaMoveDialog.initSectionOptions(this._sectionData);
  }

  /**
   * @param {integer} id - Section ID to hide / set visible = false
   * No checking is done to see if we're just patching the same value
   */
  async hideSection(id) {
    var response = await fetchCredentials(`/rest/Section/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ visible: false }),
    });
    if (response.status == 200) {
      return;
    } else {
      var data = await response.json();
      this._modalError._error(
        `Unable to hide section. Error: ${data.message}`,
        "Error"
      );
    }
  }

  /**
   * @param {integer} id - Section ID to restore / set visible = true
   * No checking is done to see if we're just patching the same value.
   */
  async restoreSection(id) {
    var response = await fetchCredentials(`/rest/Section/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ visible: true }),
    });
    if (response.status == 200) {
      return;
    } else {
      var data = await response.json();
      this._modalError._error(
        `Unable to restore section. Error: ${data.message}`,
        "Error"
      );
    }
  }

  //
  // Folder tree functions
  //

  /**
   * Loops through the folders and sees if they are visible or not (either via expanding) or
   * using the section visibility flag.
   *
   * If a folder/section visibility flag is false, but the this._viewAllHiddenFolders == true, then
   *   it is visible to the user. Hidden otherwise.
   * If a parent folder is hidden, then all of its children are hidden.
   * If a parent folder is not expanded, then all of its children are hidden.
   */
  updateLibraryVisibility() {
    var that = this;

    if (this._viewAdvancedFolderDetails) {
      this.setLeftPanelWidth("500px");
    } else {
      this.setLeftPanelWidth(this._leftPanelDefaultWidth);
    }

    function traverseAlphabetically(node, parentPath) {
      var appendedPath = parentPath;
      var parentExpanded = null;

      if (appendedPath != "") {
        var parentSection = that._sectionData._sectionPathMap[parentPath];
        for (const folder of that._folders.children) {
          if (folder._section.id == parentSection.id) {
            parentExpanded = folder._expanded;
            break;
          }
        }

        appendedPath += ".";
      }

      Object.keys(node)
        .sort()
        .forEach((subpath) => {
          var childSectionListItem = null;
          var childSection = that._sectionData.getSectionFromPath(
            appendedPath + subpath
          );
          if (SectionData.isSavedSearch(childSection)) {
            return;
          }

          for (const folder of that._folders.children) {
            if (folder._section.id == childSection.id) {
              childSectionListItem = folder;
            }
          }

          if (that._viewAdvancedFolderDetails) {
            childSectionListItem.showAdvancedDetails();
          } else {
            childSectionListItem.hideAdvancedDetails();
          }

          var section = that._sectionData.getSectionFromPath(
            appendedPath + subpath
          );
          if (SectionData.isSavedSearch(section)) {
            return;
          }

          childSectionListItem.style.display = "block";
          if (!section.visible) {
            if (!that._viewAllHiddenFolders) {
              childSectionListItem.collapse();
              childSectionListItem.style.display = "none";
            }
          }
          if (parentExpanded != null && parentExpanded == false) {
            childSectionListItem.collapse();
            childSectionListItem.style.display = "none";
          }

          traverseAlphabetically(node[subpath], appendedPath + subpath);
        });
    }
    traverseAlphabetically(this._sectionData._sectionTree, "");

    for (const folder of this._errorFolders) {
      if (this._viewAdvancedFolderDetails) {
        folder.showAdvancedDetails();
      } else {
        folder.hideAdvancedDetails();
      }
    }
  }

  /**
   * @postcondition Section edit dialog is updated with the list of sections
   */
  makeFolders() {
    // Clear out the existing folder lists
    while (this._folders.firstChild) {
      this._folders.removeChild(this._folders.firstChild);
    }

    this._errorFolders = [];

    const that = this;
    function createSectionItem(path, errorSection) {
      if (errorSection != null) {
        const sectionItem = document.createElement("section-list-item");
        sectionItem.init(errorSection, [], true);
        that._folders.appendChild(sectionItem);
        that._errorFolders.push(sectionItem);
      } else {
        const section = that._sectionData.getSectionFromPath(path);
        if (SectionData.isSavedSearch(section)) {
          return;
        }

        const childSections = that._sectionData.getChildSections(section);

        const sectionItem = document.createElement("section-list-item");
        sectionItem.init(section, childSections);

        sectionItem.addEventListener("selected", (evt) => {
          that.selectSection(evt.detail.id);
        });

        sectionItem.addEventListener("collapse", () => {
          that.updateLibraryVisibility();
        });

        sectionItem.addEventListener("expand", () => {
          that.updateLibraryVisibility();
        });

        sectionItem.addEventListener("showMoreMenu", () => {
          for (const folder of that._folders.children) {
            if (folder != sectionItem) {
              folder.hideMoreMenu();
            }
          }
        });

        sectionItem.addEventListener("hideSection", async (evt) => {
          that.showDimmer();

          await that.hideSection(evt.detail.id);

          // Get children of the section. If there are any, we need to hide all of them.
          const children = that._sectionData.getChildSections(section);
          for (const childSection of children) {
            await that.hideSection(childSection.id);
          }

          // Reset the UI
          await that.getSections();
          that.hideDimmer();
        });

        sectionItem.addEventListener("deleteSection", async (evt) => {
          const sectionToDelete = that._sectionData.getSectionFromID(
            evt.detail.id
          );
          that.selectSection(evt.detail.id);
          that._deleteSectionDialog.init(sectionToDelete, false);
          that._deleteSectionDialog.setAttribute("is-open", "");
          that.setAttribute("has-open-modal", "");
        });

        sectionItem.addEventListener("restoreSection", async (evt) => {
          that.showDimmer();
          await that.restoreSection(evt.detail.id);

          // Get children of the section. If there are any, we need to restore all of them.
          const children = that._sectionData.getChildSections(section);
          for (const childSection of children) {
            await that.restoreSection(childSection.id);
          }

          // Reset the UI
          await that.getSections();
          that.selectSection(evt.detail.id);
          that.hideDimmer();
        });

        sectionItem.addEventListener("addSection", () => {
          that.showDimmer();
          that.selectSection(section.id);
          that._folderDialog.setMode("newFolder", section);
          that._folderDialog.setAttribute("is-open", "");
        });

        sectionItem.addEventListener("moveSection", () => {
          that.showDimmer();
          that.selectSection(section.id);
          that._folderDialog.setMode("moveFolder", section);
          that._folderDialog.setAttribute("is-open", "");
        });

        sectionItem.addEventListener("renameSection", () => {
          that.showDimmer();
          that.selectSection(section.id);
          that._folderDialog.setMode("renameFolder", section);
          that._folderDialog.setAttribute("is-open", "");
        });

        that._folders.appendChild(sectionItem);
      }
    }

    function traverseAlphabetically(node, parentPath) {
      var appendedPath = parentPath;
      if (appendedPath != "") {
        appendedPath += ".";
      }

      Object.keys(node)
        .sort()
        .forEach((subpath) => {
          createSectionItem(appendedPath + subpath);
          traverseAlphabetically(node[subpath], appendedPath + subpath);
        });
    }
    traverseAlphabetically(this._sectionData._sectionTree, "");

    const errorSections = this._sectionData.getErrorSections();
    for (const section of errorSections) {
      createSectionItem(null, section);
    }

    this._folderDialog.init(this._sectionData);
    this.updateLibraryVisibility();
  }

  //
  // Media search functions
  //

  /**
   * Update the search list elements in the UI
   */
  updateSearchesVisibility() {
    if (this._viewAdvancedSearchDetails) {
      this.setLeftPanelWidth("500px");
      for (const search of this._savedSearches.children) {
        search.showAdvancedDetails();
      }
    } else {
      this.setLeftPanelWidth(this._leftPanelDefaultWidth);
      for (const search of this._savedSearches.children) {
        search.hideAdvancedDetails();
      }
    }
  }

  /**
   * @precondition this._sectionData has been initialized
   */
  makeMediaSearches() {
    while (this._savedSearches.firstChild) {
      this._savedSearches.removeChild(this._savedSearches.firstChild);
    }

    const that = this;
    function createSectionItem(section) {
      const childSections = that._sectionData.getChildSections(section);

      const sectionItem = document.createElement("media-search-list-item");
      sectionItem.init(section, childSections);

      sectionItem.addEventListener("showMoreMenu", () => {
        for (const search of that._savedSearches.children) {
          if (search != sectionItem) {
            search.hideMoreMenu();
          }
        }
      });

      sectionItem.addEventListener("selected", (evt) => {
        that.selectSection(evt.detail.id);
      });

      sectionItem.addEventListener("deleteSection", async (evt) => {
        const sectionToDelete = that._sectionData.getSectionFromID(
          evt.detail.id
        );
        that.selectSection(evt.detail.id);
        that._deleteSectionDialog.init(sectionToDelete, false);
        that._deleteSectionDialog.setAttribute("is-open", "");
        that.setAttribute("has-open-modal", "");
      });

      sectionItem.addEventListener("renameSection", () => {
        that._mediaSearchDialog.setMode("editSearch", section);
        that._mediaSearchDialog.setAttribute("is-open", "");
        that.setAttribute("has-open-modal", "");
      });

      that._savedSearches.appendChild(sectionItem);
    }

    for (const section of this._sectionData.getSavedSearchesList()) {
      createSectionItem(section);
    }

    this._mediaSearchDialog.init(this._sectionData);
    this.updateSearchesVisibility();
  }

  /**
   * @param {integer} sectionId - Tator ID of section element. If null, then All Media is assumed
   */
  selectSection(sectionId, page, pageSize) {
    // Make all folders and searhes inactive
    const allFolders = [...this._folders.children];
    for (const folder of allFolders) {
      folder.setInactive();
    }

    const allSearches = [...this._savedSearches.children];
    for (const search of allSearches) {
      search.setInactive();
    }

    this._allMediaButton.setInactive();

    // Set the active folder or search and the mainSection portion of the page
    this._selectedSection = null;
    if (sectionId != null) {
      for (const folder of allFolders) {
        const section = folder.getSection();
        if (section.id == sectionId) {
          folder.setActive();
          this._selectedSection = section;
          this._sectionSearchDisplay.style.display = "none";
          break;
        }
      }

      if (this._selectedSection == null) {
        for (const search of allSearches) {
          const section = search.getSection();
          if (section.id == sectionId) {
            search.setActive();
            this._selectedSection = section;
            this._sectionSearchDisplay.style.display = "flex";
            this._sectionSearchDisplay.setDisplay(
              this._selectedSection.object_search,
              this._selectedSection.related_search
            );
            break;
          }
        }
      }
    }

    if (this._selectedSection == null) {
      this._allMediaButton.setActive();
      this._sectionSearchDisplay.style.display = "none";
    }

    // Expand the folders in the library panel until the active folder is selected and in view
    if (this._selectedSection != null) {
      var parentSections = this._sectionData.getParentSections(
        this._selectedSection
      );
      var parentSectionIds = parentSections.map((section) => section.id);
      var activeFolder = null;
      for (const folder of allFolders) {
        const section = folder.getSection();
        if (parentSectionIds.includes(section.id)) {
          folder.expand();
        }
        if (section.id == this._selectedSection.id) {
          activeFolder = folder;
        }
      }
      this.updateLibraryVisibility();

      if (activeFolder != null) {
        this.displayPanel("library");
      } else {
        this.displayPanel("saved searches");
      }

      function isInViewport(element) {
        var rect = element.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <=
            (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <=
            (window.innerWidth || document.documentElement.clientWidth)
        );
      }
      if (activeFolder != null && !isInViewport(activeFolder)) {
        activeFolder.scrollIntoView();
      }
    }

    // Update media section center page
    this.updateURL();
    this._mediaSection.init(
      this._project.id,
      this._selectedSection,
      page,
      pageSize,
      this._sections
    );
  }

  /**
   * Updates the URL with the current page's state
   */
  updateURL() {
    let url = new URL(window.location.href);

    if (this._selectedSection !== null) {
      url.searchParams.set("section", this._selectedSection.id);
    } else {
      url.searchParams.delete("section");
    }
    window.history.replaceState({}, "", url.toString());
  }

  //
  // Bookmark management
  //

  /**
   * @precondition this._bookmarks is filled with the bookmark objects to display
   */
  makeBookmarks() {
    // Clear out the existing bookmarks
    while (this._bookmarkListItems.firstChild) {
      this._bookmarkListItems.removeChild(this._bookmarkListItems.firstChild);
    }

    // Build bookmark list, and sort by name.
    // Put the standard Last visited at the top.
    const first = "Last visited";
    this._bookmarks.sort((a, b) => {
      return a.name == first ? -1 : b.name == first ? 1 : 0;
    });

    for (const bookmark of this._bookmarks) {
      const listItem = document.createElement("bookmark-list-item");
      listItem.init(bookmark);
      this._bookmarkListItems.appendChild(listItem);

      listItem.addEventListener("showMoreMenu", () => {
        for (const bookmark of that._bookmarks.children) {
          if (bookmark != listItem) {
            bookmark.hideMoreMenu();
          }
        }
      });

      listItem.addEventListener("renameBookmark", () => {
        this._bookmarkEditDialog.init(bookmark);
        this._bookmarkEditDialog.setAttribute("is-open", "");
        this.setAttribute("has-open-modal", "");
      });

      listItem.addEventListener("deleteBookmark", () => {
        this._bookmarkDeleteDialog.init(bookmark);
        this._bookmarkDeleteDialog.setAttribute("is-open", "");
        this.setAttribute("has-open-modal", "");
      });
    }
  }

  //
  // Side Left Panel
  //

  leftPanelHidden() {
    return this._leftPanel.style.display == "none";
  }

  expandLeftPanel() {
    this._leftPanel.style.display = "flex";
  }

  hideLeftPanel() {
    this._leftPanel.style.display = "none";
    this._sidebarLibraryButton.setAttribute("tooltip", "Open Library Panel");
    this._sidebarSavedSearchesButton.setAttribute(
      "tooltip",
      "Open Saved Searches Panel"
    );
    this._sidebarBookmarksButton.setAttribute(
      "tooltip",
      "Open Bookmarks Panel"
    );
  }

  /**
   * @param {string} panel
   *   "library" | "saved searches" | "bookmarks"
   */
  displayPanel(panel) {
    if (panel == "library") {
      this._currentPanel = panel;

      if (this._viewAdvancedFolderDetails) {
        this.setLeftPanelWidth("500px");
      } else {
        this.setLeftPanelWidth(this._leftPanelDefaultWidth);
      }

      this._sidebarLibraryButton.setAttribute("tooltip", "Hide Library Panel");
      this._sidebarSavedSearchesButton.setAttribute(
        "tooltip",
        "Open Saved Searches Panel"
      );
      this._sidebarBookmarksButton.setAttribute(
        "tooltip",
        "Open Bookmarks Panel"
      );

      this._sidebarLibraryButton.classList.add("btn-purple50");
      this._sidebarSavedSearchesButton.classList.remove("btn-purple50");
      this._sidebarBookmarksButton.classList.remove("btn-purple50");

      this._sidebarLibraryText.classList.add("text-white");
      this._sidebarSavedSearchesText.classList.remove("text-white");
      this._sidebarBookmarksText.classList.remove("text-white");

      this._sidebarLibraryText.classList.remove("text-gray");
      this._sidebarSavedSearchesText.classList.add("text-gray");
      this._sidebarBookmarksText.classList.add("text-gray");

      this._panelLibrary.style.display = "block";
      this._panelSavedSearches.style.display = "none";
      this._panelBookmarks.style.display = "none";
    } else if (panel == "saved searches") {
      this._currentPanel = panel;

      if (this._viewAdvancedSearchDetails) {
        this.setLeftPanelWidth("500px");
      } else {
        this.setLeftPanelWidth(this._leftPanelDefaultWidth);
      }

      this._sidebarSavedSearchesButton.setAttribute(
        "tooltip",
        "Hide Saved Searches Panel"
      );
      this._sidebarLibraryButton.setAttribute("tooltip", "Open Library Panel");
      this._sidebarBookmarksButton.setAttribute(
        "tooltip",
        "Open Bookmarks Panel"
      );

      this._sidebarLibraryButton.classList.remove("btn-purple50");
      this._sidebarSavedSearchesButton.classList.add("btn-purple50");
      this._sidebarBookmarksButton.classList.remove("btn-purple50");

      this._sidebarLibraryText.classList.remove("text-white");
      this._sidebarSavedSearchesText.classList.add("text-white");
      this._sidebarBookmarksText.classList.remove("text-white");

      this._sidebarLibraryText.classList.add("text-gray");
      this._sidebarSavedSearchesText.classList.remove("text-gray");
      this._sidebarBookmarksText.classList.add("text-gray");

      this._panelLibrary.style.display = "none";
      this._panelSavedSearches.style.display = "block";
      this._panelBookmarks.style.display = "none";
    } else if (panel == "bookmarks") {
      this._currentPanel = panel;

      this.setLeftPanelWidth(this._leftPanelDefaultWidth);

      this._sidebarBookmarksButton.setAttribute(
        "tooltip",
        "Hide Bookmarks Panel"
      );
      this._sidebarLibraryButton.setAttribute("tooltip", "Open Library Panel");
      this._sidebarSavedSearchesButton.setAttribute(
        "tooltip",
        "Open Saved Searches Panel"
      );

      this._sidebarLibraryButton.classList.remove("btn-purple50");
      this._sidebarSavedSearchesButton.classList.remove("btn-purple50");
      this._sidebarBookmarksButton.classList.add("btn-purple50");

      this._sidebarLibraryText.classList.remove("text-white");
      this._sidebarSavedSearchesText.classList.remove("text-white");
      this._sidebarBookmarksText.classList.add("text-white");

      this._sidebarLibraryText.classList.add("text-gray");
      this._sidebarSavedSearchesText.classList.add("text-gray");
      this._sidebarBookmarksText.classList.remove("text-gray");

      this._panelLibrary.style.display = "none";
      this._panelSavedSearches.style.display = "none";
      this._panelBookmarks.style.display = "block";
    }
  }

  /**
   * @param {string} width
   *  e.g. "400px";
   */
  setLeftPanelWidth(width) {
    this._leftPanel.style.minWidth = width;
    this._leftPanel.style.maxWidth = width;
  }

  /**
   * Setup the left side navigation bar
   * Execute only at initialization.
   */
  createSidebarNav() {
    var sidebarDiv = document.createElement("div");
    sidebarDiv.setAttribute(
      "class",
      "project-sidebar d-flex flex-items-center flex-column"
    );
    this.mainWrapper.appendChild(sidebarDiv);

    this._sidebarLibraryButton = document.createElement("button");
    this._sidebarLibraryButton.setAttribute(
      "class",
      "mt-2 btn-clear d-flex flex-items-center flex-column flex-justify-center px-2 py-2 rounded-2 f2 text-gray entity__button project-sidebar-button tooltip-right"
    );
    this._sidebarLibraryButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 4h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" /><path d="M17 17v2a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h2" />
      </svg>
    `;
    sidebarDiv.appendChild(this._sidebarLibraryButton);

    this._sidebarLibraryText = document.createElement("div");
    this._sidebarLibraryText.setAttribute(
      "class",
      "f3 text-gray pb-2 pt-1 text-center mb-2 clickable"
    );
    this._sidebarLibraryText.textContent = "Library";
    sidebarDiv.appendChild(this._sidebarLibraryText);

    this._sidebarSavedSearchesButton = document.createElement("button");
    this._sidebarSavedSearchesButton.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center flex-column flex-justify-center px-2 py-2 rounded-2 f2 text-gray entity__button project-sidebar-button tooltip-right"
    );
    this._sidebarSavedSearchesButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" />
      </svg>
    `;
    sidebarDiv.appendChild(this._sidebarSavedSearchesButton);

    this._sidebarSavedSearchesText = document.createElement("div");
    this._sidebarSavedSearchesText.setAttribute(
      "class",
      "f3 text-gray pb-2 pt-1 text-center mb-2 clickable"
    );
    this._sidebarSavedSearchesText.textContent = "Searches";
    sidebarDiv.appendChild(this._sidebarSavedSearchesText);

    this._sidebarBookmarksButton = document.createElement("button");
    this._sidebarBookmarksButton.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center flex-column flex-justify-center px-2 py-2 rounded-2 f2 text-gray entity__button project-sidebar-button tooltip-right"
    );
    this._sidebarBookmarksButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 10v11l-5 -3l-5 3v-11a3 3 0 0 1 3 -3h4a3 3 0 0 1 3 3z" /><path d="M11 3h5a3 3 0 0 1 3 3v11" />
      </svg>
    `;
    sidebarDiv.appendChild(this._sidebarBookmarksButton);

    this._sidebarBookmarksText = document.createElement("div");
    this._sidebarBookmarksText.setAttribute(
      "class",
      "f3 text-gray pb-2 pt-1 text-center mb-2 clickable"
    );
    this._sidebarBookmarksText.textContent = "Bookmarks";
    sidebarDiv.appendChild(this._sidebarBookmarksText);

    this._sidebarLibraryButton.addEventListener("click", () => {
      this._sidebarLibraryButton.blur();
      if (!this.leftPanelHidden() && this._currentPanel == "library") {
        this.hideLeftPanel();
      } else {
        this.expandLeftPanel();
        this.displayPanel("library");
      }
    });
    this._sidebarLibraryText.addEventListener("click", () => {
      this._sidebarLibraryText.blur();
      if (!this.leftPanelHidden() && this._currentPanel == "library") {
        this.hideLeftPanel();
      } else {
        this.expandLeftPanel();
        this.displayPanel("library");
      }
    });
    this._sidebarSavedSearchesButton.addEventListener("click", () => {
      this._sidebarSavedSearchesButton.blur();
      if (!this.leftPanelHidden() && this._currentPanel == "saved searches") {
        this.hideLeftPanel();
      } else {
        this.expandLeftPanel();
        this.displayPanel("saved searches");
      }
    });
    this._sidebarSavedSearchesText.addEventListener("click", () => {
      this._sidebarSavedSearchesText.blur();
      if (!this.leftPanelHidden() && this._currentPanel == "saved searches") {
        this.hideLeftPanel();
      } else {
        this.expandLeftPanel();
        this.displayPanel("saved searches");
      }
    });
    this._sidebarBookmarksButton.addEventListener("click", () => {
      this._sidebarBookmarksButton.blur();
      if (!this.leftPanelHidden() && this._currentPanel == "bookmarks") {
        this.hideLeftPanel();
      } else {
        this.expandLeftPanel();
        this.displayPanel("bookmarks");
      }
    });
    this._sidebarBookmarksText.addEventListener("click", () => {
      this._sidebarBookmarksText.blur();
      if (!this.leftPanelHidden() && this._currentPanel == "bookmarks") {
        this.hideLeftPanel();
      } else {
        this.expandLeftPanel();
        this.displayPanel("bookmarks");
      }
    });
  }

  /**
   * Setup the left side panel for the library components
   * Execute only at initialization.
   */
  setupLibraryPanel() {
    this._viewAllHiddenFolders = false;
    this._viewAdvancedFolderDetails = false;

    const libraryHeader = document.createElement("div");
    libraryHeader.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center pt-2 pb-3 ml-2"
    );
    this._panelLibrary.appendChild(libraryHeader);

    const libraryText = document.createElement("div");
    libraryText.setAttribute("class", "h2 mb-2");
    libraryText.textContent = "Library";
    libraryHeader.appendChild(libraryText);

    this._allMediaButton = document.createElement("all-media-item");
    this._panelLibrary.appendChild(this._allMediaButton);

    this._allMediaButton.addEventListener("selected", (evt) => {
      this.selectSection(evt.detail.id);
    });

    const folderHeader = document.createElement("div");
    folderHeader.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-2 mt-3"
    );
    this._panelLibrary.appendChild(folderHeader);

    const folderText = document.createElement("h2");
    folderText.setAttribute("class", "h3 ml-2");
    folderText.textContent = "Folders";
    folderHeader.appendChild(folderText);

    const folderButtons = document.createElement("div");
    folderButtons.setAttribute(
      "class",
      "rounded-2 px-1 d-flex flex-items-center"
    );
    folderHeader.appendChild(folderButtons);

    const advancedDetails = document.createElement("div");
    advancedDetails.setAttribute(
      "class",
      "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray"
    );
    advancedDetails.setAttribute("tooltip", "View Advanced Details");
    advancedDetails.style.minHeight = "28px";
    folderButtons.appendChild(advancedDetails);
    advancedDetails.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 100 100" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M81.41,56.24l-11.47-6.86c-1.88-1.12-1.92-3.83-0.07-5.01c5.71-3.64,5.33-11.31,0.19-14.6
      L33.17,6.23c-5.71-3.65-13.21,0.46-13.21,7.24v15.38c0,1.83-2.02,2.94-3.56,1.95C10.69,27.15,3.2,31.24,3.2,38.03v47.11
      c0,6.78,7.49,10.89,13.21,7.24l12.76-8.24c1.2-0.78,2.78,0.09,2.78,1.52c0,8.74,7.95,11.39,13.04,8.14l36.42-23.26
      C86.63,67.2,86.63,59.58,81.41,56.24z M65.64,60.57c-5.92,3.78-33.23,21.44-33.83,21.69c-5.47,2.28-11.84-1.69-11.84-7.95
      c0-2.21,0-38.64,0-40.88c0-6.78,7.49-10.89,13.21-7.24c5.1,3.26,32.56,20.62,32.47,20.62C70.86,50.15,70.86,57.24,65.64,60.57z">
    </svg>
   `;

    const viewHiddenFolders = document.createElement("div");
    viewHiddenFolders.setAttribute(
      "class",
      "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray"
    );
    viewHiddenFolders.setAttribute("tooltip", "View Hidden Folders");
    viewHiddenFolders.style.minHeight = "28px";
    folderButtons.appendChild(viewHiddenFolders);
    viewHiddenFolders.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
   `;

    const collapseFolders = document.createElement("div");
    collapseFolders.setAttribute(
      "class",
      "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray"
    );
    collapseFolders.setAttribute("tooltip", "Collapse All Folders");
    collapseFolders.style.minHeight = "28px";
    folderButtons.appendChild(collapseFolders);
    collapseFolders.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 3m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 7.26a2.005 2.005 0 0 0 -1.012 1.737v10c0 1.1 .9 2 2 2h10c.75 0 1.158 -.385 1.5 -1" /><path d="M11 10h6" />
    </svg>
    `;

    const expandFolders = document.createElement("div");
    expandFolders.setAttribute(
      "class",
      "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray"
    );
    expandFolders.setAttribute("tooltip", "Expand All Folders");
    expandFolders.style.minHeight = "28px";
    folderButtons.appendChild(expandFolders);
    expandFolders.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 3m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z" /><path d="M4.012 7.26a2.005 2.005 0 0 0 -1.012 1.737v10c0 1.1 .9 2 2 2h10c.75 0 1.158 -.385 1.5 -1" /><path d="M11 10h6" /><path d="M14 7v6" />
    </svg>
    `;

    const addFolders = document.createElement("div");
    addFolders.setAttribute(
      "class",
      "d-flex d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray"
    );
    addFolders.setAttribute("tooltip", "Add Folder");
    addFolders.style.minHeight = "28px";
    folderButtons.appendChild(addFolders);
    addFolders.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" />
    </svg>
    `;

    this._folders = document.createElement("ul");
    this._folders.setAttribute("class", "sections");
    this._folders.style.height = "70vh";
    this._folders.style.overflowY = "auto";
    this._panelLibrary.appendChild(this._folders);

    advancedDetails.addEventListener("click", () => {
      advancedDetails.blur();
      this._viewAdvancedFolderDetails = !this._viewAdvancedFolderDetails;

      if (this._viewAdvancedFolderDetails) {
        advancedDetails.setAttribute("tooltip", "Hide Advanced Details");
      } else {
        advancedDetails.setAttribute("tooltip", "View Advanced Details");
      }

      this.updateLibraryVisibility();
    });

    viewHiddenFolders.addEventListener("click", () => {
      viewHiddenFolders.blur();
      this._viewAllHiddenFolders = !this._viewAllHiddenFolders;

      if (this._viewAllHiddenFolders) {
        viewHiddenFolders.setAttribute("tooltip", "Stash Hidden Folders");
        viewHiddenFolders.innerHTML = `
        <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
        `;
      } else {
        viewHiddenFolders.setAttribute("tooltip", "View Hidden Folders");
        viewHiddenFolders.innerHTML = `
        <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
       `;
      }

      this.updateLibraryVisibility();
    });

    collapseFolders.addEventListener("click", () => {
      collapseFolders.blur();
      const allFolders = [...this._folders.children];
      for (const folder of allFolders) {
        folder.collapse();
      }
      this.updateLibraryVisibility();
    });

    expandFolders.addEventListener("click", () => {
      expandFolders.blur();
      const allFolders = [...this._folders.children];
      for (const folder of allFolders) {
        folder.expand();
      }
      this.updateLibraryVisibility();
    });

    addFolders.addEventListener("click", () => {
      addFolders.blur();
      this._folderDialog.setMode("newFolder", this._selectedSection);
      this._folderDialog.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });
  }

  /**
   * Setup the left side panel for the saved searches components
   * Execute only at initialization.
   */
  setupSearchesPanel() {
    this._viewAdvancedSearchDetails = false;

    const topHeader = document.createElement("div");
    topHeader.setAttribute("class", "d-flex pt-2 pb-2 ml-2 flex-column");
    this._panelSavedSearches.appendChild(topHeader);

    const savedSearchesHeader = document.createElement("div");
    savedSearchesHeader.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center"
    );
    topHeader.appendChild(savedSearchesHeader);

    var savedSearchText = document.createElement("div");
    savedSearchText.setAttribute("class", "h2");
    savedSearchText.textContent = "Searches";
    savedSearchesHeader.appendChild(savedSearchText);

    const helpDiv = document.createElement("div");
    helpDiv.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center mb-2"
    );
    topHeader.appendChild(helpDiv);

    const searchHelpIcon = document.createElement("div");
    searchHelpIcon.setAttribute(
      "class",
      "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray"
    );
    searchHelpIcon.setAttribute("tooltip", "Searches Help");
    searchHelpIcon.style.minHeight = "28px";
    searchHelpIcon.style.maxWidth = "28px";
    savedSearchesHeader.appendChild(searchHelpIcon);
    searchHelpIcon.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
   `;

    const searchHelpText = document.createElement("div");
    searchHelpText.setAttribute("class", "f2 py-2 text-dark-gray");
    searchHelpText.textContent =
      "Apply a filter to an existing folder or search and save it as a Media Search. Media Searches are visible to all project users.";
    helpDiv.appendChild(searchHelpText);
    searchHelpText.style.display = "none";

    searchHelpIcon.addEventListener("click", () => {
      searchHelpIcon.blur();
      if (searchHelpText.style.display == "none") {
        searchHelpText.style.display = "block";
      } else {
        searchHelpText.style.display = "none";
      }
    });

    const mediaSearchHeader = document.createElement("div");
    mediaSearchHeader.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center py-2"
    );
    this._panelSavedSearches.appendChild(mediaSearchHeader);

    var headerText = document.createElement("h2");
    headerText.setAttribute("class", "h3 ml-2");
    headerText.textContent = "Media Searches";
    mediaSearchHeader.appendChild(headerText);

    var headerButtons = document.createElement("div");
    headerButtons.setAttribute(
      "class",
      "rounded-2 px-1 d-flex flex-items-center"
    );
    mediaSearchHeader.appendChild(headerButtons);

    const advancedDetails = document.createElement("div");
    advancedDetails.setAttribute(
      "class",
      "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray"
    );
    advancedDetails.setAttribute("tooltip", "View Advanced Details");
    advancedDetails.style.minHeight = "28px";
    headerButtons.appendChild(advancedDetails);
    advancedDetails.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 100 100" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M81.41,56.24l-11.47-6.86c-1.88-1.12-1.92-3.83-0.07-5.01c5.71-3.64,5.33-11.31,0.19-14.6
      L33.17,6.23c-5.71-3.65-13.21,0.46-13.21,7.24v15.38c0,1.83-2.02,2.94-3.56,1.95C10.69,27.15,3.2,31.24,3.2,38.03v47.11
      c0,6.78,7.49,10.89,13.21,7.24l12.76-8.24c1.2-0.78,2.78,0.09,2.78,1.52c0,8.74,7.95,11.39,13.04,8.14l36.42-23.26
      C86.63,67.2,86.63,59.58,81.41,56.24z M65.64,60.57c-5.92,3.78-33.23,21.44-33.83,21.69c-5.47,2.28-11.84-1.69-11.84-7.95
      c0-2.21,0-38.64,0-40.88c0-6.78,7.49-10.89,13.21-7.24c5.1,3.26,32.56,20.62,32.47,20.62C70.86,50.15,70.86,57.24,65.64,60.57z">
    </svg>
   `;

    this._addSavedSearchButton = document.createElement("div");
    this._addSavedSearchButton.setAttribute(
      "class",
      "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray"
    );
    this._addSavedSearchButton.setAttribute(
      "tooltip",
      "Save Current Media Search"
    );
    this._addSavedSearchButton.setAttribute("disabled", "");
    this._addSavedSearchButton.style.cursor = "not-allowed";
    this._addSavedSearchButton.setAttribute(
      "tooltip",
      "No media search to save."
    );
    this._addSavedSearchButton.style.minHeight = "28px";
    headerButtons.appendChild(this._addSavedSearchButton);
    this._addSavedSearchButton.innerHTML = `
    <svg class="no-fill" width="20" height="20" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2" /><path d="M12 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M14 4l0 4l-6 0l0 -4" />
    </svg>
    `;

    this._savedSearches = document.createElement("ul");
    this._savedSearches.setAttribute("class", "sections");
    this._savedSearches.style.height = "70vh";
    this._savedSearches.style.overflowY = "auto";
    this._panelSavedSearches.appendChild(this._savedSearches);

    advancedDetails.addEventListener("click", () => {
      advancedDetails.blur();
      this._viewAdvancedSearchDetails = !this._viewAdvancedSearchDetails;

      if (this._viewAdvancedSearchDetails) {
        advancedDetails.setAttribute("tooltip", "Hide Advanced Details");
      } else {
        advancedDetails.setAttribute("tooltip", "View Advanced Details");
      }

      this.updateSearchesVisibility();
    });

    this._addSavedSearchButton.addEventListener("click", () => {
      this._addSavedSearchButton.blur();
      if (this._addSavedSearchButton.hasAttribute("disabled")) {
        return;
      }
      this.setAttribute("has-open-modal", "");
      this._mediaSearchDialog.setMode("newSearch", this._selectedSection);
      this._mediaSearchDialog.setAttribute("is-open", "");
    });
  }

  /**
   * Setup the left side panel for the bookmarks components
   * Execute only at initialization
   */
  setupBookmarksPanel() {
    const bookmarkHeader = document.createElement("div");
    bookmarkHeader.setAttribute("class", "d-flex pt-2 pb-2 ml-2 flex-column");
    this._panelBookmarks.appendChild(bookmarkHeader);

    const bookmarkHeaderDiv = document.createElement("div");
    bookmarkHeaderDiv.setAttribute(
      "class",
      "d-flex flex-justify-between flex-items-center mb-2"
    );
    bookmarkHeader.appendChild(bookmarkHeaderDiv);

    const bookmarkText = document.createElement("div");
    bookmarkText.setAttribute("class", "h2");
    bookmarkText.textContent = "Bookmarks";
    bookmarkHeaderDiv.appendChild(bookmarkText);

    const bookmarkHelpIcon = document.createElement("div");
    bookmarkHelpIcon.setAttribute(
      "class",
      "d-flex mr-2 d-flex flex-items-center clickable rounded-2 px-1 btn btn-fit-content btn-small-height btn-clear btn-charcoal-medium text-gray"
    );
    bookmarkHelpIcon.setAttribute("tooltip", "Bookmarks Help");
    bookmarkHelpIcon.style.minHeight = "28px";
    bookmarkHelpIcon.style.maxWidth = "28px";
    bookmarkHeaderDiv.appendChild(bookmarkHelpIcon);
    bookmarkHelpIcon.innerHTML = `
    <svg class="no-fill" width="18" height="18" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
   `;

    const bookmarkHelpText = document.createElement("div");
    bookmarkHelpText.setAttribute("class", "f2 py-2 text-dark-gray");
    bookmarkHelpText.textContent =
      "Click on a bookmark to view the media at the specific frame and version. Bookmarks are created within the annotator and are specific to the user.";
    bookmarkHeader.appendChild(bookmarkHelpText);
    bookmarkHelpText.style.display = "none";

    bookmarkHelpIcon.addEventListener("click", () => {
      bookmarkHelpIcon.blur();
      if (bookmarkHelpText.style.display == "none") {
        bookmarkHelpText.style.display = "block";
      } else {
        bookmarkHelpText.style.display = "none";
      }
    });

    this._bookmarkListItems = document.createElement("ul");
    this._bookmarkListItems.setAttribute("class", "sections");
    this._bookmarkListItems.style.height = "70vh";
    this._bookmarkListItems.style.overflowY = "auto";
    this._panelBookmarks.appendChild(this._bookmarkListItems);
  }

  /**
   * Create the left panels for the:
   * - Library
   * - Saved searches
   * - Bookmarks
   *
   * Execute only at initialization
   */
  createLeftPanel() {
    this._leftPanel = document.createElement("div");
    this._leftPanel.setAttribute("class", "d-flex flex-grow flex-column");
    this._leftPanel.style.minWidth = "400px";
    this._leftPanel.style.maxWidth = "400px";
    this._leftPanel.style.backgroundColor = "#0d1320";
    this.mainWrapper.appendChild(this._leftPanel);

    this._panelLibrary = document.createElement("section");
    this._panelLibrary.setAttribute(
      "class",
      "py-3 mr-3 ml-3 text-gray flex-grow"
    );
    this._leftPanel.appendChild(this._panelLibrary);

    this._panelSavedSearches = document.createElement("section");
    this._panelSavedSearches.setAttribute(
      "class",
      "py-3 mr-3 ml-3 text-gray flex-grow"
    );
    this._leftPanel.appendChild(this._panelSavedSearches);

    this._panelBookmarks = document.createElement("section");
    this._panelBookmarks.setAttribute(
      "class",
      "py-3 mr-3 ml-3 text-gray flex-grow"
    );
    this._leftPanel.appendChild(this._panelBookmarks);

    this.setupLibraryPanel();
    this.setupSearchesPanel();
    this.setupBookmarksPanel();

    this._leftPanelDefaultWidth = "400px";
    this.setLeftPanelWidth(this._leftPanelDefaultWidth);

    this._currentPanel = "library";
    this.displayPanel("library");
  }
}

customElements.define("project-detail", ProjectDetail);
