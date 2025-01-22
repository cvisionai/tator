import { TatorElement } from "./tator-element.js";

export class ModalDialog extends TatorElement {
  constructor() {
    super();

    this._div = document.createElement("div");
    this._div.setAttribute("class", "modal-wrap d-flex");
    this._shadow.appendChild(this._div);

    this._modal = document.createElement("div");
    this._modal.setAttribute(
      "class",
      "modal d-flex flex-items-center flex-justify-center flex-column rounded-2"
    );
    this._div.appendChild(this._modal);

    this._close = document.createElement("modal-close");
		this._modal.appendChild(this._close);

		this._header = document.createElement("div");
		this._header.setAttribute(
			"class",
			"modal__header py-6 px-6 lh-default text-center"
		);
		this._modal.appendChild(this._header);

		this._titleDiv = document.createElement("div");
		this._titleDiv.setAttribute("class", "h2 px-6");
		this._header.appendChild(this._titleDiv);

		this._title = document.createTextNode("");
		this._titleDiv.appendChild(this._title);

		this._main = document.createElement("div");
		this._main.setAttribute("class", "modal__main px-6 py-4");
		this._modal.appendChild(this._main);

		this._footer = document.createElement("div");
		this._footer.setAttribute("class", "modal__footer d-flex");
		this._modal.appendChild(this._footer);

		this._closeCallback = (evt) => {
			this.dispatchEvent(new Event("close"));
			this.removeAttribute("is-open");
		};

		this._close.addEventListener("click", this._closeCallback.bind(this));
  }

  static get observedAttributes() {
    return ["is-open"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "is-open":
        if (newValue === null) {
          this._div.classList.remove("is-open");
        } else {
          this._div.classList.add("is-open");
          this.dispatchEvent(new Event("open"));
        }
        break;
    }
  }

  fadeOut(timeOut = 1500) {
    setTimeout(() => {
      this._closeCallback();
    }, timeOut);
  }

  // MODAL helpers

  /** Show a success message that autofades
   * Details ->
   * title: ICON  Success
   * Body: @param {string} message
   */
  _success(message) {
    this._clear();
    let text = document.createTextNode(" Success");
    this._titleDiv.innerHTML = "";
    this._titleDiv.append(document.createElement("modal-success"));
    this._titleDiv.append(text);
    this._main.innerHTML = message;

    this.setAttribute("is-open", "true");
    this.fadeOut();
  }

  /** Show a success message with a confirm for next step
   * Custom accept/exit button are params
   * Details ->
   * title: ICON  Success
   * Body: @param {string} or {node} mainText
   * Footer:  @param {button w/ handler} Exit / @param {button w/ handler} Continue
   * Optional-- scroll flag true/false
   */
  _successConfirm({
    mainText = "",
    buttonContinue = document.createElement("button"),
    buttonExit = document.createElement("button"),
    scroll = true,
  } = {}) {
    this._clear();
    let text = document.createTextNode(" Success");
    this._titleDiv.innerHTML = "";
    this._titleDiv.append(document.createElement("modal-success"));
    this._titleDiv.append(text);

    if (mainText.nodeType == Node.ELEMENT_NODE) {
      this._main.appendChild(mainText);
    } else {
      this._main.innerHTML = mainText;
    }

    if (scroll) this._main.classList.add("fixed-height-scroll");

    this._footer.appendChild(buttonContinue);
    this._footer.appendChild(buttonExit);

    return this.setAttribute("is-open", "true");
  }

  /** Show a error message
   * Details ->
   * title: ICON   @param {string} title (default says Error)
   * Body: @param {string} message
   * Footer:  buttonClose (always closes)
   */
  _error(message, title = " Error") {
    this._clear();
    let text = document.createTextNode(title);
    this._titleDiv.innerHTML = "";
    this._titleDiv.append(document.createElement("modal-warning"));
    this._titleDiv.append(text);

    this._main.innerHTML = message;

    let buttonContinue = document.createElement("button");
    buttonContinue.setAttribute("class", "btn f1 text-semibold");

    let confirmTextContinue = document.createTextNode("OK");
    buttonContinue.appendChild(confirmTextContinue);

    this._footer.appendChild(buttonContinue);
    buttonContinue.addEventListener("click", this._closeCallback.bind(this));

    return this.setAttribute("is-open", "true");
  }

  /* Show a warning message and confirmation buttons
   * Details ->
   * title: ICON  Warning
   * Body: @param {string} message
   * Footer:  @param {button w/ handler} buttonClose / @param {button w/ handler} buttonSave
   */
  _warningConfirm(message, buttonClose, buttonSave) {
    this._clear();
    let text = document.createTextNode(" Warning");
    this._titleDiv.innerHTML = "";
    let warningIcon = document.createElement("modal-warning");
    warningIcon.svg.setAttribute("class", "h3 text-yellow");
    this._titleDiv.append();
    this._titleDiv.append(text);
    this._main.innerHTML = message;

    this._footer.appendChild(buttonClose);
    this._footer.appendChild(buttonSave);

    return this.setAttribute("is-open", "true");
  }

  /* Show a message and confirmation buttons
   * Details ->
   * title: @param {string} titleText
   * Body: @param {string} or {node} mainText
   * Footer:  buttonClose (always closes) / @param {button w/ handler} buttonSave
   * Optional-- scroll flag true/false
   */
  _confirm({
    titleText = "",
    mainText = "",
    buttonSave = document.createElement("button"),
    scroll = true,
  } = {}) {
    this._clear();
    this._titleDiv.innerHTML = titleText;

    if (mainText.nodeType == Node.ELEMENT_NODE) {
      this._main.appendChild(mainText);
    } else {
      this._main.innerHTML = mainText;
    }

    if (scroll) this._main.classList.add("fixed-height-scroll");

    let buttonClose = document.createElement("button");
    buttonClose.setAttribute(
      "class",
      "btn btn-clear btn-charcoal f1 text-semibold"
    );
    buttonClose.innerHTML = "Cancel";
    buttonClose.addEventListener("click", this._modalCloseAndClear.bind(this));

    this._footer.appendChild(buttonSave);
    this._footer.appendChild(buttonClose);
    return this.setAttribute("is-open", "true");
  }

  /** Show a message (no icon, it is neutral) and ok button
   * Details ->
   * title: Complete
   * Body: @param {string} message
   * Footer:  buttonContinue (always closes)
   */
  _complete(message) {
    this._clear();
    let text = document.createTextNode("Complete");
    this._titleDiv.innerHTML = "";
    this._titleDiv.append(text);
    this._main.innerHTML = message;
    this._footer.innerHTML = "";

    let buttonContinue = document.createElement("button");
    buttonContinue.setAttribute("class", "btn f1 text-semibold");
    let confirmTextContinue = document.createTextNode("OK");
    buttonContinue.appendChild(confirmTextContinue);
    this._footer.appendChild(buttonContinue);
    buttonContinue.addEventListener("click", this._closeCallback.bind(this));

    this.setAttribute("is-open", "true");
    // this.fadeOut();
  }

  /** Clears the modal and returns it  */
  _clear() {
    if (this._titleDiv) this._titleDiv.innerHTML = "";
    if (this._main) this._main.innerHTML = "";
    if (this._footer) this._footer.innerHTML = "";
    if (this._main) this._main.classList.remove("fixed-height-scroll");

    return this;
  }

  _modalCloseAndClear() {
    this._closeCallback();
    this._clear();
  }
}

if (!customElements.get("modal-dialog")) {
  customElements.define("modal-dialog", ModalDialog);
}
