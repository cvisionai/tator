class AnalyticsCollections extends TatorPage {
    constructor() {
      super();

      const main = document.createElement("main");
      main.setAttribute("class", "layout-max py-4");
      this._shadow.appendChild(main);

      const header = document.createElement("div");
      header.setAttribute("class", "main__header d-flex flex-items-center flex-justify-between py-6");
      main.appendChild(header);

      const h1 = document.createElement("h1");
      h1.setAttribute("class", "h1");
      header.appendChild(h1);

      const h1Text = document.createTextNode("Collections");
      h1.appendChild(h1Text);
    }
  }
  
customElements.define("analytics-collections", AnalyticsCollections);