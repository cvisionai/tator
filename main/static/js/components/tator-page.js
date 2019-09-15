class TatorPage extends TatorElement {
  constructor() {
    super();

    this._header = document.createElement("header-main");
    this._shadow.appendChild(this._header);

    this._nav = document.createElement("nav-main");
    this._shadow.appendChild(this._nav);

    const shortcuts = document.createElement("keyboard-shortcuts");
    this._shadow.appendChild(shortcuts);

    this._header.addEventListener("openNav", evt => {
      this._nav.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._nav.addEventListener("closed", evt => {
      this._nav.removeAttribute("is-open");
      shortcuts.removeAttribute("is-open");
      this.removeAttribute("has-open-modal");
    });

    this._nav.addEventListener("show-shortcuts", evt => {
      shortcuts.setAttribute("is-open", "");
      this.setAttribute("has-open-modal", "");
    });

    this._dimmer = document.createElement("div");
    this._dimmer.setAttribute("class", "background-dimmer");
    this._shadow.appendChild(this._dimmer);

    // Set up service worker.
    if ("serviceWorker" in navigator) {
      // Get path for upload worker.
      const uploadWorkerUrl = "/static/js/tasks/upload-worker.js";

      // Define function for unregistering all service workers.
      const unregisterAll = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      };

      // Define function to register latest.
      const registerLatest = async () => {
        const registration = await navigator.serviceWorker.register(uploadWorkerUrl);
        if (registration.waiting && registration.active) {
          console.log("Close all tabs to get service worker updates.");
        } else {
          registration.addEventListener("updatefound", () => {
            registration.installing.addEventListener("statechange", installEvt => {
              if (installEvt.target.state === "installed") {
                if (registration.active) {
                  console.log("Close all tabs to get service worker updates.");
                } else {
                  console.log("Service worker content has been cached!");
                }
              }
            });
          });
        }

        // Wait for registration to become active.
        while (!registration.active) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Get the serviceworker.
        window._serviceWorker = registration.active;
        window._serviceWorker.postMessage({command: "wake"});
      };

      // Set up listener for number of ongoing uploads.
      navigator.serviceWorker.addEventListener("message", async evt => {
        if (evt.data.msg == "numUploads") {
          if (evt.data.count == 0) {
            await unregisterAll();
          }
          registerLatest();
        }
      });
      
      window.addEventListener("load", async function() {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length == 0) {
          registerLatest();
        } else {
          for (const registration of registrations) {
            const current = registration.active;
            if (current) {
              current.postMessage({command: "getNumUploads"});
            }
          }
        }
      });
    }
  }

  static get observedAttributes() {
    return ["username", "has-open-modal"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "username":
        this._header.setAttribute("username", newValue);
        break;
      case "has-open-modal":
        if (newValue === null) {
          this._dimmer.classList.remove("has-open-modal");
        } else {
          this._dimmer.classList.add("has-open-modal");
        }
        break;
    }
  }
}

customElements.define("tator-page", TatorPage);

