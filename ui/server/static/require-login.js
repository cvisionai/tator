function getCookie(name) {
  let value = "; " + document.cookie;
  let parts = value.split("; " + name + "=");
  if (parts.length == 2) {
    return parts.pop().split(";").shift();
  }
}
const backend = window.localStorage.getItem("backend");
if (window.location.pathname != "/accounts/login") {
  fetch(`${backend}/rest/Session`, {
    method: "GET",
    credentials: "include",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  })
  .then(response => {
    if (response.status == 404) {
      window.location.href = `/accounts/login?next=${window.location.pathname}`;
    }
  });
}
  
