import { TatorElement } from "../tator-element.js";
import { svgNamespace } from "../tator-element.js";
import { hasPermission } from "../../util/has-permission.js";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { getDeepActiveElement } from "../../util/utilities.js";

export class EntityCard extends TatorElement {
  constructor() {
    super();

    // Built ins
    this.builtIns = [
      "id",
      "modified_by",
      "modified_datetime",
      "created_by",
      "created_datetime",
      "type",
      "elemental_id",
      "mark",
    ];

    // #todo These are not supported in card labels yet
    // this.builtIns_MediaOnly = ["created_by"];
    // this.builtIns_LocOnly = ["frame"];

    this._type = null;

    // List element (card)
    this._li = document.createElement("li");
    this._li.setAttribute("class", "entity-card rounded-2 clickable");
    this._shadow.appendChild(this._li);

    // Link
    this._link = document.createElement("a");
    this._link.setAttribute(
      "class",
      "entity-card__link file__link d-flex flex-items-center text-white"
    );
    this._link.setAttribute("href", "#");
    this._li.appendChild(this._link);

    // Image, spinner until SRC set
    this._img = document.createElement("img");
    this._img.setAttribute(
      "src",
      `${STATIC_PATH}/ui/src/images/spinner-transparent.svg`
    );
    this._img.setAttribute("class", "entity-card__image rounded-1");
    this._img.setAttribute("crossorigin", "anonymous");
    this._link.appendChild(this._img);

    // containing div for li element (styling)
    this._styledDiv = document.createElement("div");
    this._styledDiv.setAttribute(
      "class",
      "entity-card__title__container py-2 px-2 lh-default"
    );
    this._li.appendChild(this._styledDiv);

    // Title Div
    this.titleDiv = document.createElement("div");
    this.titleDiv.setAttribute(
      "class",
      "entity-card__title py-1 d-flex flex-justify-between"
    );
    this._styledDiv.appendChild(this.titleDiv);
    this.titleDiv.hidden = true;

    // Section title - h2
    this._title = document.createElement("h2");
    this._title.setAttribute(
      "class",
      "section__name text-hover-white text-gray py-1 px-1 css-truncate"
    );
    this._link.appendChild(this._title);

    // Text for Title Div
    this._name = document.createElement("a");
    this._name.setAttribute("class", "text-semibold text-white col-11");
    this._name.style.overflowWrap = "break-word";
    // this._name.setAttribute("href", "#");
    this.titleDiv.appendChild(this._name);

    // OPTIONAL Description Div
    this.descDiv = document.createElement("div");
    this.descDiv.setAttribute("class", "entity-card__description py-1 f2");
    this._styledDiv.appendChild(this.descDiv);
    this.descDiv.hidden = true; // HIDDEN default

    // "More" (three dots) menu (OPTIONAL) #todo
    this._more = document.createElement("media-more");
    this._more.setAttribute("class", "entity-card__more text-right ");
    this._more.hidden = true; // HIDDEN default
    this.titleDiv.appendChild(this._more);

    // Lower div start
    const lowerDiv = document.createElement("div");
    lowerDiv.setAttribute("class", "");
    this._styledDiv.appendChild(lowerDiv);

    const durationDiv = document.createElement("div");
    durationDiv.setAttribute("class", "d-flex flex-items-center");
    lowerDiv.appendChild(durationDiv);

    this._duration = document.createElement("span");
    this._duration.setAttribute("title", "duration");
    this._duration.setAttribute("class", "f3 text-gray duration");
    durationDiv.appendChild(this._duration);

    // OPTIONAL bottom (contains pagination + id display)
    this._bottom = document.createElement("div");
    this._bottom.setAttribute("class", "f3 d-flex flex-justify-between");
    this._styledDiv.appendChild(this._bottom);

    // OPTIONAL Pagination position
    this._pos_text = document.createElement("span");
    this._pos_text.setAttribute("class", "f3 text-gray pr-2");
    this._bottom.appendChild(this._pos_text);

    // Emblem div
    this._emblemDiv = document.createElement("div");
    this._emblemDiv.setAttribute("class", "d-flex flex-items-center");
    lowerDiv.appendChild(this._emblemDiv);

    // Attachment button & emblem code
    this._attachmentButton = document.createElement("button");
    this._attachmentButton.setAttribute(
      "class",
      "px-1 btn-clear h2 text-gray hover-text-white"
    );
    this._attachmentButton.style.display = "none";
    this._emblemDiv.appendChild(this._attachmentButton);

    var svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.fill = "none";
    this._attachmentButton.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
    );
    svg.appendChild(path);

    let archiveSvg = `<svg class="no-fill" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
    let archiveUpSvg = `<svg class="no-fill" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
    let archiveDownSvg = `<svg class="no-fill" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
    this._archiveEmblem = document.createElement("button");
    this._archiveEmblem.setAttribute(
      "class",
      "px-1 btn-clear h2 text-gray hover-text-white d-flex"
    );
    this._archiveEmblem.innerHTML = archiveSvg;
    this._archiveEmblem.style.display = "none";
    this._emblemDiv.appendChild(this._archiveEmblem);

    this._archiveUpEmblem = document.createElement("button");
    this._archiveUpEmblem.setAttribute(
      "class",
      "px-1 btn-clear h2 text-gray hover-text-white d-flex"
    );
    this._archiveUpEmblem.innerHTML = archiveSvg + archiveUpSvg;
    this._archiveUpEmblem.style.display = "none";
    this._emblemDiv.appendChild(this._archiveUpEmblem);

    this._archiveDownEmblem = document.createElement("button");
    this._archiveDownEmblem.setAttribute(
      "class",
      "px-1 btn-clear h2 text-gray hover-text-white d-flex"
    );
    this._archiveDownEmblem.innerHTML = archiveSvg + archiveDownSvg;
    this._archiveDownEmblem.style.display = "none";
    this._emblemDiv.appendChild(this._archiveDownEmblem);

    this.addEventListener("mouseenter", () => {
      if (this.hasAttribute("media-id")) {
        this.dispatchEvent(
          new CustomEvent("cardMouseover", {
            detail: { media: this.media },
          })
        );
      }
    });

    this.addEventListener("mouseleave", () => {
      if (this.hasAttribute("media-id")) {
        this.dispatchEvent(new Event("cardMouseexit"));
      }
    });

    // OPTIONAL ID data
    this._id_text = document.createElement("span");
    this._id_text.setAttribute("class", "f3 text-gray px-2");
    this._bottom.appendChild(this._id_text);

    // More menu event listener (if included)
    this._more.addEventListener("algorithmMenu", (evt) => {
      this.dispatchEvent(
        new CustomEvent("runAlgorithm", {
          composed: true,
          detail: {
            algorithmName: evt.detail.algorithmName,
            mediaIds: [Number(this.getAttribute("media-id"))],
            projectId: this._more._project.id,
          },
        })
      );
    });

    this._more.addEventListener("annotations", (evt) => {
      this.dispatchEvent(
        new CustomEvent("downloadAnnotations", {
          detail: {
            mediaIds: this.getAttribute("media-id"),
            annotations: true,
          },
          composed: true,
        })
      );
    });

    this._more.addEventListener("rename", (evt) => {
      const input = document.createElement("input");
      input.setAttribute("class", "form-control input-sm1 f1");
      input.setAttribute("value", this._name.textContent);
      this.titleDiv.replaceChild(input, this._name);
      input.addEventListener("focus", (evt) => {
        evt.target.select();
      });
      input.addEventListener("keydown", (evt) => {
        let activeElement = getDeepActiveElement(evt.target);
        if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
          // Ignore keypresses in input fields
          return;
        }

        if (evt.keyCode == 13) {
          evt.preventDefault();
          input.blur();
        }
      });
      input.addEventListener("blur", (evt) => {
        if (evt.target.value !== "") {
          this._name.textContent = evt.target.value;
          const full = evt.target.value;
          this._li.setAttribute("title", full);
        }
        fetchCredentials("/rest/Media/" + this.getAttribute("media-id"), {
          method: "PATCH",
          body: JSON.stringify({
            name: `${this._name.textContent}`,
          }),
        }).catch((err) => console.error("Failed to change name: " + err));
        this.titleDiv.replaceChild(this._name, evt.target);
      });
      input.focus();
    });

    this._more.addEventListener("delete", (evt) => {
      // console.log(this);
      this.dispatchEvent(
        new CustomEvent("deleteFile", {
          detail: {
            mediaId: this.getAttribute("media-id"),
            mediaName: this._name.textContent,
          },
          composed: true,
        })
      );
    });

    this._more.addEventListener("move", this._moveMediaFile.bind(this));

    // Attachment button listener
    this._attachmentButton.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("attachments", {
          composed: true,
          detail: this._attachments,
        })
      );
    });

    // Card LINK (both _name and _link)click / List item click listener
    this.addEventListener("click", this.togglePanel.bind(this));
    this._link.addEventListener("click", (e) => {
      if (
        this._multiEnabled ||
        !this._link.hasAttribute("href") ||
        this._link.getAttribute("href") == "#"
      ) {
        e.preventDefault();
      }
    });
    this._name.addEventListener("click", (e) => {
      if (
        this._multiEnabled ||
        !this._name.hasAttribute(
          "href" || this._link.getAttribute("href") == "#"
        )
      ) {
        e.preventDefault();
      }
    });

    // prep this var
    this._tmpHidden = null;
    this.attributeDivs = {};
    this._currentShownAttributes = "";
    this.multiEnabled = false;
    this._multiSelectionToggle = false;

    /* Holds attributes for the card */
    this.attributesDiv = document.createElement("div");

    /* Sends events related to selection clicks */
    this.addEventListener("contextmenu", this.contextMenuHandler.bind(this));

    //
    this._sectionInit = false;
    this._mediaInit = false;
  }

  set multiEnabled(val) {
    // console.log("entity-card multiEnabled set..." + val);
    this._multiEnabled = val;
    this._multiSelectionToggle = val;

    if (val) {
      this._li.classList.add("multi-select");
    } else {
      this._li.classList.remove("multi-select");
    }
  }

  static get observedAttributes() {
    return ["thumb", "thumb-gif", "name", "processing", "pos-text", "duration"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "thumb":
        if (this._thumb != newValue) {
          this._img.setAttribute("src", newValue);
          this._img.onload = () => {
            this.dispatchEvent(new Event("loaded"));
          };
          this._thumb = newValue;
        }
        break;
      case "thumb-gif":
        if (this._thumbGif != newValue) {
          this._thumbGif = newValue;
          this._li.addEventListener("mouseenter", () => {
            if (this.hasAttribute("thumb-gif")) {
              this._img.setAttribute("src", this.getAttribute("thumb-gif"));
            }
          });
          this._li.addEventListener("mouseleave", () => {
            if (this.hasAttribute("thumb")) {
              this._img.setAttribute("src", this.getAttribute("thumb"));
            }
          });
        }
        break;
      case "name":
        this._name.textContent = newValue;
        this._li.setAttribute("title", newValue);
        this._more.setAttribute("name", newValue);
        break;
      case "processing":
        if (newValue === null) {
          this._more.removeAttribute("processing");
        } else {
          this._more.setAttribute("processing", "");
        }
        break;
      case "duration":
        if (newValue !== null && newValue !== "null") {
          //
          this._duration.textContent = newValue;
        } else {
          this._duration.textContent = "";
        }
      case "pos-text":
        this._pos_text.textContent = newValue;
    }
  }

  init({
    obj,
    panelContainer = null,
    cardLabelsChosen = null,
    enableMultiselect = false,
    idx = null,
    mediaInit = false,
    memberships = null,
  }) {
    //
    // this.resetAll();

    // Give card access to panel
    this.panelContainer = panelContainer;
    this.cardObj = obj;
    this.multiEnabled = enableMultiselect;
    this._idx = idx;
    this._mediaInit = mediaInit;
    this._type = mediaInit ? "media" : "localization"; // Section set in different init

    if (this._idx !== null) {
      // console.log(`Tab index ${this._idx}`);
      this._li.setAttribute("tabindex", this._idx);
    }

    if (!mediaInit) {
      // ID is title
      this._id_text.innerHTML = `ID: ${this.cardObj.id}`;
      this._name.style.opacity = 1;
      this._link.style.opacity = 1;
      this._name.style.cursor = "pointer";
      this._link.style.cursor = "pointer";
    }

    // Graphic
    if (
      typeof this.cardObj.image !== "undefined" &&
      this.cardObj.image !== null
    ) {
      this.setImageStatic(obj.image);
    } else if (!mediaInit) {
      this.setImageStatic(
        `${STATIC_PATH}/ui/src/images/spinner-transparent.svg`
      );
    }

    if (obj.posText) {
      // Add position text related to pagination
      this.setAttribute("pos-text", obj.posText);
    }

    this._membershipMap = new Map();
    if (memberships !== null) {
      for (let member of memberships) {
        this._membershipMap.set(member.user, member.username);
      }
    }

    /**
     * Attributes hidden on card are controlled by outer menu
     */
    let attrList = [...this.builtIns, ...obj.attributeOrder];

    // #todo These are not supported in card labels yet
    // if (this._type == "localization") attrList = [...attrList, ...this.builtIns_LocOnly];
    // if (this._type == "media") attrList = [...attrList, ...this.builtIns_MediaOnly];

    if (attrList && attrList.length > 0) {
      // console.log("Setting up labels on card with this data:");
      // console.log(obj);
      // Clear this in case of reuse / re-init
      this.attributesDiv.innerHTML = "";
      // console.log("This type: " + this._type);
      // console.log(obj);

      for (const attr of attrList) {
        let attrStyleDiv = document.createElement("div");
        attrStyleDiv.setAttribute("class", `entity-gallery-card__attribute`);

        let attrLabel = document.createElement("div");
        attrLabel.setAttribute("class", "f3 text-gray text-normal");
        attrStyleDiv.appendChild(attrLabel);

        let key = "";
        let keyString = "";

        // Assign key and output string based on attr info
        if (typeof attr == "string") {
          key = attr;

          if (
            typeof obj[this._type][key] !== null &&
            obj[key] !== "" &&
            key !== "type"
          ) {
            if (
              key.indexOf("_by") > -1 &&
              this._membershipMap.has(Number(obj[this._type][key]))
            ) {
              // It is a user ID lookup
              const username = this._membershipMap.get(
                Number(obj[this._type][key])
              );
              keyString = `<span class="text-dark-gray">${key}</span>: ${username}`;
            } else {
              keyString = `<span class="text-dark-gray">${key}</span>: ${
                obj[this._type][key]
              }`;
            }
          } else if (
            key === "type" &&
            typeof obj.entityType["dtype"] !== null &&
            obj.entityType["dtype"] !== ""
          ) {
            keyString = `<span class="text-dark-gray">${key}</span>: ${obj.entityType["name"]}`;
          } else {
            keyString = `<span class="text-dark-gray"><span class="text-dark-gray">${key}</span>: <<span class="text-italics ">not set</span>></span>`;
          }
        } else {
          key = attr.name;

          if (
            obj.attributes !== null &&
            typeof obj.attributes[key] !== "undefined" &&
            obj.attributes[key] !== null &&
            obj.attributes[key] !== ""
          ) {
            keyString = `<span class="text-dark-gray">${key}</span>: ${obj.attributes[key]}`;
          } else {
            keyString = `<span class="text-dark-gray"><span class="text-dark-gray">${key}</span>: <<span class="text-italics ">not set</span>></span>`;
          }
        }

        // Update output based on key and keystring
        attrLabel.innerHTML = keyString;
        attrStyleDiv.setAttribute("title", `${key}`);

        // add to the card & keep a list
        this.attributeDivs[key] = {};
        this.attributeDivs[key].div = attrStyleDiv;
        this.attributeDivs[key].value = attrLabel;

        if (
          cardLabelsChosen &&
          Array.isArray(cardLabelsChosen) &&
          cardLabelsChosen.length > 0
        ) {
          // If we have any preferences saved check against it
          if (cardLabelsChosen.indexOf(key) > -1) {
            // console.log("FOUND "+key+" at index "+cardLabelsChosen.indexOf(key));
          } else {
            attrStyleDiv.classList.add("hidden");
          }
        } else {
          attrStyleDiv.classList.add("hidden");
        }

        this.attributesDiv.appendChild(attrStyleDiv);
      }

      if (this.attributeDivs) {
        // Show description div
        this.descDiv.appendChild(this.attributesDiv);
        this.descDiv.hidden = false;
      }
    }
  }

  /**
   * Custom label display update
   */
  _updateShownAttributes(evt) {
    // console.log("_updateShownAttributes, evt.detail.value=");
    // console.log(evt.detail.value);
    let labelValues = evt.detail.value;

    // We want to treat builtIn like the attribute's on the type
    //
    if (
      this.attributeDivs &&
      (evt.detail.typeId === this.cardObj.entityType.id ||
        evt.detail.typeId === -1)
    ) {
      // show selected
      for (let [key, value] of Object.entries(this.attributeDivs)) {
        if (labelValues.includes(key)) {
          value.div.classList.remove("hidden");
        } else {
          // typeData know about built ins, but not the other way around
          // only HIDE a non-built in if we have an entity type
          const nonBuiltWithType =
            !this.builtIns.includes(key) && evt.detail.typeId !== -1;
          const isBuiltType =
            this.builtIns.includes(key) && evt.detail.typeId == -1;
          if (nonBuiltWithType || isBuiltType) {
            value.div.classList.add("hidden");
          }
        }
      }
    }
  }

  /**
   * Update Attribute Values
   * - If side panel is edited the card needs to update attributes
   */
  _updateAttributeValues(data) {
    console.log(
      "Update card with new data",
      data,
      data.entityType.id == this.cardObj.entityType.id
    );
    if (data.entityType.id == this.cardObj.entityType.id) {
      this._id_text.innerHTML = `ID: ${data.id}`;
      for (let [attr, value] of Object.entries(data.attributes)) {
        if (typeof this.attributeDivs[attr] !== "undefined") {
          if (this.attributeDivs[attr] != null) {
            this.attributeDivs[
              attr
            ].value.innerHTML = `<span class="text-dark-gray">${attr}</span>: ${value}`;
          } else {
            this.attributeDivs[
              attr
            ].value.innerHTML = `<span class="text-dark-gray"><span class="text-dark-gray">${attr}</span>: <<span class="text-italics ">not set</span>></span>`;
          }
        }
      }
      for (let attr_key of this.builtIns) {
        if (data[attr_key]) {
          if (typeof this.attributeDivs[attr_key] !== "undefined") {
            if (this.attributeDivs[attr_key] != null) {
              this.attributeDivs[
                attr_key
              ].value.innerHTML = `<span class="text-dark-gray">${attr_key}</span>: ${data[attr_key]}`;
            } else {
              this.attributeDivs[
                attr_key
              ].value.innerHTML = `<span class="text-dark-gray"><span class="text-dark-gray">${attr}</span>: <<span class="text-italics ">not set</span>></span>`;
            }
          }
        }
      }
    }
  }

  set posText(val) {
    this._pos_text.textContent = val;
  }

  set active(enabled) {
    if (enabled) {
      this._li.classList.add("is-active");
    } else {
      this._li.classList.remove("is-active");
    }
  }

  set project(val) {
    this._project = val;
    this._more.project = val;
    if (this._project && this._project.id) {
      this.setAttribute("project-id", this._project.id);
    } else {
      this.setAttribute("project-id", "");
    }
  }

  set algorithms(val) {
    this._more.algorithms = val;
  }

  set mediaParams(val) {
    this._mediaParams = val;
  }

  set media(val) {
    // console.log("Set entity-card media.....");
    // console.log(val);
    this._media = val;
    this._more.media = val;
    let valid = false;
    let project = this._media.project;
    if (typeof this._media.project == "undefined") {
      project = this._media.project_id;
    }

    // Set ID for later use
    if (this._media && this._media.id) {
      this.setAttribute("media-id", this._media.id);
    }

    if (this._media && this._media.name) {
      this.setAttribute("name", this._media.name);
    }

    function hasValue(value) {
      return !(
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0)
      );
    }

    // Set thumnail
    if (
      this._media.media_files &&
      hasValue(this._media.media_files.thumbnail)
    ) {
      this.setAttribute("thumb", this._media.media_files.thumbnail[0].path);
    }
    this.removeAttribute("thumb-gif"); // why is this always done? instead of below on else

    if (
      this._media.media_files &&
      hasValue(this._media.media_files.thumbnail_gif)
    ) {
      this.setAttribute(
        "thumb-gif",
        this._media.media_files.thumbnail_gif[0].path
      );
    }

    if (this._media.media_files) {
      if (hasValue(this._media.media_files.attachment)) {
        this.attachments = this._media.media_files.attachment;
      } else {
        this.attachments = [];
      }
    }

    // Check if file is valid and set LiveThumb
    if (this._media.media_files !== null) {
      if (
        "streaming" in this._media.media_files ||
        "layout" in this._media.media_files ||
        "concat" in this._media.media_files ||
        "image" in this._media.media_files
      ) {
        valid = true;
      }

      if (
        !("thumbnail" in this._media.media_files) &&
        "live" in this._media.media_files
      ) {
        // Default to tator thumbnail
        // TODO: Have some visual indication if stream is active.
        this._img.setAttribute(
          "src",
          `${STATIC_PATH}/ui/src/images/live-thumb.png`
        );
      }
    }

    // console.log(`File "${val.name}" is valid? >>> ${valid}`)
    // If valid setup up the values
    if (valid) {
      //   this._name.style.opacity = 0.35;
      //   this._link.style.opacity = 0.35;
      //   this._name.style.cursor = "not-allowed";
      //   this._link.style.cursor = "not-allowed";
      // } else {

      // Setup name & link
      var uri = `/${project}/annotation/${
        val.id
      }?${this._mediaParams.toString()}`;
      this._name.setAttribute("href", uri);
      this._link.setAttribute("href", uri);
      this._name.style.opacity = 1;
      this._link.style.opacity = 1;
      this._name.style.cursor = "pointer";
      this._link.style.cursor = "pointer";

      // Setup media emblem
      if (this._media.archive_state == "to_archive") {
        this._archiveDownEmblem.style.display = "flex";
        this._archiveDownEmblem.setAttribute("tooltip", "Pending Archival");
      } else if (this._media.archive_state == "archived") {
        this._archiveEmblem.style.display = "flex";
        this._archiveEmblem.setAttribute("tooltip", "Archived");
      } else if (this._media.archive_state == "to_live") {
        this._archiveUpEmblem.style.display = "flex";
        this._archiveUpEmblem.setAttribute("tooltip", "Pending Live");
      } else {
        this._archiveDownEmblem.style.display = "none";
        this._archiveUpEmblem.style.display = "none";
        this._archiveEmblem.style.display = "none";
      }

      // Add duration to card
      if (
        typeof this._media.num_frames !== "undefined" &&
        this._media.num_frames !== null &&
        typeof this._media.fps !== "undefined" &&
        this._media.fps !== null
      ) {
        // Add duration to card
        let seconds = Number(this._media.num_frames) / Number(this._media.fps);
        let duration = new Date(seconds * 1000).toISOString().substr(11, 8);
        this.setAttribute("duration", duration);
      } else {
        this.setAttribute("duration", null);
      }
    } else {
      this.resetValues();
    }
  }

  get media() {
    return this._media;
  }

  set attachments(val) {
    this._attachments = val;
    if (val.length > 0) {
      this._attachmentButton.style.display = "flex";
    } else {
      this._attachmentButton.style.display = "none";
    }
  }

  /**
   * Set the card's main image thumbnail
   * @param {image} image
   */
  setImage(image) {
    const url = URL.createObjectURL(image);
    this._img.src = url;
    this._img.onload = () => URL.revokeObjectURL(url);
  }

  setImageStatic(image) {
    //this.setAttribute("thumb", image);
    this._img.setAttribute("src", image);
    this.cardObj.image = image;
    this._img.onload = () => {
      this.dispatchEvent(new Event("loaded"));
    };
  }

  togglePanel(e) {
    // console.log("Toggle panel");
    if (
      this._link.hasAttribute("href") &&
      this._link.getAttribute("href") !== "#" &&
      !this._multiEnabled
    ) {
      // follow the link...
      // console.log("SKIP");
      return false;
    } else {
      // otherwise do some panel, or multi stuff don't go #
      e.preventDefault();
      // console.log("ELSE: Panel stuff.......");

      if (this._multiEnabled) {
        this._multiSelectionToggle = true;

        /* @ "card-click"*/
        // if (e.shiftKey && !this._mediaInit) {
        //   // console.log("Shift click!");
        //   // this._multiSelectionToggle = true;
        //   this.dispatchEvent(new CustomEvent("shift-select", { detail: { element: this, id: this.cardObj.id, isSelected: this._li.classList.contains("is-selected") } })); //user is clicking specific cards
        // } else

        if (e.code == "Enter") {
          // console.log("Enter click!... " + this._li.hasFocus());
          if (this._li.hasFocus()) {
            //
          }
          // this._multiSelectionToggle = true;
          this.dispatchEvent(
            new CustomEvent("shift-select", {
              detail: {
                element: this,
                id: this.cardObj.id,
                isSelected: this._li.classList.contains("is-selected"),
              },
            })
          ); //user is clicking specific cards
        } else if (
          (e.ctrlKey && !this._mediaInit) ||
          (e.code == "Control" && !this._mediaInit)
        ) {
          // usually context menu is hit, and not this keeping in case....
          // this._multiSelectionToggle = true;
          this.dispatchEvent(
            new CustomEvent("ctrl-select", {
              detail: {
                element: this,
                id: this.cardObj.id,
                isSelected: this._li.classList.contains("is-selected"),
              },
            })
          ); //user is clicking specific cards
        } else if (this._mediaInit) {
          // console.log("this._li.classList.contains(is-selected .................................... "+this._li.classList.contains("is-selected"))
          this.dispatchEvent(
            new CustomEvent("ctrl-select", {
              detail: {
                element: this,
                id: this.cardObj.id,
                isSelected: this._li.classList.contains("is-selected"),
              },
            })
          ); //user is clicking specific cards
        }
      }

      // In multi, we select the card, but don't ALWAYs pop it
      if (
        this._li.classList.contains("is-selected") &&
        !this._mediaInit &&
        !this._sectionInit
      ) {
        this._deselectedCardAndPanel();
      } else if (!this._mediaInit && !this._sectionInit) {
        //&&  !this._multiSelectionToggle
        this._selectedCardAndPanel();
      } else {
        this.cardClickEvent(false); // this sends event with open flag false, but no selection happens
      }
    }
  }

  _unselectOpen() {
    const cardId =
      this.panelContainer._panelTop._panel.getAttribute("selected-id");

    // if it exists, close it!
    if (!this._multiSelectionToggle) {
      // console.log("unselecting this cardId: " + cardId)
      if (typeof cardId !== "undefined" && cardId !== null) {
        let evt = new CustomEvent("unselected", { detail: { id: cardId } });
        this.panelContainer.dispatchEvent(evt); // this even unselected related card
      }
    }
  }

  _deselectedCardAndPanel() {
    this.cardClickEvent(false);
    this._li.classList.remove("is-selected");
    this.annotationEvent("hide-annotation");
  }

  _selectedCardAndPanel() {
    // Hide open panels
    this._unselectOpen();
    this.cardClickEvent();
    this.annotationEvent("open-annotation");
    this._li.classList.add("is-selected");
  }

  cardClickEvent(openFlag = true) {
    // Send event to panel to hide the localization canvas & title
    let cardClickEvent = new CustomEvent("card-click", {
      detail: { openFlag, cardObj: this.cardObj },
    });
    this.dispatchEvent(cardClickEvent);
  }

  annotationEvent(evtName) {
    // Send event to panel to hide the localization
    let annotationEvent = new CustomEvent(evtName, {
      detail: { cardObj: this.cardObj },
    });
    this.panelContainer.dispatchEvent(annotationEvent);
  }

  contextMenuHandler(e) {
    if (e.ctrlKey && !this._mediaInit) {
      // console.log("Card was clicked with ctrl");
      this._multiSelectionToggle = true;
      e.preventDefault(); // stop contextmenu
      // this.togglePanel(e);
      this.dispatchEvent(
        new CustomEvent("ctrl-select", {
          detail: {
            element: this,
            id: this.cardObj.id,
            isSelected: this._li.classList.contains("is-selected"),
          },
        })
      ); //user is clicking specific cards
      // this._li.classList.add("is-selected");
    }
  }

  rename(name) {
    this._title.textContent = name;
  }

  sectionInit(section, sectionType) {
    this._section = section;
    this._sectionType = sectionType;
    this._img.remove();
    this._styledDiv.remove();
    this._li.classList.add("section");
    this._li.classList.remove("entity-card");
    this._sectionInit = true;
    this._type = "section";

    if (section === null) {
      this._title.textContent = "All Media";
    } else {
      this._title.textContent = section.name;
    }
    this._title.hidden = false;

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("fill", "none");
    svg.style.fill = "none";
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    this._link.insertBefore(svg, this._title);

    // Null section means display all media.
    if (section === null) {
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z");
      svg.appendChild(path);

      const poly = document.createElementNS(svgNamespace, "polyline");
      poly.setAttribute("points", "9 22 9 12 15 12 15 22");
      svg.appendChild(poly);
    }
    if (sectionType == "folder") {
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute(
        "d",
        "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
      );
      svg.appendChild(path);

      const context = document.createElement("div");
      context.setAttribute(
        "class",
        "more d-flex flex-column f2 px-3 py-2 lh-condensed"
      );
      context.style.display = "none";
      this._shadow.appendChild(context);

      const archiveToggle = document.createElement("toggle-button");
      archiveToggle.before(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-archive"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`
      );
      if (this._section.visible) {
        archiveToggle.setAttribute("text", "Archive folder");
      } else {
        archiveToggle.setAttribute("text", "Restore folder");
      }
      context.appendChild(archiveToggle);

      const rename = document.createElement("rename-button");
      rename.setAttribute("text", "Rename folder");
      context.appendChild(rename);

      const deleteSection = document.createElement("delete-button");
      deleteSection.init("Delete folder");
      context.appendChild(deleteSection);

      rename.addEventListener("click", (evt) => {
        evt.stopPropagation();
        this.dispatchEvent(
          new CustomEvent("renameSection", {
            detail: { type: "folder", section: this._section },
          })
        );
        context.style.display = "none";
      });
      deleteSection.addEventListener("click", (evt) => {
        evt.stopPropagation();
        this.dispatchEvent(
          new CustomEvent("deleteSection", {
            detail: { type: "folder", section: this._section },
          })
        );
        context.style.display = "none";
      });

      archiveToggle.addEventListener("click", (evt) => {
        this._section.visible = !this._section.visible;
        const sectionId = Number();
        fetchCredentials(`/rest/Section/${this._section.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            visible: this._section.visible,
          }),
        }).then((response) => {
          if (this._section.visible) {
            archiveToggle.setAttribute("text", "Archive folder");
          } else {
            archiveToggle.setAttribute("text", "Restore folder");
          }
          this.dispatchEvent(
            new CustomEvent("visibilityChange", {
              detail: { section: this._section },
            })
          );
        });
      });

      this.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        context.style.display = "block";
      });

      window.addEventListener("click", (evt) => {
        context.style.display = "none";
      });
    } else if (sectionType == "savedSearch") {
      const circle = document.createElementNS(svgNamespace, "circle");
      circle.setAttribute("cx", "11");
      circle.setAttribute("cy", "11");
      circle.setAttribute("r", "8");
      svg.appendChild(circle);

      const line = document.createElementNS(svgNamespace, "line");
      line.setAttribute("x1", "21");
      line.setAttribute("y1", "21");
      line.setAttribute("x2", "16.65");
      line.setAttribute("y2", "16.65");
      svg.appendChild(line);

      const context = document.createElement("div");
      context.setAttribute(
        "class",
        "more d-flex flex-column f2 px-3 py-2 lh-condensed"
      );
      context.style.display = "none";
      this._shadow.appendChild(context);

      const rename = document.createElement("rename-button");
      rename.setAttribute("text", "Rename saved search");
      context.appendChild(rename);

      const deleteSection = document.createElement("delete-button");
      deleteSection.init("Delete saved search");
      context.appendChild(deleteSection);

      rename.addEventListener("click", (evt) => {
        evt.stopPropagation();
        this.dispatchEvent(
          new CustomEvent("renameSection", {
            detail: { type: "saved search", section: this._section },
          })
        );
        context.style.display = "none";
      });
      deleteSection.addEventListener("click", (evt) => {
        evt.stopPropagation();
        this.dispatchEvent(
          new CustomEvent("deleteSection", {
            detail: { type: "saved search", section: this._section },
          })
        );
        context.style.display = "none";
      });

      this.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        context.style.display = "block";
      });

      window.addEventListener("click", (evt) => {
        context.style.display = "none";
      });
    } else if (sectionType == "bookmark") {
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute(
        "d",
        "M19 21l-7-5-7 5V5a2 2 0 0 1-2-2h10a2 2 0 0 1 2 2z"
      );
      svg.appendChild(path);
      this._link.setAttribute("href", section.uri);

      // Set up bookmark management controls.
      const input = document.createElement("input");
      input.setAttribute("class", "form-control input-sm f1");
      input.style.display = "none";
      this._link.appendChild(input);

      const context = document.createElement("div");
      context.setAttribute(
        "class",
        "more d-flex flex-column f2 px-3 py-2 lh-condensed"
      );
      context.style.display = "none";
      this._shadow.appendChild(context);

      const rename = document.createElement("rename-button");
      rename.setAttribute("text", "Rename");
      context.appendChild(rename);

      const remove = document.createElement("delete-button");
      remove.init("Delete");
      context.appendChild(remove);

      this._link.addEventListener("contextmenu", (evt) => {
        evt.preventDefault();
        context.style.display = "block";
      });

      rename.addEventListener("click", () => {
        // console.log("Rename event......");
        input.style.display = "block";
        this._link.style.pointerEvents = "none";
        this._title.style.display = "none";
        input.setAttribute("value", this._title.textContent);
        input.focus();
      });

      input.addEventListener("focus", (evt) => {
        evt.target.select();
      });

      input.addEventListener("keydown", (evt) => {
        let activeElement = getDeepActiveElement(evt.target);
        if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
          // Ignore keypresses in input fields
          return;
        }

        if (evt.keyCode == 13) {
          evt.preventDefault();
          input.blur();
        }
      });

      input.addEventListener("blur", (evt) => {
        if (evt.target.value !== "") {
          this._title.textContent = evt.target.value;
          this._link.style.pointerEvents = "";
          this._section.name = evt.target.value;
          fetchCredentials(
            "/rest/Bookmark/" + this._section.id,
            {
              method: "PATCH",
              body: JSON.stringify({ name: evt.target.value }),
            },
            true
          );
        }
        input.style.display = "none";
        this._title.style.display = "block";
      });

      remove.addEventListener("click", () => {
        this.parentNode.removeChild(this);
        fetchCredentials(
          "/rest/Bookmark/" + this._section.id,
          {
            method: "DELETE",
          },
          true
        );
      });

      window.addEventListener("click", (evt) => {
        context.style.display = "none";
      });
    }
  }

  _moveMediaFile(evt) {
    // console.log("Entity card _moveMediaFile");
    evt.preventDefault();
    this.dispatchEvent(
      new CustomEvent("moveFile", {
        detail: {
          mediaId: this.getAttribute("media-id"),
          mediaName: this._name.textContent,
        },
        composed: true,
      })
    );
  }

  resetValues() {
    // Link reset
    this._name.style.opacity = 0.35;
    this._link.style.opacity = 0.35;
    this._link.setAttribute("href", "#");
    this._name.removeAttribute("href");

    // Other data reset
    this._duration.textContent = "";
    this._attachmentButton.style.display = "none";
    this._archiveEmblem.style.display = "none";
    this._archiveUpEmblem.style.display = "none";
    this._archiveDownEmblem.style.display = "none";
  }

  handleDragStart(e) {
    this.dispatchEvent(new Event("card-moving"));

    const data = this.cardObj;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(data));
  }
}

customElements.define("entity-card", EntityCard);
