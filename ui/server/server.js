#!/usr/bin/env node

const express = require('express');
const nunjucks = require('nunjucks');
const favicon = require('serve-favicon');
const proxy = require('express-http-proxy');
const cookieParser = require('cookie-parser');
const originalFetch = require('node-fetch');
const fetch = require('fetch-retry')(originalFetch);
const dns = require('dns');
const yargs = require('yargs/yargs');

const loginPath = "/auth/realms/tator/protocol/openid-connect/auth";
const loginQuery = "scope=openid&client_id=tator&response_type=code";
const logoutPath = "/auth/realms/tator/protocol/openid-connect/logout";
const redirect_uri_default = `http://localhost:3000/callback`;
const redirect_uri_logout = `http://localhost:3000/login`; 

dns.setServers([
  '8.8.8.8',
  '1.1.1.1',
]);
const app = express();

const argv = yargs(process.argv.slice(2))
  .usage('Usage: $0 -b https://cloud.tator.io -o -e')
  .alias('h', 'host')
  .alias('p', 'port')
  .alias('b', 'backend')
  .alias('e', 'email_enabled')
  .alias('o', 'okta_enabled')
  .alias('k', 'keycloak_enabled')
  .alias("r", "redirect_uri")
  .alias("l", "redirect_uri_logout")
  .boolean('e')
  .boolean('o')
  .boolean('k')
  .describe('h', 'Express host. Default is localhost.')
  .describe('p', 'Express port. Default is 3000.')
  .describe('b', 'Backend host, including protocol. Default is same origin (blank).')
  .describe('e', 'Include this argument if email is enabled in the backend.')
  .describe('o', 'Include this argument if Okta is enabled for authentication.')
  .describe('k', 'Include this argument if Keycloak is enabled for authentication.')
  .describe(
    "r",
    `Redirect URI for auth code callback. Default is ${redirect_uri_default}.`
  )
  .describe("l", `Redirect URI for logout. Default is ${redirect_uri_logout}.`)
  .default('h', 'localhost')
  .default('p', 3000)
  .default('b', '')
  .default('k', false)
  .default("r", redirect_uri_default)
  .default("l", redirect_uri_logout)
  .argv

const params = { 
  backend: argv.backend,
  email_enabled: argv.email_enabled,
  okta_enabled: argv.okta_enabled,
  keycloak_enabled: argv.keycloak_enabled,
};

nunjucks.configure('server/views', {
  express: app,
  autoescape: true
});
app.set('view engine', 'html');
app.use('/static', express.static('./dist'));
app.use('/static', express.static('./server/static'));
app.use(favicon('./server/static/images/favicon.ico'));
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

    app.get("/accounts/logout", (req, res) => {
      res.render("logout", params);
    });
  }
}

app.get('/', (req, res) => {
  res.redirect(301, '/projects');
});

app.get('/:projectId/analytics', (req, res) => {
  res.render('analytics/portal', params);
});

app.get('/:projectId/analytics/localizations', (req, res) => {
  res.render('analytics/localizations', params);
});

app.get('/:projectId/analytics/collections', (req, res) => {
  res.render('analytics/collections', params);
});

app.get('/:projectId/analytics/corrections', (req, res) => {
  res.render('analytics/corrections', params);
});

app.get('/:projectId/analytics/files', (req, res) => {
  res.render('analytics/files', params);
});

app.get('/:projectId/dashboards', (req, res) => {
  res.render('analytics/dashboard-portal', params);
});

app.get('/:projectId/dashboards/:id', (req, res) => {
  res.render('analytics/dashboard', params);
});

app.get('/organizations', (req, res) => {
  res.render('organizations', params);
});

app.get('/:organizationId/organization-settings', (req, res) => {
  res.render('organization-settings', params);
});

app.get('/projects', (req, res) => {
  res.render('projects', params);
});

app.get('/:projectId/project-detail', (req, res) => {
  res.render('project-detail', params);
});

app.get('/:projectId/project-settings', (req, res) => {
  res.render('project-settings', params);
});

app.get('/:projectId/annotation/:id', (req, res) => {
  res.render('annotation', params);
});

app.get('/token', (req, res) => {
  res.render('token', params);
});

app.get('/account-profile', (req, res) => {
  res.render('account-profile', params);
});

app.get('/registration', (req, res) => {
  res.render('registration', params);
});

app.get('/accept', (req, res) => {
  res.render('accept', params);
});

app.get('/password-reset-request', (req, res) => {
  res.render('password-reset-request', params);
});

app.get('/password-reset', (req, res) => {
  res.render('password-reset', params);
});

app.get('/rest', (req, res) => {
  res.render('browser', params);
});

app.get('/callback', (req, res) => {
  res.render('callback', params);
});

app.post('/exchange', async (req, res) => {
  const body = new URLSearchParams();
  body.append('grant_type', 'authorization_code');
  body.append('client_id', 'tator');
  body.append('code', req.body.code);
  body.append('redirect_uri', `${req.body.origin}/callback`); // Callback URL is validated by keycloak
  const url = `${argv.backend}/auth/realms/tator/protocol/openid-connect/token`;
  try {
    await fetch(url, {
      retries: 10,
      retryDelay: 100,
      method: "POST",
      body: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    })
    .then(response => {
      if (!response.ok) {
        console.error(`Error: Request failed with status ${response.status} ${response.statusText}`);
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
      }
      res.cookie("refresh_token", data.refresh_token, options);
      options.path = "/media";
      res.cookie("access_token", data.access_token, options);
      options.path = "/admin";
      res.cookie("access_token", data.access_token, options);
      options.path = "/bespoke";
      res.cookie("access_token", data.access_token, options);
      res.setHeader("Access-Control-Allow-Credentials", 'true');
      res.status(200).json({
        access_token: data.access_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        id_token: data.id_token,
      });
    })
    .catch((error) => {
      console.error(`Error in fetch for exchange: ${error}`);
      console.error(error.message);
      console.error(error.stack);
      return Promise.reject(error);
    });
  } catch (error) {
    console.error(`Error in exchange endpoint: ${error}`);
    console.error(error.message);
    console.error(error.stack);
    res.status(403).send({message: "Failed to retrieve access token!"});
  }
});

app.get('/refresh', async (req, res) => {
  const body = new URLSearchParams();
  body.append('grant_type', 'refresh_token');
  body.append('client_id', 'tator');
  body.append('refresh_token', req.cookies.refresh_token);
  if (typeof req.cookies.refresh_token === "undefined") {
    res.status(403).send({message: "No refresh token!"});
  } else {
    const url = `${argv.backend}/auth/realms/tator/protocol/openid-connect/token`;
    try {
      await fetch(url, {
        retries: 10,
        retryDelay: 100,
        method: "POST",
        body: body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
      })
      .then(response => {
        if (!response.ok) {
          console.error(`Error: Request failed with status ${response.status} ${response.statusText}`);
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
        }
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
        console.error(`Error in fetch for refresh: ${error}`);
        console.error(error.message);
        console.error(error.stack);
        return Promise.reject(error);
      });
    } catch (error) {
      console.error(`Error in refresh endpoint: ${error}`);
      console.error(error.message);
      console.error(error.stack);
      res.status(403).send({message: "Failed to refresh access token!"});
    }
  }
});

app.get('/dnstest', async (req, res) => {
  try {
    await fetch(argv.backend, {
      retries: 10,
      retryDelay: 100,
      method: "GET",
    })
    .then(response => {
      if (!response.ok) {
        console.error(`Error: Request failed with status ${response.status} ${response.statusText}`);
        throw new Error("Response from backend failed!");
      }
      res.status(200).send({message: "DNS was resolved!"});
    })
    .catch((error) => {
      console.error(`Error in fetch to backend: ${error}`);
      console.error(error.message);
      console.error(error.stack);
      return Promise.reject(error);
    });
  } catch (error) {
    console.error(`Error in DNS test: ${error}`);
    console.error(error.message);
    console.error(error.stack);
    res.status(400).send({message: "DNS test failed!"});
  }
});

app.listen(argv.port, argv.host, () => {
  console.log('Started express server!');
});

