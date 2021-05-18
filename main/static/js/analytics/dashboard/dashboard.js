class AnalyticsDashboard extends TatorPage {
    constructor() {
      super();

      this.projectId = window.location.pathname.split("/")[1];

      this.main = document.createElement("main");
      this.main.setAttribute("class", "layout-max py-4 d-flex flex-items-center flex-row");
      this._shadow.appendChild(this.main);

      // Annotations #TODO icon
      const annotationsBox = document.createElement("box-navigation");
      this.main.appendChild(annotationsBox);

      const annotationsLink = document.createElement("a");
      annotationsLink.setAttribute("class", "h2 text-normal text-gray");
      annotationsLink.setAttribute("href", `/${this.projectId}/analytics/annotations`);
      annotationsLink.textContent = "Annotations";
      annotationsBox._content.appendChild(annotationsLink);

      // Collections #TODO icon
      const collectionsBox = document.createElement("box-navigation");
      this.main.appendChild(collectionsBox);

      const collectionsLink = document.createElement("a");
      collectionsLink.setAttribute("class", "h2 text-normal text-gray");
      collectionsLink.setAttribute("href", `/${this.projectId}/analytics/collections`);
      collectionsLink.textContent = "Collections";
      collectionsBox._content.appendChild(collectionsLink);

      // Reports #TODO icon
      const reportsBox = document.createElement("box-navigation");
      this.main.appendChild(reportsBox);

      const reportsLink = document.createElement("a");
      reportsLink.setAttribute("class", "h2 text-normal text-gray");
      reportsLink.setAttribute("href", `/${this.projectId}/analytics/reports`);
      reportsLink.textContent = "Reports";
      reportsBox._content.appendChild(reportsLink);
    }
  }
  
customElements.define("analytics-dashboard", AnalyticsDashboard);