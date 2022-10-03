import { TatorElement } from "../tator-element.js";
import { hasPermission } from "../../util/has-permission.js";

export class DateTimeInput extends TatorElement {
   constructor() {
      super();

      // DATETIME INPUT
      this.label = document.createElement("label");
      this.label.setAttribute("class", "d-flex flex-justify-between flex-items-center py-1");
      this._shadow.appendChild(this.label);

      const labelInner = document.createElement("span");
      labelInner.setAttribute("class", "col-3");
      this._innerLabel = labelInner;
      this.label.appendChild(labelInner);

      this._name = document.createTextNode("");
      labelInner.appendChild(this._name);

      this._input = document.createElement("input");
      this._input.setAttribute("class", "form-control input-sm col-12");
      this._input.setAttribute("type", "datetime-local");
      this._input.setAttribute("step", ".1");
      this._input.hidden = false;
      this.label.appendChild(this._input);

      this._textInput = document.createElement("input");
      this._textInput.setAttribute("class", "form-control input-sm col-8");
      this._textInput.setAttribute("type", "text");
      this._textInput.hidden = true;
      this.label.appendChild(this._textInput);

      this._toggle = document.createElement("text-calendar-button");
      this.label.appendChild(this._toggle);

      this._toggle.addEventListener("click", () => {
         if (this._toggle.current_state == "text") {
            this._input.hidden = true;
            this._textInput.hidden = false;
         }
         else {
            this._input.hidden = false;
            this._textInput.hidden = true;
         }
      });

      this._input.addEventListener("change", () => {

         this._setTextFromCalendar(); // this.getValue() utilizes the text field

         if (this.getValue() === null) {
            this._input.classList.add("has-border");
            this._input.classList.add("is-invalid");
         } else {
            this._input.classList.remove("has-border");
            this._input.classList.remove("is-invalid");
         }
         this.dispatchEvent(new Event("change"));
      });

      this._input.addEventListener("focus", () => {
         document.body.classList.add("shortcuts-disabled");
      });

      this._input.addEventListener("blur", () => {
         document.body.classList.remove("shortcuts-disabled");
      });

      this._textInput.addEventListener("change", () => {
         if (this.getValue() === null) {
            this._textInput.classList.add("has-border");
            this._textInput.classList.add("is-invalid");
         } else {
            this._textInput.classList.remove("has-border");
            this._textInput.classList.remove("is-invalid");
         }
         this.dispatchEvent(new Event("change"));
      });

      this._textInput.addEventListener("focus", () => {
         document.body.classList.add("shortcuts-disabled");
      });

      this._textInput.addEventListener("blur", () => {
         document.body.classList.remove("shortcuts-disabled");
      });
   }

   static get observedAttributes() {
      return ["name"];
   }

   attributeChangedCallback(name, oldValue, newValue) {
      switch (name) {
         case "name":
            this._name.nodeValue = newValue;
            break;
      }
   }

   // Permission for datetime only
   set permission(val) {
      if (hasPermission(val, "Can Edit")) {
         this._input.removeAttribute("readonly");
         this._textInput.removeAttribute("readonly");
         this._input.classList.remove("disabled");
         this._textInput.classList.remove("disabled");
      } else {
         this._input.setAttribute("readonly", "");
         this._textInput.setAttribute("readonly", "");
         this._input.classList.add("disabled");
         this._textInput.classList.add("disabled");
      }
   }

   set default(val) {
      // Value should be the deafult ISO string
      this._default = val;
   }

   changed() {
      // #todo datetime cuts off miliseconds to 3 points, may need to account for this looking like a change here?
      return this.getValue() !== this._default;
   }

   reset() {
      // Go back to default value
      if (typeof this._default !== "undefined") {
         this.setValue(this._default);
      } else {
         this.setValue("");
      }
   }

   getValue() {
      let val = new Date(this._textInput.value);
      if (isNaN(val.getTime())) {
         val = null;
      } else {
         val = val.toISOString();
      }
      return val;
   }

   _setTextFromCalendar() {
      let val = this._input.value;
      if (val === null || val === "" || isNaN(new Date(val).getTime())) {
         val = null;
      } else {
         let utcString = val + 'Z';
         let date = new Date(utcString);
         val = date.toISOString();
      }

      this._textInput.value = val;
   }

   setValue(val) {
      // assume any incoming value (not null, or "") is in ISO format
      // datetime-local requires this format: YYYY-MM-DDThh:mm:ss.ms
      // the text-field will utilize the ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
      // Even though it says local, let's assume UTC
      if (val === null || val === "" || isNaN(new Date(val).getTime())) {
         val = null;
      } else {
         let date = new Date(val);
         let minuteWithOffset = (date.getMinutes() + date.getTimezoneOffset());
         date.setMinutes(minuteWithOffset);

         let year = date.getFullYear();
         let month = (Number(date.getMonth()) + 1).toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false,
            timeZone: 'UTC'
         });
         let day = date.getDate().toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false,
            timeZone: 'UTC'
         });
         let hours = date.getHours().toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false,
            timeZone: 'UTC'
         });
         let minutes = date.getMinutes().toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false,
            timeZone: 'UTC'
         });
         let seconds = date.getSeconds().toLocaleString('en-US', {
            minimumIntegerDigits: 2,
            useGrouping: false,
            timeZone: 'UTC'
         });
         let milliseconds = date.getMilliseconds().toLocaleString('en-US', {
            minimumIntegerDigits: 3,
            useGrouping: false,
            timeZone: 'UTC'
         });

         let dateToString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
         val = dateToString;
      }

      if (val != null) {
         this._input.value = val;
         this._textInput.value = val + "Z";
      }
      else {
         this._input.value = null;
         this._textInput.value = null;
      }
   }
}

customElements.define("datetime-input", DateTimeInput);
