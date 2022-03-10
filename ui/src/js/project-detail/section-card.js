import { TatorElement } from "../components/tator-element.js";
import { getCookie } from "../util/get-cookie.js";
import { fetchRetry } from "../util/fetch-retry.js";
import { svgNamespace } from "../components/tator-element.js";

export class SectionCard extends TatorElement {
  constructor() {
    super();

    this._li = document.createElement("li");
    this._li.style.cursor = "pointer";
    this._li.setAttribute("class", "section d-flex flex-items-center flex-justify-between px-2 rounded-1");
    this._shadow.appendChild(this._li);

    this._link = document.createElement("a");
    this._link.setAttribute("class", "section__link d-flex flex-items-center text-gray");
    this._li.appendChild(this._link);

    this._title = document.createElement("h2");
    this._title.setAttribute("class", "section__name py-1 px-1 css-truncate");
    this._link.appendChild(this._title);

  }

  init(section, sectionType) {
    this._section = section;
    this._sectionType = sectionType;
    if (section === null) {
      this._title.textContent = "All Media";
    } else {
      this._title.textContent = section.name;
    }

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("height", "1em");
    svg.setAttribute("width", "1em");
    svg.setAttribute("fill", "none");
    svg.style.fill = "none";
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    this._link.insertBefore(svg, this._title);

    // Null section means display all media.
    if (section === null) {
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z");
      svg.appendChild(path);

      const poly = document.createElementNS(svgNamespace, "polyline");
      poly.setAttribute("points", "9 22 9 12 15 12 15 22");
      svg.appendChild(poly);
    }
    if (sectionType == "folder") {
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z");
      svg.appendChild(path);

      const context = document.createElement("div");
      context.setAttribute("class", "more d-flex flex-column f2 px-3 py-2 lh-condensed");
      context.style.display = "none";
      this._shadow.appendChild(context);

      const toggle = document.createElement("toggle-button");
      if (this._section.visible) {
        toggle.setAttribute("text", "Archive folder");
      } else {
        toggle.setAttribute("text", "Restore folder");
      }
      context.appendChild(toggle);

      toggle.addEventListener("click", evt => {
        this._section.visible = !this._section.visible;
        const sectionId = Number();
        fetch(`/rest/Section/${this._section.id}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "visible": this._section.visible,
          })
        })
        .then(response => {
          if (this._section.visible) {
            toggle.setAttribute("text", "Archive folder");
          } else {
            toggle.setAttribute("text", "Restore folder");
          }
          this.dispatchEvent(new CustomEvent("visibilityChange", {
            detail: {section: this._section}
          }));
        });
      });

      this.addEventListener("contextmenu", evt => {
        evt.preventDefault();
        context.style.display = "block";
      });

      window.addEventListener("click", evt => {
        context.style.display = "none";
      });
    } else if (sectionType == "savedSearch") {
      const circle = document.createElementNS(svgNamespace, "circle");
      circle.setAttribute("cx", "11");
      circle.setAttribute("cy", "11");
      circle.setAttribute("r", "8");
      svg.appendChild(circle);

      const line = document.createElementNS(svgNamespace, "line");
      line.setAttribute("x1", "21");
      line.setAttribute("y1", "21");
      line.setAttribute("x2", "16.65");
      line.setAttribute("y2", "16.65");
      svg.appendChild(line);
    } else if (sectionType == "bookmark") {
      const path = document.createElementNS(svgNamespace, "path");
      path.setAttribute("d", "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z");
      svg.appendChild(path);
      this._link.setAttribute("href", section.uri);

      // Set up bookmark management controls.
      const input = document.createElement("input");
      input.setAttribute("class", "form-control input-sm f1");
      input.style.display = "none";
      this._link.appendChild(input);

      const context = document.createElement("div");
      context.setAttribute("class", "more d-flex flex-column f2 px-3 py-2 lh-condensed");
      context.style.display = "none";
      this._shadow.appendChild(context);

      const rename = document.createElement("rename-button");
      rename.setAttribute("text", "Rename");
      context.appendChild(rename);

      const remove = document.createElement("delete-button");
      remove.init("Delete");
      context.appendChild(remove);

      this._link.addEventListener("contextmenu", evt => {
        evt.preventDefault();
        context.style.display = "block";
      });

      rename.addEventListener("click", () => {
        input.style.display = "block";
        this._link.style.pointerEvents = "none";
        this._title.style.display = "none";
        input.setAttribute("value", this._title.textContent);
        input.focus();
      });

      input.addEventListener("focus", evt => {
        evt.target.select();
      });

      input.addEventListener("keydown", evt => {
        if (evt.keyCode == 13) {
          evt.preventDefault();
          input.blur();
        }
      });

      input.addEventListener("blur", evt => {
        if (evt.target.value !== "") {
          this._title.textContent = evt.target.value;
          this._link.style.pointerEvents = "";
          this._section.name = evt.target.value;
          fetchRetry("/rest/Bookmark/" + this._section.id, {
            method: "PATCH",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({"name": evt.target.value}),
          });
        }
        input.style.display = "none";
        this._title.style.display = "block";
      });

      remove.addEventListener("click", () => {
        this.parentNode.removeChild(this);
        fetchRetry("/rest/Bookmark/" + this._section.id, {
          method: "DELETE",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
        });
      });

      window.addEventListener("click", evt => {
        context.style.display = "none";
      });
    }
  }

  rename(name) {
    this._title.textContent = name;
  }

  set active(enabled) {
    if (enabled) {
      this._li.classList.add("is-active");
    } else {
      this._li.classList.remove("is-active");
    }
  }
}

customElements.define("section-card", SectionCard);
