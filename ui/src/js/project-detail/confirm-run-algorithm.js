import { ModalDialog } from "../components/modal-dialog.js";
import { fetchRetry } from "../util/fetch-retry.js";
import { svgNamespace } from "../components/tator-element.js";

export class ConfirmRunAlgorithm extends ModalDialog {
  constructor() {
    super();

    const iconWrapper = document.createElement("div");
    this._header.insertBefore(iconWrapper, this._titleDiv);

    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("width", "24");
    svg.setAttribute("height", "24");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.style.fill = "none";
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    iconWrapper.appendChild(svg);

    const poly = document.createElementNS(svgNamespace, "polyline");
    poly.setAttribute("points", "22 12 18 12 15 21 9 3 6 12 2 12");
    svg.appendChild(poly);

    this._message = document.createElement("p");
    this._message.setAttribute("class", "py-3 text-center");
    this._main.appendChild(this._message);

    this._icon = document.createElement("div");
    this._icon.setAttribute("class", "text-center py-3")
    this._icon.style.margin = "auto";
    this._icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="4em" height="4em" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>';
    this._icon.style.display = "none";
    //this._main.appendChild(this._icon);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear btn-purple");
    this._accept.textContent = "Yes";
    this._footer.appendChild(this._accept);

    this._cancel = document.createElement("button");
    this._cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    this._cancel.textContent = "No";
    this._footer.appendChild(this._cancel);

    this._cancel.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("close",
          {composed: true,
           detail: {
             confirm: false}}));
    });

    this._accept.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("close",
          {composed: true,
           detail: {
             confirm: true,
             projectId: this._projectId,
             mediaIds: this._mediaIds,
             section: this._section,
             algorithmName: this._algorithmName,
             extraParameters: this._extraParameters}}));
    });
  }

  /**
   * Initialize the dialog window with the algorithm information prior
   * to displaying it
   *
   * @param {integer} projectId Project ID associate with algorithm
   * @param {string} algorithmName Name of workflow to run
   * @param {array} mediaIds List of media IDs to process. Can be null, if so section is checked.
   * @param {Tator.Section} section Section to process. If this and mediaIds is null, assume that all the media in the project will be processed.
   * @param {array} extraParameters key/value pairs of parameters to pass along when launching the workflow
   */
  async init(algorithmName, projectId, mediaIds, section, extraParameters)
  {
    this._title.nodeValue = `Launch Workflow`;
    this._accept.style.display = "none";
    this._cancel.style.display = "none";
    this._message.textContent = `Retrieving data...`;
    this._message.classList.add("text-gray");

    if (mediaIds == null) {

      if (section == null) {
        var response = await fetchRetry(`/rest/MediaCount/${projectId}`, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          }
        });
        var count = await response.json();
        var msgText = `Do you want to run <span class="text-purple text-semibold">` + algorithmName + `</span> on <br />the <span class="text-purple text-semibold">ALL media (media count: ${count})</span>?`;
      }
      else {
        var response = await fetchRetry(`/rest/MediaCount/${projectId}?section=${section.id}`, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          }
        });
        var count = await response.json();
        var msgText = `Do you want to run <span class="text-purple text-semibold">` + algorithmName + `</span> on <br />media in <span class="text-purple text-semibold">${section.name} (media count: ${count})</span>?`;
      }

      // Small delay so that the user can acknowledge something was happening.
      // This isn't something we want users to rush through anyway.
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    else {
      var count = mediaIds.length;
      if (count == 1) {

        var response = await fetchRetry(`/rest/Media/${mediaIds[0]}`, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Accept": "application/json",
            "Content-Type": "application/json"
          }
        });
        var media = await response.json();
        var msgText = `Do you want to run <span class="text-purple text-semibold">` + algorithmName + `</span> on <br /><span class="text-purple text-semibold">${media.name} (ID: ${media.id})</span>?`;
      }
      else {
        var msgText = `Do you want to run <span class="text-purple text-semibold">` + algorithmName + `</span> on <br /><span class="text-purple text-semibold">${count} media</span>?`;
      }
    }

    this._message.classList.remove("text-gray");
    this._accept.style.display = "flex";
    this._cancel.style.display = "flex";
    this._message.innerHTML = msgText;
    this._algorithmName = algorithmName;
    this._projectId = projectId;
    this._mediaIds = mediaIds;
    this._section = section;
    this._extraParameters = extraParameters;
  }

  static get observedAttributes() {
    return ModalDialog.observedAttributes;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    ModalDialog.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
  }
}

customElements.define("confirm-run-algorithm", ConfirmRunAlgorithm);
