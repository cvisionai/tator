import { TatorElement } from "../components/tator-element.js";
import { svgNamespace } from "../components/tator-element.js";
import streamSaver from "../util/StreamSaver.js";

export class DownloadButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute(
      "class",
      "btn-clear py-2 px-0 text-gray hover-text-white d-flex flex-items-center"
    );
    this._shadow.appendChild(this._button);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("id", "icon-download");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    this._button.appendChild(svg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M20 15v4c0 0.276-0.111 0.525-0.293 0.707s-0.431 0.293-0.707 0.293h-14c-0.276 0-0.525-0.111-0.707-0.293s-0.293-0.431-0.293-0.707v-4c0-0.552-0.448-1-1-1s-1 0.448-1 1v4c0 0.828 0.337 1.58 0.879 2.121s1.293 0.879 2.121 0.879h14c0.828 0 1.58-0.337 2.121-0.879s0.879-1.293 0.879-2.121v-4c0-0.552-0.448-1-1-1s-1 0.448-1 1zM13 12.586v-9.586c0-0.552-0.448-1-1-1s-1 0.448-1 1v9.586l-3.293-3.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5 5c0.092 0.092 0.202 0.166 0.324 0.217s0.253 0.076 0.383 0.076c0.256 0 0.512-0.098 0.707-0.293l5-5c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0z"
    );
    svg.appendChild(path);

    this._span = document.createElement("span");
    this._span.setAttribute("class", "px-2");
    this._button.appendChild(this._span);

    this._button.addEventListener("click", () => {
      if (this.request) {
        const fileSize = this.getAttribute("size");
        const name = this.getAttribute("name");

        console.log(`${name} is ${fileSize} bytes`);
        const fileStream = streamSaver.createWriteStream(name, {
          size: fileSize,
        });
        fetch(this.request).then((res) => {
          // https://github.com/jimmywarting/StreamSaver.js/blob/master/examples/fetch.html
          const readableStream = res.body;

          if (window.WritableStream && readableStream.pipeTo) {
            return readableStream
              .pipeTo(fileStream)
              .then(() => console.log("done writing"));
          }

          window.writer = fileStream.getWriter();

          const reader = res.body.getReader();
          const pump = () =>
            reader
              .read()
              .then((res) =>
                res.done ? writer.close() : writer.write(res.value).then(pump)
              );

          pump();
        });
      } else if (this.hasAttribute("url") && this.hasAttribute("name")) {
        const link = document.createElement("a");
        link.style.display = "none";
        link.setAttribute("href", this.getAttribute("url"));
        link.setAttribute("download", this.getAttribute("name"));
        this._shadow.appendChild(link);
        link.click();
        this._shadow.removeChild(link);
      }
    });
  }

  static get observedAttributes() {
    return ["text", "url", "name", "request"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "text":
        this._span.textContent = newValue;
        break;
      case "url":
        this._button.setAttribute("href", newValue);
        break;
      case "name":
        this._button.setAttribute("download", newValue);
        break;
    }
  }
}

customElements.define("download-button", DownloadButton);
