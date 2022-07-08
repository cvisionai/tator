import { ModalDialog } from "../components/modal-dialog.js";
import { fetchRetry } from "../util/fetch-retry.js";
import { getCookie } from "../util/get-cookie.js";
import { v1 as uuidv1 } from "uuid";

export class MediaMoveDialog extends ModalDialog {
  constructor() {
    super();

    this._title.textContent = "Move media file(s)"

    this._message = document.createElement("p");
    this._main.appendChild(this._message);

    this._moveEnum = document.createElement("media-move");
    this._main.appendChild(this._moveEnum);

    this._moveEnum.addEventListener("move", this.confirmChange.bind(this));
    this._moveEnum.addEventListener("moveToNew", this.moveToNew.bind(this));

    this._newNameInput = document.createElement("input");
    this._newNameInput.setAttribute("placeholder", "Give it a name...");
    this._newNameInput.setAttribute("class", "form-control f1 px-4 ");
    this._newNameInput.hidden = true;
    this._main.appendChild(this._newNameInput);

    let buttonSave = document.createElement("button")
    buttonSave.setAttribute("class", "btn btn-clear btn-primary f1 text-semibold");
    buttonSave.innerHTML = "Confirm";

    buttonSave.addEventListener("click", this._moveConfirmed.bind(this));

    let buttonClose = document.createElement("button")
    buttonClose.setAttribute("class", "btn btn-clear btn-charcoal f1 text-semibold");
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
    this._mediaName = null;
    this._sectionTo = null;
  }

  async open(mediaId, mediaName, projectId) {
    // Values
    this._projectId = projectId;
    this._mediaId = mediaId;
    this._mediaName = mediaName;
    this._sectionTo = null;

    // Update text
    this._message.textContent = `Choose where to move "${this._mediaName}" (ID: ${this._mediaId})?`;
    this._moveEnum.hidden = false;
    this._newNameInput.hidden = true;
    this._footer.classList.add("hidden");

    // get sections
    try {
      const sectionResp = await fetchRetry(`/rest/Sections/${this._projectId}`, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        }
      });

      if (sectionResp.status !== 200) {
        const respObj = await sectionResp.json();
        this._message.textContent = `Error: ${respObj.message}`;
      } else {
        this._moveEnum.sections = await sectionResp.json();
      }

    } catch (err) {
      this._message.textContent = `Error getting section list.`;
      console.error('Error getting section list.', err)
    }

    this.setAttribute("is-open", "true");
  }

  confirmChange(evt) {
    const sectionTo = JSON.parse(evt.detail.to);

    // Update text
    this.removeAttribute("is-open");

    // hide inputs, show buttons
    this._moveEnum.hidden = true;
    this._newNameInput.hidden = true;
    this._footer.classList.remove("hidden");

    if (typeof sectionTo.id !== "undefined" && sectionTo.id !== null) {
      this._sectionTo = sectionTo;
      this._message.textContent = `Move "${this._mediaName}" (ID: ${this._mediaId}) to section "${this._sectionTo.name}" (ID ${this._sectionTo.id})?`;
    } else if (evt.detail.message) {
      this._message.textContent = `Could not move media: ${evt.detail.message}`;
      this._sectionTo = null;
    } else {
      this._message.textContent = `Error moving media.`;
      this._sectionTo = null;
    }

    this.setAttribute("is-open", "true");
  }

  moveToNew(evt) {
    this._sectionTo = { name: "NEW" };
    console.log(evt);

    // Update text
    this.removeAttribute("is-open");

    // reveal name input, and show buttons
    this._moveEnum.hidden = false;
    this._newNameInput.hidden = false;
    this._footer.classList.remove("hidden");

    this.setAttribute("is-open", "true");
  }

  async _moveConfirmed() {
    console.log("_moveConfirmed");
    console.log(this._sectionTo);
    if (this._sectionTo !== null && this._sectionTo.name !== null && this._mediaId !== null) {
      if (this._sectionTo.name !== "NEW") {
        // hide all
        this._moveEnum.hidden = true;
        this._newNameInput.hidden = true;
        this._footer.classList.add("hidden");
        this._message.textContent = `Moving file...`;


        //fetch call
        try {
          const resp = await fetchRetry(`/rest/Media/${this._mediaId}`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ "attributes": { "tator_user_sections": this._sectionTo.tator_user_sections } })
          });

          const respJSON = await resp.json();

          // Update text
          this.removeAttribute("is-open");
          // Reset values
          this._moveEnum._select.value = "Select a section";
          this._newNameInput.value = ""; // reset form
          // Values
          this._projectId = null;
          this._mediaId = null;
          this._mediaName = null;
          this._sectionTo = null;


          if (resp.status !== 200) {
            this._message.textContent = `Error: ${respJSON.message}`;
          } else {
            this._message.textContent = `Success! ${respJSON.message}`;
            this.dispatchEvent(new Event("reload"));
          }
        } catch (err) {
          this._message.textContent = `Error updating media.`;
        }

        this.setAttribute("is-open", "true");
        setTimeout(() => {
          this.removeAttribute("is-open");
          this._message.textContent = "";
        }, 3000);

      } else if (this._sectionTo.name == "NEW") {
        // CREATE A NEW SECTION AND RETURN THE CONFIRMED DIALOG contents WITH THE NEW SECTION!
        console.log("Create new section, and then show them modal again......");
        // hide all
        this._moveEnum.hidden = true;
        this._newNameInput.hidden = true;
        this._footer.classList.add("hidden");
        this._message.textContent = `Creating section...`;

        try {
          //fetch call
          const sectionResp = await fetchRetry(`/rest/Sections/${this._projectId}`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
              "Accept": "application/json",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: this._newNameInput.value,
              tator_user_sections: uuidv1(),
              visible: true
            })

          });


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
            // #todo Show newly added section in the bg?
            this.dispatchEvent(new Event("reload"));

            // Reset values
            this._moveEnum._select.value = "Select a section";
            this._newNameInput.value = ""; // reset form
            
            // get the new section fetch call
            const getSection = await fetchRetry(`/rest/Section/${respJSON.id}`, {
              method: "GET",
              credentials: "same-origin",
              headers: {
                "X-CSRFToken": getCookie("csrftoken"),
                "Accept": "application/json",
                "Content-Type": "application/json"
              }
            });

            // to do if sectionResp.status !== 200
            const data = await getSection.json();

            if (getSection.status !== 200) {
              console.error(
                "Was not able to get the new section data."
              )
            } else {
              //then
              this._moveEnum.dispatchEvent(new CustomEvent("move", {
                detail: { to: JSON.stringify(data), message: respJSON.message },
                composed: true
              }));
            }
          }
        } catch (err) {
          console.error(
            "Was not able to get the new section data.", err
          )
        }
      }

    }
  }
}

customElements.define("media-move-dialog", MediaMoveDialog);
