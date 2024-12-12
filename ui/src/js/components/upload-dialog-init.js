import { ModalDialog } from "./modal-dialog.js";

export class UploadDialogInit extends ModalDialog {
	constructor() {
		super();

		this._typeAttributeMap = new Map();

		this._title.nodeValue = "Upload";
		this._modal.classList.add("fixed-height-scroll");

		this._form = document.createElement("form");
		this._form.setAttribute("class", "modal__form");
		this._main.appendChild(this._form);

		const formGroup2 = document.createElement("div");
		formGroup2.setAttribute("class", "form-group");
		this._form.appendChild(formGroup2);

		this._parentFolders = document.createElement("enum-input");
		this._parentFolders.setAttribute("class", "text-gray f2");
		this._parentFolders.setAttribute("name", " Folder:");
		formGroup2.appendChild(this._parentFolders);

		const details = document.createElement("details");
		// details.setAttribute("class", "hidden form-group pl-3");
		this._form.appendChild(details);

		this._helpText = document.createElement("summary");
		this._helpText.setAttribute(
			"class",
			"text-light-gray text-underline f2 clickable pt-3"
		);

		const closedText = `
		  <svg width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M9 6l6 6l-6 6"></path>
      </svg> Advanced
		`;

		const openText = `
		<svg transform="rotate(90)" width="14" height="14" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M9 6l6 6l-6 6"></path>
      </svg> Advanced
	`;

		this._helpText.innerHTML = closedText;

		details.addEventListener("toggle", (event) => {
			if (details.open) {
				/* the element was toggled open */
				this._helpText.innerHTML = openText;
			} else {
				/* the element was toggled closed */
				this._helpText.innerHTML = closedText;
			}
		});

		this._helpText0 = document.createElement("div");
		this._helpText0.setAttribute("class", "f3 text-gray py-3");
		this._helpText0.innerHTML = `
		  <p class="pb-2">Specify the media type (useful when multiple types are configured).</p>
			<p>Optionally, set an attribute value for this type during media creation.</p>
		`;
		details.appendChild(this._helpText0);

		details.appendChild(this._helpText);

		this._helpText2 = document.createElement("p");
		this._helpText2.setAttribute("class", "text-gray f2 py-2");
		this._helpText2.innerText = ``;
		details.appendChild(this._helpText2);

		this._mediaType = document.createElement("enum-input");
		this._mediaType.setAttribute("class", "text-gray f2");
		this._mediaType.setAttribute("name", "Media Type:");
		this._mediaType.permission = "View only";
		details.appendChild(this._mediaType);

		this._mediaAttributes = document.createElement("attribute-panel");
		this._mediaAttributes.enableBuiltInAttributes = false;
		this._mediaAttributes.enableHiddenAttributes = false;
		this._mediaAttributes._standardWidgetsDiv.style.display = "none";
		details.appendChild(this._mediaAttributes);

		const apply = document.createElement("button");
		apply.setAttribute("class", "btn btn-clear");
		apply.textContent = "Choose Files";
		this._footer.appendChild(apply);

		const cancel = document.createElement("button");
		cancel.setAttribute("class", "btn btn-clear btn-charcoal");
		cancel.textContent = "Cancel";
		this._footer.appendChild(cancel);

		cancel.addEventListener("click", this._closeCallback.bind(this));

		apply.addEventListener("click", () => {
			this._closeCallback();
			this.dispatchEvent(
				new CustomEvent("choose-files", {
					detail: {
						attributes: this._mediaAttributes.getValues(),
					},
				})
			);
		});

		// Data initialization
		this._noParentName = "-- None --";
		this._anyMediaType = "-- Default --";
		this._sectionData = null;
	}

	static get observedAttributes() {
		return ModalDialog.observedAttributes;
	}

	attributeChangedCallback(name, oldValue, newValue) {
		ModalDialog.prototype.attributeChangedCallback.call(
			this,
			name,
			oldValue,
			newValue
		);
		switch (name) {
			case "is-open":
				break;
		}
	}

	set mediaTypes(val) {
		this._mediaTypes = val;
		this._typeAttributeMap = new Map();

		this.setupTypeDropdown();
	}

	setupTypeDropdown() {
		const list = [];
		for (let t of this._mediaTypes) {
			if (["image", "video"].includes(t.dtype) && t.visible === true) {
				list.push({ value: t.id, label: `${t.name} (ID:${t.id})`, extra: t });
				this._typeAttributeMap.set(t.id, t);
			}
		}

		if (list && list.length > 0) {
			list.sort((a, b) => {
				if (a.label < b.label) {
					return -1;
				}
				if (a.label > b.label) {
					return 1;
				}
				return 0;
			});

			list.unshift({ value: this._anyMediaType, label: this._anyMediaType });

			this._mediaType.choices = list;
			this._mediaType.setValue(list[0].value);
		}

		// this._mediaType.addEventListener("change", (evt) => {
		// 	console.log("Change from dialog...", evt.target.getValue());

		// });

		if (list.length > 0) {
			this._mediaType.permission = "Can Edit";
		}

		return list.length > 1;
	}

	_clearAttributePanel() {
		this._mediaAttributes.dataType = null;
	}

	open() {
		this.setupData();
		this.setAttribute("is-open", "true");
	}

	setupData() {
		const searchParams = new URLSearchParams(window.location.search),
			selectedSection = searchParams.get("section"),
			choices = this._sectionData.getFolderEnumChoices();

		choices.unshift({ value: this._noParentName, label: this._noParentName });
		this._parentFolders.resetChoices();
		this._parentFolders.choices = choices;

		if (selectedSection) {
			this._parentFolders.setValue(selectedSection);
		} else {
			this._parentFolders.setValue(this._noParentName);
		}
	}
}

customElements.define("upload-dialog-init", UploadDialogInit);
