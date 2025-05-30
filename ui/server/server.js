#!/usr/bin/env node

const tracer = require("dd-trace").init();
const express = require("express");
const crypto = require("crypto");
const nunjucks = require("nunjucks");
const favicon = require("serve-favicon");
const proxy = require("express-http-proxy");
const cookieParser = require("cookie-parser");
const originalFetch = require("node-fetch");
const fetch = require("fetch-retry")(originalFetch);
const dns = require("dns");
const yargs = require("yargs/yargs");
const logger = require("pino-http");

const loginPath = "/auth/realms/tator/protocol/openid-connect/auth";
const loginQuery = "scope=openid&client_id=tator&response_type=code";
const logoutPath = "/auth/realms/tator/protocol/openid-connect/logout";
const redirect_uri_default = `http://localhost:3000/callback`;

dns.setServers(["8.8.8.8", "1.1.1.1"]);
const app = express();
app.use(logger());

const argv = yargs(process.argv.slice(2))
  .usage("Usage: $0 -b https://cloud.tator.io -o -e")
  .alias("h", "host")
  .alias("p", "port")
  .alias("b", "backend")
  .alias("e", "email_enabled")
  .alias("o", "okta_enabled")
  .alias("k", "keycloak_enabled")
  .alias("r", "redirect_uri")
  .boolean("e")
  .boolean("o")
  .boolean("k")
  .describe("h", "Express host. Default is localhost.")
  .describe("p", "Express port. Default is 3000.")
  .describe(
    "b",
    "Backend host, including protocol. Default is same origin (blank)."
  )
  .describe("e", "Include this argument if email is enabled in the backend.")
  .describe("o", "Include this argument if Okta is enabled for authentication.")
  .describe(
    "k",
    "Include this argument if Keycloak is enabled for authentication."
  )
  .describe(
    "r",
    `Redirect URI for auth code callback. Default is ${redirect_uri_default}.`
  )
  .describe("static_path", "URL path to static files")
  .describe("max_age", "Max age to cache static files in seconds")
  .default("h", "localhost")
  .default("p", 3000)
  .default("b", "")
  .default("k", false)
  .default("r", redirect_uri_default)
  .default("static_path", "/static")
  .default("max_age", 0).argv;

function addHeaders(res, path, stat) {
  if (argv.keycloak_enabled) {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  }
  return res;
}

const allowedHosts = [process.env.MAIN_HOST];
if (process.env.ALIAS_HOSTS) {
  allowedHosts.push(process.env.ALIAS_HOSTS.split(","));
}
if (argv.backend) {
  allowedHosts.push(argv.backend);
}

const params = {
  backend: argv.backend,
  email_enabled: argv.email_enabled,
  okta_enabled: argv.okta_enabled,
  keycloak_enabled: argv.keycloak_enabled,
  static_path: argv.static_path,
  datadog_enabled: process.env.DD_LOGS_INJECTION == "true",
  datadog_client_token: process.env.DD_CLIENT_TOKEN || "",
  datadog_application_id: process.env.DD_APPLICATION_ID || "",
  datadog_env: process.env.DD_ENV || "",
  datadog_version: process.env.DD_VERSION || "",
  datadog_allowed_hosts: allowedHosts.join(","),
};

nunjucks.configure("server/views", {
  express: app,
  autoescape: true,
});
app.set("view engine", "html");

// Serve favicon.
app.use(favicon("./server/static/images/favicon.ico"));

// Serve legacy bundles for applets until they can be updated.
app.use(
  "/static",
  express.static("./legacy", { setHeaders: addHeaders, maxAge: 0 })
);

// Serve static images in the static directory.
app.use(
  "/static/images",
  express.static("./server/static/images", {
    setHeaders: addHeaders,
    maxAge: 0,
  })
);

// Middleware to generate a nonce for use in CSP.
app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  params['csp_nonce'] = nonce;
  next();
});

const maxAgeMilliseconds = argv.max_age * 1000;
const staticMap = {
  "./server/static": argv.static_path,
  "../scripts/packages/tator-js/src/annotator": argv.static_path,
  "./src": `${argv.static_path}/ui/src`,
  "./node_modules/zustand/esm": `${argv.static_path}/ui/node_modules/zustand/esm`,
  "./node_modules/uuid/dist/esm-browser": `${argv.static_path}/ui/node_modules/uuid/dist/esm-browser`,
  "./node_modules/d3/dist": `${argv.static_path}/ui/node_modules/d3/dist`,
  "./node_modules/autocompleter": `${argv.static_path}/ui/node_modules/autocompleter`,
  "./node_modules/marked/lib": `${argv.static_path}/ui/node_modules/marked/lib`,
  "./node_modules/libtess": `${argv.static_path}/ui/node_modules/libtess`,
  "./node_modules/hls.js/dist": `${argv.static_path}/ui/node_modules/hls.js/dist`,
  "./node_modules/earcut": `${argv.static_path}/ui/node_modules/earcut`,
  "./node_modules/underwater-image-color-correction": `${argv.static_path}/ui/node_modules/underwater-image-color-correction`,
  "./node_modules/spark-md5": `${argv.static_path}/ui/node_modules/spark-md5`,
  "./node_modules/swagger-ui-dist": `${argv.static_path}/ui/node_modules/swagger`,
  "../scripts": `${argv.static_path}/scripts`,
};
for (const [dir, path] of Object.entries(staticMap)) {
  app.use(
    path,
    express.static(dir, { setHeaders: addHeaders, maxAge: maxAgeMilliseconds, immutable: true })
  );
  if (dir === "./server/static" && path != "/static") {
    // This lets django admin panel see static files at static as it doesn't get templated with GIT_REVISION
    app.use(
      "/static",
      express.static(dir, {
        setHeaders: addHeaders,
        maxAge: maxAgeMilliseconds,
        immutable: true,
      })
    );
  }
  if (dir === "../scripts" && path != "/static") {
    app.use(
      "/static/scripts",
      express.static(dir, {
        setHeaders: addHeaders,
        maxAge: maxAgeMilliseconds,
      })
    );
  }
}
app.use(express.json());
app.use(cookieParser());

if (params.backend) {
  let opts = {};
  if (params.keycloak_enabled) {
    app.use("/accounts/login", (req, res) => {
      res.redirect(
        `${argv.backend}${loginPath}?${loginQuery}&redirect_uri=${argv.redirect_uri}`
      );
    });
  }
  app.use(
    "/media",
    proxy(argv.backend, {
      proxyReqPathResolver: function (req) {
        return "/media" + req.url;
      },
    })
  );
}

app.get("/", (req, res) => {
  res.redirect(301, "/projects");
});

app.get("/:projectId/analytics", (req, res) => {
  res.render("analytics/portal", params);
});

app.get("/:projectId/analytics/localizations", (req, res) => {
  res.render("analytics/localizations", params);
});

app.get("/:projectId/analytics/collections", (req, res) => {
  res.render("analytics/collections", params);
});

app.get("/:projectId/analytics/corrections", (req, res) => {
  res.render("analytics/corrections", params);
});

app.get("/:projectId/analytics/files", (req, res) => {
  res.render("analytics/files", params);
});

app.get("/:projectId/analytics/export", (req, res) => {
  res.render("analytics/export", params);
});

app.get("/:projectId/dashboards", (req, res) => {
  res.render("analytics/dashboard-portal", params);
});

app.get("/:projectId/dashboards/:id", (req, res) => {
  res.render("analytics/dashboard", params);
});

app.get("/organizations", (req, res) => {
  res.render("organizations", params);
});

app.get("/:organizationId/organization-settings", (req, res) => {
  res.render("organization-settings", params);
});

app.get("/projects", (req, res) => {
  res.render("projects", params);
});

app.get("/:projectId/project-detail", (req, res) => {
  res.render("project-detail", params);
});

app.get("/:projectId/project-settings", (req, res) => {
  res.render("project-settings", params);
});

app.get("/:projectId/annotation/:id", (req, res) => {
  res.render("annotation", params);
  res = addHeaders(res);
});

app.get("/permission-settings", (req, res) => {
  res.render("permission-settings", params);
});

app.get("/token", (req, res) => {
  res.render("token", params);
});

app.get("/account-profile", (req, res) => {
  res.render("account-profile", params);
});

app.get("/registration", (req, res) => {
  res.render("registration", params);
});

app.get("/accept", (req, res) => {
  res.render("accept", params);
});

app.get("/password-reset-request", (req, res) => {
  res.set('Cache-Control', 'no-cache, must-revalidate');
  res.set('X-Content-Type-Options', 'nosniff');
  let backend = "'self'"
  if (params.backend) {
     backend = `'self' ${params.backend}`;
  }  
  res.set('Content-Security-Policy', `default-src ${backend}; script-src ${backend} 'nonce-${params.csp_nonce}'; frame-ancestors 'none'; form-action ${backend};`);
  res.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), fullscreen=(self), payment=(), autoplay=(), accelerometer=(), gyroscope=(), magnetometer=(), midi=(), usb=(), xr-spatial-tracking=(), picture-in-picture=(), interest-cohort=(), sync-xhr=(), clipboard-read=(), clipboard-write=(), gamepad=(), display-capture=()');
  res.render("password-reset-request", params);
});

app.get("/password-reset", (req, res) => {
  res.render("password-reset", params);
});

app.get("/rest", (req, res) => {
  res.render("browser", params);
});

app.get("/callback", (req, res) => {
  res.render("callback", params);
});

app.post("/exchange", async (req, res) => {
  const body = new URLSearchParams();
  body.append("grant_type", "authorization_code");
  body.append("client_id", "tator");
  body.append("code", req.body.code);
  body.append("redirect_uri", `${req.body.origin}/callback`); // Callback URL is validated by keycloak
  const url = `${argv.backend}/auth/realms/tator/protocol/openid-connect/token`;
  try {
    await fetch(url, {
      retries: 10,
      retryDelay: 100,
      method: "POST",
      body: body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
      .then((response) => {
        if (!response.ok) {
          req.log.error(
            `Error: Request failed with status ${response.status} ${response.statusText}`
          );
          throw new Error("Response from keycloak failed!");
        }
        return response.json();
      })
      .then((data) => {
        const options = {
          maxAge: data.refresh_expires_in * 1000,
          sameSite: "strict",
          secure: true,
          httpOnly: true,
          path: "/refresh",
        };
        res.cookie("refresh_token", data.refresh_token, options);
        options.path = "/media";
        res.cookie("access_token", data.access_token, options);
        options.path = "/admin";
        res.cookie("access_token", data.access_token, options);
        options.path = "/bespoke";
        res.cookie("access_token", data.access_token, options);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.status(200).json({
          access_token: data.access_token,
          expires_in: data.expires_in,
          token_type: data.token_type,
          id_token: data.id_token,
        });
      })
      .catch((error) => {
        req.log.error(`Error in fetch for exchange: ${error}`);
        req.log.error(error.message);
        req.log.error(error.stack);
        return Promise.reject(error);
      });
  } catch (error) {
    req.log.error(`Error in exchange endpoint: ${error}`);
    req.log.error(error.message);
    req.log.error(error.stack);
    res.status(403).send({ message: "Failed to retrieve access token!" });
  }
});

app.get("/refresh", async (req, res) => {
  const body = new URLSearchParams();
  body.append("grant_type", "refresh_token");
  body.append("client_id", "tator");
  body.append("refresh_token", req.cookies.refresh_token);
  if (typeof req.cookies.refresh_token === "undefined") {
    res.status(403).send({ message: "No refresh token!" });
  } else {
    const url = `${argv.backend}/auth/realms/tator/protocol/openid-connect/token`;
    try {
      await fetch(url, {
        retries: 10,
        retryDelay: 100,
        method: "POST",
        body: body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      })
        .then((response) => {
          if (!response.ok) {
            req.log.error(
              `Error: Request failed with status ${response.status} ${response.statusText}`
            );
            throw new Error("Response from keycloak failed!");
          }
          return response.json();
        })
        .then((data) => {
          const options = {
            maxAge: data.refresh_expires_in * 1000,
            sameSite: "strict",
            secure: true,
            httpOnly: true,
            path: "/refresh",
          };
          res.cookie("refresh_token", data.refresh_token, options);
          options.path = "/media";
          res.cookie("access_token", data.access_token, options);
          options.path = "/admin";
          res.cookie("access_token", data.access_token, options);
          options.path = "/bespoke";
          res.cookie("access_token", data.access_token, options);
          res.status(200).json({
            access_token: data.access_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
            id_token: data.id_token,
          });
        })
        .catch((error) => {
          req.log.error(`Error in fetch for refresh: ${error}`);
          req.log.error(error.message);
          req.log.error(error.stack);
          return Promise.reject(error);
        });
    } catch (error) {
      req.log.error(`Error in refresh endpoint: ${error}`);
      req.log.error(error.message);
      req.log.error(error.stack);
      res.status(403).send({ message: "Failed to refresh access token!" });
    }
  }
});

app.get("/dnstest", async (req, res) => {
  try {
    await fetch(argv.backend, {
      retries: 10,
      retryDelay: 100,
      method: "GET",
    })
      .then((response) => {
        if (!response.ok) {
          req.log.error(
            `Error: Request failed with status ${response.status} ${response.statusText}`
          );
          throw new Error("Response from backend failed!");
        }
        res.status(200).send({ message: "DNS was resolved!" });
      })
      .catch((error) => {
        req.log.error(`Error in fetch to backend: ${error}`);
        req.log.error(error.message);
        req.log.error(error.stack);
        return Promise.reject(error);
      });
  } catch (error) {
    req.log.error(`Error in DNS test: ${error}`);
    req.log.error(error.message);
    req.log.error(error.stack);
    res.status(400).send({ message: "DNS test failed!" });
  }
});

app.listen(argv.port, argv.host, () => {
  console.log("Started express server!");
});
