'use strict';

const store = require('../index');
const common = require('../lib/common');
const versionHistory = require('../lib/version-history');
const assert = require('chai').assert;

function assertValid (versionHistoryType) {
  assert.isString(versionHistoryType.versionDisplay);
  assert.isString(versionHistoryType.releaseNotes);
  assert.isString(versionHistoryType.releaseDate);
  assert.isString(versionHistoryType.releaseTimestamp);
}

function pageWith (items) {
  const data = {
    data: [{
      data: {
        shelfMapping: {
          mostRecentVersion: {
            seeAllAction: { pageData: { shelves: [{ items }] } }
          }
        }
      }
    }]
  };
  return `<html><script type="application/json" id="serialized-server-data">${JSON.stringify(data)}</script></html>`;
}

describe('Version History method', () => {
  it('should retrieve the version history of an app', () => {
    return store.versionHistory({ id: '324684580' })
      .then((versionHistory) => {
        assert(versionHistory);
        assert(versionHistory.length > 0);
        versionHistory.map(assertValid);
      });
  });

  describe('parsing', () => {
    const realRequest = common.request;
    let requested;

    afterEach(() => { common.request = realRequest; });

    function serve (html) {
      requested = [];
      common.request = (url, headers) => {
        requested.push({ url, headers });
        return Promise.resolve(html);
      };
    }

    it('should read the history from the page in a single request', () => {
      serve(pageWith([{
        $kind: 'TitledParagraph',
        text: 'Bug fixes',
        primarySubtitle: '9.1.78',
        secondarySubtitle: 'Fri Aug 28 2026 06:10:51 GMT+0000 (Coordinated Universal Time)'
      }]));

      return versionHistory({ id: '1', country: 'cn' })
        .then((history) => {
          assert.lengthOf(requested, 1, 'the page alone should be enough');
          assert.equal(requested[0].url, 'https://apps.apple.com/cn/app/id1');
          assert.isString(requested[0].headers['User-Agent']);

          assert.lengthOf(history, 1);
          assertValid(history[0]);
          assert.deepEqual(history[0], {
            versionDisplay: '9.1.78',
            releaseNotes: 'Bug fixes',
            releaseDate: '2026-08-28',
            releaseTimestamp: '2026-08-28T06:10:51.000Z'
          });
        });
    });

    it('should skip entries without a usable version or date', () => {
      serve(pageWith([
        { text: 'ok', primarySubtitle: '2.0', secondarySubtitle: 'Fri Aug 28 2026 06:10:51 GMT+0000' },
        { text: 'no version', primarySubtitle: '', secondarySubtitle: 'Fri Aug 28 2026 06:10:51 GMT+0000' },
        { text: 'bad date', primarySubtitle: '1.0', secondarySubtitle: 'not a date' }
      ]));

      return versionHistory({ id: '1' })
        .then((history) => {
          assert.lengthOf(history, 1);
          assert.equal(history[0].versionDisplay, '2.0');
        });
    });

    it('should fail loudly when the page shape changes', () => {
      serve('<html>no server data here</html>');

      return versionHistory({ id: '1' })
        .then(() => assert.fail('should have rejected'),
          (error) => assert.match(error.message, /serialized server data/));
    });
  });
});
