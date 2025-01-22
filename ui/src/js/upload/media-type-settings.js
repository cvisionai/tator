import { TatorElement } from "../components/tator-element.js";
import { store } from "./store.js";

export class MediaTypeSettings extends TatorElement {
	constructor() {
		super();

		this._availableTypes = ["video", "image", "file", "folder"];

		this._div = document.createElement("div");
		this._div.setAttribute("class", "col-12"); //px-3 py-3 rounded-3 my-3
		// this._div.setAttribute(
		// 	"style",
		// 	"border: 1px solid var(--color-charcoal--light);"
		// );
		this._shadow.appendChild(this._div);

		this._summary = document.createElement("div");
		this._summary.setAttribute(
			"class",
			"d-flex flex-justify-between flex-items-center"
		);
		this._div.appendChild(this._summary);

		// this._summaryTitle = document.createElement("div");
		// this._summaryTitle.innerHTML = `<span class="h3 mr-3">Properties</span>`;
		// this._summaryTitle.setAttribute("class", "col-10");
		// this._summary.appendChild(this._summaryTitle);

		// this._summaryText = document.createElement("div");
		// this._summaryText.textContent =
		// 	"Specify the data type you are uploading, and any additional metadata to be set on upload.";
		// this._summaryText.setAttribute("class", "py-2 text-gray f2");
		// this._summaryTitle.appendChild(this._summaryText);

		// this._clearAllInvalid = document.createElement("a");
		// this._clearAllInvalid.setAttribute(
		// 	"class",
		// 	"text-underline text-gray clickable f1 hover-text-white"
		// );
		// this._clearAllInvalid.textContent = "Reset to default values";
		// this._clearAllInvalid.addEventListener("click", this._render.bind(this));
		// this._summary.appendChild(this._clearAllInvalid);

		window.addEventListener("reset-to-default", this._render.bind(this));

		this._optionsDiv = document.createElement("div");
		// this._optionsDiv.setAttribute("class", "offset-lg-2 d-flex flex-wrap");
		this._div.appendChild(this._optionsDiv);
	}

	set mediaTypes(val) {
		this._mediaTypes = val;

		this._render();
	}

	_render() {
		this._optionsDiv.innerHTML = "";
		this._inputToSelectMap = new Map();
		this._inputToAttrMap = new Map();
		this._dtypeMap = new Map();
		if (this._mediaTypes && this._mediaTypes.length > 0) {
			for (let m of this._mediaTypes) {
				if (this._availableTypes.includes(m.dtype)) {
					const array = this._dtypeMap.has(m.dtype)
						? this._dtypeMap.get(m.dtype)
						: [];
					array.push(m);
					this._dtypeMap.set(m.dtype, array);
				}
			}
		}

		for (let [t, list] of this._dtypeMap) {
			this._createSection(t, list);
		}

		this.getValue();
	}

	getValue() {
		const inputs = Array.from(this._shadow.querySelectorAll("checkbox-input"));
		const mediaTypeSettings = [];
		for (let input of inputs) {
			const checked = input.getChecked();

			if (checked) {
				const dataType = input.getData().dataType;
				const mediaTypeValue = this._inputToSelectMap.get(dataType).getValue(),
					attributes = this._inputToAttrMap.get(dataType).getValues();

				const mediaType = this._mediaTypes.find(
					(m) => m.id === Number(mediaTypeValue)
				);
				mediaTypeSettings.push({
					dtype: dataType,
					mediaType: mediaType,
					attributes: attributes ? attributes : [],
				});
			}
		}
		console.log("Get media type settings value...", mediaTypeSettings);
		store.setState({ mediaTypeSettings });
		return mediaTypeSettings;
	}

	_createSection(dataType, list) {
		const div = document.createElement("div");
		div.setAttribute("class", "mb-3");
		this._optionsDiv.appendChild(div);

		const inner = document.createElement("div");
		inner.setAttribute("class", "bg-charcoal col-12 px-3 py-2 rounded-3");
		div.appendChild(inner);

		const innerTop = document.createElement("div");
		innerTop.setAttribute("class", "form-group d-flex flex-justify-between");
		inner.appendChild(innerTop);

		const dataTypeDisplay =
			dataType.charAt(0).toUpperCase() + dataType.slice(1);

		const input = document.createElement("checkbox-input");
		input.classList.add("col-10", "text-light-gray");
		input.setAttribute("name", `${dataTypeDisplay}s`);
		input.setAttribute(
			"tooltip",
			`Disable to ignore ${dataTypeDisplay}s chosen from your local file system.`
		);
		input.setValue({
			id: dataType,
			checked: true,
			data: { dataType: dataType },
		});
		input.styleSpan.classList.add("px-3");
		input.styleSpan.classList.remove("px-1");
		input._checked = true;
		innerTop.appendChild(input);

		const topSmall = document.createElement("div");
		topSmall.setAttribute("class", "text-center col-2 pb-1");
		innerTop.appendChild(topSmall);

		const drawer = document.createElement("div");
		drawer.setAttribute("class", "form-group mt-6");
		drawer.style.display = "none";
		inner.appendChild(drawer);

		const mediaTypeSelect = document.createElement("enum-input");
		mediaTypeSelect.setAttribute("name", `${dataTypeDisplay} Type`);
		drawer.appendChild(mediaTypeSelect);

		const options = list.map((m) => {
			return {
				value: m.id,
				label: m.name,
			};
		});

		mediaTypeSelect.choices = options;

		// const info = document.createElement("div");
		// info.classList.add("text-light-gray", "f1", "pt-6");
		// info.textContent = "Attributes:";
		// drawer.appendChild(info);

		const attributePanel = document.createElement("attribute-panel");
		attributePanel.enableBuiltInAttributes = false;
		attributePanel.enableHiddenAttributes = false;
		attributePanel._standardWidgetsDiv.style.display = "none";
		attributePanel.dataType = list[0];
		drawer.appendChild(attributePanel);

		mediaTypeSelect.addEventListener("change", (evt) => {
			attributePanel.reset();
			const id = Number(mediaTypeSelect.getValue());
			attributePanel.dataType = list.find((m) => m.id === id);
			this.getValue();
		});

		const optHide = "";
		const showLess = document.createElement("span");
		showLess.setAttribute("class", "clickable f3 " + optHide);
		showLess.setAttribute("tooltip", "Hide drawer");
		showLess.style.display = "none";
		showLess.textContent = "Less -";
		topSmall.appendChild(showLess);

		const showMore = document.createElement("span");
		showMore.setAttribute("class", "clickable f3");
		showMore.textContent = "More +";
		// showMore.style.display = "none";
		showMore.setAttribute(
			"tooltip",
			`Set attributes on media, or specify a registered ${dataTypeDisplay} Type.`
		);
		topSmall.appendChild(showMore);

		showMore.addEventListener(
			"click",
			this._openDrawer.bind(this, drawer, showMore, showLess)
		);
		showLess.addEventListener(
			"click",
			this._closeDrawer.bind(this, drawer, showMore, showLess)
		);

		input.addEventListener("change", () => {
			this.getValue();
			if (input.getChecked()) {
				this._openDrawer(drawer, showMore, showLess);
				input.classList.add("text-light-gray");
			} else {
				this._closeDrawer(drawer, showMore, showLess);
				showMore.style.display = "none";
				input.classList.remove("text-light-gray");
				input.setAttribute(
					"tooltip",
					`Enable to choose ${dataTypeDisplay}s from your local file system.`
				);
			}
			this.getValue();
		});

		this._inputToSelectMap.set(dataType, mediaTypeSelect);
		this._inputToAttrMap.set(dataType, attributePanel);
	}

	_openDrawer(drawer, showMore, showLess) {
		drawer.style.display = "block";
		showLess.style.display = "block";
		showLess.classList.remove("hidden");
		showMore.style.display = "none";
	}

	_closeDrawer(drawer, showMore, showLess) {
		drawer.style.display = "none";
		showLess.style.display = "none";
		showMore.style.display = "block";
	}
}

customElements.define("media-type-settings", MediaTypeSettings);
