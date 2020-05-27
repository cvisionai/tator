function getDtype(obj) {
  // Guesses the data type of an object based on values.
  let dtype = "state";
  if (typeof obj.x !== "undefined") {
    dtype = "dot";
    if (obj.width !== null && typeof obj.width !== "undefined") {
      dtype = "box";
    } else if (obj.u !== null && typeof obj.u !== "undefined") {
      dtype = "line";
    }
  }
  return dtype;
}
