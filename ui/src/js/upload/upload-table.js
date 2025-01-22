import { TatorElement } from "../components/tator-element.js";
import { formatBytesOutput } from "../util/bytes-formatter.js";

export class UploadTable extends TatorElement {
	constructor() {
		super();
		this._uploadData = [];
		this._project = null;
		this._mediaType = null;

		this._summaryTable = document.createElement("table");
		this._summaryTable.setAttribute(
			"class",
			"col-12 file-table upload-table pb-6 mb-6"
		);
		this._shadow.appendChild(this._summaryTable);

		this._headerMap = new Map();
		this._headerMap
			// .set("", "")
			// .set("select", this._allSelectedText)
			.set("name", "Path")
			.set("size", "Size")
			.set("type", "Type")
			.set("note", "Note");
	}

	set uploadData(upload) {
		this._uploadData = upload;
		this._createTable();
	}

	_createHeader() {
		const header = this._summaryTable.createTHead();
		const headerRow = header.insertRow();
		this._headerMap.forEach((value, key) => {
			const cell = headerRow.insertCell();
			cell.textContent = value;
			if (key == "select") {
				cell.classList.add("text-center", "text-underline", "clickable", "f3");
			} else {
				cell.addEventListener("click", (evt) => {
					this._sortTable(key, this._direction);
				});
			}
		});
	}

	_createTable() {
		// Upload > list

		this._checkboxMap = new Map();

		this._summaryTable.innerHTML = "";
		this._createHeader();
		const body = this._summaryTable.createTBody();
		const pageData = this._uploadData ? this._uploadData : [];
		this.dispatchEvent(
			new CustomEvent("upload-summary", {
				detail: {
					data: pageData,
					ok: true, // TODO: Check if there are any errors
				},
			})
		);

		if (pageData && pageData.length > 0) {
			pageData.forEach((row, index) => {
				const tr = body.insertRow();
				tr.dataset.info = JSON.stringify(row);
				this._headerMap.forEach((value, key) => {
					const cell = tr.insertCell();
					if (key == "name") {
						cell.classList.add("wide");
					}
					if (key == "name") {
						const reducedName = `${this._sectionData.getSectionPath({
								name: row.name,
							})}`,
							sectionPath =
								row.parent && row.parent !== ""
									? this._sectionData
											.getSectionNamesLineage({ path: row.parent })
											.join(" > ")
									: "";
						if (row.type === "folder") {
							cell.innerHTML = `<span><svg class="no-fill mr-2" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 19h-7a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v3.5"></path><path d="M16 19h6"></path><path d="M19 16v6"></path>
              </svg></span>`;
						}

						cell.innerHTML += `${sectionPath}<span class="text-bold">${reducedName}</span>`;
					} else if (key == "select") {
						if (row.invalid_skip) {
							cell.classList.add("text-center", "f3", "clickable");
							cell.addEventListener("click", (evt) => {
								tr.remove();
								this._removeEntry(row);
							});
							cell.textContent = "X";
							this._checkboxMap.set(index, null);
						} else {
							const input = document.createElement("checkbox-input");
							input.label.setAttribute("class", "text-center");

							cell.addEventListener("click", (evt) => {
								input.click();
							});
							input.addEventListener(
								"change",
								this._calculateSelected.bind(this)
							);
							cell.appendChild(input);
							this._checkboxMap.set(index, input);
						}
					} else if (key == "size" && row.type === "folder") {
						cell.textContent = "--";
					} else if (key == "size") {
						cell.textContent = formatBytesOutput(row.size);
					} else if (
						key == "lastrow" &&
						row?.note &&
						row?.note?.indexOf("exists") > -1
					) {
						cell.classList.add("text-center", "f3", "clickable", "text-gray");

						const renameAction = document.createElement("span");
						renameAction.innerHTML = `Rename <br/><br/><br/>`;
						// renameAction.addEventListener("click", (evt) => {
						// 	tr.remove();
						// 	this._currentUpload.updateEntry({ index: index });
						// 	this._checkIdempotency();
						// });
						cell.appendChild(renameAction);

						const removeAction = document.createElement("span");
						removeAction.textContent = "Remove";
						removeAction.addEventListener("click", (evt) => {
							tr.remove();
							this._removeEntry(row);
						});
						cell.appendChild(removeAction);
					} else if (key == "lastrow") {
						cell.classList.add("text-center", "f3", "clickable", "text-gray");
						cell.addEventListener("click", (evt) => {
							tr.remove();
							this._removeEntry(row);
						});
						cell.textContent = "Remove";
					} else {
						cell.innerHTML = row[key];

						if (key == "note") {
							if (row.invalid_skip) tr.classList.add("text-gray");
						}
					}
				});
			});
		}
	}
}

customElements.define("upload-table", UploadTable);
