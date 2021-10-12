class ProgressDialog extends ModalDialog {
  constructor() {
    super();

    this._div.setAttribute("class", "modal-wrap d-flex text-center");
    this._div.style.width = "334px";
    this._modal.setAttribute("class", "modal rounded-2");
    this._titleDiv.setAttribute("class", "h2");
    this._title.nodeValue = "";
    this._footer.remove();

    // Loading Icon
    this._loadingImg = document.createElement("img");
    this._loadingImg.setAttribute("src", "/static/images/spinner-transparent.svg");
    this._loadingImg.style.margin = "auto";
    this._loadingImg.style.display = "none";
    this._header.appendChild(this._loadingImg);

    // Success Icon
    // Note: Scaled up version of success-light.js
    this._successSvg = document.createElementNS(svgNamespace, "svg");
    this._successSvg.setAttribute("class", "py-6 text-center")
    this._successSvg.setAttribute("viewBox", "0 0 80 80");
    this._successSvg.setAttribute("height", "84px");
    this._successSvg.setAttribute("width", "84px");
    this._successSvg.setAttribute("fill", "none");
    this._successSvg.setAttribute("stroke", "#54e37a");
    this._successSvg.setAttribute("stroke-width", "2");
    this._successSvg.setAttribute("stroke-linecap", "round");
    this._successSvg.setAttribute("stroke-linejoin", "round");
    this._successSvg.style.fill = "none";
    this._successSvg.style.display = "none";
    this._successSvg.style.margin = "auto";
    this._header.appendChild(this._successSvg);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M 36 3 C 18 3 3 18 3 36 C 3 54 18 69 36 69 C 54 69 69 54 69 36 C 69 18 54 3 36 3");
    this._successSvg.appendChild(path);

    const path2 = document.createElementNS(svgNamespace, "path");
    path2.setAttribute("d", "M 51 21 L 30 48 L 18 39");
    this._successSvg.appendChild(path2);

    // Failed Icon
    // Note: Scaled up version of warning-light.js
    this._failedSvg = document.createElementNS(svgNamespace, "svg");
    this._failedSvg.setAttribute("class", "py-6 text-center")
    this._failedSvg.setAttribute("viewBox", "0 0 80 80");
    this._failedSvg.setAttribute("height", "84px");
    this._failedSvg.setAttribute("width", "84px");
    this._failedSvg.setAttribute("fill", "none");
    this._failedSvg.setAttribute("stroke", "#ff3e1d");
    this._failedSvg.setAttribute("stroke-width", "2");
    this._failedSvg.setAttribute("stroke-linecap", "round");
    this._failedSvg.setAttribute("stroke-linejoin", "round");
    this._failedSvg.style.fill = "none";
    this._failedSvg.style.display = "none";
    this._failedSvg.style.margin = "auto";
    this._header.appendChild(this._failedSvg);

    const path3 = document.createElementNS(svgNamespace, "path");
    path3.setAttribute("d", "M 30.87 11.58 L 5.46 54 a 6 6 90 0 0 5.13 9 h 50.82 a 6 6 90 0 0 5.13 -9 L 41.13 11.58 a 6 6 90 0 0 -10.26 0 z");
    this._failedSvg.appendChild(path3);

    const line_0 = document.createElementNS(svgNamespace, "line");
    line_0.setAttribute("x1", "36");
    line_0.setAttribute("y1", "27");
    line_0.setAttribute("x2", "36");
    line_0.setAttribute("y2", "43");
    this._failedSvg.appendChild(line_0);

    const line_1 = document.createElementNS(svgNamespace, "line");
    line_1.setAttribute("x1", "36");
    line_1.setAttribute("y1", "52");
    line_1.setAttribute("x2", "36.03");
    line_1.setAttribute("y2", "52");
    this._failedSvg.appendChild(line_1);

    // Message to display to the user that will be configurable with the monitorJob function
    this._contentDiv = document.createElement("div");
    this._contentDiv.setAttribute("class", "text-center")
    this._contentDiv.style.paddingTop = "30px";
    this._contentDiv.style.paddingBottom = "60px";
    this._main.appendChild(this._contentDiv);
    this._msg = document.createElement("p");
    this._contentDiv.appendChild(this._msg)

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

    let response = await fetchRetry("/rest/Job/" + jobUid, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
    });

    let jobStatus = await response.json();
    var jobSucceeded = true;

    if (jobStatus.status === "Running") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      jobSucceeded = await this.getJobCompleteStatus(jobUid, jobPromise);
    }
    else if (jobStatus.status === "Succeeded") {
      return true;
    }
    else {
      return false;
    }

    return jobSucceeded;
  }

  checkJobs() {

    this._checkJobThread = null;

    var promises = [];
    for (let index = 0; index < this._jobList.length; index++) {
      var jobPromise = fetchRetry("/rest/Job/" + this._jobList[index].jobUid, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": getCookie("csrftoken"),
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
      });
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
          }
          else if (data.status == "Succeeded") {
            this.dispatchEvent(new CustomEvent("jobsDone", {
              detail: {status: true, job: this._jobList[index]},
              composed: true
            }));
          }
          else {
            this.dispatchEvent(new CustomEvent("jobsDone", {
              detail: {status: false, job: this._jobList[index]},
              composed: true
            }));
          }
        }
  
        this._jobList = keepJobs;
        if (this._newJobList.length > 0) {
          this._jobList.push(...this._newJobList);
        }
  
        if (this._jobList.length > 0) {
          this._checkJobThread = setTimeout(() => { this.checkJobs(); }, 5000);
        }
      });
    });
  }

  /**
   * Returns a promise once the job is completed. The promise contains a boolean
   * that is true if the job was successful. If the job failed, false is returned.
   */
  monitorJob(jobUid, msg, callback) {

    this._failedSvg.style.display = "none";
    this._successSvg.style.display = "none";
    this._loadingImg.style.display = "block";
    this._msg.textContent = msg;

    var newJob = {
      jobUid: jobUid,
      msg: msg,
      callback: callback
    };

    if (this._jobList.length == 0) {
      this._jobList.push(newJob);
      this._checkJobThread = setTimeout(() => { this.checkJobs(); }, 5000);
    }
    else {
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

customElements.define("progress-dialog", ProgressDialog)