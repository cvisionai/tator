import { ModalDialog } from "../components/modal-dialog.js";

export class NewAlgorithmForm extends ModalDialog {
  constructor() {
    super();

    this._title.nodeValue = "Register Algorithm";

    const name = document.createElement("form-text");
    name.setAttribute("name", "Algorithm Name");
    name.setAttribute("validator", "slug");
    name.setAttribute("placeholder", "Name of the algorithm");
    this._main.appendChild(name);

    const needsGpu = document.createElement("labeled-checkbox");
    needsGpu.setAttribute("text", "Must be executed on GPU node");
    this._main.appendChild(needsGpu);

    const filesPerJob = document.createElement("form-text");
    filesPerJob.setAttribute("name", "Files Per Job");
    filesPerJob.setAttribute("validator", "int");
    filesPerJob.setAttribute(
      "placeholder",
      "Number of files to process per job"
    );
    this._main.appendChild(filesPerJob);

    const setup = document.createElement("form-file");
    setup.setAttribute("type", "file");
    setup.setAttribute("name", "Setup Script");
    setup.setAttribute("placeholder", "Path to setup.py");
    this._main.appendChild(setup);

    const teardown = document.createElement("form-file");
    teardown.setAttribute("type", "file");
    teardown.setAttribute("name", "Teardown Script");
    teardown.setAttribute("placeholder", "Path to teardown.py");
    this._main.appendChild(teardown);

    const imageName = document.createElement("form-text");
    imageName.setAttribute("name", "Image Name");
    imageName.setAttribute("placeholder", "Name of docker image");
    this._main.appendChild(imageName);

    const imageTag = document.createElement("form-text");
    imageTag.setAttribute("name", "Image Tag");
    imageTag.setAttribute("placeholder", "Tag name of docker image");
    this._main.appendChild(imageName);

    const registry = document.createElement("form-text");
    registry.setAttribute("name", "Registry");
    registry.setAttribute("placeholder", "URL of docker image registry");
    this._main.appendChild(registry);

    const username = document.createElement("form-text");
    username.setAttribute("name", "Username");
    username.setAttribute("placeholder", "Username for docker registry");
    this._main.appendChild(username);

    const password = document.createElement("form-text");
    password.setAttribute("name", "Password");
    password.setAttribute("placeholder", "Password for docker registry");
    password.setAttribute("password", "");
    this._main.appendChild(password);

    this._accept = document.createElement("button");
    this._accept.setAttribute("class", "btn btn-clear");
    this._accept.setAttribute("disabled", "");
    this._accept.textContent = "Create";
    this._footer.appendChild(this._accept);

    const cancel = document.createElement("button");
    cancel.setAttribute("class", "btn btn-clear btn-charcoal");
    cancel.textContent = "Cancel";
    this._footer.appendChild(cancel);

    cancel.addEventListener("click", this._closeCallback);
  }
}

customElements.define("new-algorithm-form", NewAlgorithmForm);
