/**
 * Class used to encapsulate a condition for the data filtering interface
 */
export class FilterConditionData {
  /**
   * Note: There is no error checking (e.g. checking for nulls)
   * @param {string} category
   * @param {string} field
   * @param {string} modifier
   * @param {string} value
   * @param {string} categoryGroup
   */
  constructor(category, field, modifier, value, categoryGroup) {
    this.category = category;
    this.field = field;
    this.modifier = modifier;
    this.value = value;
    this.categoryGroup = categoryGroup;
  }

  /**
   * @returns {string} String version of this object
   */
  getString() {
    return (
      this.categoryGroup +
      ":" +
      this.field +
      " " +
      this.modifier +
      " " +
      this.value
    );
  }
}

/**
 * Library of utility functions related to the filtering of data
 */
export class FilterUtilities {
  /**
   * @returns {array of objects} Valid modifier choices given the dtype
   *                             Stored within the value property of the object because this
   *                             syncs up with the enum-input javascript.
   */
  static getModifierChoices(selectedAttributeType) {
    var choices = [];
    var dtype = selectedAttributeType.dtype;

    // #TODO Add more options for the different dtypes
    if (dtype == "enum") {
      choices.push({ value: "==", label: "Equals" });
      choices.push({ value: "NOT ==", label: "Does Not Equal" });
    } else if (dtype == "int" || dtype == "float") {
      choices.push({ value: "==", label: "Equals" });
      choices.push({ value: "NOT ==", label: "Does Not Equal" });
      choices.push({ value: ">" });
      choices.push({ value: ">=" });
      choices.push({ value: "<" });
      choices.push({ value: "<=" });
      choices.push({ value: "in", label: "Is one of  (Comma-separated)" });
    } else if (dtype == "bool") {
      choices.push({ value: "==" });
    } else if (dtype == "datetime") {
      choices.push({ value: "After" });
      choices.push({ value: "Before" });
    } else if (dtype == "string") {
      choices.push({ value: "Includes" });
      choices.push({ value: "==", label: "Equals" });
      choices.push({ value: "Starts with" });
      choices.push({ value: "Ends with" });
      choices.push({ value: "NOT ==", label: "Does Not Equal" });
      //  TODO:  Need fancier  inputs choices.push({ value: "in",  label: "Is one of  (Comma-separated)"});
    } else if (dtype == "geopos") {
      choices.push({
        value: "Distance <=",
        label: "Distance Within Sphere (dist,lat,lon)",
      });
    } else {
      console.error(`Can't handle filter ops on dtype='{$dtype}'`);
    }

    return choices;
  }
}

/**
 *
 * @param {Tator.AttributeCombinatorSpec} attributeCombinatorSpec
 * @returns HTML string representing the spec
 */
export function processAttributeCombinatorSpec(
  attributeCombinatorSpec,
  memberships = [],
  sections = [],
  versions = [],
  attributeSpanClass = "text-dark-gray",
  inverseSpanClass = "text-gray",
  operationSpanClass = "text-gray",
  valueSpanClass = "text-dark-gray",
  methodSpanClass = "text-semibold text-gray px-1"
) {
  var operationStringTokens = [];
  for (
    let index = 0;
    index < attributeCombinatorSpec.operations.length;
    index++
  ) {
    var operation = attributeCombinatorSpec.operations[index];
    if (
      operation?.attribute == "$created_by" ||
      operation?.attribute == "$modified_by" ||
      operation?.attribute == "$user"
    ) {
      for (const membership of memberships) {
        if (membership.user == parseInt(operation.value)) {
          operation.value = `${membership.username} (ID: ${membership.id})`;
          break;
        }
      }
    } else if (operation?.attribute == "$section") {
      for (const section of sections) {
        if (section.id == parseInt(operation.value)) {
          operation.value = `${section.name} (ID: ${section.id})`;
          break;
        }
      }
    } else if (operation?.attribute == "$version") {
      for (const version of versions) {
        if (version.id == parseInt(operation.value)) {
          operation.value = `${version.name} (ID: ${version.id})`;
          break;
        }
      }
    }

    if (operation.hasOwnProperty("attribute")) {
      operationStringTokens.push("(");
      operationStringTokens.push(
        `<span class="${attributeSpanClass}">${operation.attribute}</span>`
      );
      if (operation.inverse) {
        operationStringTokens.push(
          `<span class="${inverseSpanClass}">NOT</span>`
        );
      }
      operationStringTokens.push(
        `<span class="${operationSpanClass}">${operation.operation}</span>`
      );
      if (operation.value == "" || operation.value == null) {
        operationStringTokens.push(`<span class="${valueSpanClass}">""<span>`);
      } else {
        operationStringTokens.push(
          `<span class="${valueSpanClass}">${operation.value}<span>`
        );
      }
      operationStringTokens.push(")");
    } else {
      operationStringTokens.push("(");
      var groupTokens = processAttributeCombinatorSpec(
        operation,
        memberships,
        sections,
        versions,
        attributeSpanClass,
        inverseSpanClass,
        operationSpanClass,
        valueSpanClass,
        methodSpanClass
      );
      operationStringTokens = operationStringTokens.concat(groupTokens);
      operationStringTokens.push(")");
    }

    if (index < attributeCombinatorSpec.operations.length - 1) {
      operationStringTokens.push(
        `<span class="${methodSpanClass}">${attributeCombinatorSpec.method}</span>`
      );
    }
  }
  return operationStringTokens;
}
