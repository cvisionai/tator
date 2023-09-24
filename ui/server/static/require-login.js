function getCookie(name) {
  let value = "; " + document.cookie;
  let parts = value.split("; " + name + "=");
  if (parts.length == 2) {
    return parts.pop().split(";").shift();
  }
}
const backend = window.localStorage.getItem("backend");
if (window.location.pathname != "/redirect/login") {
  fetch(`${backend}/accounts/account-profile`, {
    method: "GET",
    credentials: "include",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  })
  .then((response) => {
    const url = new URL(response.url);
    if (response.status == 301 || url.pathname.startsWith('/redirect/login')) {
      window.location.href = `/redirect/login/?next=${window.location.pathname}`;
    }
  },
  (error) => {
      window.location.href = `/redirect/login/?next=${window.location.pathname}`;
  });
}
