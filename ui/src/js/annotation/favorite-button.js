import { TatorElement } from "../components/tator-element.js";
import { fetchCredentials } from "../../../../scripts/packages/tator-js/src/utils/fetch-credentials.js";

export class FavoriteButton extends TatorElement {
  constructor() {
    super();

    this._button = document.createElement("button");
    this._button.setAttribute("class", "btn btn-outline btn-small f2");
    this._button.style.width = "initial";
    this._shadow.appendChild(this._button);

    const input = document.createElement("input");
    input.setAttribute("class", "form-control input-sm f1");
    input.style.display = "none";
    this._shadow.appendChild(input);

    const context = document.createElement("div");
    context.setAttribute(
      "class",
      "more d-flex flex-column f2 px-3 py-2 lh-condensed"
    );
    context.style.display = "none";
    this._shadow.appendChild(context);

    const rename = document.createElement("rename-button");
    rename.setAttribute("text", "Rename");
    context.appendChild(rename);

    const remove = document.createElement("delete-button");
    remove.init("Delete");
    context.appendChild(remove);

    this._button.addEventListener("contextmenu", (evt) => {
      evt.preventDefault();
      context.style.display = "block";
    });

    rename.addEventListener("click", () => {
      input.style.display = "block";
      this._button.style.display = "none";
      input.setAttribute("value", this._button.textContent);
      input.focus();
    });

    input.addEventListener("focus", (evt) => {
      document.body.classList.add("shortcuts-disabled");
      evt.target.select();
    });

    input.addEventListener("keydown", (evt) => {
      if (evt.keyCode == 13) {
        evt.preventDefault();
        input.blur();
      }
    });

    input.addEventListener("blur", (evt) => {
      document.body.classList.remove("shortcuts-disabled");
      if (evt.target.value !== "") {
        this._button.textContent = evt.target.value;
        this._favorite.name = evt.target.value;
        this.dispatchEvent(
          new CustomEvent("rename", {
            detail: this._favorite,
          })
        );
        fetchCredentials(
          "/rest/Favorite/" + this._favorite.id,
          {
            method: "PATCH",
            body: JSON.stringify({ name: evt.target.value }),
          },
          true
        );
      }
      input.style.display = "none";
      this._button.style.display = "block";
    });

    remove.addEventListener("click", () => {
      this.parentNode.removeChild(this);
      this.dispatchEvent(
        new CustomEvent("remove", {
          detail: this._favorite,
        })
      );
      fetchCredentials(
        "/rest/Favorite/" + this._favorite.id,
        {
          method: "DELETE",
        },
        true
      );
    });

    window.addEventListener("click", (evt) => {
      context.style.display = "none";
    });
  }

  init(favorite) {
    this._button.textContent = favorite.name;
    this._favorite = favorite;

    this._button.addEventListener("click", () => {
      this._button.blur();
      this.dispatchEvent(
        new CustomEvent("load", {
          detail: favorite.values,
          composed: true,
        })
      );
    });
  }
}

customElements.define("favorite-button", FavoriteButton);
