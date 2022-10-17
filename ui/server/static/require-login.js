function getCookie(name) {
  let value = "; " + document.cookie;
  let parts = value.split("; " + name + "=");
  if (parts.length == 2) {
    return parts.pop().split(";").shift();
  }
}
const backend = window.localStorage.getItem("backend");
fetch(`${backend}/rest/Session`, {
  method: "GET",
  credentials: "same-origin",
  headers: {
    "X-CSRFToken": getCookie("csrftoken"),
    "Accept": "application/json",
    "Content-Type": "application/json"
  }
})
.then(response => {
  if (response.status == 204) {
    window.location.href = `/accounts/login?next=${window.location.pathname}`;
  }
});
  
