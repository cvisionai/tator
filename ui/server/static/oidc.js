function exchangeAuthToken() {
  const currentUrl = new URL(window.location);
  const searchParams = currentUrl.searchParams;
  const origin = currentUrl.origin;
  const code = searchParams.get("code");
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
      let postLoginPath = localStorage.getItem("postLoginPath") || "/projects";
      const expiresAtString = localStorage.getItem("postLoginPathExpiresAt");
      const expiresAt = new Date(expiresAtString);
      const currentDate = new Date();
      if (expiresAt < currentDate) {
        console.log("Post login path is expired, ignoring.");
        postLoginPath = "/projects";
      }
      console.log(
        `Login successful, going to post login path ${postLoginPath}`
      );
      window.location.href = postLoginPath;
    })
    .catch((error) => {
      console.error("Error exchanging token!");
      window.location.href = `/accounts/login`;
    });
}
