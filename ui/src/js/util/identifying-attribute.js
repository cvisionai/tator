export function identifyingAttribute(dataTypes) {
  const sorted = dataTypes.attribute_types.sort((a, b) => a.order - b.order);
  for (const dataType of sorted) {
    if (dataType.order >= 0) {
      if (dataType.dtype == "string" || dataType.dtype == "enum") {
        return dataType;
      }
    }
  }
}
