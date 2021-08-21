class OrganizationSummary extends TatorElement {
  constructor() {
    super();

    const div = document.createElement("div");
    div.setAttribute("class", "organizations d-flex flex-items-center rounded-2");
    this._shadow.appendChild(div);

    this._link = document.createElement("a");
    this._link.setAttribute("class", "organizations__link d-flex flex-items-center text-white");
    div.appendChild(this._link);

    this._img = document.createElement("img");
    this._img.setAttribute("class", "organizations__image px-2 rounded-1");
    this._link.appendChild(this._img);

    const text = document.createElement("div");
    text.setAttribute("class", "organizations__text px-3");
    this._link.appendChild(text);

    const h2 = document.createElement("h2");
    h2.setAttribute("class", "text-semibold py-2");
    text.appendChild(h2);

    this._text = document.createTextNode("");
    h2.appendChild(this._text);

    //this._description = document.createElement("organization-description");
    //text.appendChild(this._description);

    //this._collaborators = document.createElement("organization-collaborators");
    //this._collaborators.setAttribute("class", "d-flex flex-grow");
    //div.appendChild(this._collaborators);

    //this._nav = document.createElement("organization-nav");
    //div.appendChild(this._nav);
  }

  set info(val) {
    this._text.nodeValue = val.name;
    this._organizationId = val.id;
    if (val.thumb) {
      this._img.setAttribute("src", val.thumb);
      this._img.setAttribute("style", "object-fit:cover");
    } else {
      this._img.setAttribute("src", "/static/images/tator-logo-symbol-only.png");
      this._img.setAttribute("style", "object-fit:contain");
    }
    if (val.permission == "Admin") {
      const url = window.location.origin + "/" + val.id + "/organization-settings";
    }
    this._link.setAttribute("href", url);
    this._description.init(val);
    this._nav.setAttribute("organization-id", val.id);
    this._nav.setAttribute("permission", val.permission);
    let first = true;
    this._collaborators.usernames = val.usernames;

    this._nav.addEventListener("remove", evt => {
      const remove = new CustomEvent("remove", {
        detail: {
          organizationId: val.id,
          organizationName: val.name,
        }
      });
      this.dispatchEvent(remove);
    });
  }
}

customElements.define("organization-summary", OrganizationSummary);
