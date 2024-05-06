function getCookie(name) {
  let value = "; " + document.cookie;
  let parts = value.split("; " + name + "=");
  if (parts.length == 2) {
    return parts.pop().split(";").shift();
  }
}

function goToLogin() {
  if (KEYCLOAK_ENABLED) {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    const expiresAtString = expiresAt.toString();
    console.log(`Storing post login path as ${window.location.pathname}, expires at ${expiresAtString}`);
    localStorage.setItem("postLoginPath", window.location.pathname);
    localStorage.setItem("postLoginPathExpiresAt", expiresAtString);
    window.location.href = `/accounts/login`;
  } else {
    window.location.href = `/accounts/login?next=${window.location.pathname}`;
  }
}

const NO_LOGIN_VIEWS = [
  '/accounts/login', '/registration',
  '/accept', '/password-reset', '/password-reset-request',
]
if (!NO_LOGIN_VIEWS.includes(window.location.pathname)) {
  if (KEYCLOAK_ENABLED) {
    let accessToken = localStorage.getItem("access_token");
    if (accessToken === null) {
      goToLogin();
    }
  } else {
    fetch(`${BACKEND}/check-login`, {
      method: "GET",
      credentials: "include",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    })
    .then(response => response.json())
    .then(data => {
      if (!data.is_authenticated) {
        goToLogin();
      }
    })
    .catch(error => {
      console.error("Error checking login status: ", error);
    });
      
  }
}
  
