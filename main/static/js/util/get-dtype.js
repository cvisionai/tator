function getDtype(obj) {
  // Guesses the data type of an object based on values.
  let dtype = "state";
  if (typeof obj.x !== "undefined") {
    dtype = "dot";
    if (obj.width !== null) {
      dtype = "box";
    } else if (obj.u !== null) {
      dtype = "line";
    }
  }
  return dtype;
}
