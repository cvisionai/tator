function exchangeAuthToken () {
  const currentUrl = new URL(window.location);
  const searchParams = currentUrl.searchParams;
  const origin = currentUrl.origin;
  const code = searchParams.get("code");
  const next = searchParams.get("state");
  fetch("/exchange", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      origin: origin,
      code: code,
    }),
  })
  .then((response) => {
    if (!response.ok) {
      throw new Error("Authentication failed!");
    }
    return response.json();
  })
  .then((data) => {
    const issueTime = new Date();
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("expires_in", data.expires_in);
    localStorage.setItem("id_token", data.id_token);
    localStorage.setItem("token_type", data.token_type);
    localStorage.setItem("issue_time", issueTime.toISOString());
    if (next) {
      if (next[0] == '/') {
        window.location.href = next;
      } else {
        window.location.href = "/projects";
      }
    } else {
      window.location.href = "/projects";
    }
  })
  .catch((error) => {
    console.error("Error exchanging token!");
    window.location.href = `/accounts/login&state=${window.location.pathname}`;
  });
}
