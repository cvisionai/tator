import UploadEntry from "./_entry.js";

// Declaration
export default class UploadFolder extends UploadEntry {
	constructor(entryObject) {
		super(...Object.values(entryObject));
	}
}
