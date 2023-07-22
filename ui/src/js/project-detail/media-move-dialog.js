import { ModalDialog } from "../components/modal-dialog.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { v1 as uuidv1 } from "uuid";

export class MediaMoveDialog extends ModalDialog {
  constructor() {
    super();

    this._title.textContent = "Move media file(s)";

    this._message = document.createElement("p");
    this._main.appendChild(this._message);

    this._moveEnum = document.createElement("media-move");
    this._main.appendChild(this._moveEnum);

    this._moveEnum.addEventListener("move", this.confirmChange.bind(this));
    this._moveEnum.addEventListener("moveToNew", this.moveToNew.bind(this));

    this._newNameInput = document.createElement("input");
    this._newNameInput.setAttribute("placeholder", "Give it a name...");
    this._newNameInput.setAttribute(
      "class",
      "form-control f1 px-4 select-sm col-12"
    );
    this._newNameInput.hidden = true;
    this._main.appendChild(this._newNameInput);

    let buttonSave = document.createElement("button");
    buttonSave.setAttribute(
      "class",
      "btn btn-clear btn-primary f1 text-semibold"
    );
    buttonSave.innerHTML = "Confirm";

    buttonSave.addEventListener("click", this._moveConfirmed.bind(this));

    let buttonClose = document.createElement("button");
    buttonClose.setAttribute(
      "class",
      "btn btn-clear btn-charcoal f1 text-semibold"
    );
    buttonClose.innerHTML = "Cancel";

    buttonClose.addEventListener("click", () => {
      this._closeCallback();
      this._mediaId = null;
      this._mediaName = null;
      this._sectionTo = null;
    });

    this._footer.classList.add("hidden");
    this._footer.appendChild(buttonSave);
    this._footer.appendChild(buttonClose);

    // Values
    this._projectId = null;
    this._mediaId = null;
    this._mediaId = null;
    this._mediaName = null;
    this._sectionTo = null;
    this._single = true;
  }

  async open(mediaId, mediaName, projectId, single = true) {
    // Values
    this._projectId = projectId;
    this._mediaId = mediaId;
    this._mediaName = mediaName;
    this._sectionTo = null;
    this._single = single;

    // Update text
    if (single) {
      this._message.innerHTML = `Move "${this._mediaName}" <span class="text-gray">(ID: ${this._mediaId})</span> to:`;
    } else {
      this._message.innerHTML = `Move media files <span class="text-gray">(IDs: ${String(
        this._mediaId
      ).replaceAll(",", ", ")})</span> to:`;
    }

    this._moveEnum.hidden = false;
    this._newNameInput.hidden = true;
    this._footer.classList.add("hidden");

    // get sections
    try {
      const sectionResp = await fetchCredentials(
        `/rest/Sections/${this._projectId}`,
        {},
        true
      );

      if (sectionResp.status !== 200) {
        const respObj = await sectionResp.json();
        this._message.textContent = `Error: ${respObj.message}`;
      } else {
        this._moveEnum.sections = await sectionResp.json();
      }
    } catch (err) {
      this._message.textContent = `Error getting section list.`;
      console.error("Error getting section list.", err);
    }

    this.setAttribute("is-open", "true");
  }

  confirmChange(evt) {
    const sectionTo = JSON.parse(evt.detail.to);
    const messageInfo = evt.detail.message;
    this._single = this._mediaId.indexOf(",") > -1;

    // Update text
    this.removeAttribute("is-open");

    // hide inputs, show buttons
    this._moveEnum.hidden = true;
    this._newNameInput.hidden = true;
    this._footer.classList.remove("hidden");

    if (
      typeof sectionTo.id !== "undefined" &&
      sectionTo.id !== null &&
      this._single
    ) {
      this._sectionTo = sectionTo;
      this._message.innerHTML = `Move "${this._mediaName}" <span class="text-gray">(ID: ${this._mediaId})</span> to <span class="text-bold">${this._sectionTo.name}</span> folder?`;
    } else if (
      typeof sectionTo.id !== "undefined" &&
      sectionTo.id !== null &&
      !this._single
    ) {
      this._sectionTo = sectionTo;
      this._message.innerHTML = `Move media file(s) <span class="text-gray">(ID: ${String(
        this._mediaId
      ).replaceAll(",", ", ")})</span> to <span class="text-bold">${
        this._sectionTo.name
      }</span> folder?`;
    } else if (messageInfo) {
      this._message.textContent = `Could not move media: ${messageInfo}`;
      this._sectionTo = null;
    } else {
      this._message.textContent = `Error moving media.`;
      this._sectionTo = null;
    }

    this.setAttribute("is-open", "true");
  }

  moveToNew(evt) {
    this._sectionTo = { name: "NEW" };
    // console.log(evt);

    // Update text
    this.removeAttribute("is-open");

    // reveal name input, and show buttons
    this._moveEnum.hidden = false;
    this._newNameInput.hidden = false;
    this._footer.classList.remove("hidden");

    this.setAttribute("is-open", "true");
  }

  async _moveConfirmed() {
    if (
      this._sectionTo !== null &&
      this._sectionTo.name !== null &&
      this._mediaId !== null
    ) {
      if (this._sectionTo.name !== "NEW") {
        // hide all
        this._moveEnum.hidden = true;
        this._newNameInput.hidden = true;
        this._footer.classList.add("hidden");
        this._message.textContent = `Moving file(s)...`;

        //fetch call
        try {
          let resp;
          if (this._single) {
            resp = await fetchCredentials(
              `/rest/Media/${this._mediaId}`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  attributes: {
                    tator_user_sections: this._sectionTo.tator_user_sections,
                  },
                }),
              },
              true
            );
          } else {
            resp = await fetchCredentials(
              `/rest/Medias/${this._projectId}?media_id=${this._mediaId}`,
              {
                method: "PATCH",
                body: JSON.stringify({
                  attributes: {
                    tator_user_sections: this._sectionTo.tator_user_sections,
                  },
                }),
              },
              true
            );
          }

          const respJSON = await resp.json();

          // Reload media
          this.dispatchEvent(new Event("reload"));

          // Update text
          this.removeAttribute("is-open");
          // Reset values
          this._moveEnum._select.value = "Select a folder";
          this._newNameInput.value = ""; // reset form

          // Values
          this._projectId = null;
          this._mediaId = null;
          this._mediaName = null;
          this._sectionTo = null;
          this._single = true;

          if (resp.status !== 200) {
            this._message.textContent = `Error: ${respJSON.message}`;
          } else {
            this._message.innerHTML = `<span class="text-green">Success! ${respJSON.message}</span>`;
            this.setAttribute("is-open", "true");
            this.fadeOut();
          }
        } catch (err) {
          this._message.textContent = `Error updating media.`;
          console.error("Error updating media.", err);
        }

        setTimeout(() => {
          this._message.textContent = "";
        }, 3000);
      } else if (this._sectionTo.name == "NEW") {
        // CREATE A NEW SECTION AND RETURN THE CONFIRMED DIALOG contents WITH THE NEW SECTION!
        // console.log("Create new section, and then show them modal again......");
        // hide all
        this._moveEnum.hidden = true;
        this._newNameInput.hidden = true;
        this._footer.classList.add("hidden");
        this._message.textContent = `Creating section...`;

        try {
          //fetch call
          const sectionResp = await fetchCredentials(
            `/rest/Sections/${this._projectId}`,
            {
              method: "POST",
              body: JSON.stringify({
                name: this._newNameInput.value,
                tator_user_sections: uuidv1(),
                visible: true,
              }),
            },
            true
          );

          const respJSON = await sectionResp.json();

          if (sectionResp.status !== 201) {
            this.removeAttribute("is-open");
            this._message.textContent = `Error: ${respJSON.message}`;
            this.setAttribute("is-open", "true");
            setTimeout(() => {
              this.removeAttribute("is-open");
              this._message.textContent = "";
            }, 3000);
          } else {
            //updated media list
            this.dispatchEvent(new Event("reload"));

            // Reset values
            this._moveEnum._select.value = "Select a folder";
            this._newNameInput.value = ""; // reset form

            // get the new section fetch call
            const getSection = await fetchCredentials(
              `/rest/Section/${respJSON.id}`
            );

            // to do if sectionResp.status !== 200
            const data = await getSection.json();

            if (getSection.status !== 200) {
              console.error("Was not able to get the new section data.");
            } else {
              // refreshes section sidebar
              this.dispatchEvent(
                new CustomEvent("new-section", { detail: { section: data } })
              );
              //then
              this._moveEnum.dispatchEvent(
                new CustomEvent("move", {
                  detail: {
                    to: JSON.stringify(data),
                    message: respJSON.message,
                  },
                  composed: true,
                })
              );
            }
          }
        } catch (err) {
          console.error("Was not able to get the new section data.", err);
        }
      }
    }
  }
}

customElements.define("media-move-dialog", MediaMoveDialog);
