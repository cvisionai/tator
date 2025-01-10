import { TatorElement } from "./tator-element.js";
import { v1 as uuidv1 } from "../../../node_modules/uuid/dist/esm-browser/index.js";
import { uploadMedia } from "../../../../scripts/packages/tator-js/src/utils/upload-media.js";

export class UploadElement extends TatorElement {
	constructor() {
		super();
		this._ftDisabled = "File type disabled";
		this._skippedReason = "";
		this._haveNewSection = false;
		this._abortController = new AbortController();
		this._cancel = false;
		this._lastSection = null;
		this._chosenSection = null;
		this._chosenMediaType = null;
		this._uploadAttributes = {};

		this._acceptedImageExt = [
			".tiff",
			".tif",
			".bmp",
			".jpe",
			".jpg",
			".jpeg",
			".png",
			".gif",
			".avif",
			".heic",
			".heif",
		];
		this._acceptedVideoExt = [
			".mp4",
			".avi",
			".3gp",
			".ogg",
			".wmv",
			".webm",
			".flv",
			".mkv",
			".mov",
			".mts",
			".m4v",
			".mpg",
			".mp2",
			".mpeg",
			".mpe",
			".mpv",
			".m4p",
			".qt",
			".swf",
			".avchd",
			".ts",
		];
	}

	init(store) {
		this._store = store;
		store.subscribe(
			(state) => state.uploadCancelled,
			(cancelled) => {
				if (cancelled) {
					// Cancel next uploads.
					this._cancel = true;
					// Abort uploads in progress.
					this._abortController.abort();
				} else {
					this._cancel = false;
				}
			}
		);
	}
}
