var originalFetch = require('isomorphic-fetch');
export var fetchRetry = require('fetch-retry')(originalFetch, {
    retries: 5,
    retryDelay: 800
  });
