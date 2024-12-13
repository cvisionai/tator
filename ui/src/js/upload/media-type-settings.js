import { TatorElement } from "../components/tator-element.js";

export class MediaTypeSettings extends TatorElement {
	constructor() {
		super();
	}

	set mediaTypes(val) {
		this._mediaTypes = val;
		this._render();
	}

	_render() {
		this._dtypeMap = new Map();
		if (this._mediaTypes && this._mediaTypes.length > 0) {
			for (let m of this._mediaTypes) {
				const array = this._dtypeMap.has(m.dtype)
					? this._dtypeMap.get(m.dtype)
					: [];
				array.push(m);
				this._dtypeMap.set(m.dtype, array);
			}
		}

		for (let [t, list] of this._dtypeMap) {
			this._createSection(t, list);
		}
	}

	_createSection(dataType, list) {
		const div = document.createElement("div");
		div.setAttribute(
			"class",
			"form-group bg-charcoal my-3 py-3 px-3 rounded-3 d-flex "
		);
		this._shadow.appendChild(div);

		const dataTypeDisplay =
			dataType.charAt(0).toUpperCase() + dataType.slice(1) + "s";

		const input = document.createElement("checkbox-input");
		input.classList.add("col-10");
		input.setAttribute("name", `Include ${dataTypeDisplay}`);
		input.styleSpan.classList.add("px-3");
		input.styleSpan.classList.remove("px-1");
		input.checked = true;
		div.appendChild(input);

		const drawer = document.createElement("div");
		drawer.setAttribute(
			"class",
			"form-group bg-light-charcoal my-3 px-3 rounded=3"
		);
		this._shadow.appendChild(drawer);

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
		});

		const topSmall = document.createElement("div");
		topSmall.setAttribute("class", "text-center col-2 pb-1");
		div.appendChild(topSmall);

		const showLess = document.createElement("span");
		showLess.setAttribute("class", "text-underline f3");
		showLess.textContent = "Show Less";

		topSmall.appendChild(showLess);

		const showMore = document.createElement("span");
		showMore.setAttribute("class", "text-underline f3");
		showMore.textContent = "Show More";
		showMore.style.display = "none";
		topSmall.appendChild(showMore);
	}
}

customElements.define("media-type-settings", MediaTypeSettings);
