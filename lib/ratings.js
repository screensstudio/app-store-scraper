'use strict';

const cheerio = require('cheerio');
const common = require('./common');

function ratings (opts) {
  return new Promise(function (resolve) {
    if (!opts.id) {
      throw Error('id is required');
    }

    const country = opts.country || 'us';
    const storeFront = common.storeId(opts.country);
    const idValue = opts.id;
    const url = `https://itunes.apple.com/${country}/customer-reviews/id${idValue}?displayable-kind=11`;

    resolve(common.request(url, {
      'X-Apple-Store-Front': `${storeFront},12`
    }, opts.requestOptions));
  })
    .then((html) => {
      if (html.length === 0) {
        throw Error('App not found (404)');
      }

      return parseRatings(html);
    });
}

module.exports = ratings;

function parseRatings (html) {
  const $ = cheerio.load(html);

  // Storefronts group thousands with ",", "." or (no-break) spaces, e.g.
  // "18,522,466 Ratings", "3.569.125 Bewertungen", "3 477 153 notes" - keep the digits only.
  const ratingsDigits = $('.rating-count').text().replace(/\D/g, '');
  const ratings = ratingsDigits ? parseInt(ratingsDigits) : 0;

  const ratingsByStar = $('.vote .total').map((i, el) => parseInt($(el).text())).get();

  const histogram = ratingsByStar.reduce((acc, ratingsForStar, index) => {
    return Object.assign(acc, { [5 - index]: ratingsForStar });
  }, {});

  return { ratings, histogram };
}
