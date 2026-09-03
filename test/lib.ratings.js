'use strict';

const assert = require('chai').assert;
const store = require('../index');
const common = require('../lib/common');

const id = '553834731';

describe('Ratings method', () => {
  it('should fetch valid ratings data by id', () => {
    return store.ratings({id})
      .then((ratings) => {
        assert.isObject(ratings);
        assert.isNumber(ratings.ratings);
        assert.isObject(ratings.histogram);
        assert.isNumber(ratings.histogram['1']);
        assert.isNumber(ratings.histogram['2']);
        assert.isNumber(ratings.histogram['3']);
        assert.isNumber(ratings.histogram['4']);
        assert.isNumber(ratings.histogram['5']);

        const histogramTotal = Object.values(ratings.histogram).reduce((sum, count) => sum + count, 0);
        assert.equal(ratings.ratings, histogramTotal);
      });
  });

  it('should fetch valid ratings data by id and country', () => {
    let ratingsForUs, ratingsForFr;
    return store.ratings({id})
      .then((ratings) => {
        ratingsForUs = ratings;
      })
      .then(() => store.ratings({id, country: 'fr'}))
      .then((ratings) => {
        ratingsForFr = ratings;
      })
      .then(() => {
        assert.notDeepEqual(ratingsForUs, ratingsForFr);
      });
  });

  describe('parsing', () => {
    const realRequest = common.request;

    afterEach(() => { common.request = realRequest; });

    function serve (ratingCount, totals = [1019, 163, 109, 80, 304]) {
      const votes = totals.map((total) => `<div class="vote"><span class="total">${total}</span></div>`).join('');
      common.request = () => Promise.resolve(
        `<html><div class="rating-count">${ratingCount}</div>${votes}</html>`
      );
    }

    // Thousands separators as rendered by the us, de, fr, ru and in storefronts
    [
      ['18,522,466 Ratings', 18522466],
      ['3.569.125 Bewertungen', 3569125],
      ['3\u202F477\u202F153 notes', 3477153],
      ['Оценок: 4\u00A0053\u00A0767', 4053767],
      ['80,89,839 Ratings', 8089839]
    ].forEach(([text, expected]) => {
      it(`should read the total from "${text}"`, () => {
        serve(text);

        return store.ratings({ id: '1' })
          .then((ratings) => assert.equal(ratings.ratings, expected));
      });
    });

    it('should keep the histogram keyed by stars', () => {
      serve('1,675 份评分');

      return store.ratings({ id: '1' })
        .then((ratings) => {
          assert.equal(ratings.ratings, 1675);
          assert.deepEqual(ratings.histogram, { 5: 1019, 4: 163, 3: 109, 2: 80, 1: 304 });
        });
    });

    it('should report zero ratings when the count is missing', () => {
      serve('');

      return store.ratings({ id: '1' })
        .then((ratings) => assert.equal(ratings.ratings, 0));
    });
  });
});
