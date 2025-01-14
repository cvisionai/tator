import UploadEntry from "./UploadEntry.js";

// TODO: handle isArchive

// Declaration
export default class Upload {
	list = [];
	allowDirectories = true;
	totalSize = 0;
	#ftDisabled = "File type disabled";
	#ftInvalid = "File type invalid";
	#abortController = new AbortController();

	constructor({ gid, fileHandles, parent, destination, store, sectionData }) {
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
		this._sectionData = sectionData;
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
						: this.#ftDisabled,
					size: 0,
				})
			);
			if (this.parent && this.parent == "" && this.allowDirectories) {
				this.parent = ``;
			} else {
				let newPath = this._sectionData.getSectionPath(entry);
				if (this.parent && this.parent !== "" && this.parent !== null) {
					newPath = `${this.parent}.${newPath}`;
				}
				this.parent = this.allowDirectories ? `${newPath}` : this.parent;
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
				const file = await entry.getFile(),
					newMedia = new UploadEntry({
						file: file,
						name: entry.name,
						parent: parent,
						destination: this.destination,
						status: "new",
						type: file.type ? file.type : "file",
						invalid_skip: null,
						info: null,
						size: file.size,
						store: this._store,
					});
				const added = this._checkFile(newMedia);
				this.list.push(added);

				if (added.ok) {
					this.totalSize += file.size;
				}
			} else if (entry.kind === "directory") {
				if (parent && parent == "" && this.allowDirectories) {
					parent = "";
				}

				this.list.push(
					new UploadEntry({
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
							: this.#ftDisabled,
						store: this._store,
					})
				);

				let newPath = this._sectionData.getSectionPath(entry),
					newParent = newPath;
				if (entry.parent && entry.parent !== "" && entry.parent !== null) {
					newPath = `${entry.parent}.${newPath}`;
				}

				if (
					parent &&
					parent == "" &&
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
				f.parent = f.type === "folder" ? "" : "";
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

	_checkFile(newMedia) {
		const mediaTypes = this._store.getState().mediaTypes;

		let mediaType = null,
			fileOk = false,
			attributes = null,
			note = "";

		const isImage = newMedia._isImage(),
			isVideo = newMedia._isVideo(),
			isArchive = newMedia._isArchive(); // TODO

		const imageOk = mediaTypes.find((t) => t.dtype === "image");
		const videoOk = mediaTypes.find((t) => t.dtype === "video");

		if (isImage && !imageOk) {
			fileOk = false;
			note = this.#ftDisabled;
		} else if (isImage && imageOk) {
			mediaType = imageOk;
			fileOk = true;
			attributes = this._imageAttr; // TODO
		} else if (isVideo && !videoOk) {
			fileOk = false;
			note = this.#ftDisabled;
		} else if (isVideo && videoOk) {
			mediaType = videoOk;
			fileOk = true;
			attributes = this._videoAttr;
		} else {
			note = this.#ftInvalid;
		}

		console.log(
			"Checking file",
			isImage,
			isVideo,
			isArchive,
			newMedia,
			imageOk,
			videoOk,
			mediaType
		);
		for (let currentType of mediaTypes) {
			// Loop to find if a type has a file_format property
			// if (mediaType === null) {
			if (currentType?.file_format !== null) {
				try {
					fileOk =
						newMedia.ext.toLowerCase() ===
						currentType.file_format.toLowerCase();
					mediaType = currentType;

					if (isArchive) {
						fileOk = true;
					}
				} catch (err) {
					console.error("Error checking file type", err, currentType);
				}
			}
			// }
		}

		// Apply information to the newMedia object
		newMedia.ok = fileOk;
		newMedia.mediaType = mediaType?.id ? mediaType.id : null;
		newMedia.options = {
			attributes: attributes ? attributes : {},
		};
		newMedia.note = !fileOk && note ? note : "";
		newMedia.invalid_skip = !fileOk;

		console.log("Information added to the newMedia object", newMedia);

		return newMedia;
	}

	getValidSummary() {
		const validSections = this.list.filter(
			(u) => !u.invalid_skip && u.type == "folder"
		);
		const validFiles = this.list.filter(
			(u) => !u.invalid_skip && u.type !== "folder"
		);

		return {
			validSections: validSections,
			validFiles: validFiles,
			totalSize: this.totalSize,
		};
	}

	upload() {
		let promise = new Promise((resolve) => resolve(true));

		const validSections = this.list.filter(
			(u) => !u.invalid_skip && u.type == "folder"
		);
		const validFiles = this.list.filter(
			(u) => !u.invalid_skip && u.type !== "folder"
		);

		const allValid = [...validFiles, ...validSections],
			uploadInfo = allValid.map((f) => {
				return {
					...f,
					status: "Pending...",
				};
			});

		this._store.setState({
			uploadTotalFolders: validSections.length,
			uploadTotalFiles: validFiles.length,
			uploadCancelled: false,
			uploadInformation: uploadInfo,
		});

		if (uploadInfo.length > 0) {
			for (const [idx, entry] of [...validSections, ...validFiles].entries()) {
				promise = promise.then(entry.uploadEntry.bind(entry, idx));
			}
		}

		promise.catch((error) => {
			this._store.setState({ uploadError: error.message });
		});
	}
}
