class AnalyticsReports extends TatorPage {
  constructor() {
    super();

    const header = document.createElement("div");
    this._headerDiv = this._header._shadow.querySelector("header");
    header.setAttribute("class", "annotation__header d-flex flex-items-center flex-justify-between px-6 f3");
    const user = this._header._shadow.querySelector("header-user");
    user.parentNode.insertBefore(header, user);

    const div = document.createElement("div");
    div.setAttribute("class", "d-flex flex-items-center");
    header.appendChild(div);

    this._breadcrumbs = document.createElement("analytics-breadcrumbs");
    div.appendChild(this._breadcrumbs);
    this._breadcrumbs.setAttribute("analytics-name", "Reports");

    const main = document.createElement("main");
    main.setAttribute("class", "d-flex");
    this._shadow.appendChild(main);

    const section = document.createElement("section");
    section.setAttribute("class", "reports_list py-6 px-5 text-gray");
    main.appendChild(section);

    this._reportCards = document.createElement("ul");
    this._reportCards.setAttribute("class", "sections");
    section.appendChild(this._reportCards);

    const mainSection = document.createElement("section");
    mainSection.setAttribute("class", "reports_main py-3 px-6 d-flex flex-column");
    main.appendChild(mainSection);

    const mainDiv = document.createElement("div");
    mainDiv.setAttribute("class", "py-3");
    mainSection.appendChild(mainDiv);

    const mainHeader = document.createElement("div");
    mainHeader.setAttribute("class", "main__header d-flex flex-justify-between");
    mainDiv.appendChild(mainHeader);

    const nameDiv = document.createElement("div");
    nameDiv.setAttribute("class", "d-flex flex-row flex-items-center");
    mainHeader.appendChild(nameDiv);

    const h1 = document.createElement("h1");
    h1.setAttribute("class", "h1");
    nameDiv.appendChild(h1);

    this._reportTitle = document.createTextNode("");
    h1.appendChild(this._reportTitle);

    this._reportCreatedDatetime = document.createElement("text");
    this._reportCreatedDatetime.setAttribute("class", "d-flex text-gray f2 lh-default");
    mainDiv.appendChild(this._reportCreatedDatetime);

    this._reportDescription = document.createElement("text");
    this._reportDescription.setAttribute("class", "d-flex text-gray f2 lh-default");
    mainDiv.appendChild(this._reportDescription);

    this._reportView = document.createElement("iframe");
    this._reportView.setAttribute("class", "d-flex flex-grow py-3")
    mainSection.appendChild(this._reportView);
  }

  static get observedAttributes() {
    return["project-name", "project-id"].concat(TatorPage.observedAttributes);
  }

  /**
   * Initialize the page with project specific information
   */
  _init() {
    const projectId = this.getAttribute("project-id");

    const reportPromise = fetch("/rest/Reports/" + projectId, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
    reportPromise.then((response) => {
      const reportData = response.json();
      reportData.then((reports) => {
        this._reports = reports;

        for (const report of reports) {
          const reportCard = document.createElement("report-card");
          reportCard.init(report);
          this._reportCards.appendChild(reportCard);

          reportCard.addEventListener("click", () => {
            const allCards = Array.from(this._reportCards.children);
            for (const card of allCards) {
              card.active = false;
            }
            reportCard.active = true;
            this._setReportView(report);
          });
        }

      });
    });
  }

  _setReportView(report) {
    this._reportView.src = report.html_file;
    this._reportTitle.textContent = report.name;
    this._reportDescription.textContent = report.description;
    this._reportCreatedDatetime.textContent = new Date(report.created_datetime).toUTCString();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    TatorPage.prototype.attributeChangedCallback.call(this, name, oldValue, newValue);
    switch (name) {
      case "project-name":
        this._breadcrumbs.setAttribute("project-name", newValue);
        break;
      case "project-id":
        this._init();
        break;
    }
  }
}

customElements.define("analytics-reports", AnalyticsReports);