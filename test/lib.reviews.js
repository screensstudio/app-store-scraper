'use strict';

const store = require('../index');
const common = require('../lib/common');
const reviews = require('../lib/reviews');
const assert = require('chai').assert;

function assertValid (review) {
  assert.isString(review.id);
  assert(review.id);
  assert.isString(review.userName);
  assert(review.userName);
  assert.isString(review.title);
  assert.isString(review.text);
  assert.isNumber(review.score);
  assert(review.score > 0);
  assert(review.score <= 5);
  assert.isNotNull(new Date(review.updated).toJSON());
  assert.isString(review.updated);
  assert(review.updated);
}

function responseWith (data) {
  return JSON.stringify({ next: '/v1/catalog/us/apps/1/reviews?offset=20', data });
}

const REVIEW = {
  id: '2100391167',
  type: 'user-reviews',
  attributes: {
    date: '2018-01-18T07:45:09Z',
    isEdited: false,
    rating: 5,
    review: 'Great app',
    title: 'Loving it',
    userName: 'someone'
  }
};

describe('Reviews method', () => {
  it('should retrieve the reviews of an app', () => {
    return store.reviews({id: '553834731'})
      .then((reviews) => {
        assert(reviews.length > 0);
        reviews.map(assertValid);
      });
  });

  it('should paginate', () => {
    return Promise.all([
      store.reviews({id: '553834731', page: 1}),
      store.reviews({id: '553834731', page: 2})
    ]).then(([first, second]) => {
      assert(first.length > 0);
      assert(second.length > 0);
      const firstIds = first.map((review) => review.id);
      second.forEach((review) => assert.notInclude(firstIds, review.id));
    });
  });

  it('should validate the sort', () => {
    return store.reviews({
      id: '553834731',
      sort: 'invalid'
    })
      .then(assert.fail)
      .catch((e) => assert.equal(e.message, 'Invalid sort invalid'));
  });

  it('should validate the page', () => {
    return store.reviews({
      id: '553834731',
      page: -1
    })
      .then(assert.fail)
      .catch((e) => assert.equal(e.message, 'Page cannot be lower than 1'));
  });

  describe('parsing', () => {
    const realRequest = common.request;
    let requested;

    afterEach(() => { common.request = realRequest; });

    function serve (body) {
      requested = [];
      common.request = (url, headers, requestOptions) => {
        requested.push({ url, headers, requestOptions });
        return Promise.resolve(body);
      };
    }

    it('should read the reviews from the web front-end API', () => {
      serve(responseWith([REVIEW]));

      return reviews({ id: '1', country: 'cn' })
        .then((list) => {
          assert.lengthOf(requested, 1);
          assert.equal(requested[0].url, 'https://apps.apple.com/api/apps/v1/catalog/cn/apps/1/reviews?limit=20&offset=0&platform=web');
          assert.isString(requested[0].headers['User-Agent']);

          assert.lengthOf(list, 1);
          assertValid(list[0]);
          assert.deepEqual(list[0], {
            id: '2100391167',
            userName: 'someone',
            score: 5,
            title: 'Loving it',
            text: 'Great app',
            updated: '2018-01-18T07:45:09Z'
          });
        });
    });

    it('should turn the page into an offset', () => {
      serve(responseWith([]));

      return reviews({ id: '1', page: 3 })
        .then(() => {
          assert.include(requested[0].url, '/catalog/us/apps/1/reviews?limit=20&offset=40');
        });
    });

    it('should pass requestOptions through', () => {
      serve(responseWith([]));

      return reviews({ id: '1', requestOptions: { method: 'DELETE' } })
        .then(() => assert.deepEqual(requested[0].requestOptions, { method: 'DELETE' }));
    });

    it('should fail loudly when the response shape changes', () => {
      serve(JSON.stringify({ feed: { entry: [] } }));

      return reviews({ id: '1' })
        .then(() => assert.fail('should have rejected'),
          (error) => assert.match(error.message, /Could not find reviews/));
    });
  });
});
