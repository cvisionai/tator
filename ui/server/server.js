#!/usr/bin/env node

const express = require('express');
const nunjucks = require('nunjucks');
const favicon = require('serve-favicon');
const proxy = require('express-http-proxy');
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

app.get('/rest', (req, res) => {
  res.render('browser', params);
});

app.listen(port, () => {
  console.log('Started express server!');
});

