function identifyingAttribute(dataTypes) {
  const sorted = dataTypes.columns.sort((a, b) => a.order - b.order);
  for (const dataType of sorted) {
    if ((dataType.dtype == "str") || (dataType.dtype == "enum")) {
      return dataType;
    }
  }
}
