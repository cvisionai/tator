import { TatorElement } from "../components/tator-element.js";

function sanitizeHTML(input) {
  // Create a DOM parser
  const parser = new DOMParser();
  // Parse the input as HTML
  const doc = parser.parseFromString(input, 'text/html');
  // Check if the input was parsed as HTML (not just plain text)
  const isHTML = doc.body.children.length > 0;
  if (isHTML) {
      // Remove all <script> tags
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(script => script.remove());
      // Return the sanitized HTML
      return doc.body.innerHTML;
  } else {
      // If not HTML, return the input as-is
      return input;
  }
}

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
        const summaryText = document.createElement("div");
        summaryText.innerHTML = sanitizeHTML(text1);


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
          const detailText = document.createElement('div');
          detailText.innerHTML = sanitizeHTML(text2);
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
