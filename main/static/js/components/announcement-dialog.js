class AnnouncementDialog extends ModalDialog {
  constructor() {
    super();
   
    // Rework the styles 
    this._div.setAttribute("class", "modal-wrap modal-wide d-flex");
    this._modal.setAttribute("class", "modal py-6 px-6 rounded-2");
    this._header.setAttribute("class", "px-3 py-3");
    this._titleDiv.setAttribute("class", "h2");
    this._title.nodeValue = "Announcements";
    this._main.remove();
    this._footer.remove();

    this._announcements = document.createElement("div");
    this._announcements.setAttribute("class", "py-4 d-flex flex-column annotation__announcement-list");
    this._header.appendChild(this._announcements);
  }

  init(announcements) {
    // Initializes the dialog.
    // announcements: returned object from Announcement endpoint.
    for (const announcement of announcements) {
      const div = document.createElement("div");
      div.setAttribute("class", "d-flex flex-column col-12 table");
      this._announcements.appendChild(div);

      const content = document.createElement("div");
      content.innerHTML = marked(announcement.markdown);
      div.appendChild(content);

      const buttonDiv = document.createElement("div");
      buttonDiv.setAttribute("class", "d-flex flex-row flex-justify-right");
      div.appendChild(buttonDiv);

      const button = document.createElement("button");
      button.setAttribute("class", "btn btn-purple");
      button.textContent = "Got it";
      buttonDiv.appendChild(button);

      button.addEventListener("click", evt => {
        div.parentNode.removeChild(div);
        // TODO: Remove announcement via DELETE request.
      });
    }
  }
}

customElements.define("announcement-dialog", AnnouncementDialog);
