export class LoadingSpinner {
  constructor() {
    this.img = document.createElement("img");
    this.img.setAttribute("class", "loading");
    this.img.setAttribute("rel", "preload");
    this.img.setAttribute("src", `${STATIC_PATH}/images/tator_loading.gif`);
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
