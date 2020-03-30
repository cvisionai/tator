class QualityControl extends TatorElement {
  constructor() {
    super();

    const summary = document.createElement("div");
    summary.style.cursor = "pointer";
    summary.setAttribute("class", "annotation__setting d-flex flex-items-center px-3 rounded-1");
    this._shadow.appendChild(summary);

    const rateSpan = document.createElement("div");
    rateSpan.style.cursor = "default";
    rateSpan.setAttribute("class", "text-gray");
    rateSpan.textContent = "Quality:";
    summary.appendChild(rateSpan);

    this._div = document.createElement("div");
    this._div.setAttribute("class", "px-1");
    summary.appendChild(this._div);

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
    const select = document.createElement("select");
    select.setAttribute("class", "form-select has-border select-sm1");

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
      let option = document.createElement("option");
      option.setAttribute("value", idx);
      option.textContent = `${resolutions[idx]}p`;
      select.appendChild(option);
    }
    select.selectedIndex = closest_idx;
    this._div.appendChild(select);
    this.quality = resolutions[closest_idx];

    select.addEventListener("change", evt => {
      const index = Number(select.options[select.selectedIndex].value);
      // Resolutions are in descending order
      let resolution = null;
      if (index >= 0)
      {
        resolution = resolutions[index];
        this.quality = resolution;
      }
      this.dispatchEvent(new CustomEvent("qualityChange", {
        detail: {quality: resolution},
        composed: true
      }));
    });
  }
}

customElements.define("quality-control", QualityControl);
