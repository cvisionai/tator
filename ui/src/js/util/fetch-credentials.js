import { getCookie } from "./get-cookie.js";
import { fetchRetry } from "./fetch-retry.js";
import { getOrRefreshAccessToken } from "../../../../scripts/packages/tator-js/src/utils/api-proxy.js";

function djangoCredentials() {
  return {
    credentials: "same-origin",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  };
}

async function keycloakCredentials() {
  const accessToken = await getOrRefreshAccessToken();
  return {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    }
  };
}

async function fetchCredentials(url, opts={}, retry=false) {
  const keycloakEnabled = localStorage.getItem("keycloak_enabled");
  let credentials;
  if (keycloakEnabled == 'true') {
    credentials = await keycloakCredentials();
  } else {
    credentials = djangoCredentials();
  }
  if (retry) {
    return fetchRetry(url, {...credentials, ...opts});
  } else {
    return fetch(url, {...credentials, ...opts});
  }
}

export { fetchCredentials };
