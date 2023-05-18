import { TatorElement } from "../components/tator-element.js";
import { hasPermission } from "../util/has-permission.js";
import { getCookie } from "../util/get-cookie.js";
import { fetchRetry } from "../util/fetch-retry.js";
import { joinParams } from "../util/join-params.js";
import { Utilities } from "../util/utilities.js";
import streamSaver from "../util/StreamSaver.js";

export class MediaSection extends TatorElement {
  constructor() {
    super();

    const section = document.createElement("div");
    section.setAttribute("class", "project__section py-3");
    this._shadow.appendChild(section);

    const header = document.createElement("div");
    header.setAttribute("class", "project__header d-flex flex-items-center flex-justify-between col-12 row-actions-hover");
    section.appendChild(header);

    this._name = document.createElement("h2");
    this._name.setAttribute("class", "h3 px-2 py-2"); //not a typo
    header.appendChild(this._name);

    this._nameText = document.createTextNode("");
    this._name.appendChild(this._nameText);

    const numFiles = document.createElement("span");
    numFiles.setAttribute("class", "text-gray px-2");
    this._name.appendChild(numFiles);

    this._numFiles = document.createTextNode("");
    numFiles.appendChild(this._numFiles);
    
    const pagePosition = document.createElement("div");
    pagePosition.setAttribute("class", "py-3 f1 text-normal text-gray");
    this._name.appendChild(pagePosition);

    this._pagePosition = document.createTextNode("");
    pagePosition.appendChild(this._pagePosition);

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

    this._paginator_top = document.createElement("entity-gallery-paginator");
    this._paginator_top._pageSize = this._defaultPageSize;
    this._paginator_top._pageMax = this._maxPageSizeDefault;
    this._paginator_top.setupElements();
    section.appendChild(this._paginator_top);

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

  init(project, section) {
    if (section === null) {
      this._sectionName = "All Media";
      this._upload.setAttribute("section", "");
    } else {
      this._sectionName = section.name;
      this._upload.setAttribute("section", section.name);
    }
    this._project = project;
    this._section = section;
    this._sectionName = this._sectionName;
    this._files.setAttribute("project-id", project);
    
    
    this._nameText.nodeValue = this._sectionName;
    this._upload.setAttribute("project-id", project);
    this._more.section = section;

    this._start = 0;
    this._stop = this._paginator_top._pageSize;
    this._after = new Map();

    
    return this.reload();
  }

  set mediaTypesMap(val) {
    this._mediaTypesMap = val;
    this._files.mediaTypesMap = val;
  }

  set project(val) {
    this._files.project = val;
    if (!hasPermission(val.permission, "Can Edit")) {
      this._upload.style.display = "none";
      this._more.setAttribute("editPermission", "Editing menu disable due to permissions.")
    }
    if (!(hasPermission(val.permission, "Can Transfer") && val.enable_downloads)) {
      this._upload.style.display = "none";
      this._more.setAttribute("uploadPermission", "Upload hidden due to permissions.")
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
    console.log("MEDIA ID (list or single? ... "+single);
    console.log(mediaId);

    for (const mediaCard of this._files._ul.children) {
      console.log(mediaCard);
      const currentCardId = mediaCard.getAttribute("media-id");

      if (currentCardId == mediaId || (Array.isArray(mediaId) && mediaId.includes(Number(currentCardId)))) {
        mediaCard.parentNode.removeChild(mediaCard);
        const numFiles = Number(this._numFiles.textContent.split(' ')[0]) - 1;
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
    this._numFiles.nodeValue = `${numFiles} ${fileText}`;
    this._numFilesCount = Number(numFiles);
    
    if (numFiles != this._paginator_top._numFiles) {
      this._start = 0;
      this._stop = this._paginator_top._pageSize;
      this._after = new Map();
      this._paginationState = {
        start: this._start,
        stop: this._stop,
        page: 1,
        pageSize: this._paginator_top._pageSize
      }
      this._paginator_top.init(numFiles, this._paginationState);
      this._paginator_bottom.init(numFiles, this._paginationState);
      this._pagePosition.nodeValue = `Page ${typeof this._paginationState.page == "undefined" ? 1 : (this._paginationState.page)} of ${this._paginator_top._numPages}`;
    }
  }

  _sectionParams() {
    const sectionParams = new URLSearchParams();
    if (this._section !== null) {
      sectionParams.append("section", this._section.id);
    }
    if (this._filterSection != null)
    {
      sectionParams.append("section", this._filterSection);
    }
    const filterAndSearchParams = this._getFilterQueryParams();
    return joinParams(sectionParams, filterAndSearchParams);
  }

  _getAfter(index) {
    const url = `/rest/Medias/${this._project}`;
    let params = this._sectionParams();
    const recursiveFetch = (url, params, current) => {
      let after = "";
      if (this._after.has(current - 5000)) {
        after = `&after=${this._after.get(current - 5000)}`;
      }
      return fetch(`${url}?${params.toString()}&start=4999&stop=5000${after}&presigned=28800`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      })
        .then(response => response.json())
        .then(data => {
          this._after.set(current, data[0].id);
          if (current < index) {
            return recursiveFetch(url, params, current + 5000);
          }
          return Promise.resolve(data[0]['id']);
        });
    }
    if (this._after.has(index)) {
      return Promise.resolve(this._after.get(index));
    } else {
      return recursiveFetch(url, params, 5000);
    }
  }

  async _loadMedia() {
    console.log("Load media...");
    const sectionQuery = this._sectionParams();
    // Find an interval for use with "after". Super page size of
    // 5000 guarantees that any start/stop fully falls within a
    // super page interval.
    let afterPromise = Promise.resolve("");

    if (this._stop < 10000) {
      sectionQuery.append("start", this._start);
      sectionQuery.append("stop", this._stop);
    } else {
      const afterIndex = 5000 * Math.floor(this._start / 5000);
      const start = this._start % afterIndex;
      let stop = this._stop % afterIndex;
      if (stop < start) {
        stop += 5000;
      }
      sectionQuery.append("start", start);
      sectionQuery.append("stop", stop);
      afterPromise = this._getAfter(afterIndex);
    }
    return afterPromise.then(afterId => {
      if (afterId) {
        sectionQuery.append("after", afterId);
      }
      return fetch(`/rest/Medias/${this._project}?${sectionQuery.toString()}&presigned=28800`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      })
        .then(response => response.json())
        .then(media => {
          this._files.numMedia = this._paginator_top._numFiles;
          this._files.startMediaIndex = this._start;
          this._files.cardInfo = media;
          this._reload.ready();
        });
    });
  }

  async reload() {
    console.log("Reload media section...");
    this._reload.busy();

    const sectionQuery = this._sectionParams();
    const response = await fetch(`/rest/MediaCount/${this._project}?${sectionQuery.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    const count = await response.json();
    this.numMedia = count;

    return await this._loadMedia();
  }

  _launchAlgorithm(evt) {
    this.dispatchEvent(
      new CustomEvent("runAlgorithm",
        {
          composed: true,
          detail: {
            algorithmName: evt.detail.algorithmName,
            mediaQuery: `?${this._sectionParams().toString()}`,
            projectId: this._project,
          }
        }));
  }

  _downloadFiles(evt) {
    let mediaParams = new URLSearchParams();
    if (evt.detail) {
      if (evt.detail.mediaIds) {
        mediaParams.append("media_id", evt.detail.mediaIds);
      }
    }
    const getUrl = endpoint => {
      const params = joinParams(this._sectionParams(), mediaParams);
      return `/rest/${endpoint}/${this._project}?${params.toString()}`;
    };
    const headers = {
      "X-CSRFToken": getCookie("csrftoken"),
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
    fetchRetry(getUrl("MediaStats"), {
      method: "GET",
      credentials: "same-origin",
      headers: headers,
    })
      .then(response => response.json())
      .then(async mediaStats => {
        let lastId = null;
        let numImages = 0;
        let numVideos = 0;
        let size = 0;
        console.log("Download size: " + mediaStats.download_size);
        console.log("Download num files: " + mediaStats.count);
        if ((mediaStats.downloadSize > 60000000000) || (mediaStats.count > 5000)) {
          const bigDownload = document.createElement("big-download-form");
          const page = document.getElementsByTagName("project-detail")[0];
          page._projects.appendChild(bigDownload);
          bigDownload.setAttribute("is-open", "");
          page.setAttribute("has-open-modal", "");
          bigDownload.addEventListener("close", evt => {
            page.removeAttribute("has-open-modal", "");
            page._projects.removeChild(bigDownload);
          });
          while (bigDownload.hasAttribute("is-open")) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          if (!bigDownload._confirm) {
            page._leaveConfirmOk = false;
            return;
          }
        }

        const batchSize = numImages > numVideos ? 20 : 2;
        const filenames = new Set();
        const re = /(?:\.([^.]+))?$/;
        const fileStream = streamSaver.createWriteStream(this._sectionName + ".zip");
        const readableZipStream = new ZIP({
          async pull(ctrl) {
            let url = `${getUrl("Medias")}&stop=${batchSize}&presigned=28800`;
            if (lastId != null) {
              url += "&after=" + encodeURIComponent(lastId);
            }
            await fetchRetry(url, {
              method: "GET",
              credentials: "same-origin",
              headers: headers,
            })
              .then(response => response.json())
              .then(async medias => {
                if (medias.length == 0) {
                  ctrl.close();
                }
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

                  const request = Utilities.getDownloadInfo(media, headers)["request"];
                  if (request !== null) { // Media objects with no downloadable files will return null.
                    // Download media file.
                    console.log("Downloading " + media.name + " from " + request.url + "...");
                    await fetchRetry(request)
                      .then(response => {
                        const stream = () => response.body;
                        const name = basename + ext;
                        ctrl.enqueue({ name, stream });
                      });
                  }
                }
              });
          }
        });
        if (window.WritableStream && readableZipStream.pipeTo) {
          readableZipStream.pipeTo(fileStream).then(() => console.log('done writing'));
        } else {
          const writer = fileStream.getWriter();
          const reader = readableZipStream.getReader();
          const pump = () => reader.read()
            .then(res => res.done ? writer.close() : writer.write(res.value).then(pump))
            .then(() => console.log('done writing'));
          pump();
        }
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
    const getUrl = endpoint => {
      return `/rest/${endpoint}/${this._project}?`;
    };
    const mediaUrl = `/rest/Medias/${this._project}?${params.toString()}`;
    const fileStream = streamSaver.createWriteStream(this._sectionName + ".zip");
    let mediaTypes = null;
    let mediaFetcher = null;
    let mediaDone = false;
    let localizationTypes = null;
    let localizationFetcher = null;
    let localizationsDone = false;
    let stateTypes = null;
    let stateFetcher = null;
    let statesDone = false;
    const headers = {
      "X-CSRFToken": getCookie("csrftoken"),
      "Content-Type": "application/json"
    };
    Number.prototype.pad = function (size) {
      var s = String(this);
      while (s.length < (size || 2)) { s = "0" + s; }
      return s;
    }
    const project = this._project;
    const readableZipStream = new ZIP({
      async pull(ctrl) {

        // Function for dumping types to file.
        const getTypes = (endpoint, fname) => {
          return fetchRetry(`/rest/${endpoint}/${project}`, {
            method: "GET",
            credentials: "same-origin",
            headers: headers,
          })
            .then(response => {
              const clone = response.clone();
              const stream = () => response.body;
              const name = fname;
              ctrl.enqueue({ name, stream });
              return clone.json();
            });
        };

        // Function for dumping single batch of metadata to file.
        const getMetadataBatch = async (baseUrl, type, batchSize, batchNum,
          baseFilename, lastId, idQuery) => {
          let url = baseUrl + "&type=" + type.id + "&stop=" + batchSize;
          if (lastId != null) {
            let param = "after";
            url += `&${param}=` + encodeURIComponent(lastId);
          }

          let request;
          if (idQuery != null) {
            request = {
              method: "PUT",
              credentials: "same-origin",
              headers: headers,
              body: JSON.stringify(idQuery),
            };
          } else {
            request = {
              method: "GET",
              credentials: "same-origin",
              headers: headers,
            };
          }

          // Fetch csv data first.
          await fetchRetry(url + "&format=csv", request)
            .then(response => {
              const stream = () => response.body;
              const batch_str = "__batch_" + Number(batchNum).pad(5);
              const name = baseFilename + type.name + batch_str + ".csv";
              ctrl.enqueue({ name, stream });
            });

          // Fetch and return json data.
          return fetchRetry(url, request)
            .then(response => {
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
                idQuery,
              )
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
                this.ids.push.apply(this.ids, entities.map(entity => entity.id));
              }
            }
            return done;
          }
        }

        if (mediaTypes == null) {
          // Get media types.
          mediaTypes = await getTypes("MediaTypes", "media_types.json");
          mediaFetcher = new MetadataFetcher(mediaTypes, mediaUrl, "medias__", "id");
        }
        else if (localizationTypes == null) {
          // Get localization types.
          const localizationsUrl = getUrl("Localizations");
          localizationTypes = await getTypes("LocalizationTypes", "localization_types.json");
          localizationFetcher = new MetadataFetcher(localizationTypes, localizationsUrl,
            "localizations__", "id");
        }
        else if (stateTypes == null) {
          // Get state types.
          const statesUrl = getUrl("States");
          stateTypes = await getTypes("StateTypes", "state_types.json");
          stateFetcher = new MetadataFetcher(stateTypes, statesUrl, "states__", "id");
        }
        else if (mediaDone == false) {
          // Get next batch of media metadata.
          mediaDone = await mediaFetcher.next();
        }
        else if (localizationsDone == false) {
          // Get next batch of localization metadata.
          localizationsDone = await localizationFetcher.next({ media_ids: mediaFetcher.ids });
        }
        else if (statesDone == false) {
          // Get next batch of state metadata.
          statesDone = await stateFetcher.next({ media_ids: mediaFetcher.ids });
        }
        else {
          // Close the zip file.
          ctrl.close();
        }
      }
    });
    if (window.WritableStream && readableZipStream.pipeTo) {
      readableZipStream.pipeTo(fileStream);
    } else {
      const writer = fileStream.getWriter();
      const reader = readableZipStream.getReader();
      const pump = () => reader.read()
        .then(res => res.done ? writer.close() : writer.write(res.value).then(pump));
      pump();
    }
  }

  _rename(evt) {
    // console.log(this._section);
    if (this._name.contains(this._nameText)) {
      const input = document.createElement("input");
      input.style.borderWidth = "3px";
      input.setAttribute("class", "form-control input-sm f1 text-white text-bold");
      input.setAttribute("value", this._section.name);
      this._name.replaceChild(input, this._nameText);
      input.addEventListener("focus", evt => {
        evt.target.select();
      });
      input.addEventListener("keydown", evt => {
        if (evt.keyCode == 13) {
          evt.preventDefault();
          input.blur();
        }
      });
      input.addEventListener("blur", evt => {
        if (evt.target.value !== "") {
          //this._worker.postMessage({
          //  command: "renameSection",
          //  fromName: this._sectionName,
          //  toName: evt.target.value,
          //});
          this._sectionName = evt.target.value;
        }
        // console.log(this._section);
        fetch("/rest/Section/" + this._section.id, {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "name": this._sectionName
          }),
        });
        this._nameText.textContent = this._sectionName;
        this._section.name = this._sectionName;
        this._name.replaceChild(this._nameText, evt.target);

        this._name.classList.add("text-green");
        setTimeout(() => {
          this._name.classList.remove("text-green");
        }, 800)
        
        this.dispatchEvent(new CustomEvent("newName", {
          detail: {
            id: this._section.id,
            sectionName: this._sectionName,
          },
        }));
      });
      input.focus();
    }
  }



  _findAfters() {
    // Find the media for each batch of 10000 medias.
  }

  _setCallbacks() {
    this._more.addEventListener("bulk-edit", () => {
      this.dispatchEvent(new Event("bulk-edit"));
    });

    // launch algorithm on all the media in this section
    this._more.addEventListener("algorithmMenu", this._launchAlgorithm.bind(this));

    this._more.addEventListener("download", this._downloadFiles.bind(this));

    this._more.addEventListener("downloadAnnotations", this._downloadAnnotations.bind(this));
    this._files.addEventListener("downloadAnnotations", this._downloadAnnotations.bind(this));

    this._more.addEventListener("rename", this._rename.bind(this));

    // New right click options
    this.addEventListener("renameSection", this._reloadAndRename.bind(this));
    this.addEventListener("deleteSection", (evt) => {
      // console.log(evt);
      this.dispatchEvent(new CustomEvent("remove", {
        detail: {
          sectionParams: this._sectionParams(),
          section: this._section,
          projectId: this._project,
          deleteMedia: false,
        }
      }));
    });

    this._more.addEventListener("deleteSection", evt => {
      this.dispatchEvent(new CustomEvent("remove", {
        detail: {
          sectionParams: this._sectionParams(),
          section: this._section,
          projectId: this._project,
          deleteMedia: false,
        }
      }));
    });

    this._more.addEventListener("deleteMedia", evt => {
      this.dispatchEvent(new CustomEvent("remove", {
        detail: {
          sectionParams: this._sectionParams(),
          section: this._section,
          projectId: this._project,
          deleteMedia: true,
        }
      }));
    });

    this._paginator_top.addEventListener("selectPage", (evt) => {
      this._setPage(evt, this._paginator_bottom); 
    });

    this._paginator_bottom.addEventListener("selectPage", (evt) => {
      this._setPage(evt, this._paginator_top); 
    });

    this._reload.addEventListener("click", this.reload.bind(this));
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
      searchArgs.delete('page');
      searchArgs.delete('pagesize');

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
    if (this._start !== 0 || this._paginator_top._pageSize !== this._defaultPageSize) {
      if (!firstParm) {
        newUrl += "&";
      } else {
        newUrl += "?";
      }
      newUrl += `page=${Number(this._paginator_top._page) + 1}&pagesize=${this._paginator_top._pageSize}`      
    }

    window.history.pushState({}, "", newUrl);
    this._pagePosition.nodeValue = `Page ${typeof this._paginator_top._page == "undefined" ? 1 : (this._paginator_top._page + 1)} of ${this._paginator_top._numPages}`;
  }

  async updateFilterResults(conditions) {
    this._filterConditions = conditions;
    this._filterURIString = encodeURIComponent(JSON.stringify(this._filterConditions));

    if (conditions !== []) {
      // Media Filters
      var finalMediaFilters = [];
      var finalMetadataFilters = [];
      for (var filter of this._filterConditions) {
        if (filter.categoryGroup == "Media")
        {
          finalMediaFilters.push(this._modelData._convertFilterForTator(filter));
        }
        else
        {
          finalMetadataFilters.push(this._modelData._convertFilterForTator(filter));
        }
          
      }

      if (finalMediaFilters.length > 0)
      {
        var searchObject = {'method': 'and', 'operations': [...finalMediaFilters]};
        console.info(`Search Object = ${JSON.stringify(searchObject)}`);
        var searchBlob = btoa(JSON.stringify(searchObject));
        this.searchString = searchBlob;
      }
      else
      {
        this.searchString = "";
      }

      if (finalMetadataFilters.length > 0)
      {
        var searchObject = {'method': 'and', 'operations': [...finalMetadataFilters]};
        console.info(`Search Object = ${JSON.stringify(searchObject)}`);
        var searchBlob = btoa(JSON.stringify(searchObject));
        this.relatedSearchString = searchBlob;
      }
      else
      {
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

    // remove page references when new query is made
    params.delete("page");
    params.delete("pagesize");

    if (typeof this._filterURIString !== "undefined" && this._filterURIString != null && this._filterURIString != encodeURIComponent("[]")) {
      params.set("filterConditions", this._filterURIString);
    } else {
      params.delete("filterConditions");
    }

    const searchString = this._searchParams.get("encoded_search");
    if (typeof searchString !== "undefined" && searchString != null && searchString !== "undefined") {
      // let params = this._sectionParams();
      params.set("encoded_search", searchString);
    } else {
      params.delete("encoded_search");
    }

    const relatedSearchString = this._searchParams.get("encoded_related_search");
    if (typeof relatedSearchString !== "undefined" && relatedSearchString != null && relatedSearchString !== "undefined") {
      // let params = this._sectionParams();
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
      this._filterConditions = JSON.parse(decodeURIComponent(this._filterURIString));
    }
    if (typeof this._filterConditions !== "undefined" && this._filterConditions != "") {
      return this._filterConditions
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
