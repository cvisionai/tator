async function downloadFile(name, url, index, existing, dirHandle) {
  let msg;
  if (existing.has(name)) {
    msg = `Skipping file ${name}, already exists...`;
  } else {
    msg = `Downloading file ${name}...\n`;
    const response = await fetch(url);
    const data = await response.blob();
    const fileHandle = await dirHandle.getFileHandle(name, { create: true });
    const writableStream = await fileHandle.createWritable();
    await writableStream.write(data);
    await writableStream.close();
  }
  return msg;
}

export async function downloadFileList(names, urls, callback, abort) {
  const dirHandle = await window.showDirectoryPicker({
    mode: "readwrite",
    startIn: "downloads",
  });
  if (dirHandle) {
    const existing = new Set();
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "file") {
        existing.add(entry.name);
      }
    }
    for (let i = 0; i < urls.length; i++) {
      if (typeof callback !== "undefined") {
        callback(i, names[i]);
      }
      const msg = await downloadFile(names[i], urls[i], i, existing, dirHandle);
      console.log(msg);
      if (abort()) {
        return;
      }
    }
    if (typeof callback !== "undefined") {
      callback(urls.length, null);
    }
  }
}
