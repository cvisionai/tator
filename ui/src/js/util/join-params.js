// Join multiple URLSearchParams.
export function joinParams(...args) {
  out = new URLSearchParams();
  for (const arg of args) {
    for (const [key, val] of arg.entries()) {
      out.append(key, val);
    }
  }
  return out;
}
