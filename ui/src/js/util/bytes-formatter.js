export const formatBytesOutput = (bytes) => {
	let fileSize = bytes;
	const fileSizeInKb = bytes / 1000;
	const fileSizeInMb = bytes / 1000 / 1000;
	const fileSizeInGb = bytes / 1000 / 1000 / 1000;

	if (fileSizeInGb > 1) {
		fileSize = `${Math.round(fileSizeInGb)} GB`;
	} else if (fileSizeInMb > 1) {
		fileSize = `${Math.round(fileSizeInMb)} MB`;
	} else if (fileSizeInKb > 1) {
		fileSize = `${Math.round(fileSizeInKb)} KB`;
	} else {
		fileSize = `${Math.round(bytes)} Byte${bytes === 1 ? "" : "s"}`;
	}

	return fileSize;
};
