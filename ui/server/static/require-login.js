function getCookie(name) {
  let value = "; " + document.cookie;
  let parts = value.split("; " + name + "=");
  if (parts.length == 2) {
    return parts.pop().split(";").shift();
  }
}
const NO_LOGIN_VIEWS = [
  '/accounts/login', '/redirect/login',
]
const backend = window.localStorage.getItem("backend");
if (!NO_LOGIN_VIEWS.includes(window.location.pathname)) {
  fetch(`${backend}/accounts/account-profile`, {
    method: "GET",
    credentials: "include",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  })
  .then(response => {
    const url = new URL(response.url);
    if (response.status == 301 || url.pathname.startsWith('/accounts/login')) {
      window.location.href = `/accounts/login/?next=${window.location.pathname}`;
    }
  });
}
  
