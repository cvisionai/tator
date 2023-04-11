function getCookie(name) {
  let value = "; " + document.cookie;
  let parts = value.split("; " + name + "=");
  if (parts.length == 2) {
    return parts.pop().split(";").shift();
  }
}

function goToLogin() {
  if (KEYCLOAK_ENABLED) {
    window.location.href = `/accounts/login&state=${window.location.pathname}`;
  } else {
    window.location.href = `/accounts/login?next=${window.location.pathname}`;
  }
}

if (window.location.pathname != "/accounts/login") {
  if (KEYCLOAK_ENABLED) {
    let accessToken = localStorage.getItem("access_token");
    if (accessToken === null) {
      goToLogin();
    }
  } else {
    fetch(`${BACKEND}/accounts/account-profile`, {
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
        goToLogin();
      }
    });
  }
}
  
