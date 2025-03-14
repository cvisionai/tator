import { TatorPage } from "../components/tator-page.js";
import { hasPermission } from "../util/has-permission.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { store } from "./store.js";
import { SectionData } from "../util/section-utilities.js";

class LoadingInterface {
	constructor(dom) {
		this._loadingScreen = document.getElementById("loadingScreen");
		this._loadingScreenText = document.getElementById("loadingScreenText");
	}

	displayLoadingScreen(message) {
		this._loadingScreen.style.display = "block";
		this._loadingScreen.classList.add("has-open-modal");

		if (message) {
			this._loadingScreenText.innerHTML = `<div class="text-semibold d-flex flex-column">${message}</div>`;
		} else {
			this._loadingScreenText.innerHTML = `<div class="text-semibold">Loading...</div>`;
		}
	}

	hideLoadingScreen() {
		this._loadingScreen.classList.remove("has-open-modal");
		this._loadingScreen.style.display = "none";
	}
}

/**
 * Main uploads page
 */
export class UploadPage extends TatorPage {
	constructor() {
		super();

		this._loadingInterface = new LoadingInterface(this._shadow);
		this._loadingInterface.displayLoadingScreen();

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
		this._lightSpacer.style.width = "100%";
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
		this.mainWrapper.setAttribute(
			"class",
			"analysis--main--wrapper d-flex offset-xl-1 col-xl-10"
		);
		this.mainWrapper.style.minHeight = "calc(100vh + 300px)";
		this._shadow.appendChild(this.mainWrapper);

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

		// this._description = document.createElement("project-text");
		// this._description.setAttribute("class", "text-gray f2 pt-3");
		// this._description.innerHTML = `
		// Add files and folders to your project.
		// &nbsp;Recommended max browser upload size is 60GB, or 5000 files. For larger uploads try <a href="https://www.tator.io/docs/developer-guide/getting-started/install-tator-py" class="text-purple hover-text-underline" target="_blank">tator-py</a>`;
		// headerWrapperDiv.appendChild(this._description);

		this._upload = document.createElement("upload-element");
		this._upload._loadingInterface = this._loadingInterface;
		this._mainSection.appendChild(this._upload);

		this._bottomSection = document.createElement("div");
		this._bottomSection.setAttribute(
			"class",
			"d-flex flex-justify-center px-3 py-3 position-fixed bg-charcoal mt-3"
		);
		// this._bottomSection.style = "bottom: 0; position: fixed; width: 100%;";
		this._mainSection.appendChild(this._bottomSection);

		this._maximizeUpload = document.createElement("a");
		this._maximizeUpload.setAttribute(
			"class",
			"py-3 f2 px-3 text-gray clickable mr-3"
		);
		this._maximizeUpload.textContent = "View Upload Window";
		this._maximizeUpload.hidden = true;
		// this._maximizeUpload.addEventListener(
		// 	"click",
		// 	this._upload._resetUpload.bind(this._upload)
		// );
		this._bottomSection.appendChild(this._maximizeUpload);

		this._cancelUpload = document.createElement("a");
		this._cancelUpload.setAttribute(
			"class",
			"py-3 f2 px-3 text-gray clickable mr-3"
		);
		this._cancelUpload.textContent = "Cancel & Reset";
		this._cancelUpload.addEventListener(
			"click",
			this._upload._resetUpload.bind(this._upload)
		);
		this._bottomSection.appendChild(this._cancelUpload);

		this._progressButton = document.createElement("progress-button");
		this._uploadButton = this._progressButton.btn;
		this._uploadButton.setAttribute("class", "btn btn-clear btn-primary f2");
		this._progressButton.setText = "Upload";
		this._uploadButton.disabled = true;
		this._uploadButton.style.width = "500px";
		this._uploadButton.addEventListener("click", async () => {
			this._uploadDialog.setAttribute("is-open", "");
			await this._upload.upload();
			this._upload._resetUpload();
		});
		this._bottomSection.appendChild(this._progressButton);

		this._cancelIdemCheck = document.createElement("a");
		this._cancelIdemCheck.hidden = true;
		this._cancelIdemCheck.innerText = "Abort idempotency check";
		this._cancelIdemCheck.setAttribute(
			"class",
			"ml-3 my-3 text-center col-12 py-2"
		);
		this._cancelIdemCheck.addEventListener("click", (evt) => {
			evt.preventDefault();
			this._upload._abortIdemCheck();
		});
		this._shadow.appendChild(this._cancelIdemCheck);

		this._sectionData = new SectionData();
		this._upload.sectionData = this._sectionData;
		this._upload._progressButton = this._progressButton;

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

		this._upload.addEventListener("upload-summary", (evt) => {
			const valid = evt.detail.data.filter((item) => !item.skip);
			this._uploadButton.disabled = !(evt.detail.ok && valid.length > 0);
			this._cancelIdemCheck.hidden = !evt.detail.checkIdem;
			if (evt?.detail?.buttonText) {
				this._progressButton.setText = evt.detail.buttonText;
			}
		});

		this._lastQuery = null;

		this._uploadDialog = document.createElement("upload-dialog");
		this._shadow.appendChild(this._uploadDialog);

		this._uploadDialog.addEventListener("cancel", (evt) => {
			store.getState().uploadCancel();
			this.removeAttribute("has-open-modal");
		});

		this._maximizeUpload.addEventListener("click", (evt) => {
			evt.preventDefault();
			this._uploadDialog.setAttribute("is-open", "");
		});

		this._uploadDialog.addEventListener("close", (evt) => {
			this.removeAttribute("has-open-modal");
		});

		this._uploadDialog.init(store);

		//
		this._setupDragAndDrop();

		// Breadcrumb
		this._breadcrumbInner = document.createElement("div");
		this._breadcrumbInner.setAttribute(
			"class",
			"annotation__breadcrumbs d-flex flex-items-center px-2 f3 text-gray"
		);
		this._breadcrumb.appendChild(this._breadcrumbInner);

		this._breadcrumbProject = document.createElement("a");
		this._breadcrumbProject.setAttribute("class", "text-gray");
		this._breadcrumbInner.appendChild(this._breadcrumbProject);

		this._breadcrumbChevron = document.createElement("chevron-right");
		this._breadcrumbChevron.setAttribute("class", "px-2");
		this._breadcrumbInner.appendChild(this._breadcrumbChevron);

		this._breadcrumbSection = document.createElement("a");
		this._breadcrumbSection.setAttribute("class", "text-gray");
		this._breadcrumbInner.appendChild(this._breadcrumbSection);

		this._breadcrumbChevron2 = document.createElement("chevron-right");
		this._breadcrumbChevron2.setAttribute("class", "px-2 hidden");
		this._breadcrumbInner.appendChild(this._breadcrumbChevron2);

		this._breadcrumbEnd = document.createElement("span");
		this._breadcrumbEnd.setAttribute("class", "px-2");
		this._breadcrumbEnd.textContent = "Upload Media";
		this._breadcrumbInner.appendChild(this._breadcrumbEnd);

		this.invalidNotify = document.createElement("modal-notify");
		this._shadow.appendChild(this.invalidNotify);

		window.addEventListener("show-invalid-details", (evt) => {
			const skippedList = evt.detail.data;
			this._invalidTable = document.createElement("upload-table");
			this._invalidTable._sectionData = this._sectionData;
			this._invalidTable.setAttribute(
				"class",
				"col-12 file-table upload-table pb-6 mb-6"
			);
			this.invalidNotify._main.appendChild(this._invalidTable);
			this._invalidTable.uploadData = skippedList;

			this._notify(
				"Invalid Details",
				`Some files have invalid details. Please correct them and try again.`,
				"neutral"
			);
		});

		this._upload.addEventListener(
			"section-change",
			this._updateBreadcrumb.bind(this)
		);

		//
		this.invalidNotify.addEventListener("open", this.showDimmer.bind(this));
		this.invalidNotify.addEventListener("close", () => {
			this.hideDimmer();
		});

		this.invalidNotify._accept.innerHTML = "Close and Clear Invalid";
		this.invalidNotify._accept.addEventListener("click", (evt) => {
			evt.preventDefault();
			this.invalidNotify._closeCallback();
			this.hideDimmer();
			this.invalidNotify._main.innerHTML = "";
			this._upload._clearAllInvalidEntries(evt);
		});

		// updates the init of sectionData utility with the new sections list
		store.subscribe((state) => state.sections, this.newSectionsList.bind(this));
	}

	async connectedCallback() {
		this._projectId = Number(window.location.pathname.split("/")[1]);

		// Initialize store data
		const initInfo = await store.getState().init();
		console.log(initInfo);
		this._init(initInfo);
		this._uploadDialog.init(store);
		this._loadingInterface.hideLoadingScreen();
	}

	_notify(title, message, error_or_ok) {
		this.invalidNotify.init(title, message, error_or_ok, null, true);
		this.invalidNotify.setAttribute("is-open", "");
		this.setAttribute("has-open-modal", "");
	}

	_init({ project, sections, mediaTypes }) {
		// Inits project data
		this._project = project;
		this._projectId = project.id;

		// Inits sections data
		this._sections = sections;
		store.setState({ sections: this._sections });

		// Inits media type data
		this._mediaTypes = mediaTypes;
		this._upload.mediaTypes = this._mediaTypes;

		// Change the msg if the user does not have can transfer* todo confirm
		if (!hasPermission(this._project.permission, "Full Control")) {
			// TODO
		}

		// Set page breadcrumbs
		this._breadcrumbProject.textContent = this._project.name;
		this._breadcrumbProject.href = `/${this._project.id}/project-detail`;
	}

	newSectionsList(sections) {
		this._sections = sections;
		// Initialize folder/search/bookmark data
		this._sectionData.init(this._sections);
		this._upload.sections = this._sections;
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

		this._leftPanelDefaultWidth = "450px";
		this.setLeftPanelWidth(this._leftPanelDefaultWidth);
		this._leftPanel.style.display = "flex";
		this._sidebarLibraryText.addEventListener("click", () => {
			this._leftPanel.style.display =
				this._leftPanel.style.display === "flex" ? "none" : "flex";
			this._sidebarLibraryText.innerText =
				this._leftPanel.style.display === "flex"
					? "Hide Media Types"
					: "Show Media Types";
		});
	}

	createSidebarNav() {
		var sidebarDiv = document.createElement("div");
		sidebarDiv.setAttribute(
			"class",
			"project-sidebar d-flex flex-items-center flex-column"
		);
		this.mainWrapper.appendChild(sidebarDiv);

		this._sidebarLibraryText = document.createElement("div");
		this._sidebarLibraryText.setAttribute(
			"class",
			"f3 text-gray pb-2 pt-1 text-center mb-2 clickable"
		);
		this._sidebarLibraryText.textContent = "Hide Media Types";
		sidebarDiv.appendChild(this._sidebarLibraryText);
	}

	_setupDragAndDrop() {
		this.mainWrapper.addEventListener("dragstart", (startEvt) => {
			startEvt.dataTransfer.effectAllowed = "move";
		});

		this._mainSection.addEventListener("dragenter", (event) => {
			this._upload._dropZone.classList.add("drag-over");
		});

		this._mainSection.addEventListener("dragover", (event) => {
			event.preventDefault();
		});

		this._mainSection.addEventListener("dragend", (event) => {
			this._upload._dropZone.classList.remove("drag-over");
		});

		this._mainSection.addEventListener("dragleave", (event) => {
			this._upload._dropZone.classList.remove("drag-over");
		});

		this._mainSection.addEventListener("drop", (event) => {
			event.stopPropagation();
			event.preventDefault();
			this._upload._dropZone.classList.remove("drag-over");
			let handle = null;

			const list = [...event.dataTransfer.items].map(async (item) => {
				if (item.getAsFileSystemHandle) {
					handle = item.getAsFileSystemHandle();
					return handle;
				} else {
					if (item.webkitGetAsEntry) {
						handle = item.webkitGetAsEntry();
					} else if (item.getAsEntry) {
						handle = item.getAsEntry();
					}

					// if (handle && handle.kind === "directory") {
					// 	// await this.addDirectory(handle);
					// 	this.dropHandler(handle);
					// } else
					if (handle) {
						return handle;
					} else {
						console.error("Wasn't able to generate handle");
					}
				}
			});

			console.log("DRAG OVER", event, list);
			this._upload.fileHandleHandler(list);
			return false;
		});
	}

	_updateBreadcrumb(evt) {
		const chosenSection = evt?.detail?.section?.id ? evt.detail.section : null;

		if (chosenSection !== null && chosenSection?.id) {
			this._breadcrumbChevron2.classList.remove("hidden");
			this._breadcrumbSection.textContent = `${this._sectionData
				.getSectionNamesLineage(chosenSection)
				.join(" > ")}`;
			this._breadcrumbSection.href = `/${chosenSection.project}/project-detail?section=${chosenSection.id}`;
		} else {
			this._breadcrumbSection.textContent = "";
			this._breadcrumbChevron2.classList.add("hidden");
		}
	}
}

customElements.define("upload-page", UploadPage);
