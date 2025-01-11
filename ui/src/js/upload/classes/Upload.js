//gid

import UploadMedia from "./Media.js";
import UploadFolder from "./Folder.js";

import { uploadMedia } from "../../../../../scripts/packages/tator-js/src/utils/upload-media.js";
import {
	reducePathUtil,
	growPathByNameUtil,
} from "../../util/path-formatter.js";

// TODO: handle isArchive

// Declaration
export default class Upload {
	list = [];
	allowDirectories = true;
	totalSize = 0;
	_ftDisabled = "File type disabled";

	constructor({ gid, fileHandles, parent, destination, store }) {
		this.gid = gid;
		this.fileHandles = fileHandles;
		this.parent = parent;
		this.destination = {
			id: destination.id ? destination.id : null,
			name: destination.name ? destination.name : null,
			path: destination.path ? destination.path : null,
			explicit_listing: destination.explicit_listing
				? destination.explicit_listing
				: null,
		}; // to do - tease apart parent + destination?
		this._store = store;
	}

	getSkippedEntries() {
		return this.list.filter((entry) => entry.invalid_skip || entry.info_skip);
	}

	async _constructList() {
		if (this.fileHandles == "directory") {
			this.list.push(
				new UploadFolder({
					name: entry.name,
					parent: this.parent,
					destination: this.destination,
					status: "new",
					type: "folder",
					invalid_skip: null,
					info_skip: allowDirectories ? false : true,
					note: this._specifiedTypes.allowDirectories
						? `<span class="text-purple">Checking...</span>`
						: this._ftDisabled,
					size: 0,
				})
			);
			if (this.parent && this.parent == "New_Files" && this.allowDirectories) {
				this.parent = ``;
			} else {
				this.parent = this.allowDirectories
					? `${growPathByNameUtil(this.parent, entry.name)}`
					: this.parent;
			}
		} else if (!this.fileHandles || !this.fileHandles.length) {
			return;
		}

		await this._recursiveDirectoryUpload(
			this.fileHandles,
			this.gid,
			this.parent
		);

		// Clear out new file handles list
		this.fileHandles = [];
	}

	async _recursiveDirectoryUpload(handle, gid, parent) {
		const entries = await handle.values();

		for await (let entry of entries) {
			if (entry.kind === "file") {
				const file = await entry.getFile();
				// media = new Media({file}),
				const added = this._checkFile(file);
				this.list.push(
					new UploadMedia({
						mediaType: added.mediaType,
						options: added.options,
						file: file,
						name: entry.name,
						parent: parent,
						destination: this.destination,
						status: "new",
						type: file.type ? file.type : "file",
						invalid_skip: null,
						info: null,
						skip: !added.ok,
						note: !added.ok ? this._ftDisabled : added.note ? added.note : "",
						size: file.size,
					})
				);
				if (added.ok) {
					this.totalSize += file.size;
				}
			} else if (entry.kind === "directory") {
				if (parent && parent == "New_Files" && this.allowDirectories) {
					parent = "";
				}

				this.list.push(
					new UploadFolder({
						name: entry.name,
						parent: this.parent,
						destination: this.destination,
						status: "new",
						type: "folder",
						invalid_skip: null,
						info: null,
						skip: this.allowDirectories ? false : true,
						note: this.allowDirectories
							? `<span class="text-purple">Checking...</span>`
							: this._ftDisabled,
					})
				);

				let newParent = this.allowDirectories
					? `${growPathByNameUtil(parent, entry.name)}`
					: parent;

				if (
					parent &&
					parent == "New_Files" &&
					this.allowDirectories &&
					entry.kind === "directory"
				) {
					newParent = "";
				}

				await this._recursiveDirectoryUpload(entry, gid, newParent);
			}
		}
	}

	addFileHandles(fileHandles) {
		this.fileHandles = fileHandles;
		this._constructList();
		return this;
	}

	_updateFileOptions(mediaTypeSettings) {
		this._mediaTypeSettings = mediaTypeSettings;
		this.allowDirectories = mediaTypeSettings.find((m) => m.dtype === "folder");
		const dtypes = [...new Set(mediaTypeSettings.map((m) => m.dtype))];

		let removed = [];
		if (this.list && this.list.length > 0) {
			for (let entry of this.list) {
				if (entry.type === "folder" && !allowDirectories) {
					this._removeEntry(entry);
					removed.push(entry);
				} else {
					if (!dtypes.includes("image") && entry._isImage()) {
						this._removeEntry(entry);
						removed.push(entry);
					} else if (!dtypes.includes("video") && entry._isVideo()) {
						this._removeEntry(entry);
						removed.push(entry);
					}
				}
			}

			return removed;
		}
	}

	renameEntry({ addToName = "_copy", index }) {
		const entry = this.list[index];
		const splitName = entry.name.split("."),
			newName = splitName[0] + addToName + splitName[1];

		// Update entry;
		entry.name = newName;
		if (entry.type === "folder") {
			const newParent = entry.parent.replace(entry.name, newName),
				oldParent = entry.parent;
			this.updatePaths(newParent, oldParent);
		}

		this.updateIndex(index, entry);
	}

	updateIndex(index, value) {
		this.list[index] = value;
	}

	_removeEntry(row) {
		const index = this.list.findIndex((d) => d.name === row.name);
		if (index > -1) {
			if (this.list[index].type === "folder") {
				let removedParent = this._data[index].name
					.replaceAll(" ", "_")
					.replaceAll(".", "_");
				this._removeParentPath(removedParent);
			}

			this.list.splice(index, 1);

			this.totalSize = 0;
			for (let f of this.list) {
				this.totalSize += f.size;
			}
		}
	}

	_removeParentPath(removedParent) {
		for (let f of this.list) {
			console.log(
				`Removing parent *${removedParent}* from current *${f.parent}*`
			);

			// File paths are the parent path + destination at the end, or just destination if it is 1 directory
			// File paths like "" or "New_Files" are the same
			// New folder additions store the path as really just the parent, and the name is the new folder (destination at end)

			if (f.parent.indexOf("." + removedParent) > -1) {
				console.log("Rem 1");
				// it is inside a path like "Folder.RemoveMe.Folder2"
				// - Replace ".RemoveMe" with ""
				f.parent = f.parent.replace("." + removedParent, "");
			} else if (f.parent.indexOf(removedParent + ".") > -1) {
				// it is at the top of a path like "RemoveMe.Folder2"
				// - Replace "RemoveMe." with ""
				f.parent = f.parent.replace("." + removedParent, "");
			} else if (f.parent === removedParent) {
				// If equal
				// - This file is in the folder we are removing
				// - This is the folder we're removing
				// So we do something slightly different for folders
				f.parent = f.type === "folder" ? "" : "New_Files";
			} else {
				// If none of these cases are met, it is unrelated to the removed folder path
			}
		}

		return this.list;
	}

	updatePaths(newPath, oldPath) {
		// const data = [];
		for (let item of this.list) {
			if (item.type == "folder" && item.parent.indexOf(oldPath) > -1) {
				item.parent = item.parent.replace(oldPath, newPath);
			} else if (
				item.parent == oldPath ||
				item.parent.indexOf(oldPath) === -1
			) {
				item.parent = newPath;
			} else if (item.parent.indexOf(oldPath) > -1) {
				item.parent = item.parent.replace(oldPath, newPath);
			}
		}
	}

	_checkFile(file, gid) {
		const mediaTypes = this._store.getState().mediaTypes;
		let mediaType = null,
			fileOk = false,
			attributes = null,
			note = "",
			comps = file.name.split(".").slice(-1), // File extension can have multiple components in archives
			ext = comps.join("."); // rejoin extension

		// Check if the file is an image, video, or archive
		// media._isImage();

		const isImage = ext.match(
				/(tiff|tif|bmp|jpe|jpg|jpeg|png|gif|avif|heic|heif)$/i
			),
			isVideo = ext.match(
				/(mp4|avi|3gp|ogg|wmv|webm|flv|mkv|mov|mts|m4v|mpg|mp2|mpeg|mpe|mpv|m4p|qt|swf|avchd|ts)$/i
			),
			isArchive = ext.match(/^(zip|tar)/i);

		const imageOk = mediaTypes.find((t) => t.dtype === "image");
		const videoOk = mediaTypes.find((t) => t.dtype === "video");

		if (isImage && !imageOk) {
			fileOk = false;
			note = this._ftDisabled;
		} else if (isImage && imageOk) {
			mediaType = imageOk;
			fileOk = true;
			attributes = this._imageAttr;
		} else if (isVideo && !videoOk) {
			fileOk = false;
			note = this._ftDisabled;
		} else if (isVideo && videoOk) {
			mediaType = videoOk;
			fileOk = true;
			attributes = this._videoAttr;
		}

		for (let currentType of mediaTypes) {
			if (mediaType === null) {
				if (currentType?.file_format !== null) {
					fileOk = ext.toLowerCase() === currentType.file_format.toLowerCase();
					mediaType = currentType;

					if (isArchive) {
						fileOk = true;
					}
				}
			}
		}

		// if (fileOk && mediaType !== null) {
		function progressCallback(progress) {
			this._store.setState({ uploadChunkProgress: progress });
		}

		const fileInfo = {
			ok: fileOk,
			file: file,
			gid: gid,
			mediaType: mediaType.id,
			// mediaType: isArchive ? -1 : mediaType == null ? null : mediaType,
			// section:
			// 	this._section && !this._chosenSection
			// 		? this._section
			// 		: this._chosenSection,
			isImage: isImage,
			isArchive: isArchive,
			progressCallback: progressCallback.bind(this),
			abortController: this._abortController,
			options: {
				attributes: attributes ? attributes : {},
			},
			note: note ? note : "",
		};
		// console.log("File is OK", fileInfo);
		return fileInfo;
		// }

		// this._store.setState({
		// 	uploadError: `Error: Please check that ${file.name} is a valid file type for this project!`,
		// });

		// return {
		// 	file: file,
		// 	ok: false,
		// };
	}
}
