/**
 * The has reusable functions to test input values
 * Idea is centralizing this functionality
 * Use to get a true/false value "on change" or file input like:
 * const hasError = this.validate.findError("thumb_size", file.size);
 */

export class InputValidation {
  constructor() {}

  findError(name, val) {
    switch (name) {
      case "name":
        if (this.isRequired(val)) {
          return false;
        } else {
          return `Name cannot be blank.`;
        }
      case "dtype":
        if (this.isRequired(val)) {
          return false;
        } else {
          return `Data Type is required.`;
        }
      case "default_volume":
        if (this.numberMax(val, 100)) {
          return false;
        } else {
          return `${val} is greater than the maximum of 100.`;
        }
      case "line_width":
        if (this.numberMax(val, 10) && this.numberMin(val, 1)) {
          return false;
        } else {
          return `${val} is not within acceptable range of 1-10.`;
        }
      case "thumb_size":
        let valNum = Number(val);
        let valAsKB = valNum / 1000;

        if (this.numberMax(valAsKB, 1000)) {
          return false;
        } else {
          return `Please choose a smaller thumbnail image. Current file is ${~~valAsKB}KB and max is 1000KB.`;
        }
      default:
        return false;
    }
  }

  // Number Max ie. < 100
  numberMax(val, max) {
    return val <= max;
  }

  // Number Max ie. > 0
  numberMin(val, min) {
    return val >= min;
  }

  // Not empty
  isRequired(val) {
    return typeof val !== "undefined" && val !== null && val !== "";
  }
}
