import { TatorElement } from "./tator-element.js";

export class BrowserRecommendation extends TatorElement {
  constructor() {
    super();
  }

  init(root) {
    let msg_html = "";
    let userAgent = window.navigator.userAgent;
    let browserName;

    if (userAgent.match(/chrome|chromium|crios/i)) {
      browserName = "chrome";
    } else if (userAgent.match(/firefox|fxios/i)) {
      browserName = "Firefox";
    } else if (userAgent.match(/safari/i)) {
      browserName = "Safari";
    } else if (userAgent.match(/opr\//i)) {
      browserName = "Opera";
    } else if (userAgent.match(/edg/i)) {
      browserName = "edge";
      browserName = "No browser detection";
    }

    const sessionValue = sessionStorage.getItem(
      `handle_error__browser-support`
    );
    if (
      browserName !== "chrome" &&
      browserName !== "edge" &&
      sessionValue == null
    ) {
      const edge_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://www.microsoft.com/en-us/edge'>Microsoft Edge</a></span>`;
      const chrome_link = `<span class='text-gray'><a class='nav__link' target='_new' href='https://www.google.com/chrome/'>Google Chrome</a></span>`;
      msg_html += "<span class='text-normal' style='line-height:1.7rem'>";
      msg_html += `${browserName} is not a supported browser for Tator.
            <br/>For full feature support, please utilize the latest versions of<br/><span class="py-2">${chrome_link} or ${edge_link}</span<.`;
      msg_html += "</span>";

      let modalError = document.createElement("modal-notify");
      root.appendChild(modalError);
      modalError.init(
        "Warning Unsupported Browser",
        msg_html,
        "error",
        "Exit",
        true
      );
      modalError.setAttribute("is-open", "");
      sessionStorage.setItem(`handle_error__browser-support`, "true");
      sessionStorage.setItem(
        `handle_error__browser-support_${document.location.pathname}`,
        "true"
      );
    }
  }
}

customElements.define("browser-recommendation", BrowserRecommendation);
