import { TatorElement } from "../components/tator-element.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";
import { svgNamespace } from "../components/tator-element.js";
import { CreateListResponse } from "../../../../scripts/packages/tator-js/pkg/src/model/CreateListResponse.js";

export class ActivityNav extends TatorElement {
  constructor() {
    super();

    this._nav = document.createElement("div");
    this._nav.setAttribute("class", "nav nav-right");
    this._shadow.appendChild(this._nav);

    const closeDiv = document.createElement("div");
    closeDiv.setAttribute("class", "d-flex flex-justify-between");
    this._nav.appendChild(closeDiv);

    const dummyDiv = document.createElement("div");
    closeDiv.appendChild(dummyDiv);

    const closeButton = document.createElement("nav-close");
    closeButton.setAttribute("class", "px-3 py-3");
    closeDiv.appendChild(closeButton);

    const headerDiv = document.createElement("div");
    headerDiv.setAttribute(
      "class",
      "py-3 d-flex flex-justify-between flex-items-center"
    );
    this._nav.appendChild(headerDiv);

    const header = document.createElement("h3");
    header.setAttribute("class", "text-semibold px-3");
    header.textContent = "Activity";
    headerDiv.appendChild(header);

    this._reloadButton = document.createElement("reload-button");
    this._reloadButton.setAttribute("class", "px-3");
    headerDiv.appendChild(this._reloadButton);

    this._panel = document.createElement("div");
    this._panel.setAttribute("class", "analysis__panel-group py-3 f2");
    this._nav.appendChild(this._panel);

    this._reloadButton.addEventListener("click", this.reload.bind(this));
    closeButton.addEventListener("click", this.close.bind(this));

    this._expanded = new Set(); // List of expanded jobs so we don't collapse on reload.
  }

  init(project) {
    this._project = project;
  }

  open() {
    this._nav.classList.add("is-open");
  }

  close() {
    this._nav.classList.remove("is-open");
    this.dispatchEvent(new Event("close"));
  }

  async reload() {
    this._reloadButton.classList.add("is-rotating");
    const jobsResp = await fetchCredentials(`/rest/Jobs/${this._project}`);
    const jobs = await jobsResp.json();

    // Clear out the panel
    while (this._panel.firstChild) {
      this._panel.removeChild(this._panel.firstChild);
    }

    // Add Algo jobs (if any)
    if (jobs.length == 0) {
      const text = document.createElement("h3");
      text.setAttribute("class", "text-semibold px-3");
      text.textContent = "No algorithm jobs in progress.";
      this._panel.appendChild(text);
    } else {
      // If anything was returned
      const ul = document.createElement("ul");
      ul.setAttribute("class", "label-tree__groups lh-default");
      this._panel.appendChild(ul);

      // Group jobs by gid.
      const groups = new Map();
      const gids = [];
      for (const job of jobs) {
        if (!groups.has(job.gid)) {
          groups.set(job.gid, new Set());
          gids.push({ gid: job.gid, launched: job.start_time });
        }
        groups.get(job.gid).add(job);
      }

      // Display each group.
      for (const gid of gids) {
        this._showGroup(gid, groups.get(gid.gid), ul, "Algorithm");
      }
    }

    const transcodesResp = await fetchCredentials(
      `/rest/Transcodes/${this._project}`
    );
    const transcodes = await transcodesResp.json();

    console.log("transcodes", transcodes);

    // Add transcode jobs (if any)
    if (transcodes.length == 0) {
      const text = document.createElement("h3");
      text.setAttribute("class", "text-semibold px-3 pt-6");
      text.textContent = "No transcodes in progress.";
      this._panel.appendChild(text);
    } else {
      // If anything was returned
      const ul = document.createElement("ul");
      ul.setAttribute("class", "pt-6 label-tree__groups lh-default");
      this._panel.appendChild(ul);

      // Group jobs by gid.
      const groups = new Map();
      const gids = [];
      for (const data of transcodes) {
        if (!groups.has(data.job.gid)) {
          groups.set(data.job.gid, new Set());
          gids.push({ gid: data.job.gid, launched: data.job.start_time });
        }
        groups.get(data.job.gid).add(data.job);
      }

      // Display each group.
      for (const gid of gids) {
        this._showGroup(gid, groups.get(gid.gid), ul, "Transcode");
      }
    }

    this._reloadButton.classList.remove("is-rotating");
  }

  _showGroup(gid, jobs, ul, type) {
    // Create header for job group.
    const li = document.createElement("li");
    ul.appendChild(li);

    const div = document.createElement("div");
    div.setAttribute(
      "class",
      "label-tree__groupinv d-flex flex-items-center flex-justify-between px-3 py-2"
    );
    li.appendChild(div);

    const header = document.createElement("h3");
    header.setAttribute("class", "text-semibold css-truncate");
    header.textContent = `${type} launched ${
      new Date(gid.launched).toString().split("(")[0]
    }`;
    div.appendChild(header);

    const cancel = document.createElement("cancel-button");
    cancel.style.opacity = "0";
    div.addEventListener("mouseenter", () => {
      cancel.style.opacity = "1";
    });
    div.addEventListener("mouseleave", () => {
      cancel.style.opacity = "0";
    });
    div.appendChild(cancel);

    cancel.addEventListener("click", () => {
      this.dispatchEvent(
        new CustomEvent("deleteJobs", {
          detail: { gid: gid.gid },
        })
      );
    });

    // Build dom tree for jobs.
    for (const job of jobs) {
      // Top level workflow.
      const workflow = this._showTask(job, false);
      ul.appendChild(workflow.li);

      // Need these to store child nodes.
      const nodes = new Map();
      const appended = new Set();

      // Create but do not append nodes of workflow.
      if (job.nodes) {
        for (const node of job.nodes) {
          nodes.set(node.id, this._showTask(node, true));
        }

        // Append child nodes.
        for (const node of job.nodes) {
          for (const child of node.children) {
            nodes.get(node.id).ul.appendChild(nodes.get(child).li);
            appended.add(child);
          }
        }

        // Append top level nodes.
        for (const node of job.nodes) {
          if (!appended.has(node.id)) {
            workflow.ul.appendChild(nodes.get(node.id).li);
          }
        }
      }
    }
  }

  _showTask(job, isSubgroup) {
    const li = document.createElement("li");
    if (isSubgroup) {
      li.classList.add("label-tree__subgroup");
    }

    const div1 = document.createElement("div");
    div1.setAttribute(
      "class",
      "label-tree__groupinv d-flex flex-items-center flex-justify-between py-2"
    );
    li.appendChild(div1);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center");
    div1.appendChild(div);

    const cancel = document.createElement("cancel-button");
    if (!isSubgroup) {
      cancel.setAttribute("class", "px-3");
      cancel.style.opacity = "0";
      div1.appendChild(cancel);
    }

    const actions = document.createElement("div");
    actions.setAttribute("class", "d-flex px-2");
    div.appendChild(actions);

    const expand = document.createElement("button");
    expand.setAttribute(
      "class",
      "btn-clear d-flex flex-items-center flex-justify-center px-1 text-gray"
    );
    expand.style.opacity = "0";
    expand.style.cursor = "none";
    actions.appendChild(expand);

    const plus = document.createElementNS(svgNamespace, "svg");
    plus.setAttribute("class", "h3");
    plus.setAttribute("width", "1em");
    plus.setAttribute("height", "1em");
    plus.setAttribute("viewBox", "0 0 24 24");
    expand.appendChild(plus);

    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute(
      "d",
      "M5 13h6v6c0 0.552 0.448 1 1 1s1-0.448 1-1v-6h6c0.552 0 1-0.448 1-1s-0.448-1-1-1h-6v-6c0-0.552-0.448-1-1-1s-1 0.448-1 1v6h-6c-0.552 0-1 0.448-1 1s0.448 1 1 1z"
    );
    plus.appendChild(path);

    const icon = document.createElementNS(svgNamespace, "svg");
    icon.setAttribute("class", "h3");
    icon.setAttribute("width", "1em");
    icon.setAttribute("height", "1em");
    icon.setAttribute("fill", "none");
    icon.style.fill = "none";
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("viewBox", "0 0 24 24");
    actions.appendChild(icon);

    if (job.status == "Succeeded") {
      icon.classList.add("text-green");

      const arc = document.createElementNS(svgNamespace, "path");
      arc.setAttribute("d", "M22 11.08V12a10 10 0 1 1-5.93-9.14");
      icon.appendChild(arc);

      const poly = document.createElementNS(svgNamespace, "polyline");
      poly.setAttribute("points", "22 4 12 14.01 9 11.01");
      icon.appendChild(poly);
    } else if (job.status == "Failed") {
      icon.classList.add("text-red");

      const circle = document.createElementNS(svgNamespace, "circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "10");
      icon.appendChild(circle);

      const line1 = document.createElementNS(svgNamespace, "line");
      line1.setAttribute("x1", "12");
      line1.setAttribute("y1", "8");
      line1.setAttribute("x2", "12");
      line1.setAttribute("y2", "12");
      icon.appendChild(line1);

      const line2 = document.createElementNS(svgNamespace, "line");
      line2.setAttribute("x1", "12");
      line2.setAttribute("y1", "16");
      line2.setAttribute("x2", "12.01");
      line2.setAttribute("y2", "16");
      icon.appendChild(line2);
    } else {
      icon.classList.add("text-purple");

      const circle = document.createElementNS(svgNamespace, "circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "10");
      icon.appendChild(circle);
    }

    const span = document.createElement("span");
    span.setAttribute("class", "text-semibold css-truncate");
    if (job.task) {
      span.textContent = job.task;
    } else {
      span.textContent = job.id;
    }
    div.appendChild(span);

    const started = Date.parse(job.start_time);
    let duration;
    if (job.stop_time) {
      duration = Date.parse(job.stop_time) - started;
    } else {
      duration = Date.now() - started;
    }
    duration = Math.round(duration / 1000); // seconds

    const time = document.createElement("span");
    time.setAttribute("class", "px-2 text-gray");
    if (duration < 60) {
      time.textContent = `${duration}s`;
    } else if (duration < 3600) {
      time.textContent = `${Math.floor(duration / 60)}m ${duration % 60}s`;
    } else if (duration < 86400) {
      time.textContent = `${Math.floor(duration / 3600)}h ${Math.round(
        (duration % 3600) / 60
      )}m`;
    } else {
      time.textContent = `${(duration / 86400).toFixed(1)}d`;
    }
    div.appendChild(time);

    const ul = document.createElement("ul");
    ul.setAttribute("class", "label-tree__subgroups d-flex flex-column");
    ul.style.paddingLeft = "16px";
    if (isSubgroup || this._expanded.has(job.id)) {
      ul.classList.add("is-open");
    }
    li.appendChild(ul);

    if (!isSubgroup) {
      div1.addEventListener("mouseenter", () => {
        expand.style.opacity = "1";
        expand.style.cursor = "pointer";
        cancel.style.opacity = "1";
      });
      div1.addEventListener("mouseleave", () => {
        expand.style.opacity = "0";
        cancel.style.opacity = "0";
      });

      expand.addEventListener("click", () => {
        ul.classList.toggle("is-open");
        if (ul.classList.contains("is-open")) {
          this._expanded.add(job.id);
        } else {
          this._expanded.delete(job.id);
        }
      });

      cancel.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("deleteJobs", {
            detail: { uid: job.uid },
          })
        );
      });
    }
    return { li: li, ul: ul };
  }
}

customElements.define("activity-nav", ActivityNav);
