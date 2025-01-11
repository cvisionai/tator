// Declaration
export default class UploadEntry {
	constructor(
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
	) {
		this.name = name;
		this.parent = parent;
		this.destination = destination;
		this.status = status;
		this.type = type;
		this.invalid_skip = invalid_skip;
		this.info_skip = info_skip;
		this.i_checked = i_checked;
		this.note = note;
		this.size = size;
	}
}
