import TatorLoading from "../../images/tator_loading.gif";

export class LoadingSpinner {
  constructor() {
    this.img = document.createElement("img");
    this.img.setAttribute("class", "loading");
    this.img.setAttribute("rel", "preload");
    this.img.setAttribute("src", TatorLoading);
    this.img.style.display = "none";
  }

  getImg() {
    return this.img;
  }

  showSpinner() {
    return (this.img.style.display = "block");
  }

  hideSpinner() {
    return (this.img.style.display = "none");
  }
}
