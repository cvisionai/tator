import { TatorElement } from "../components/tator-element.js";
import { hasPermission } from "../util/has-permission.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { joinParams } from "../util/join-params.js";
import { Utilities } from "../util/utilities.js";
import { downloadFileList } from "../util/download-file-list.js";
import { SectionData } from "../util/section-utilities.js";

export class MediaSection extends TatorElement {
  constructor() {
    super();

    const section = document.createElement("div");
    section.setAttribute("class", "project__section py-3");
    this._shadow.appendChild(section);

    const header = document.createElement("div");
    header.setAttribute(
      "class",
      "project__header d-flex flex-items-center flex-justify-between col-12 row-actions-hover"
    );
    section.appendChild(header);

    this._name = document.createElement("div");
    this._name.setAttribute("class", "d-flex flex-column h3 py-2");
    header.appendChild(this._name);

    this._nameText = document.createElement("div");
    this._nameText.setAttribute("class", "d-flex flex-items-center");
    this._name.appendChild(this._nameText);

    this._loading = document.createElement("div");
    this._loading.setAttribute(
      "class",
      "d-flex flex-items-center text-white f2 text-semibold py-2"
    );
    this._loading.innerHTML = "Loading...";
    this._name.appendChild(this._loading);
    this._loading.style.display = "none";

    this._pageWrapper = document.createElement("div");
    this._pageWrapper.setAttribute("class", "d-flex text-gray f1 py-2");
    this._name.appendChild(this._pageWrapper);
    this._pageWrapper.style.display = "none";

    this._numFiles = document.createElement("div");
    this._numFiles.setAttribute("class", "text-gray mr-2");
    this._pageWrapper.appendChild(this._numFiles);

    this._pagePosition = document.createElement("div");
    this._pagePosition.setAttribute("class", "text-normal");
    this._pageWrapper.appendChild(this._pagePosition);

    const actions = document.createElement("div");
    actions.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(actions);

    this._reload = document.createElement("reload-button");
    this._reload.setAttribute("class", "px-2");
    actions.appendChild(this._reload);

    this._upload = document.createElement("section-upload");
    this._upload.setAttribute("class", "px-2");
    actions.appendChild(this._upload);

    this._more = document.createElement("section-more");
    this._more.setAttribute("class", "px-2");
    actions.appendChild(this._more);

    this._hiddenMediaLabel = document.createElement("div");
    section.appendChild(this._hiddenMediaLabel);

    this._defaultPageSize = 25;
    this._maxPageSizeDefault = 100;

    const paginatorTopDiv = document.createElement("div");
    paginatorTopDiv.setAttribute(
      "class",
      "d-flex flex-items-center flex-justify-center mt-2"
    );
    section.appendChild(paginatorTopDiv);

    this._paginator_top = document.createElement("entity-gallery-paginator");
    this._paginator_top._showIndexLength = 3;
    this._paginator_top._pageSize = this._defaultPageSize;
    this._paginator_top._pageMax = this._maxPageSizeDefault;
    this._paginator_top.setupElements();
    paginatorTopDiv.appendChild(this._paginator_top);

    this._sort = document.createElement("entity-gallery-sort-simple");
    paginatorTopDiv.appendChild(this._sort);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex py-3");
    section.appendChild(div);

    this._files = document.createElement("section-files");
    this._files.setAttribute("class", "col-12");
    this._files.mediaParams = this._sectionParams.bind(this);

    div.appendChild(this._files);

    this._paginator_bottom = document.createElement("entity-gallery-paginator");
    this._paginator_top._showIndexLength = 3;
    this._paginator_bottom._pageSize = this._defaultPageSize;
    this._paginator_bottom._pageMax = this._maxPageSizeDefault;
    this._paginator_bottom.setupElements();
    section.appendChild(this._paginator_bottom);

    this._searchParams = new URLSearchParams();
    this._numFilesCount = 0;
    this._searchString = "";
    this._relatedSearchString = "";
    this._filterConditions = [];

    this._setCallbacks();

    window.addEventListener("upload-complete", this.reload.bind(this));
  }

  /**
   * @param {array} sections
   *   Array of all the sections in the project
   */
  updateSectionData(sections) {
    this._sectionData = new SectionData();
    this._sectionData.init(sections);
  }

  async init(project, section, page, pageSize, allSections) {
    this._pageWrapper.style.display = "none";
    this._loading.style.display = "flex";

    this.updateSectionData(allSections);

    if (section === null) {
      this._sectionName = "All Media";
      this._upload.setAttribute("section", "");
      this._nameText.innerHTML = `<span class="text-white d-flex flex-items-center">${this._sectionName}</span>`;
    } else {
      this._sectionName = section.name;
      this._upload.setAttribute("section", section.name);
      var parts = this._sectionData.getSectionNamesLineage(section);
      var nameTextHTML = `<span class="text-white d-flex flex-items-center">${section.name}</span>`;
      if (parts.length > 1) {
        let mainSectionName = parts[parts.length - 1];
        parts.pop();
        var chevronSpacer = `
        <svg width="20" height="20" viewBox="0 0 24 24" class="no-fill px-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        `;
        nameTextHTML = `<span class="text-dark-gray d-flex flex-items-center">`;
        nameTextHTML += parts.join(chevronSpacer);
        nameTextHTML += chevronSpacer;
        nameTextHTML += `</span>`;
        nameTextHTML += `<span class="text-white d-flex flex-items-center">${mainSectionName}</span>`;
      }
      this._nameText.innerHTML = nameTextHTML;
    }
    this._project = project;
    this._section = section;
    this._files.setAttribute("project-id", project);

    this._upload.setAttribute("project-id", project);
    this._more.section = section;

    if (page != null && pageSize != null) {
      this._start = (page - 1) * pageSize;
      this._stop = this._start + pageSize;
      this._paginator_top.pageSize = pageSize;
      this._paginator_bottom.pageSize = pageSize;
      this._page = page;
    } else {
      this._start = 0;
      this._stop = this._paginator_top._pageSize;
      this._page = 1;
    }
    this._paginator_top._setPage(page - 1);
    this._paginator_bottom._setPage(page - 1);

    this._updatePageArgs();

    await this.reload();
  }

  /**
   * @param {array} mediaTypes
   *    Array of media types to display in the UI
   */
  set mediaTypes(mediaTypes) {
    this._mediaTypes = mediaTypes;
    this._mediaTypesMap = new Map();
    for (let mediaTypeData of mediaTypes) {
      this._mediaTypesMap.set(mediaTypeData.id, mediaTypeData);
    }
    this._files.mediaTypesMap = this._mediaTypesMap;
    this._sort.init("Media", mediaTypes);
  }

  set project(val) {
    this._files.project = val;
    if (!hasPermission(val.permission, "Can Edit")) {
      this._upload.style.display = "none";
      this._more.setAttribute(
        "editPermission",
        "Editing menu disable due to permissions."
      );
    }
    if (
      !(hasPermission(val.permission, "Can Transfer") && val.enable_downloads)
    ) {
      this._upload.style.display = "none";
      this._more.setAttribute(
        "uploadPermission",
        "Upload hidden due to permissions."
      );
    }
    this._more.project = val;
    this._project = val;
  }

  set numMedia(val) {
    this._updateNumFiles(val);
    if (val == 0) {
      this._files.style.display = "none";
    } else {
      this._files.style.display = "block";
    }
  }

  set searchString(val) {
    if (val) {
      this._searchParams.set("encoded_search", val);
    } else {
      this._searchParams.delete("encoded_search");
    }
    this._searchString = val;
  }

  set relatedSearchString(val) {
    if (val) {
      this._searchParams.set("encoded_related_search", val);
    } else {
      this._searchParams.delete("encoded_related_search");
    }
    this._relatedSearchString = val;
  }

  get sectionParams() {
    return this._sectionParams();
  }

  set cardInfo(val) {
    this._files.cardInfo = val;
  }

  set mediaIds(val) {
    this._updateNumFiles(val.length);
    this._files.mediaIds = val;
  }

  set algorithms(val) {
    this._more.algorithms = val;
    this._files.algorithms = val;
  }

  set sections(val) {
    let sections = val.slice();
    const index = sections.indexOf(this._sectionName);
    if (index > -1) {
      sections.splice(index, 1);
    }
    this._files.sections = sections;
    this._mediaMove.sections = sections;
  }

  removeMedia(mediaId) {
    const single = !(mediaId.indexOf(",") > -1);
    if (!single) mediaId = mediaId.split(",");
    console.log("MEDIA ID (list or single? ... " + single);
    console.log(mediaId);

    for (const mediaCard of this._files._ul.children) {
      console.log(mediaCard);
      const currentCardId = mediaCard.getAttribute("media-id");

      if (
        currentCardId == mediaId ||
        (Array.isArray(mediaId) && mediaId.includes(Number(currentCardId)))
      ) {
        mediaCard.parentNode.removeChild(mediaCard);
        const numFiles = Number(this._numFiles.textContent.split(" ")[0]) - 1;
        this._updateNumFiles(numFiles); // do this at the end
      }
    }

    // clear any selected cards & reload
    this.reload();
    this._bulkEdit.clearAllCheckboxes();
  }

  _updateNumFiles(numFiles) {
    let fileText = "Files";
    if (numFiles == 1) {
      fileText = "File";
    }
    this._numFiles.innerHTML = `${numFiles} ${fileText}`;
    this._numFilesCount = Number(numFiles);

    this._paginationState = {
      start: this._start,
      stop: this._stop,
      page: this._page,
      pageSize: this._paginator_top._pageSize,
    };
    this._paginator_top.init(numFiles, this._paginationState);
    this._paginator_bottom.init(numFiles, this._paginationState);

    if (numFiles == 0) {
      this._paginator_top.style.display = "none";
      this._paginator_bottom.style.display = "none";
      this._sort.style.display = "none";
    } else {
      this._paginator_top.style.display = "block";
      this._paginator_bottom.style.display = "block";
      this._sort.style.display = "block";
    }

    if (this._paginator_top._numPages == 0) {
      this._pagePosition.innerHTML = ``;
    } else {
      this._pagePosition.innerHTML = `(Page ${
        typeof this._paginationState.page == "undefined"
          ? 1
          : this._paginationState.page
      } of ${this._paginator_top._numPages})`;
    }
  }

  /**
   * Call this when the section has been changed or the media list has been changed.
   * The page parameters are removed.
   *
   * @precondition this._section has been set to the section to be displayed in the UI
   * @returns {URLSearchParams}
   */
  _sectionParams() {
    var searchParams = new URLSearchParams();
    const filterAndSearchParams = this._getFilterQueryParams();
    const sortParam = new URLSearchParams(this._sort.getQueryParam());
    let params = joinParams(searchParams, filterAndSearchParams);
    params = joinParams(params, sortParam);
    searchParams.delete("section");
    if (this._section != null) {
      searchParams.set("section", this._section.id);
    }
    return params;
  }

  /**
   * @postcondition Media cards are updated with the URL parameters
   * @postcondition
   */
  async _loadMedia() {
    var sectionQuery = this._sectionParams();
    if (Number.isNaN(this._start) || Number.isNaN(this._stop)) {
      console.log(`Load media... ignoring due to NaN start/stop`);
      return; // This may happen if it's called too soon and the pagination has not been set.
    }
    sectionQuery.set("start", this._start);
    sectionQuery.set("stop", this._stop);

    console.log(`Load media... sectionQuery: ${sectionQuery}`);
    var response = await fetchCredentials(
      `/rest/Medias/${this._project}?${sectionQuery.toString()}&presigned=28800`
    );
    var mediaList = await response.json();

    this._files.numMedia = this._paginator_top._numFiles;
    this._files.startMediaIndex = this._start;
    this._files.cardInfo = mediaList;
    this._reload.ready();

    this._pageWrapper.style.display = "flex";
    this._loading.style.display = "none";
  }

  /**
   * Reload the UI with the section query parameters in the URL
   */
  async reload() {
    this._reload.busy();

    const sectionQuery = this._sectionParams();
    console.log(`Get media count... sectionQuery: ${sectionQuery.toString()}`);
    const response = await fetchCredentials(
      `/rest/MediaCount/${this._project}?${sectionQuery.toString()}`
    );
    const count = await response.json();
    this.numMedia = count;

    await this._loadMedia();
  }

  _launchAlgorithm(evt) {
    this.dispatchEvent(
      new CustomEvent("runAlgorithm", {
        composed: true,
        detail: {
          algorithmName: evt.detail.algorithmName,
          section: this._section,
          projectId: this._project,
        },
      })
    );
  }

  _downloadFiles(evt) {
    let mediaParams = new URLSearchParams();
    if (evt.detail) {
      if (evt.detail.mediaIds) {
        mediaParams.append("media_id", evt.detail.mediaIds);
      }
    }
    const getUrl = (endpoint) => {
      const params = joinParams(this._sectionParams(), mediaParams);
      return `/rest/${endpoint}/${this._project}?${params.toString()}`;
    };
    fetchCredentials(getUrl("MediaStats"), {}, true)
      .then((response) => response.json())
      .then(async (mediaStats) => {
        let lastId = null;
        let numImages = 0;
        let numVideos = 0;
        let size = 0;
        console.log("Download size: " + mediaStats.download_size);
        console.log("Download num files: " + mediaStats.count);
        if (mediaStats.downloadSize > 60000000000 || mediaStats.count > 5000) {
          const bigDownload = document.createElement("big-download-form");
          const page = document.getElementsByTagName("project-detail")[0];
          page._projects.appendChild(bigDownload);
          bigDownload.setAttribute("is-open", "");
          page.setAttribute("has-open-modal", "");
          bigDownload.addEventListener("close", (evt) => {
            page.removeAttribute("has-open-modal", "");
            page._projects.removeChild(bigDownload);
          });
          while (bigDownload.hasAttribute("is-open")) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          if (!bigDownload._confirm) {
            page._leaveConfirmOk = false;
            return;
          }
        }

        const filenames = new Set();
        const re = /(?:\.([^.]+))?$/;
        let url = `${getUrl("Medias")}&presigned=28800`;
        await fetchCredentials(url, {}, true)
          .then((response) => response.json())
          .then(async (medias) => {
            const names = [];
            const urls = [];
            const dialog = document.createElement("download-dialog");
            const page = document.getElementsByTagName("project-detail")[0];
            page._projects.appendChild(dialog);
            dialog.setAttribute("is-open", "");
            page.setAttribute("has-open-modal", "");
            dialog.addEventListener("close", (evt) => {
              page.removeAttribute("has-open-modal", "");
              page._projects.removeChild(dialog);
            });
            dialog._setTotalFiles(medias.length);
            const callback = (numDone, name) => {
              dialog._setFilesCompleted(numDone);
              dialog._setFilename(name);
            };
            let cancel = false;
            dialog.addEventListener("cancel", () => {
              cancel = true;
              page.removeAttribute("has-open-modal", "");
              page._projects.removeChild(dialog);
            });
            const abort = () => {
              return cancel;
            };
            for (const media of medias) {
              lastId = media.id;
              const basenameOrig = media.name.replace(/\.[^/.]+$/, "");
              const ext = re.exec(media.name)[0];
              let basename = basenameOrig;
              let vers = 1;
              while (filenames.has(basename)) {
                basename = basenameOrig + " (" + vers + ")";
                vers++;
              }
              filenames.add(basename);

              const request = Utilities.getDownloadInfo(media)["request"];
              if (request !== null) {
                // Media objects with no downloadable files will return null.
                names.push(basename + ext);
                urls.push(request.url);
              } else {
                dialog._addError(
                  `Could not find download URL for media ${media.name} (ID ${media.id}), skipping...`
                );
              }
            }
            downloadFileList(names, urls, callback, abort);
          });
      });
  }

  _downloadAnnotations(evt) {
    const mediaParams = new URLSearchParams();
    if (evt.detail) {
      if (evt.detail.mediaIds) {
        mediaParams.append("media_id", evt.detail.mediaIds);
      }
    }
    const params = joinParams(mediaParams, this._sectionParams());
    const getUrl = (endpoint) => {
      return `/rest/${endpoint}/${this._project}?`;
    };

    const redirectUrl = `/${
      this._project
    }/analytics/export?${params.toString()}`;
    window.location.href = redirectUrl;
  }

  _setCallbacks() {
    // User entering bulk edit mode
    this._more.addEventListener("bulk-edit", () => {
      this.dispatchEvent(new Event("bulk-edit"));
    });

    // launch algorithm on all the media in this section
    this._more.addEventListener(
      "algorithmMenu",
      this._launchAlgorithm.bind(this)
    );

    // Download all media files
    this._more.addEventListener("download", this._downloadFiles.bind(this));

    // Download all annotations
    this._more.addEventListener(
      "downloadAnnotations",
      this._downloadAnnotations.bind(this)
    );

    this._files.addEventListener(
      "downloadAnnotations",
      this._downloadAnnotations.bind(this)
    );

    this._more.addEventListener("deleteSection", (evt) => {
      this.dispatchEvent(
        new CustomEvent("remove", {
          detail: {
            sectionParams: this._sectionParams(),
            section: this._section,
            projectId: this._project,
            deleteMedia: false,
          },
        })
      );
    });

    // Callback for when user selects Delete Media option in the section more menu
    // Dispatch back to the project detail page which executes the delete
    this._more.addEventListener("deleteMedia", (evt) => {
      this.dispatchEvent(new Event("deleteMedia"));
    });

    this._paginator_top.addEventListener("selectPage", (evt) => {
      this._setPage(evt, this._paginator_bottom);
    });

    this._paginator_bottom.addEventListener("selectPage", (evt) => {
      this._setPage(evt, this._paginator_top);
    });

    this._reload.addEventListener("click", this.reload.bind(this));
    this._sort.addEventListener("sortBy", this.reload.bind(this));
  }

  async _setPage(evt, otherPaginator) {
    this._start = evt.detail.start;
    this._stop = evt.detail.stop;
    this._paginationState = evt.detail;

    // clear any selected cards
    this._bulkEdit.clearAllCheckboxes();

    otherPaginator.init(otherPaginator._numFiles, this._paginationState);

    this._updatePageArgs();
    await this._loadMedia();
  }

  _updatePageArgs() {
    // update the URL
    const searchParams = new URLSearchParams(window.location.search);
    var newUrl = `${document.location.origin}${document.location.pathname}`;

    searchParams.delete("page");
    searchParams.delete("pagesize");

    if (
      this._start !== 0 ||
      this._paginator_top._pageSize !== this._defaultPageSize
    ) {
      searchParams.set("page", `${Number(this._paginator_top._page) + 1}`);
      searchParams.set("pagesize", this._paginator_top._pageSize);
    }

    newUrl += "?" + searchParams.toString();
    window.history.replaceState({}, "", newUrl);

    this._pagePosition.innerHTML = `(Page ${this._paginator_top._page + 1} of ${
      this._paginator_top._numPages
    })`;
  }

  /**
   * Expected to be called whenever filters are applied that affect which media should be displayed
   *
   * @param {array} conditions
   *   Array of FilterConditionData objects
   * @returns {string}
   *   Search and related search strings that are encoded in base64
   *   These are the filter UI, not the object_search and related_search of the REST endpoints
   * @postcondition URL updated with latest filter components.
   */
  async updateFilterResults(conditions) {
    this._filterConditions = conditions;
    this._filterURIString = encodeURIComponent(
      JSON.stringify(this._filterConditions)
    );

    // Figure out the filter UI media search and metadata search strings
    if (Array.isArray(this._filterConditions)) {
      var finalMediaFilters = [];
      var finalMetadataFilters = [];
      for (var filter of this._filterConditions) {
        if (filter.categoryGroup == "Media") {
          finalMediaFilters.push(
            this._modelData._convertFilterForTator(filter)
          );
        } else {
          finalMetadataFilters.push(
            this._modelData._convertFilterForTator(filter)
          );
        }
      }

      if (finalMediaFilters.length > 0) {
        var searchObject = {
          method: "and",
          operations: [...finalMediaFilters],
        };
        console.info(`Search Object = ${JSON.stringify(searchObject)}`);
        var searchBlob = btoa(JSON.stringify(searchObject));
        this.searchString = searchBlob;
      } else {
        this.searchString = "";
      }

      if (finalMetadataFilters.length > 0) {
        var searchObject = {
          method: "and",
          operations: [...finalMetadataFilters],
        };
        console.info(`Search Object = ${JSON.stringify(searchObject)}`);
        var searchBlob = btoa(JSON.stringify(searchObject));
        this.relatedSearchString = searchBlob;
      } else {
        this.relatedSearchString = "";
      }

      // Reset the page back to the first page before reloading the media
      this._start = 0;
      this._stop = this._paginator_top._pageSize;
      this._page = 1;
      this._updatePageArgs();

      // Reload media with the new filter conditions at the first page
      await this.reload();
    } else {
      this.searchString = "";
      this.relatedSearchString = "";
    }

    if (window.location.search !== this._getFilterQueryParams.toString()) {
      let newUrl = this.getFilterURL();
      window.history.replaceState({}, "Filter", newUrl);
    }

    return this._searchString + this._relatedSearchString;
  }

  /**
   * @returns {string}
   *   URL with the filter conditions applied (retaining the current parameters)
   */
  getFilterURL() {
    var url = window.location.origin + window.location.pathname;
    url += "?" + this._getFilterQueryParams().toString();
    console.log(`Filter URL: ${url}`);
    return url;
  }

  /**
   * Utilizes this._filterURIString
   *
   * @returns {URLSearchParams}
   *   filterConditions is provided using this._filterURIString
   */
  _getFilterQueryParams() {
    const params = new URLSearchParams(window.location.search);

    if (
      typeof this._filterURIString !== "undefined" &&
      this._filterURIString != null &&
      this._filterURIString != encodeURIComponent("[]")
    ) {
      params.set("filterConditions", this._filterURIString);
    } else {
      params.delete("filterConditions");
    }

    params.delete("encoded_search");
    if (this._searchString != "" && this._searchString != null) {
      params.set("encoded_search", this._searchString);
    }

    params.delete("related_search");
    if (this._relatedSearchString != "" && this._relatedSearchString != null) {
      params.set("related_search", this._relatedSearchString);
    }

    return params;
  }
}

customElements.define("media-section", MediaSection);
