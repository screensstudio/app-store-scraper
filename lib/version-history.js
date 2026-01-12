'use strict';

const common = require('./common');

function versionHistory (opts) {
  opts.country = opts.country || 'US';

  return new Promise((resolve) => {
    if (opts.id) {
      resolve();
    } else {
      throw Error('Either id or appId is required');
    }
  })
    .then(() => {
      const tokenUrl = `https://apps.apple.com/${opts.country}/app/id${opts.id}`;
      return common.request(tokenUrl, {}, opts.requestOptions);
    })
    .then((html) => {
      // Extract the JS bundle URL from the HTML
      const scriptMatch = html.match(/<script type="module" crossorigin src="(\/assets\/index~[^"]+\.js)"><\/script>/);
      if (!scriptMatch) {
        throw Error('Could not find JS bundle URL in App Store page');
      }
      const bundleUrl = `https://apps.apple.com${scriptMatch[1]}`;
      return common.request(bundleUrl, {}, opts.requestOptions);
    })
    .then((jsBundle) => {
      // Extract the JWT token from the JS bundle
      // Token starts with ES256 JWT header: eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6
      const tokenMatch = jsBundle.match(/eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      if (!tokenMatch) {
        throw Error('Could not find bearer token in JS bundle');
      }
      const token = tokenMatch[0];

      const url = `https://amp-api-edge.apps.apple.com/v1/catalog/${opts.country}/apps/${opts.id}?platform=web&extend=versionHistory&additionalPlatforms=appletv,ipad,iphone,mac,realityDevice`;
      return common.request(url, {
        'Origin': 'https://apps.apple.com',
        'Authorization': `Bearer ${token}`
      }, opts.requestOptions);
    })
    .then((json) => {
      if (json.length === 0) { throw Error('App not found (404)'); }

      return JSON.parse(json).data[0].attributes.platformAttributes.ios.versionHistory;
    });
}

module.exports = versionHistory;

