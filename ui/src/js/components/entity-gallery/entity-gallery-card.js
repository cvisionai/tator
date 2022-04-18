import { TatorElement } from "../tator-element.js";
import { svgNamespace } from "../tator-element.js";
import { hasPermission } from "../../util/has-permission.js";
import { getCookie } from "../../util/get-cookie.js";
import { fetchRetry } from "../../util/fetch-retry.js";
import Spinner from "../../../images/spinner-transparent.svg";
import LiveThumb from "../../../images/live-thumb.png";

export class EntityCard extends TatorElement {
  constructor() {
    super();

    // List element (card)
    this._li = document.createElement("li");
    this._li.setAttribute("class", "entity-card rounded-2 clickable");
    this._shadow.appendChild(this._li);

    // Link
    this._link = document.createElement("a");
    this._link.setAttribute("class", "entity-card__link file__link d-flex flex-items-center text-white");
    this._link.setAttribute("href", "#");
    this._li.appendChild(this._link);

    // Image, spinner until SRC set
    this._img = document.createElement("img");
    this._img.setAttribute("src", Spinner);
    this._img.setAttribute("class", "entity-card__image rounded-1");
    this._link.appendChild(this._img);

    // containing div for li element (styling)
    this._styledDiv = document.createElement("div");
    this._styledDiv.setAttribute("class", "entity-card__title__container py-2 px-2 lh-default");
    this._li.appendChild(this._styledDiv);

    // Title Div
    this.titleDiv = document.createElement("div");
    this.titleDiv.setAttribute("class", "entity-card__title py-1 d-flex flex-justify-between");
    this._styledDiv.appendChild(this.titleDiv);
    this.titleDiv.hidden = true;
    
    // Section title - h2
    this._title = document.createElement("h2");
    this._title.setAttribute("class", "section__name text-hover-white text-gray py-1 px-1 css-truncate");
    this._link.appendChild(this._title);

    // Text for Title Div
    this._name = document.createElement("a");
    this._name.setAttribute("class", "text-semibold text-white css-truncate");
    // this._name.setAttribute("href", "#");
    this.titleDiv.appendChild(this._name);

    // OPTIONAL Description Div
    this.descDiv = document.createElement("div");
    this.descDiv.setAttribute("class", "entity-card__description py-1 f2");
    this._styledDiv.appendChild(this.descDiv);
    this.descDiv.hidden = true; // HIDDEN default

    // "More" (three dots) menu (OPTIONAL)
    this._more = document.createElement("media-more");
    this._more.setAttribute("class", "entity-card__more text-right ");
    this._more.style.opacity = 0;
    this.titleDiv.appendChild(this._more);
    this._more.hidden = true; // HIDDEN default


    

    // Lower div start
    const lowerDiv = document.createElement("div");
    lowerDiv.setAttribute("class", "");
    this._styledDiv.appendChild(lowerDiv);

    const durationDiv = document.createElement("div");
    durationDiv.setAttribute("class", "d-flex flex-items-center");
    lowerDiv.appendChild(durationDiv);

    this._duration = document.createElement("span");
    this._duration.setAttribute("class", "f3 text-gray");
    durationDiv.appendChild(this._duration);

    // OPTIONAL bottom (contains pagination + id display)
    this._bottom = document.createElement("div");
    this._bottom.setAttribute("class", "f3 d-flex flex-justify-between");
    this._styledDiv.appendChild(this._bottom);

    // OPTIONAL Detail text (ie file extension)
    this._ext = document.createElement("span");
    this._ext.setAttribute("class", "f3 text-gray");
    this._ext.hidden = true;
    this._bottom.appendChild(this._ext);

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
    this._attachmentButton.setAttribute("class", "px-1 btn-clear h2 text-gray hover-text-white");
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
    path.setAttribute("d", "M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48");
    svg.appendChild(path);

    let archiveSvg = `<svg class="no-fill" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
    let archiveUpSvg = `<svg class="no-fill" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
    let archiveDownSvg = `<svg class="no-fill" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>`;
    this._archiveEmblem = document.createElement("button");
    this._archiveEmblem.setAttribute("class", "px-1 btn-clear h2 text-gray hover-text-white d-flex");
    this._archiveEmblem.innerHTML = archiveSvg;
    this._archiveEmblem.style.display = "none";
    this._emblemDiv.appendChild(this._archiveEmblem);

    this._archiveUpEmblem = document.createElement("button");
    this._archiveUpEmblem.setAttribute("class", "px-1 btn-clear h2 text-gray hover-text-white d-flex");
    this._archiveUpEmblem.innerHTML = archiveSvg + archiveUpSvg;
    this._archiveUpEmblem.style.display = "none";
    this._emblemDiv.appendChild(this._archiveUpEmblem);

    this._archiveDownEmblem = document.createElement("button");
    this._archiveDownEmblem.setAttribute("class", "px-1 btn-clear h2 text-gray hover-text-white d-flex");
    this._archiveDownEmblem.innerHTML = archiveSvg + archiveDownSvg;
    this._archiveDownEmblem.style.display = "none";
    this._emblemDiv.appendChild(this._archiveDownEmblem);

    // OPTIONAL ID data
    this._id_text = document.createElement("span");
    this._id_text.setAttribute("class", "f3 text-gray px-2");
    this._bottom.appendChild(this._id_text);

    // More menu event listener (if included)
    this.addEventListener("mouseenter", () => {
      this._more.style.opacity = 1;
    });

    this.addEventListener("mouseleave", () => {
      this._more.style.opacity = 0;
    });



    this._more.addEventListener("algorithmMenu", evt => {
      this.dispatchEvent(
        new CustomEvent("runAlgorithm",
          {
            composed: true,
            detail: {
              algorithmName: evt.detail.algorithmName,
              mediaIds: [Number(this.getAttribute("media-id"))],
              projectId: this._more._project.id,
            }
          }));
    });

    this._more.addEventListener("annotations", evt => {
      this.dispatchEvent(new CustomEvent("downloadAnnotations", {
        detail: {
          mediaIds: this.getAttribute("media-id"),
          annotations: true
        },
        composed: true
      }));
    });

    this._more.addEventListener("rename", evt => {
      const input = document.createElement("input");
      input.setAttribute("class", "form-control input-sm1 f1");
      input.setAttribute("value", this._name.textContent);
      titleDiv.replaceChild(input, this._name);
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
          this._name.textContent = evt.target.value;
          const full = evt.target.value + this._ext.textContent;
          this._li.setAttribute("title", full);
        }
        fetch("/rest/Media/" + this.getAttribute("media-id"), {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: `${this._name.textContent}.${this._ext.textContent}`,
          }),
        })
          .catch(err => console.error("Failed to change name: " + err));
        titleDiv.replaceChild(this._name, evt.target);
      });
      input.focus();
    });

    this._more.addEventListener("delete", evt => {
      this.dispatchEvent(new CustomEvent("deleteFile", {
        detail: {
          mediaId: this.getAttribute("media-id"),
          mediaName: this._name.textContent
        },
        composed: true
      }));
    });


    // Attachment button listener
    this._attachmentButton.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("attachments", {
        composed: true,
        detail: this._attachments,
      }));
    });


    // Card click / List item click listener
    this.addEventListener("click", this.togglePanel.bind(this));
    this._link.addEventListener("click", (e) => {
      if (this._multiEnabled) {
        e.preventDefault();
      }
    });
    this._name.addEventListener("click", (e) => {
      if (this._multiEnabled) {
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
    this.attributesDiv = document.createElement('div');

    /* Sends events related to selection clicks */
    this.addEventListener('contextmenu', this.contextMenuHandler.bind(this));

    //
    this._sectionInit = false;
    this._mediaInit = false;
  }

  set multiEnabled(val) {
    // console.log("multiEnabled set..."+val)
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
          this._img.onload = () => { this.dispatchEvent(new Event("loaded")) };
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
        const dot = Math.max(0, newValue.lastIndexOf(".") || Infinity);
        const ext = newValue.slice(dot + 1);
        this._ext.textContent = ext.toUpperCase();
        this._name.textContent = newValue.slice(0, dot);
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
        // console.log(newValue);
        this._duration.textContent = newValue;
      case "pos-text":
        this._pos_text.textContent = newValue;
    }
  }



  init({ obj, panelContainer = null, cardLabelsChosen = null, enableMultiselect = false, idx = null, mediaInit = false }) {
    // Give card access to panel
    this.panelContainer = panelContainer;
    this.cardObj = obj;
    this.multiEnabled = enableMultiselect;
    this._idx = idx;
    this._mediaInit = mediaInit;

    if (this._idx !== null) {
      // console.log(`Tab index ${this._idx}`);
      this._li.setAttribute("tabindex", this._idx)
    }

    if (!mediaInit) {
      // ID is title
      this._id_text.innerHTML = `ID: ${this.cardObj.id}`;      
    }


    // Graphic
    if (typeof this.cardObj.image !== "undefined" && this.cardObj.image !== null) {
      //this.setAttribute("thumb", obj.image);
      this.setImageStatic(obj.image);
    } else if (typeof obj.graphic !== "undefined" && obj.graphic !== null) {
      this.reader = new FileReader();
      this.reader.readAsDataURL(obj.graphic); // converts the blob to base64
      this.reader.addEventListener("load", this._setImgSrc.bind(this));
    } else if (!mediaInit) {
      //this.setAttribute("thumb", Spinner);
      this.setImageStatic(Spinner);
    }

    if (obj.posText) {
     // Add position text related to pagination
     this.setAttribute("pos-text", obj.posText);     
    }


    /**
     * Attributes hidden on card are controlled by outer menu 
    */
    if (obj.attributeOrder && obj.attributeOrder.length > 0) {
      // console.log("Setting up labels on card with this data:");
      // console.log(obj);
      // Clear this in case of reuse / re-init
      this.attributesDiv.innerHTML = "";
      for (const attr of obj.attributeOrder) {
        let attrStyleDiv = document.createElement("div");
        attrStyleDiv.setAttribute("class", `entity-gallery-card__attribute`);

        let attrLabel = document.createElement("span");
        attrLabel.setAttribute("class", "f3 text-gray text-normal");
        attrStyleDiv.appendChild(attrLabel);

        let key = attr.name;
        if (obj.attributes !== null && typeof obj.attributes[key] !== "undefined" && obj.attributes[key] !== null && obj.attributes[key] !== "") {
          attrLabel.appendChild(document.createTextNode(`${obj.attributes[key]}`));
        } else {
          attrLabel.innerHTML = `<span class="text-dark-gray"><<span class="text-italics ">not set</span>></span>`;
        }

        // add to the card & keep a list
        this.attributeDivs[key] = {};
        this.attributeDivs[key].div = attrStyleDiv;
        this.attributeDivs[key].value = attrLabel;

        if (cardLabelsChosen && Array.isArray(cardLabelsChosen) && cardLabelsChosen.length > 0) {
          // If we have any preferences saved check against it
          if (cardLabelsChosen.indexOf(key) > -1 ) {
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
    // console.log(evt.detail);
    // console.log(this.cardObj);
    let labelValues = evt.detail.value;

    if (this.attributeDivs && evt.detail.typeId === this.cardObj.entityType.id) {
      // show selected
      for (let [key, value] of Object.entries(this.attributeDivs)) {
        if (labelValues.includes(key)) {
          value.div.classList.remove("hidden");
        } else {
          value.div.classList.add("hidden");
        }
      }
    }
  }

  /**
   * Update Attribute Values
   * - If side panel is edited the card needs to update attributes
   */
  _updateAttributeValues(data) {
    for (let [attr, value] of Object.entries(data.attributes)) {
      if (this.attributeDivs[attr] != null) {
        this.attributeDivs[attr].value.innerHTML = value;
      } else {
        this.attributeDivs[attr].value.innerHTML = `<span class="text-dark-gray"><<span class="text-italics ">not set</span>></span>`;
      }
    }
  }

  set posText(val) {
    this.setAttribute("pos-text", val);
  }

  set active(enabled) {
    if (enabled) {
      this._li.classList.add("is-active");
    } else {
      this._li.classList.remove("is-active");
    }
  }

  set project(val) {
    if (!hasPermission(val.permission, "Can Edit")) {
      this._more.style.display = "none";
    }
    this._more.project = val;
  }

  set algorithms(val) {
    this._more.algorithms = val;
  }

  set mediaParams(val) {
    this._mediaParams = val;
  }

  set media(val) {
    this._media = val;
    this._more.media = val;
    let valid = false;
    if (this._media.media_files) {
      if ('streaming' in this._media.media_files ||
        'layout' in this._media.media_files ||
        'image' in this._media.media_files) {
        valid = true;
      }
      if (!('thumbnail' in this._media.media_files) && 'live' in this._media.media_files) {
        // Default to tator thumbnail
        // TODO: Have some visual indication if stream is active.
        this._img.setAttribute("src", LiveThumb);

      }
    }
    if (valid == false) {
      this._name.style.opacity = 0.35;
      this._link.style.opacity = 0.35;
      this._name.style.cursor = "not-allowed";
      this._link.style.cursor = "not-allowed";
    }
    else {
      let project = val.project;
      if (typeof (val.project) == "undefined") {
        project = val.project_id;
      }
      var uri = `/${project}/annotation/${val.id}?${this._mediaParams.toString()}`;
      this._name.setAttribute("href", uri);
      this._link.setAttribute("href", uri);
      this._name.style.opacity = 1;
      this._link.style.opacity = 1;
      this._name.style.cursor = "pointer";
      this._link.style.cursor = "pointer";
    }

    if (this._media.archive_state == "to_archive") {
      this._archiveDownEmblem.style.display = "flex";
      this._archiveDownEmblem.setAttribute("tooltip", "Pending Archival");
    }
    else if (this._media.archive_state == "archived") {
      this._archiveEmblem.style.display = "flex";
      this._archiveEmblem.setAttribute("tooltip", "Archived");
    }
    else if (this._media.archive_state == "to_live") {
      this._archiveUpEmblem.style.display = "flex";
      this._archiveUpEmblem.setAttribute("tooltip", "Pending Live");
    }
    else {
      this._archiveDownEmblem.style.display = "none";
      this._archiveUpEmblem.style.display = "none";
      this._archiveEmblem.style.display = "none";
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
    this.reader = new FileReader();
    this.reader.readAsDataURL(image); // converts the blob to base64
    this.reader.addEventListener("load", this._setImgSrcReader.bind(this));
  }

  _setImgSrcReader() {
    this._img.setAttribute("src", this.reader.result);
    this._img.onload = () => { this.dispatchEvent(new Event("loaded")) };
  }

  setImageStatic(image) {
    //this.setAttribute("thumb", image);
    this._img.setAttribute("src", image);
    this.cardObj.image = image;
    this._img.onload = () => { this.dispatchEvent(new Event("loaded")) };
  }

  togglePanel(e) {
    // console.log("TOGGLE CARD ")
    if (this._link.getAttribute("href") !== "#" && !this._multiEnabled) {
      // follow the link...
      // otherwise do some panel, or multi stuff
      // console.log("clicked....");
    } else {
      e.preventDefault();

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
          this.dispatchEvent(new CustomEvent("shift-select", { detail: { element: this, id: this.cardObj.id, isSelected: this._li.classList.contains("is-selected") } })); //user is clicking specific cards
        } else if ((e.ctrlKey  && !this._mediaInit) || (e.code == "Control" && !this._mediaInit)) {
          // usually context menu is hit, and not this keeping in case....
          // this._multiSelectionToggle = true;
          this.dispatchEvent(new CustomEvent("ctrl-select", { detail: { element: this, id: this.cardObj.id, isSelected: this._li.classList.contains("is-selected") } })); //user is clicking specific cards
        } else if(this._mediaInit) {
          // console.log("this._li.classList.contains(is-selected .................................... "+this._li.classList.contains("is-selected"))
          this.dispatchEvent(new CustomEvent("ctrl-select", { detail: { element: this, id: this.cardObj.id, isSelected: this._li.classList.contains("is-selected") } })); //user is clicking specific cards
        }
      }

      if (this._li.classList.contains("is-selected") && !this._multiSelectionToggle && !this._mediaInit && !this._sectionInit) {
        this._deselectedCardAndPanel();
      } else if (!this._multiSelectionToggle && !this._mediaInit && !this._sectionInit) {
        this._selectedCardAndPanel();
      } else {
        this.cardClickEvent(false);
      }
    }
  }

  _unselectOpen() {
    const cardId = this.panelContainer._panelTop._panel.getAttribute("selected-id");

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
    this.cardClickEvent(true);
    this.annotationEvent("open-annotation");
    this._li.classList.add("is-selected");
  }

  cardClickEvent(openFlag = false) {
    // Send event to panel to hide the localization canvas & title
    let cardClickEvent = new CustomEvent("card-click", { detail: { openFlag, cardObj: this.cardObj } });
    this.dispatchEvent(cardClickEvent);
  }

  annotationEvent(evtName) {
    // Send event to panel to hide the localization
    let annotationEvent = new CustomEvent(evtName, { detail: { cardObj: this.cardObj } });
    this.panelContainer.dispatchEvent(annotationEvent);
  }

  contextMenuHandler(e) {
    if (e.ctrlKey && !this._mediaInit) {
      // console.log("Card was clicked with ctrl");
      this._multiSelectionToggle = true;
      e.preventDefault(); // stop contextmenu
      // this.togglePanel(e);
      this.dispatchEvent(new CustomEvent("ctrl-select", { detail: { element: this, id: this.cardObj.id, isSelected: this._li.classList.contains("is-selected") } })); //user is clicking specific cards
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
      path.setAttribute("d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z");
      svg.appendChild(path);

      const context = document.createElement("div");
      context.setAttribute("class", "more d-flex flex-column f2 px-3 py-2 lh-condensed");
      context.style.display = "none";
      this._shadow.appendChild(context);

      const toggle = document.createElement("toggle-button");
      if (this._section.visible) {
        toggle.setAttribute("text", "Archive folder");
      } else {
        toggle.setAttribute("text", "Restore folder");
      }
      context.appendChild(toggle);

      toggle.addEventListener("click", evt => {
        this._section.visible = !this._section.visible;
        const sectionId = Number();
        fetch(`/rest/Section/${this._section.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "visible": this._section.visible,
          })
        })
          .then(response => {
            if (this._section.visible) {
              toggle.setAttribute("text", "Archive folder");
            } else {
              toggle.setAttribute("text", "Restore folder");
            }
            this.dispatchEvent(new CustomEvent("visibilityChange", {
              detail: { section: this._section }
            }));
          });
      });

      this.addEventListener("contextmenu", evt => {
        evt.preventDefault();
        context.style.display = "block";
      });

      window.addEventListener("click", evt => {
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
    } else if (sectionType == "bookmark") {
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z");
      svg.appendChild(path);
      this._link.setAttribute("href", section.uri);

      // Set up bookmark management controls.
      const input = document.createElement("input");
      input.setAttribute("class", "form-control input-sm f1");
      input.style.display = "none";
      this._link.appendChild(input);

      const context = document.createElement("div");
      context.setAttribute("class", "more d-flex flex-column f2 px-3 py-2 lh-condensed");
      context.style.display = "none";
      this._shadow.appendChild(context);

      const rename = document.createElement("rename-button");
      rename.setAttribute("text", "Rename");
      context.appendChild(rename);

      const remove = document.createElement("delete-button");
      remove.init("Delete");
      context.appendChild(remove);

      this._link.addEventListener("contextmenu", evt => {
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
          this._title.textContent = evt.target.value;
          this._link.style.pointerEvents = "";
          this._section.name = evt.target.value;
          fetchRetry("/rest/Bookmark/" + this._section.id, {
            method: "PATCH",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ "name": evt.target.value }),
          });
        }
        input.style.display = "none";
        this._title.style.display = "block";
      });

      remove.addEventListener("click", () => {
        this.parentNode.removeChild(this);
        fetchRetry("/rest/Bookmark/" + this._section.id, {
          method: "DELETE",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
        });
      });

      window.addEventListener("click", evt => {
        context.style.display = "none";
      });
    }
  }

}

customElements.define("entity-card", EntityCard);  
