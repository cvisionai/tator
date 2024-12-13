// import { TatorElement } from "../components/tator-element.js";
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
		this._description.textContent = `Add the files and folders you want to upload to your project. To upload files larger than ***GB, use tator-py, or contact us. Learn more.`;
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

		// this._uploadDialog = document.createElement("upload-dialog");
		// this._projects.appendChild(this._uploadDialog);

		// this._attachmentDialog = document.createElement("attachment-dialog");
		// this._attachmentDialog._header.classList.add("fixed-height-scroll");
		// this._projects.appendChild(this._attachmentDialog);

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

		// this._cancelJob.addEventListener("confirmGroupCancel", () => {
		// 	this._cancelJob.removeAttribute("is-open");
		// });

		// this._cancelJob.addEventListener("close", () => {
		// 	this.removeAttribute("has-open-modal");
		// });

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
		store.setState({ selectedSection: this._selectedSection });
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
		for (let [panelName, parts] of this._panelPartMap) {
			parts[0].setAttribute("tooltip", `Open ${panelName} panel`);
		}
	}

	/**
	 * @param {string} panel
	 *   "library" | "saved searches" | "bookmarks" | "upload"
	 */
	displayPanel(panel) {
		this._currentPanel = panel;

		if (panel == "library") {
			if (this._viewAdvancedFolderDetails) {
				this.setLeftPanelWidth("500px");
			} else {
				this.setLeftPanelWidth(this._leftPanelDefaultWidth);
			}
		} else if (panel == "saved searches") {
			if (this._viewAdvancedSearchDetails) {
				this.setLeftPanelWidth("500px");
			} else {
				this.setLeftPanelWidth(this._leftPanelDefaultWidth);
			}
		} else if (panel == "bookmarks" || panel == "upload") {
			this.setLeftPanelWidth(this._leftPanelDefaultWidth);
		}

		for (let [panelName, parts] of this._panelPartMap) {
			if (panel === panelName) {
				parts[0].classList.add("btn-purple50");
				parts[1].classList.add("text-white");
				parts[1].classList.remove("text-gray");
				parts[2].style.display = "block";

				parts[0].setAttribute("tooltip", `Hide ${panel} panel`);
			} else {
				parts[0].classList.remove("btn-purple50");
				parts[1].classList.remove("text-white");
				parts[1].classList.add("text-gray");
				parts[2].style.display = "none";
				parts[0].setAttribute("tooltip", `Open ${panel} panel`);
			}
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

		this._sidebarLibraryButton.addEventListener(
			"click",
			this._sectionHandler.bind(this, "library")
		);
		this._sidebarLibraryText.addEventListener(
			"click",
			this._sectionHandler.bind(this, "library")
		);
		this._sidebarSavedSearchesButton.addEventListener(
			"click",
			this._sectionHandler.bind(this, "saved searches")
		);
		this._sidebarSavedSearchesText.addEventListener(
			"click",
			this._sectionHandler.bind(this, "saved searches")
		);
		this._sidebarBookmarksButton.addEventListener(
			"click",
			this._sectionHandler.bind(this, "bookmarks")
		);
		this._sidebarBookmarksText.addEventListener(
			"click",
			this._sectionHandler.bind(this, "bookmarks")
		);
	}

	_sectionHandler(panelName, evt) {
		evt.currentTarget.blur();
		if (!this.leftPanelHidden() && this._currentPanel == panelName) {
			this.hideLeftPanel();
		} else {
			this.expandLeftPanel();
			this.displayPanel(panelName);
		}
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

		// TODO setup upload settings panel
		// this.setupLibraryPanel();

		this._leftPanelDefaultWidth = "400px";
		this.setLeftPanelWidth(this._leftPanelDefaultWidth);

		// button, text, panel
		this._panelPartMap = new Map();
		this._panelPartMap
			.set("library", [
				this._sidebarLibraryButton,
				this._sidebarLibraryText,
				this._panelLibrary,
			])
			.set("saved searches", [
				this._sidebarSavedSearchesButton,
				this._sidebarSavedSearchesText,
				this._panelSavedSearches,
			])
			.set("bookmarks", [
				this._sidebarBookmarksButton,
				this._sidebarBookmarksText,
				this._panelBookmarks,
			]);

		this._currentPanel = "library";
		this.displayPanel("library");
	}
}

customElements.define("upload-page", UploadPage);
