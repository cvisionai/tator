class QualityControl extends TatorElement {
  constructor() {
    super();

    const details = document.createElement("details");
    details.setAttribute("class", "position-relative");
    this._shadow.appendChild(details);

    const summary = document.createElement("summary");
    summary.style.cursor = "pointer";
    summary.setAttribute("class", "annotation__setting d-flex flex-items-center px-3 rounded-1");
    details.appendChild(summary);

    const rateSpan = document.createElement("div");
    rateSpan.setAttribute("class", "text-gray");
    rateSpan.textContent = "Quality:";
    summary.appendChild(rateSpan);

    this._span = document.createElement("span");
    this._span.setAttribute("class", "px-1");
    this._span.textContent = "";
    summary.appendChild(this._span);

    const styleDiv = document.createElement("div");
    styleDiv.setAttribute("class", "files__main files-wrap");
    details.appendChild(styleDiv);

    this._div = document.createElement("div");
    this._div.setAttribute("class", "more d-flex flex-column f2 py-3 px-2");
    styleDiv.appendChild(this._div);

    // handle default
    const searchParams = new URLSearchParams(window.location.search);
    this._quality = 720;
    if (searchParams.has("quality"))
    {
      this._quality = Number(searchParams.get("quality"));
    }
  }

  hide()
  {
    this.style.visibility = 'hidden';
  }

  set quality(quality)
  {
    this._quality = quality;
    this._span.textContent = quality + "p";

    let params = new URLSearchParams(document.location.search.substring(1));
    params.set("quality", quality);
    const path = document.location.pathname;
    const searchArgs = params.toString();
    var newUrl = path;
    newUrl += "?" + searchArgs;

    window.history.replaceState(quality,"Quality",newUrl);
  }

  set resolutions(resolutions)
  {
    const slider = document.createElement("input");
    slider.setAttribute("class", "range flex-grow");
    slider.setAttribute("type", "range");
    slider.setAttribute("step", "1");

    let closest_idx = 0;
    let max_diff = Number.MAX_SAFE_INTEGER;
    for (let idx = 0; idx < resolutions.length; idx++)
    {
      let diff = Math.abs(resolutions[idx]-this._quality);
      if (diff < max_diff)
      {
        max_diff = diff;
        closest_idx = idx;
      }
    }
    slider.setAttribute("value", resolutions.length-closest_idx);
    slider.setAttribute("min", 1);
    slider.setAttribute("max", resolutions.length);
    this._div.appendChild(slider);
    this.quality = resolutions[closest_idx];

    slider.addEventListener("input", evt => {
      const index = evt.target.value;
      // Resolutions are in descending order
      const resolution = resolutions[resolutions.length-index];
      this.quality = resolution;
      this.dispatchEvent(new CustomEvent("qualityChange", {
        detail: {resolution: resolution},
        composed: true
      }));
    });
  }
}

customElements.define("quality-control", QualityControl);
