'use strict';

const R = require('ramda');
const common = require('./common');
const app = require('./app');
const c = require('./constants');

// apps.apple.com rate limits clients that send no User-Agent.
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9'
};

// The legacy /rss/customerreviews/ feed still answers 200 but never returns entries.
// This is the endpoint the App Store web front-end itself calls; it needs no token.
const PAGE_SIZE = 20;

function cleanList (response) {
  if (!response || !Array.isArray(response.data)) {
    throw Error('Could not find reviews in App Store response');
  }

  return response.data.map((review) => {
    const attributes = review.attributes || {};
    return {
      id: review.id,
      userName: attributes.userName,
      score: attributes.rating,
      title: attributes.title,
      text: attributes.review,
      updated: attributes.date
    };
  });
}

const reviews = (opts) => new Promise((resolve) => {
  validate(opts);

  if (opts.id) {
    resolve(opts.id);
  } else if (opts.appId) {
    resolve(app(opts).then(app => app.id));
  }
})
  .then((id) => {
    opts = opts || {};
    opts.page = opts.page || 1;
    opts.country = opts.country || 'us';

    // The endpoint takes no ordering parameter: it always answers in Apple's own
    // relevance order, so opts.sort cannot be honoured and callers must page through
    // the whole list rather than stop at the first already-seen review.
    const offset = (opts.page - 1) * PAGE_SIZE;
    const url = `https://apps.apple.com/api/apps/v1/catalog/${opts.country}/apps/${id}/reviews?limit=${PAGE_SIZE}&offset=${offset}&platform=web`;
    return common.request(url, DEFAULT_HEADERS, opts.requestOptions);
  })
  .then(JSON.parse)
  .then(cleanList);

function validate (opts) {
  if (!opts.id && !opts.appId) {
    throw Error('Either id or appId is required');
  }

  if (opts.sort && !R.includes(opts.sort, R.values(c.sort))) {
    throw new Error('Invalid sort ' + opts.sort);
  }

  if (opts.page && opts.page < 1) {
    throw new Error('Page cannot be lower than 1');
  }
}

module.exports = reviews;
