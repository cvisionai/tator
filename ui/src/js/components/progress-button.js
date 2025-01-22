import { TatorElement } from "../components/tator-element.js";

export class ProgressButton extends TatorElement {
	constructor() {
		super();

		this.btn = document.createElement("button");
		this.btn.setAttribute("id", "btn-progress-outer");
		this.btn.disabled = true;
		this._shadow.appendChild(this.btn);

		this.btnText = document.createElement("span");
		this.btnText.setAttribute("class", "btn-progress-text");
		this.btn.appendChild(this.btnText);

		this.progress = document.createElement("span");
		this.progress.setAttribute("class", "btn-progress-inner");
		this.btn.appendChild(this.progress);
	}

	set setText(val) {
		this._initText = val;
		this.btnText.textContent = val;
	}

	_progressCallback(percent) {
		console.log("Progress: ", percent);
		this.progress.hidden = percent === 0;

		this.progress.style.width = `${percent}%`;
		if (Math.floor(percent) === 100) {
			this.btnText.textContent = "Complete";
			setTimeout(() => {
				this.btn.disabled = false;
				this.progress.style.width = "0%";
				// this.progress.hidden = true;
				this.btnText.textContent = this._initText;
			}, 500);
		}
	}
}

customElements.define("progress-button", ProgressButton);
