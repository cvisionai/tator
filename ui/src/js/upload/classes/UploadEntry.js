import { uploadMedia } from "../../../../../scripts/packages/tator-js/src/utils/upload-media.js";
import { v1 as uuidv1 } from "uuid";
import { fetchCredentials } from "../../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

// Declaration
export default class UploadEntry {
	constructor({
		file = null,
		mediaType = null,
		options = {},
		name = null,
		parent = null,
		destination = null,
		path = "",
		type = null,
		invalid_skip = false,
		info_skip = false,
		i_checked = false,
		status = "",
		note = "",
		size = 0,
		store = null,
	}) {
		// Media only
		this.file = file;
		this.mediaType = mediaType;
		this.options = options;

		// all
		this.name = name; // file or folder name
		this.parent = parent; // (to be) newly created parent structure
		this.destination = destination; // base destination path
		this.type = type; // file mime type string or "folder"
		this.invalid_skip = invalid_skip; // won't be uploaded, thrown out / not in summary table?
		this.info_skip = info_skip; // won't be uploaded, but give user a chance to fix it // TODO: put these outside of table
		this.i_checked = i_checked; // skips recheck if nothing has changed, or if it is turned off
		this.status = status; // relevant during upload
		this.note = note; // relevant for upload summary (idem check results)
		this.size = size;
		this._store = store;

		// calculated
		this.ext = this.returnExt();
	}

	progressCallback(progress) {
		this._store.setState({ uploadChunkProgress: progress });
	}

	returnExt() {
		if (this.file?.name)
			return this.file.name.split(".").slice(-1).join(".").toLowerCase();
		return "";
	}

	_isImage() {
		if (!this.ext) {
			try {
				this.ext = this.returnExt();
			} catch (e) {
				console.error(e);
			}
		}
		const matches = String(this.ext).match(
			/(tiff|tif|bmp|jpe|jpg|jpeg|png|gif|avif|heic|heif)$/i
		);
		console.log(`THIS ${this.ext} matches??? ${matches}`);
		return matches;
	}

	_isVideo() {
		if (!this.ext) {
			try {
				this.ext = this.returnExt();
			} catch (e) {
				console.error(e);
			}
		}

		return this.ext.match(
			/(mp4|avi|3gp|ogg|wmv|webm|flv|mkv|mov|mts|m4v|mpg|mp2|mpeg|mpe|mpv|m4p|qt|swf|avchd|ts)$/i
		);
	}

	_isArchive() {
		if (!this.ext) {
			try {
				this.ext = this.returnExt();
			} catch (e) {
				console.error(e);
			}
		}
		return this.ext.match(/^(zip|tar)/i);
	}

	async uploadEntry(idx, abortController, gid) {
		this.abortController = abortController;

		console.log(`Uploading entry ${idx} - name: ${this.name} (${this.type})`);
		if (this._cancel) {
			throw `Creation of '${this.name}' cancelled!`;
		}
		if (!this.file && this.type == "folder") {
			this._store.setState({
				uploadCurrentFile: this.name,
			});
			console.log("Creating folder with these opts", this);
			const folderCreated = await this._createFolder();
			if (folderCreated) {
				const completed = this._store.getState().uploadFoldersCompleted + 1;
				this._store.setState({
					uploadFoldersCompleted: completed,
				});
			} else {
				// this.uploadError = "Error creating folder";
				// TODO: add error to store
				this.status = "Error: " + folderCreated;
			}

			// return folderCreated;
		} else {
			this._store.setState({
				uploadChunkProgress: 0,
				uploadCurrentFile: this.file.name,
			});

			const section = this._store.getState().sections
				? this._store.getState().sections.find((s) => s.path == this.parent)
				: null;
			this.section_id = this.section = section?.id ? section.id : null;
			/**
			 * Upload media w/ options
			 * https://github.com/cvisionai/tator-js/blob/main/src/utils/upload-media.js
			 */
			await uploadMedia(this.mediaType, this.file, {
				...this.options, // includes attributes
				section_id: section?.id ? section.id : null,
				section: section?.name ? section.name : null,
				filename: this.file.name,
				progressCallback: this.progressCallback.bind(this),
				gid: gid,
			});
			const completed = this._store.getState().uploadFilesCompleted + 1;
			this._store.setState({
				uploadFilesCompleted: completed,
			});
		}

		const updated = [...this._store.getState().uploadInformation];

		updated[idx].status = "Success!";

		this._store.setState({
			uploadInformation: [...updated],
		});

		return true;
	}

	async _createFolder(msg) {
		try {
			var spec = {
				name: this.name,
				path: this.path,
				tator_user_sections: uuidv1(),
				visible: true,
			};
			const projectId = this._store.getState().project.id;
			var response = await fetchCredentials(`/rest/Sections/${projectId}`, {
				method: "POST",
				body: JSON.stringify(spec),
			});

			if (response.status == 201) {
				var data = await response.json();

				const sections = await fetchCredentials(`/rest/Sections/${projectId}`);
				const sectionList = await sections.json();

				// Add the new section to the section list
				this._store.setState({
					sections: sectionList, // listener triggers update to sectionData util
				});
			} else {
				var data = await response.json();
				console.error(data.message);
				// this._store.setState({ uploadError: data.message });
				return data.message;
			}
			return msg;
		} catch (err) {
			console.error(err);
			// this._store.setState({ uploadError: err.message });
			return err;
		}
	}
}
