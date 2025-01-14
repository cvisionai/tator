import { uploadMedia } from "../../../../../scripts/packages/tator-js/src/utils/upload-media.js";

// Declaration
export default class UploadEntry {
	constructor({
		file = null,
		mediaType = null,
		options = {},
		name = null,
		parent = null,
		destination = null,
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
		if (this.file?.name) return this.file.name.split(".").slice(-1).join(".");
		return "";
	}

	_isImage() {
		return this.ext.match(
			/(tiff|tif|bmp|jpe|jpg|jpeg|png|gif|avif|heic|heif)$/i
		);
	}

	_isVideo() {
		return this.ext.match(
			/(tiff|tif|bmp|jpe|jpg|jpeg|png|gif|avif|heic|heif)$/i
		);
	}

	_isArchive() {
		return this.ext.match(/^(zip|tar)/i);
	}

	async uploadEntry(idx, abortController) {
		this.abortController = abortController;
		console.log(`Uploading entry ${idx} - name: ${this.name} (${this.type})`);
		if (this._cancel) {
			throw `Creation of '${msg.name}' cancelled!`;
		}
		if (!this.file && this.type == "folder") {
			this._store.setState({
				uploadCurrentFile: msg.name,
			});
			console.log("Creating folder with these opts", msg);
			const folderCreated = await this._createFolder(msg);
			const completed = store.getState().uploadFoldersCompleted + 1;
			this._store.setState({
				uploadFoldersCompleted: completed,
			});
			// return folderCreated;
		} else {
			this._store.setState({
				uploadChunkProgress: 0,
				uploadCurrentFile: this.file.name,
			});

			const info = {
				...msg,
				section: null,
				section_id: null,
				name: msg.file.name,
			};
			const section = this._sections.find((s) => s.path == info.parent);
			console.log("Section", this._sections, section, info.parent);
			if (section) {
				info.section = section.name;
				info.section_id = section.id;
			}

			console.log("Uploading media with this opts", info);
			await uploadMedia(info.mediaType, info.file, info);
			const completed = store.getState().uploadFilesCompleted + 1;
			this._store.setState({
				uploadFilesCompleted: completed,
			});
		}

		const updated = [...store.getState().uploadInformation];

		updated[idx].status = "Success!";

		this._store.setState({
			uploadInformation: [...updated],
		});

		return true;
	}

	async _createFolder(msg) {
		try {
			let newPath = this._sectionData.getSectionPath(msg);
			if (msg.parent && msg.parent !== "" && msg.parent !== null) {
				newPath = `${msg.parent}.${newPath}`;
			}
			var spec = {
				name: msg.name,
				path: newPath,
				tator_user_sections: uuidv1(),
				visible: true,
			};
			var response = await fetchCredentials(
				`/rest/Sections/${this._projectId}`,
				{
					method: "POST",
					body: JSON.stringify(spec),
				}
			);

			if (response.status == 201) {
				var data = await response.json();

				const sections = await fetchCredentials(
					`/rest/Sections/${this._projectId}`
				);
				const sectionData = await sections.json();

				// Add the new section to the section list
				this._store().setState({
					sections: sectionData, // listener triggers update to sectionData util
				});

				// this.sections = sectionData;
			} else {
				var data = await response.json();
				console.error(data.message);
				store.setState({ uploadError: data.message });
			}
			return msg;
		} catch (err) {
			console.error(err);
			store.setState({ uploadError: err.message });
			return msg;
		}
	}
}
