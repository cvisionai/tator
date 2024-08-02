// Function to read the stream in chunks
async function read(reader, writableStream, tempFileHandle, name, dirHandle) {
  const { done, value } = await reader.read();
  if (done) {
    // Close the writable stream after writing all chunks.
    await writableStream.close();
    // Rename the temporary file to the final file name
    await tempFileHandle.move(name);
    return;
  }

  // Write each chunk to the writable stream
  await writableStream.write(value);
  // Continue reading
  await read(reader, writableStream, tempFileHandle, name, dirHandle);
}

async function downloadFile(name, url, index, existing, dirHandle) {
  let msg;
  if (existing.has(name)) {
    msg = `Skipping file ${name}, already exists...`;
  } else {
    msg = `Downloading file ${name}...\n`;
    const response = await fetch(url);
    const reader = response.body.getReader();
    const tempName = `${name}.tmp`;
    const tempFileHandle = await dirHandle.getFileHandle(tempName, {
      create: true,
    });
    const writableStream = await tempFileHandle.createWritable();
    await read(reader, writableStream, tempFileHandle, name, dirHandle);
  }
  return msg;
}

export async function downloadFileList(
  dirHandle,
  names,
  urls,
  callback,
  abort
) {
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
