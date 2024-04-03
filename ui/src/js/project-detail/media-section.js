import { TatorElement } from "../components/tator-element.js";
import { hasPermission } from "../util/has-permission.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { joinParams } from "../util/join-params.js";
import { Utilities } from "../util/utilities.js";
import { downloadFileList } from "../util/download-file-list.js";
import streamSaver from "../util/StreamSaver.js";

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
    this._name.appendChild(this._nameText);

    const pageWrapper = document.createElement("div");
    pageWrapper.setAttribute("class", "d-flex text-gray f1 py-2");
    this._name.appendChild(pageWrapper);

    this._numFiles = document.createElement("div");
    this._numFiles.setAttribute("class", "text-gray mr-2");
    pageWrapper.appendChild(this._numFiles);

    this._pagePosition = document.createElement("div");
    this._pagePosition.setAttribute("class", "text-normal");
    pageWrapper.appendChild(this._pagePosition);

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
      "d-flex flex-items-center flex-justify-center"
    );
    section.appendChild(paginatorTopDiv);

    this._paginator_top = document.createElement("entity-gallery-paginator");
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
    this._paginator_bottom._pageSize = this._defaultPageSize;
    this._paginator_bottom._pageMax = this._maxPageSizeDefault;
    this._paginator_bottom.setupElements();
    section.appendChild(this._paginator_bottom);

    this._searchParams = new URLSearchParams();
    this._numFilesCount = 0;
    this._searchString = "";

    this._setCallbacks();
  }

  async init(project, section) {
    if (section === null) {
      this._sectionName = "All Media";
      this._upload.setAttribute("section", "");
      this._nameText.innerHTML = `<span class="text-white">${this._sectionName}</span>`;
    } else {
      this._sectionName = section.name;
      this._upload.setAttribute("section", section.name);
      let parts = section.name.split(".");
      var nameTextHTML = `<span class="text-white">${section.name}</span>`;
      if (parts.length > 1) {
        let mainSectionName = parts[parts.length - 1];
        parts.pop();
        nameTextHTML = `<span class="text-dark-gray">`;
        nameTextHTML += parts.join(" > ");
        nameTextHTML += ` > </span>`;
        nameTextHTML += `<span class="text-white">${mainSectionName}</span>`;
      }
      this._nameText.innerHTML = nameTextHTML;
    }
    this._project = project;
    this._section = section;
    this._files.setAttribute("project-id", project);

    this._upload.setAttribute("project-id", project);
    this._more.section = section;

    this._start = 0;
    this._stop = this._paginator_top._pageSize;
    this._after = new Map();

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
    console.log("test !!!!!!!!!!!!!!!!!!!!!!!!!!!");
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

    if (numFiles != this._paginator_top._numFiles) {
      this._start = 0;
      this._stop = this._paginator_top._pageSize;
      this._paginationState = {
        start: this._start,
        stop: this._stop,
        page: 1,
        pageSize: this._paginator_top._pageSize,
      };
      this._paginator_top.init(numFiles, this._paginationState);
      this._paginator_bottom.init(numFiles, this._paginationState);

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
  }

  _sectionParams() {
    const sectionParams = new URLSearchParams();
    if (this._section !== null) {
      sectionParams.append("section", this._section.id);
    }
    const filterAndSearchParams = this._getFilterQueryParams();
    const sortParam = new URLSearchParams(this._sort.getQueryParam());
    let params = joinParams(sectionParams, filterAndSearchParams);
    params = joinParams(params, sortParam);
    return params;
  }

  async _loadMedia() {
    var sectionQuery = this._sectionParams();
    if (Number.isNaN(this._start) || Number.isNaN(this._stop)) {
      console.log(`Load media... ignoring due to NaN start/stop`);
      return; // This may happen if it's called too soon and the pagination has not been set.
    }
    sectionQuery.append("start", this._start);
    sectionQuery.append("stop", this._stop);

    console.log(`Load media... sectionQuery: ${sectionQuery}`);
    var response = await fetchCredentials(
      `/rest/Medias/${this._project}?${sectionQuery.toString()}&presigned=28800`
    );
    var mediaList = await response.json();

    this._files.numMedia = this._paginator_top._numFiles;
    this._files.startMediaIndex = this._start;
    this._files.cardInfo = mediaList;
    this._reload.ready();
  }

  async reload() {
    console.log("Reload media section...");
    this._reload.busy();

    const sectionQuery = this._sectionParams();
    console.log(`Section query: ${sectionQuery.toString()}`);
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
    const mediaUrl = `/rest/Medias/${this._project}?${params.toString()}`;
    const fileStream = streamSaver.createWriteStream(
      this._sectionName + ".zip"
    );
    let mediaTypes = null;
    let mediaFetcher = null;
    let mediaDone = false;
    let localizationTypes = null;
    let localizationFetcher = null;
    let localizationsDone = false;
    let stateTypes = null;
    let stateFetcher = null;
    let statesDone = false;
    Number.prototype.pad = function (size) {
      var s = String(this);
      while (s.length < (size || 2)) {
        s = "0" + s;
      }
      return s;
    };
    const project = this._project;
    const readableZipStream = new ZIP({
      async pull(ctrl) {
        // Function for dumping types to file.
        const getTypes = (endpoint, fname) => {
          return fetchCredentials(`/rest/${endpoint}/${project}`).then(
            (response) => {
              const clone = response.clone();
              const stream = () => response.body;
              const name = fname;
              ctrl.enqueue({ name, stream });
              return clone.json();
            }
          );
        };

        // Function for dumping single batch of metadata to file.
        const getMetadataBatch = async (
          baseUrl,
          type,
          batchSize,
          batchNum,
          baseFilename,
          lastId,
          idQuery
        ) => {
          let url = baseUrl + "&type=" + type.id + "&stop=" + batchSize;
          if (lastId != null) {
            let param = "after";
            url += `&${param}=` + encodeURIComponent(lastId);
          }

          let request;
          if (idQuery != null) {
            request = {
              method: "PUT",
              body: JSON.stringify(idQuery),
            };
          } else {
            request = {
              method: "GET",
            };
          }

          // Fetch csv data first.
          await fetchCredentials(url + "&format=csv", request, true).then(
            (response) => {
              const stream = () => response.body;
              const batch_str = "__batch_" + Number(batchNum).pad(5);
              const name = baseFilename + type.name + batch_str + ".csv";
              ctrl.enqueue({ name, stream });
            }
          );

          // Fetch and return json data.
          return fetchCredentials(url, request, true).then((response) => {
            const clone = response.clone();
            const stream = () => response.body;
            const batch_str = "__batch_" + Number(batchNum).pad(5);
            const name = baseFilename + type.name + batch_str + ".json";
            ctrl.enqueue({ name, stream });
            return clone.json();
          });
        };

        // Class for fetching batches of metadata.
        class MetadataFetcher {
          constructor(types, baseUrl, baseFilename, lastField) {
            this._types = types;
            this._baseUrl = baseUrl;
            this._baseFilename = baseFilename;
            this._lastField = lastField;
            this._batchNum = 0;
            this._lastId = null;
            this._typeIndex = 0;
            this._batchSize = 1000;
            this.ids = []; // Accumulation of retrieved IDs
          }

          async next(idQuery) {
            // Fetches next batch of metadata, iterating over types. Returns
            // whether all metadata has been fetched.
            let done = false;
            if (this._types.length == 0) {
              done = true;
            } else {
              const entities = await getMetadataBatch(
                this._baseUrl,
                this._types[this._typeIndex],
                this._batchSize,
                this._batchNum,
                this._baseFilename,
                this._lastId,
                idQuery
              );
              this._batchNum++;
              if (entities.length == 0) {
                this._typeIndex++;
                if (this._typeIndex == this._types.length) {
                  done = true;
                } else {
                  this._batchNum = 0;
                  this._lastId = null;
                }
              } else {
                this._lastId = entities[entities.length - 1][this._lastField];
                this.ids.push.apply(
                  this.ids,
                  entities.map((entity) => entity.id)
                );
              }
            }
            return done;
          }
        }

        if (mediaTypes == null) {
          // Get media types.
          mediaTypes = await getTypes("MediaTypes", "media_types.json");
          mediaFetcher = new MetadataFetcher(
            mediaTypes,
            mediaUrl,
            "medias__",
            "id"
          );
        } else if (localizationTypes == null) {
          // Get localization types.
          const localizationsUrl = getUrl("Localizations");
          localizationTypes = await getTypes(
            "LocalizationTypes",
            "localization_types.json"
          );
          localizationFetcher = new MetadataFetcher(
            localizationTypes,
            localizationsUrl,
            "localizations__",
            "id"
          );
        } else if (stateTypes == null) {
          // Get state types.
          const statesUrl = getUrl("States");
          stateTypes = await getTypes("StateTypes", "state_types.json");
          stateFetcher = new MetadataFetcher(
            stateTypes,
            statesUrl,
            "states__",
            "id"
          );
        } else if (mediaDone == false) {
          // Get next batch of media metadata.
          mediaDone = await mediaFetcher.next();
        } else if (localizationsDone == false) {
          // Get next batch of localization metadata.
          localizationsDone = await localizationFetcher.next({
            media_ids: mediaFetcher.ids,
          });
        } else if (statesDone == false) {
          // Get next batch of state metadata.
          statesDone = await stateFetcher.next({ media_ids: mediaFetcher.ids });
        } else {
          // Close the zip file.
          ctrl.close();
        }
      },
    });
    if (window.WritableStream && readableZipStream.pipeTo) {
      readableZipStream.pipeTo(fileStream);
    } else {
      const writer = fileStream.getWriter();
      const reader = readableZipStream.getReader();
      const pump = () =>
        reader
          .read()
          .then((res) =>
            res.done ? writer.close() : writer.write(res.value).then(pump)
          );
      pump();
    }
  }

  _setCallbacks() {
    this._more.addEventListener("bulk-edit", () => {
      this.dispatchEvent(new Event("bulk-edit"));
    });

    // launch algorithm on all the media in this section
    this._more.addEventListener(
      "algorithmMenu",
      this._launchAlgorithm.bind(this)
    );

    this._more.addEventListener("download", this._downloadFiles.bind(this));

    this._more.addEventListener(
      "downloadAnnotations",
      this._downloadAnnotations.bind(this)
    );
    this._files.addEventListener(
      "downloadAnnotations",
      this._downloadAnnotations.bind(this)
    );

    // New right click options
    this.addEventListener("renameSection", this._reloadAndRename.bind(this));
    this.addEventListener("deleteSection", (evt) => {
      // console.log(evt);
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
    const searchArgs = new URLSearchParams(window.location.search);
    var newUrl = `${document.location.origin}${document.location.pathname}`;
    let firstParm = true;

    if (searchArgs.toString !== "") {
      searchArgs.delete("page");
      searchArgs.delete("pagesize");

      for (const [key, value] of searchArgs) {
        if (!firstParm) {
          newUrl += "&";
        } else {
          newUrl += "?";
        }
        newUrl += `${key}=${value}`;
        firstParm = false;
      }
    }

    // Only add back params if we're not on default page 1, and pageSize 10
    if (
      this._start !== 0 ||
      this._paginator_top._pageSize !== this._defaultPageSize
    ) {
      if (!firstParm) {
        newUrl += "&";
      } else {
        newUrl += "?";
      }
      newUrl += `page=${Number(this._paginator_top._page) + 1}&pagesize=${
        this._paginator_top._pageSize
      }`;
    }

    window.history.pushState({}, "", newUrl);
    this._pagePosition.nodeValue = `Page ${
      typeof this._paginator_top._page == "undefined"
        ? 1
        : this._paginator_top._page + 1
    } of ${this._paginator_top._numPages}`;
  }

  async updateFilterResults(conditions) {
    this._filterConditions = conditions;
    this._filterURIString = encodeURIComponent(
      JSON.stringify(this._filterConditions)
    );

    if (conditions !== []) {
      // Media Filters
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

      await this.reload();
    } else {
      this.searchString = "";
      this.relatedSearchString = "";
    }

    if (window.location.search !== this._getFilterQueryParams.toString()) {
      let newUrl = this.getFilterURL();
      window.history.replaceState({}, "Filter", newUrl);
    }

    return this._searchString + this.relatedSearchString;
  }

  getFilterURL() {
    const searchParams = new URLSearchParams(window.location.search);
    var url = window.location.origin + window.location.pathname;
    url += "?" + this._getFilterQueryParams().toString();
    return url;
  }

  _getFilterQueryParams() {
    const params = new URLSearchParams(window.location.search);

    params.delete("page");
    params.delete("pagesize");

    if (
      typeof this._filterURIString !== "undefined" &&
      this._filterURIString != null &&
      this._filterURIString != encodeURIComponent("[]")
    ) {
      params.set("filterConditions", this._filterURIString);
    } else {
      params.delete("filterConditions");
    }

    const searchString = this._searchParams.get("encoded_search");
    if (
      typeof searchString !== "undefined" &&
      searchString != null &&
      searchString !== "undefined"
    ) {
      params.set("encoded_search", searchString);
    } else {
      params.delete("encoded_search");
    }

    const relatedSearchString = this._searchParams.get(
      "encoded_related_search"
    );
    if (
      typeof relatedSearchString !== "undefined" &&
      relatedSearchString != null &&
      relatedSearchString !== "undefined"
    ) {
      params.set("encoded_related_search", relatedSearchString);
    } else {
      params.delete("encoded_related_search");
    }

    return params;
  }

  // Used in project-detail to get any existing conditions
  // Distill back out filter conditions from param
  getFilterConditionsObject() {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has("filterConditions")) {
      this._filterURIString = searchParams.get("filterConditions");
      this._filterConditions = JSON.parse(
        decodeURIComponent(this._filterURIString)
      );
    }
    if (
      typeof this._filterConditions !== "undefined" &&
      this._filterConditions != ""
    ) {
      return this._filterConditions;
    } else {
      return [];
    }
  }
  async _reloadAndRename(evt) {
    // console.log(evt);
    // this.section = evt.detail.section;
    // await this.reload();
    this._rename();
  }
}

customElements.define("media-section", MediaSection);
