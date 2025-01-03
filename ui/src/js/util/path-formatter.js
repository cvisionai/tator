export const reducePathToNameUtil = (path) => {
	return `${path.split(".")[path.split(".").length - 1].replaceAll("_", " ")}`;
};

export const reducePathUtil = (path) => {
	const replacedTop = path.split(".");
	if (replacedTop[0] == "") {
		// console.log("replacedTop[0]", replacedTop[0]);
		replacedTop.splice(0, 1);
	}
	if (replacedTop.length > 1) {
		return `${replacedTop.join(" > ").replaceAll("_", " ")}`;
	} else {
		return `${String(replacedTop).replaceAll("_", " ")}`;
	}
};

// export const reducePathShortUtil = (path) => {
// 	const reduced = reducePathUtil(path);

// 	// OK as is
// 	if (reduced.length < 40) {
// 		return reduced;
// 	}

// 	// Make it short
// 	let name = reducePathToNameUtil(path);
// 	if (name.length > 40) {
// 		const length = name.length;
// 		name =
// 			name.substring(0, 15) + "..." + name.substring(length - 15, length - 1);
// 	}

// 	const split = path.split(".");
// 	split.splice(0, 1);
// 	let newReduced = "/",
// 		i = 0;
// 	for (let part of split) {
// 		i++;
// 		if (i == split.length) {
// 			newReduced += " " + name;
// 			break;
// 		} else {
// 			let partName = part;
// 			if (partName.length > 10) {
// 				partName = `${partName.substring(0, 8).replaceAll("_", " ")}...`;
// 			}
// 			newReduced += ` ${partName} /`;
// 		}
// 	}
// 	return newReduced;
// };

export const growPathByNameUtil = (path, name) => {
	const updatedName = name.replaceAll(" ", "_").replaceAll(".", "_");
	const joined =
		path == "" || path == null || path == undefined
			? `${updatedName}`
			: `${path}.${updatedName}`;

	return joined;
};
