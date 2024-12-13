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
		//
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

		this._projects = document.createElement("div");
		this._projects.setAttribute("class", "d-flex flex-justify-right");
		this._mainSection.appendChild(this._projects);

		this.modalNotify = document.createElement("modal-notify");
		this._projects.appendChild(this.modalNotify);

		this.modal = document.createElement("modal-dialog");
		this._projects.appendChild(this.modal);

		this._cancelJob = document.createElement("cancel-confirm");
		this._shadow.appendChild(this._cancelJob);

		this._modalError = document.createElement("modal-dialog");
		this._shadow.appendChild(this._modalError);

		this._sectionData = new SectionData();

		// Create store subscriptions
		store.subscribe((state) => state.user, this._setUser.bind(this));
		store.subscribe(
			(state) => state.announcements,
			this._setAnnouncements.bind(this)
		);

		window.addEventListener("beforeunload", (evt) => {
			if (this._uploadsInProgress > 0) {
				evt.preventDefault();
				evt.returnValue = "";
				window.alert("Uploads are in progress. Still leave?");
			}
		});

		this._modalError.addEventListener("close", () => {
			this._modalError.removeAttribute("is-open");
			this.removeAttribute("has-open-modal");
		});

		// this._uploadDialog.addEventListener("cancel", (evt) => {
		// 	store.getState().uploadCancel();
		// 	this.removeAttribute("has-open-modal");
		// });

		// this._uploadDialog.addEventListener("close", (evt) => {
		// 	this.removeAttribute("has-open-modal");
		// });

		// this._attachmentDialog.addEventListener("close", (evt) => {
		// 	this.removeAttribute("has-open-modal");
		// });

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
								// this.makeFolders();
								// this.displayPanel("library");
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
	}

	setupSettingsPanel(mediaTypes) {
		if (mediaTypes !== undefined) {
			const h3 = document.createElement("h3");
			h3.setAttribute("class", "h2 text-light-gray");
			h3.textContent = "Media Type Settings";
			this._settingsPanel.appendChild(h3);

			const settings = document.createElement("div");
			settings.setAttribute("class", "d-flex flex-column");
			this._settingsPanel.appendChild(settings);

			const mediaTypeSettings = document.createElement("media-type-settings");
			mediaTypeSettings.setAttribute("class", "d-flex flex-column");
			mediaTypeSettings.mediaTypes = mediaTypes;
			settings.appendChild(mediaTypeSettings);
		}
	}
}

customElements.define("upload-page", UploadPage);
