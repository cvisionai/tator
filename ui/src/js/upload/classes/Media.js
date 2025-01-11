import UploadEntry from "./_entry.js";

// Declaration
export default class UploadMedia extends UploadEntry {
	constructor({
		// Media files only
		file,
		mediaType,
		options,

		// Carry through to entry
		name,
		parent,
		destination,
		status,
		type,
		invalid_skip,
		info_skip,
		i_checked,
		note,
		size,
	}) {
		super(
			name,
			parent,
			destination,
			status,
			type,
			invalid_skip,
			info_skip,
			i_checked,
			note,
			size
		);

		this.file = file;
		this.mediaType = mediaType;
		this.options = options;
	}

	_isImage() {
		let comps = this.file.name.split(".").slice(-1), // File extension can have multiple components in archives
			ext = comps.join(".");

		return ext.match(/(tiff|tif|bmp|jpe|jpg|jpeg|png|gif|avif|heic|heif)$/i);
	}

	_isVideo() {
		let comps = this.file.name.split(".").slice(-1), // File extension can have multiple components in archives
			ext = comps.join(".");

		return ext.match(/(tiff|tif|bmp|jpe|jpg|jpeg|png|gif|avif|heic|heif)$/i);
	}
}
