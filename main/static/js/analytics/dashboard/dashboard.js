class AnalyticsDashboard extends TatorPage {
    constructor() {
      super();

      this.projectId = window.location.pathname.split("/")[1];

      this.main = document.createElement("main");
      this.main.setAttribute("class", "layout-max py-4 d-flex flex-items-center flex-row");
      this._shadow.appendChild(this.main);

      // Annotations
      const annotationsBox = this._getDashboardBox({
          name : "Annotations", 
          href : `/${this.projectId}/analytics/annotations`, 
          iconName: "grid-icon"
        });
      this.main.appendChild(annotationsBox);

      // Collections
      const collectionsBox = this._getDashboardBox({
          name : "Collections", 
          href : `/${this.projectId}/analytics/collections`, 
          iconName: "layers-icon"
        });
      this.main.appendChild(collectionsBox);

      // Reports #TODO 
      /*
      const visualizationBox = this._getDashboardBox({
          name : "Data Visualization", 
          href : `/${this.projectId}/analytics/visualization`, 
          iconName: "bar-chart-icon"
        });
      this.main.appendChild(visualizationBox);
    */

      // Reports
      const reportsBox = this._getDashboardBox({
          name : "Reports", 
          href : `/${this.projectId}/analytics/reports`, 
          iconName: "file-text-icon"
        });
      this.main.appendChild(reportsBox);
    }

    _getDashboardBox({name, href, iconName}={}){
      const height = "2em";
      const width = "2em";

      const iconDiv = document.createElement("div");
      iconDiv.setAttribute("class", "pb-3 d-block color-white");

      const dashboardIcon = new SvgDefinition({iconName, height, width});
      iconDiv.appendChild(dashboardIcon);

      const dashboardText = document.createElement("p");
      dashboardText.setAttribute("class", "h3 analysis__dashboard-text text-normal text-gray");
      dashboardText.textContent = name;

      return this._newRoundedBox(iconDiv, dashboardText, href);
    }

    _newRoundedBox(iconDiv, dashboardText, href){
      const roundedBox = document.createElement("a");
      roundedBox.setAttribute("href", href);
      roundedBox.setAttribute("class", "analysis__dashboard-box d-flex flex-items-center rounded-2");

      const content = document.createElement("div");
      content.setAttribute("class", "flex-items-center text-center");
      content.style.width = "100%";
      roundedBox.appendChild(content);

      content.appendChild(iconDiv);
      content.appendChild(dashboardText);

      return roundedBox;
    }

  }
  
customElements.define("analytics-dashboard", AnalyticsDashboard);