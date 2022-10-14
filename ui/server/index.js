const express = require('express');
const app = express();
const port = 3000;

app.set('view engine', 'nunjucks');

app.get('/accounts/account-profile', (req, res) => {
});

app.get('/:projectId/analytics', (req, res) => {
});

app.get('/:projectId/analytics/localizations', (req, res) => {
});

app.get('/:projectId/analytics/collections', (req, res) => {
});

app.get('/:projectId/analytics/corrections', (req, res) => {
});

app.get('/:projectId/analytics/files', (req, res) => {
});

app.get('/:projectId/dashboards', (req, res) => {
});

app.get('/:projectId/dashboards/:id', (req, res) => {
});

app.get('/organizations', (req, res) => {
});

app.get('/:organizationId/organization-settings', (req, res) => {
});

app.get('/projects', (req, res) => {
  res.render('projects');
});

app.get('/:projectId/project-detail', (req, res) => {
});

app.get('/:projectId/project-detail', (req, res) => {
});

app.get('/:projectId/project-detail', (req, res) => {
});

app.get('/:projectId/project-settings', (req, res) => {
});

app.get('/:projectId/annotation/:id', (req, res) => {
});

app.get('/registration', (req, res) => {
});

app.get('/accept', (req, res) => {
});

app.get('/token', (req, res) => {
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
