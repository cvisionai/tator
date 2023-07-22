import { ModalDialog } from "../components/modal-dialog.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { svgNamespace } from "../components/tator-element.js";

export class ProgressDialog extends ModalDialog {
  constructor() {
    super();

    this._div.setAttribute("class", "modal-wrap d-flex text-center");
    this._div.style.width = "334px";
    this._modal.setAttribute("class", "modal rounded-2");
    this._titleDiv.setAttribute("class", "h2");
    this._title.nodeValue = "";
    this._footer.remove();

    this._icon = document.createElement("div");
    this._icon.style.margin = "auto";
    this._icon.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="4em" height="4em" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="no-fill"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>';
    this._header.appendChild(this._icon);

    // Message to display to the user that will be configurable with the monitorJob function
    this._contentDiv = document.createElement("div");
    this._contentDiv.setAttribute("class", "text-center");
    this._contentDiv.style.paddingTop = "30px";
    this._contentDiv.style.paddingBottom = "60px";
    this._main.appendChild(this._contentDiv);
    this._msg = document.createElement("p");
    this._contentDiv.appendChild(this._msg);

    // Ok Button
    this._okButton = document.createElement("button");
    this._okButton.setAttribute("class", "btn btn-clear");
    this._okButton.style.margin = "auto";
    this._okButton.textContent = "Ok";
    this._okButton.addEventListener("click", this._okClickHandler.bind(this));
    this._main.appendChild(this._okButton);

    this._jobList = []; // Objects with {uid: str, promise: Promise}
    this._newJobList = [];
    this._checkJobThread = null;
  }

  /**
   * This function won't return until the corresponding job's status is not "Running"
   *
   * Returns true if the job's status is succeeded. False is failed.
   */
  async getJobCompleteStatus(jobUid, jobPromise) {
    let response = await fetchCredentials("/rest/Job/" + jobUid, {}, true);
    let jobStatus = await response.json();
    var jobSucceeded = true;

    if (jobStatus.status === "Running") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      jobSucceeded = await this.getJobCompleteStatus(jobUid, jobPromise);
    } else if (jobStatus.status === "Succeeded") {
      return true;
    } else {
      return false;
    }

    return jobSucceeded;
  }

  checkJobs() {
    this._checkJobThread = null;

    var promises = [];
    for (let index = 0; index < this._jobList.length; index++) {
      var jobPromise = fetchCredentials(
        "/rest/Job/" + this._jobList[index].jobUid,
        {},
        true
      );
      promises.push(jobPromise);
    }

    var jsonDataPromises = [];
    Promise.all(promises).then((responses) => {
      for (let index = 0; index < this._jobList.length; index++) {
        jsonDataPromises.push(responses[index].json());
      }
      Promise.all(jsonDataPromises).then((jsonData) => {
        var keepJobs = [];
        for (let index = 0; index < this._jobList.length; index++) {
          var data = jsonData[index];
          if (data.status == "Running") {
            keepJobs.push(this._jobList[index]);
          } else if (data.status == "Succeeded") {
            this.dispatchEvent(
              new CustomEvent("jobsDone", {
                detail: { status: true, job: this._jobList[index] },
                composed: true,
              })
            );
          } else {
            this.dispatchEvent(
              new CustomEvent("jobsDone", {
                detail: { status: false, job: this._jobList[index] },
                composed: true,
              })
            );
          }
        }

        this._jobList = keepJobs;
        if (this._newJobList.length > 0) {
          this._jobList.push(...this._newJobList);
        }

        if (this._jobList.length > 0) {
          this._checkJobThread = setTimeout(() => {
            this.checkJobs();
          }, 5000);
        }
      });
    });
  }

  /**
   * Returns a promise once the job is completed. The promise contains a boolean
   * that is true if the job was successful. If the job failed, false is returned.
   */
  monitorJob(jobUid, msg, callback) {
    this._msg.textContent = msg;

    var newJob = {
      jobUid: jobUid,
      msg: msg,
      callback: callback,
    };

    if (this._jobList.length == 0) {
      this._jobList.push(newJob);
      this._checkJobThread = setTimeout(() => {
        this.checkJobs();
      }, 5000);
    } else {
      this._newJobList.push(newJob);
    }
  }

  /**
   * Callback when the OK button has been clicked.
   */
  _okClickHandler() {
    this.dispatchEvent(new Event("close"));
  }
}

customElements.define("progress-dialog", ProgressDialog);
