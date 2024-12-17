import { TatorPage } from "../components/tator-page.js";
import { hasPermission } from "../util/has-permission.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { store } from "./store.js";
import { SectionData } from "../util/section-utilities.js";

/**
 * Main uploads page
 */
export class UploadPage extends TatorPage {
	constructor() {
		super();
		this._uploadsInProgress = 0;

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

		this._breadcrumb = document.createElement("div");
		this._breadcrumb.setAttribute("class", "d-flex flex-items-center");
		utilitiesDiv.before(this._breadcrumb);

		// Wrapper to allow r.side bar to slide into left
		this.mainWrapper = document.createElement("div");
		this.mainWrapper.setAttribute("class", "analysis--main--wrapper d-flex");
		this.mainWrapper.style.minHeight = "calc(100vh - 62px)";
		this._shadow.appendChild(this.mainWrapper);

		//
		// Left area of the page
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

		this._projectText = document.createTextNode("");
		this._projectText.nodeValue = "Upload Media";
		h1.appendChild(this._projectText);

		this._description = document.createElement("project-text");
		this._description.setAttribute("class", "text-gray f2 py-3");
		this._description.textContent = `Add files and folders to your project.`;
		headerWrapperDiv.appendChild(this._description);

		const subheader = document.createElement("div");
		subheader.setAttribute("class", "d-flex flex-justify-right");
		this._mainSection.appendChild(subheader);

		
		this._dropZone = document.createElement("div");
		this._dropZone.setAttribute("draggable", "true");
		this._dropZone.setAttribute("class", "f2 d-flex flex-column text-gray my-6 px-3 py-3 rounded-3 text-center drop-zone");
		this._dropZone.innerHTML = `Drag and drop files and folders you want to upload here, or choose Add files or Add folder.`;
		this._mainSection.appendChild(this._dropZone);


		this._dropArea = document.createElement("drop-upload");
		this._mainSection.appendChild(this._dropArea);

		const destination = document.createElement("div");
		destination.setAttribute("class", "my-6 px-3 py-3 rounded-3 d-flex flex-wrap");
		destination.setAttribute("style", "border: 1px solid #ccc;");
		this._mainSection.appendChild(destination);

		const destTitle = document.createElement("div");
		destTitle.textContent = "Destination";
		destTitle.setAttribute("class", "col-3 h3");
		destination.appendChild(destTitle);

		this._destinationPicker = document.createElement("enum-input");
		this._destinationPicker.classList.add("col-8");
		this._destinationPicker.setAttribute("name", "Folder");
		destination.appendChild(this._destinationPicker);

		this._destinationPicker.addEventListener("change", this._dropArea.updateDestination.bind(this._dropArea));


		this._bottomSection = document.createElement("div");
		this._bottomSection.setAttribute("class", "d-flex flex-justify-right my-6 px-3 py-3 rounded-3");
		this._mainSection.appendChild(this._bottomSection);


		this._cancelUpload = document.createElement("a");
		this._cancelUpload.setAttribute("class", "py-3 f2 px-3 text-gray clickable mr-3");
		this._cancelUpload.textContent = "Cancel";
		this._cancelUpload.addEventListener("click", this._dropArea._resetUpload.bind(this._dropArea));
		this._bottomSection.appendChild(this._cancelUpload);

		this._uploadButton = document.createElement("button");
		this._uploadButton.setAttribute("class", "btn btn-clear btn-primary f2");
		this._uploadButton.textContent = "Upload";
		this._uploadButton.disabled = true;	
		// this._uploadButton.addEventListener("click", () => {
		// 	this._dropArea.upload();
		// });
		this._bottomSection.appendChild(this._uploadButton);


		this._sectionData = new SectionData();
		this._dropArea._sectionData = this._sectionData;

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


		this._dropArea.addEventListener("upload-summary", (evt) => {
			this._uploadButton.disabled = !evt.detail.ok || evt.detail.data.length === 0;
		});

		
		this._lastQuery = null;

		this._uploadDialog = document.createElement("upload-dialog");
		this._shadow.appendChild(this._uploadDialog);

		this._uploadDialog.addEventListener("cancel", (evt) => {
			store.getState().uploadCancel();
			this.removeAttribute("has-open-modal");
		});

		this._uploadDialog.addEventListener("close", (evt) => {
			this.removeAttribute("has-open-modal");
		});
		this._uploadDialog.init(store);

		//
		this._setupDragAndDrop();

		//
		this._uploadDialog.addEventListener("open", this.showDimmer.bind(this));
		this._uploadDialog.addEventListener("close", this.hideDimmer.bind(this));
	}

	connectedCallback() {
		this.setAttribute(
			"project-id",
			Number(window.location.pathname.split("/")[1])
		);
		// Initialize store data
		store.getState().init();
		// this._uploadDialog.init(store);
	}

	static get observedAttributes() {
		return ["project-id", "token"].concat(TatorPage.observedAttributes);
	}

	_notify(title, message, error_or_ok) {
		this.modalNotify.init(title, message, error_or_ok);
		this.modalNotify.setAttribute("is-open", "");
		this.setAttribute("has-open-modal", "");
	}

	_init() {
		const projectId = this.getAttribute("project-id");
		this._projectId = projectId;

		// Get info about the project.
		const projectPromise = fetchCredentials("/rest/Project/" + projectId);
		const sectionPromise = fetchCredentials("/rest/Sections/" + projectId);
		const algoPromise = fetchCredentials("/rest/Algorithms/" + projectId);
		const mediaTypePromise = fetchCredentials("/rest/MediaTypes/" + projectId);
		const membershipPromise = fetchCredentials(
			"/rest/Memberships/" + projectId
		);

		// Run all above promises
		Promise.all([
			projectPromise,
			sectionPromise,
			algoPromise,
			mediaTypePromise,
			membershipPromise,
		])
			.then(
				([
					projectResponse,
					sectionResponse,
					algoResponse,
					mediaTypeResponse,
					membershipResponse,
				]) => {
					const projectData = projectResponse.json();
					const sectionData = sectionResponse.json();
					const algoData = algoResponse.json();
					const mediaTypeData = mediaTypeResponse.json();
					const membershipData = membershipResponse.json();

					Promise.all([
						projectData,
						sectionData,
						algoData,
						mediaTypeData,
						membershipData,
					])
						.then(
							async ([project, sections, algos, mediaTypes, memberships]) => {
								// Save retrieved REST data
								this._project = project;
								this._sections = sections;
								this._algorithms = this.getParsedAlgos(algos);
								this._mediaTypes = mediaTypes;
								this._memberships = memberships;
								this.setupSettingsPanel(this._mediaTypes);

								store.setState({ sections: this._sections });

								// Set page breadcrumbs
								this._breadcrumb.innerHTML = `<div class="annotation__breadcrumbs d-flex flex-items-center px-2 f3 text-gray">
                  <a class="text-gray" href="/${this._project.id}/project-detail">${this._project.name}</a>
                  <chevron-right class="px-2"></chevron-right>
                  <a class="text-gray">Upload Media</a>
                </div>`;

								// Hide the settings button if the user does not have full control
								if (!hasPermission(this._project.permission, "Full Control")) {
									// TODO
								}

								// Initialize folder/search/bookmark data
								this._sectionData.init(this._sections);

								// Fill in the left panel area with section information
								this._noneText = "-- None --";
								this._destinationPicker.choices = [{
									value: this._noneText,
									label: this._noneText,
								}, ...this._sections.map((section) => {
									return {
										value: section.id,
										label: section.name,
									};
								})];
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

	getParsedAlgos(algos) {
		// Hide algorithms if needed from the project detail page.
		// There are a standard list of algorithm names to hide as well as categories
		var hiddenAlgos = ["tator_extend_track", "tator_fill_track_gaps"];

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

		return parsedAlgos;
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

	/**
	 * @param {string} width
	 *  e.g. "400px";
	 */
	setLeftPanelWidth(width) {
		this._leftPanel.style.minWidth = width;
		this._leftPanel.style.maxWidth = width;
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
		this._leftPanel.style.maxWidth = "450px";
		this._leftPanel.style.backgroundColor = "#0d1320";
		this.mainWrapper.appendChild(this._leftPanel);

		this._settingsPanel = document.createElement("section");
		this._settingsPanel.setAttribute(
			"class",
			"py-3 mr-3 ml-3 text-gray flex-grow"
		);
		this._leftPanel.appendChild(this._settingsPanel);
		this.setupSettingsPanel();

		this._leftPanelDefaultWidth = "450px";
		this.setLeftPanelWidth(this._leftPanelDefaultWidth);
		this._leftPanel.style.display = "flex";
		this._sidebarLibraryText.addEventListener("click", () => {
			this._leftPanel.style.display = this._leftPanel.style.display === "flex" ? "none" : "flex";
			this._sidebarLibraryText.innerText = this._leftPanel.style.display === "flex" ? "Hide Media Types" : "Show Media Types";
		});
	}

	setupSettingsPanel(mediaTypes) {
		if (mediaTypes !== undefined) {
			const h3 = document.createElement("h3");
			h3.setAttribute("class", "h2 text-light-gray");
			h3.textContent = "Media Types";
			this._settingsPanel.appendChild(h3);
      
      const description = document.createElement("p");
			description.setAttribute("class", "text-gray f2 py-3");
			description.textContent = `Specify the data type you are uploading, and any additional metadata to be set on upload.`;
			this._settingsPanel.appendChild(description);

			const settings = document.createElement("div");
			settings.setAttribute("class", "d-flex flex-column");
			this._settingsPanel.appendChild(settings);

			const mediaTypeSettings = document.createElement("media-type-settings");
			mediaTypeSettings.setAttribute("class", "d-flex flex-column");
			mediaTypeSettings.mediaTypes = mediaTypes;
			settings.appendChild(mediaTypeSettings);
		}
	}

	createSidebarNav() {
		var sidebarDiv = document.createElement("div");
		sidebarDiv.setAttribute(
			"class",
			"project-sidebar d-flex flex-items-center flex-column"
		);
		this.mainWrapper.appendChild(sidebarDiv);

		// this._sidebarLibraryButton = document.createElement("button");
		// this._sidebarLibraryButton.setAttribute(
		// 	"class",
		// 	"mt-2 btn-clear d-flex flex-items-center flex-column flex-justify-center px-2 py-2 rounded-2 f2 text-gray entity__button project-sidebar-button tooltip-right"
		// );
		// this._sidebarLibraryButton.innerHTML = `
    //   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="no-fill">
    //     <path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 4h3l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2" /><path d="M17 17v2a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h2" />
    //   </svg>
    // `;
		// sidebarDiv.appendChild(this._sidebarLibraryButton);

		this._sidebarLibraryText = document.createElement("div");
		this._sidebarLibraryText.setAttribute(
			"class",
			"f3 text-gray pb-2 pt-1 text-center mb-2 clickable"
		);
		this._sidebarLibraryText.textContent = "Hide Media Types";
		sidebarDiv.appendChild(this._sidebarLibraryText);

		
	}

  _setupDragAndDrop() {
    this._mainSection.addEventListener("dragstart", (startEvt) => {
      startEvt.dataTransfer.effectAllowed = "move";
    });

    this._mainSection.addEventListener("dragenter", (event) => {
      this._dropZone.classList.add("drag-over");
    });

    this._mainSection.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    this._mainSection.addEventListener("dragend", (event) => {
      this._dropZone.classList.remove("drag-over");
    });

    this._mainSection.addEventListener("dragleave", (event) => {
      this._dropZone.classList.remove("drag-over");
    });

    this._mainSection.addEventListener("drop", (event) => {
      event.stopPropagation();
      event.preventDefault();
			this._dropZone.classList.remove("drag-over");
			// this._dropArea.drop(event);

			
			const list = [...event.dataTransfer.items].map(async (item) => {
				if (item.getAsFileSystemHandle) {
					return item.getAsFileSystemHandle();
				} else {
					let handle = null;

					// From inside an async method or JS module
					if (item.webkitGetAsEntry) {
						handle = item.webkitGetAsEntry();
					} else if (item.getAsEntry) {
						handle = item.getAsEntry();
					}

					if (handle && handle.kind === "directory") {
						await this.addDirectory(handle);

						// this._notAcceptableDialog.show();
					} else if (handle) {
						const fileHandle = await this.getFileSafari(handle);

						return fileHandle;
					} else {
						console.error("Wasn't able to generate handle");
					}
				}
			});

			console.log("DRAG OVER", event, list);
			this._dropArea.dropHandler(list);
      return false;
    });
  }

}

customElements.define("upload-page", UploadPage);
