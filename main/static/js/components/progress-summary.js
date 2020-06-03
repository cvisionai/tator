class ProgressSummary extends TatorElement {
  constructor() {
    super();

    const details = document.createElement("details");
    details.setAttribute("class", "header__layout-wrap f2");
    this._shadow.appendChild(details);

    const summary = document.createElement("summary");
    details.appendChild(summary);

    this._layout = document.createElement("div");
    this._layout.setAttribute("class", "header__layout d-flex flex-items-center text-gray");
    summary.appendChild(this._layout);

    this._processing = document.createElement("div");
    this._processing.setAttribute("class", "header__processing d-flex flex-column");
    this._processing.style.opacity = "0";
    this._layout.appendChild(this._processing);

    this._numProcs = document.createElement("div");
    this._numProcs.setAttribute("class", "d-flex flex-justify-between");
    this._processing.appendChild(this._numProcs);

    this._timeRemaining = document.createElement("span");
    this._processing.appendChild(this._timeRemaining);

    this._svg = document.createElementNS(svgNamespace, "svg");
    this._svg.setAttribute("class", "hover-text-white");
    this._svg.setAttribute("id", "icon-maximize-2");
    this._svg.setAttribute("viewBox", "0 0 24 24");
    this._svg.setAttribute("height", "1em");
    this._svg.setAttribute("width", "1em");
    this._svg.style.display = "none";
    this._layout.appendChild(this._svg);

    const title = document.createElementNS(svgNamespace, "title");
    title.textContent = "Maximize";
    this._svg.appendChild(title);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", "M18.586 4l-5.293 5.293c-0.391 0.391-0.391 1.024 0 1.414s1.024 0.391 1.414 0l5.293-5.293v3.586c0 0.552 0.448 1 1 1s1-0.448 1-1v-6c0-0.003 0-0.005 0-0.008-0.001-0.132-0.028-0.258-0.075-0.374-0.101-0.245-0.297-0.441-0.543-0.543-0.115-0.047-0.241-0.074-0.373-0.075-0.003 0-0.006 0-0.009 0h-6c-0.552 0-1 0.448-1 1s0.448 1 1 1zM5.414 20l5.293-5.293c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0l-5.293 5.293v-3.586c0-0.552-0.448-1-1-1s-1 0.448-1 1v6c0 0.003 0 0.006 0 0.009 0.001 0.132 0.028 0.258 0.075 0.373 0.101 0.245 0.297 0.441 0.543 0.543 0.115 0.047 0.242 0.074 0.374 0.075 0.003 0 0.005 0 0.008 0h6c0.552 0 1-0.448 1-1s-0.448-1-1-1z");
    this._svg.appendChild(path);

    this._div = document.createElement("div");
    this._div.setAttribute("class", "more py-2 px-4");
    this._div.style.display = "none";
    details.appendChild(this._div);

    const ul = document.createElement("ul");
    this._div.appendChild(ul);

    this._summaries = {};
    this._downloadOk = false;

    window.addEventListener("readyForWebsocket", async () => {
      const ws_scheme = window.location.protocol == "https:" ? "wss" : "ws";
      const ws_path = ws_scheme + '://' + window.location.hostname + '/ws/progress/';
      this._socket = new ReconnectingWebSocket(ws_path);
      this._socket.onopen = () => {
        console.log("WebSocket opened");
      }
      this._socket.onclose = () => {
        console.log("WebSocket closed");
      }
      this._socket.onmessage = message => {
        const data = JSON.parse(message.data);
        if ("gid" in data) {
          let text = "";
          switch (data.prefix) {
            case "algorithm":
              text = data.project_name + " | " + data.name + " " + data.num_complete + " of " + data.num_procs;
              break;
            case "upload":
              text = data.project_name + " | " + "Uploading " + data.num_complete + " of " + data.num_procs;
              break;
            case "download":
              text = "Creating " + data.num_complete + " of " + data.num_procs + " zip files";
              break;
          }
          const exists = data.gid in this._summaries;
          let job;
          if (exists) {
            job = this._summaries[data.gid];
          } else {
            job = document.createElement("progress-job");
          }
          job.setAttribute("text", text);
          job.setAttribute("max", data.num_procs);
          job.setAttribute("done", data.num_complete);
          job.setAttribute("gid", data.gid);
          if (!exists) {
            ul.appendChild(job);
            this._summaries[data.gid] = job;
          }
          const numJobs = Object.keys(this._summaries).length;
          if (numJobs > 0) {
            this._numProcs.textContent = numJobs + " processes running";
            this._processing.style.opacity = "1";
            this._svg.style.display = "block";
            this._div.style.display = "block";
          } else {
            this._numProcs.textContent = "";
            this._processing.style.opacity = "0";
            this._svg.style.display = "none";
            this._div.style.display = "none";
          }
        } else {
          if (data.prefix == "download" && data.state == "finished") {
            if (this._downloadOk) {
              const link = document.createElement("a");
              link.setAttribute("href", `/media/${data.project_id}/` + data.uid + ".zip");
              link.setAttribute("download", data.name + ".zip");
              link.style.display = "none";
              this._shadow.appendChild(link);
              link.click();
              this._shadow.removeChild(link);
            }
            this._downloadOk = false;
          }
          this.dispatchEvent(new CustomEvent(data.prefix + "Progress", {
            detail: {message: data}
          }));
        }
      };
    });
  }

  notify(text, withCheck) {
    const note = document.createElement("header-notification");
    note.setAttribute("text", text);
    if (withCheck) {
      note.setAttribute("with-check", "");
    }
    const existing = this._layout.querySelector("header-notification");
    if (existing === null) {
      this._layout.appendChild(note);
    } else {
      this._layout.replaceChild(note, existing);
    }
  }

  enableDownloads() {
    this._downloadOk = true;
  }
}

customElements.define("progress-summary", ProgressSummary);
