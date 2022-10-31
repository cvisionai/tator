#!/usr/bin/env node

const express = require('express');
const nunjucks = require('nunjucks');
const favicon = require('serve-favicon');
const yargs = require('yargs/yargs');
const app = express();
const port = 3000;

const argv = yargs(process.argv.slice(2))
  .usage('Usage: $0 -b https://cloud.tator.io -o -e')
  .alias('b', 'backend')
  .alias('e', 'email_enabled')
  .alias('o', 'okta_enabled')
  .boolean('e')
  .boolean('o')
  .describe('b', 'Backend host, including protocol. Default is same origin (blank).')
  .describe('e', 'Include this argument if email is enabled in the backend.')
  .describe('o', 'Include this argument if Okta is enabled for authentication.')
  .default('b', '')
  .argv

const params = { 
  backend: argv.backend,
  email_enabled: argv.email_enabled,
  okta_enabled: argv.okta_enabled
};

nunjucks.configure('server/views', {
  express: app,
  autoescape: true
});
app.set('view engine', 'html');
app.use('/static', express.static('./dist'));
app.use('/static', express.static('./server/static'));
app.use(favicon('./server/static/images/favicon.ico'));


app.get('/', (req, res) => {
  res.redirect('/projects');
});

app.get('/:projectId/analytics', (req, res) => {
  res.render('analytics/portal');
});

app.get('/:projectId/analytics/localizations', (req, res) => {
  res.render('analytics/localizations');
});

app.get('/:projectId/analytics/collections', (req, res) => {
  res.render('analytics/collections');
});

app.get('/:projectId/analytics/corrections', (req, res) => {
  res.render('analytics/corrections');
});

app.get('/:projectId/analytics/files', (req, res) => {
  res.render('analytics/files');
});

app.get('/:projectId/dashboards', (req, res) => {
  res.render('analytics/dashboard-portal');
});

app.get('/:projectId/dashboards/:id', (req, res) => {
  res.render('analytics/dashboard');
});

app.get('/organizations', (req, res) => {
  res.render('organizations');
});

app.get('/:organizationId/organization-settings', (req, res) => {
  res.render('organization-settings');
});

app.get('/projects', (req, res) => {
  res.render('projects', params);
});

app.get('/:projectId/project-detail', (req, res) => {
  res.render('project-detail', params);
});

app.get('/:projectId/project-settings', (req, res) => {
  res.status(404).end();
});

app.get('/:projectId/annotation/:id', (req, res) => {
  res.status(404).end();
});

app.get('/token', (req, res) => {
  res.render('token', params);
});

app.get('/rest', (req, res) => {
  res.render('browser', params);
});

app.use((req, res, next) => {
  res.status(404).end();
});

/*
    path('stream-saver/sw.js', StreamSaverSWLocal.as_view(), name='sw'),
    path('stream-saver/mitm.html', StreamSaverMITMLocal.as_view(), name='mitm'),
    path('auth-project', AuthProjectView.as_view()),
    path('auth-admin', AuthAdminView.as_view()),
*/

app.listen(port, () => {
  console.log('Started express server!');
});

