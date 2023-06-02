import { TatorElement } from "../components/tator-element.js";

export class ProjectText extends TatorElement {
  constructor() {
    super();
  }

  static get observedAttributes() {
    return ["text"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue == newValue) {
      return;
    }

    switch (name) {
      case "text":
        // Break words into reasonable length lines.
        const words = newValue.split(" ");
        const lines = [];
        let line = "";
        for (let word of words) {
          line += word + " ";
          if (line.length >= 64) {
            lines.push(line);
            line = "";
          }
        }
        if (line.length > 0) {
          lines.push(line);
        }

        const text1 = lines.slice(0, 2).join("\n");
        const summaryText = document.createTextNode(text1);

        if (lines.length > 2) {
          const details = document.createElement("details");
          details.setAttribute(
            "class",
            "project__description text-gray f2 lh-default"
          );
          this._shadow.appendChild(details);

          const summary = document.createElement("summary");
          details.appendChild(summary);

          summary.appendChild(summaryText);

          const text2 = lines.slice(2).join("\n");
          const detailText = document.createTextNode(text2);
          details.appendChild(detailText);
        } else {
          const div = document.createElement("div");
          div.setAttribute(
            "class",
            "project__description text-gray f2 lh-default"
          );
          this._shadow.appendChild(div);

          div.appendChild(summaryText);
        }
        break;
    }
  }
}

customElements.define("project-text", ProjectText);
