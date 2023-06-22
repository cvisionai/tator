#!/usr/bin/env node

const express = require('express');
const nunjucks = require('nunjucks');
const favicon = require('serve-favicon');
const proxy = require('express-http-proxy');
const cookieParser = require('cookie-parser');
const yargs = require('yargs/yargs');
const app = express();

const argv = yargs(process.argv.slice(2))
  .usage('Usage: $0 -b https://cloud.tator.io -o -e')
  .alias('h', 'host')
  .alias('p', 'port')
  .alias('b', 'backend')
  .alias('e', 'email_enabled')
  .alias('o', 'okta_enabled')
  .alias('k', 'keycloak_enabled')
  .alias('m', 'prelogin_message')
  .alias('r', 'prelogin_redirect')
  .boolean('e')
  .boolean('o')
  .boolean('k')
  .describe('h', 'Express host. Default is localhost.')
  .describe('p', 'Express port. Default is 3000.')
  .describe('b', 'Backend host, including protocol. Default is same origin (blank).')
  .describe('e', 'Include this argument if email is enabled in the backend.')
  .describe('o', 'Include this argument if Okta is enabled for authentication.')
  .describe('k', 'Include this argument if Keycloak is enabled for authentication.')
  .describe('m', 'Message to display at /prelogin.')
  .describe('r', 'Redirect path for the accept button at /prelogin.')
  .default('h', 'localhost')
  .default('p', 3000)
  .default('b', '')
  .default('k', false)
  .default('m', '')
  .default('r', '')
  .argv

const params = { 
  backend: argv.backend,
  email_enabled: argv.email_enabled,
  okta_enabled: argv.okta_enabled,
  keycloak_enabled: argv.keycloak_enabled,
  prelogin_message: argv.prelogin_message.replaceAll("COLON", ":").split("\\n"),
  prelogin_redirect: argv.prelogin_redirect,
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
    opts.proxyReqPathResolver = function(req) {
      return `/auth/realms/tator/protocol/openid-connect/auth?scope=openid&client_id=tator&response_type=code&redirect_uri=http://localhost:${port}/callback`;
    };
  }
  app.use('/accounts/login', proxy(params.backend, opts));
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

app.get('/prelogin', (req, res) => {
  res.render('prelogin', params);
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
      res.setHeader("Access-Control-Allow-Credentials", 'true');
      res.status(200).json({
        access_token: data.access_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        id_token: data.id_token,
      });
    })
    .catch((error) => {
      console.error(`Error in exchange endpoint: ${error}`);
      return Promise.reject(error);
    });
  } catch (error) {
    console.error(`Error in exchange endpoint: ${error}`);
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
          path: "/media",
        }
        res.cookie("access_token", data.access_token, options);
        options.path = "/admin";
        res.cookie("access_token", data.access_token, options);
        res.status(200).json({
          access_token: data.access_token,
          expires_in: data.expires_in,
          token_type: data.token_type,
          id_token: data.id_token,
        });
      })
      .catch((error) => {
        console.error(`Error in refresh endpoint: ${error}`);
        return Promise.reject(error);
      });
    } catch (error) {
      console.error(`Error in refresh endpoint: ${error}`);
      res.status(403).send({message: "Failed to refresh access token!"});
    }
  }
});

app.listen(argv.port, argv.host, () => {
  console.log('Started express server!');
});

