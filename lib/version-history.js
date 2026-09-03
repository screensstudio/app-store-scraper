'use strict';

const common = require('./common');

// apps.apple.com rate limits clients that send no User-Agent.
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9'
};

function serverData (html) {
  const match = html.match(/<script type="application\/json" id="serialized-server-data">([\s\S]*?)<\/script>/);
  if (!match) {
    throw Error('Could not find serialized server data in App Store page');
  }
  return JSON.parse(match[1]);
}

// The "Version History" sheet is shipped with the page, under the see-all action of the
// most-recent-version shelf.
function historyItems (data) {
  const page = data && data.data && data.data[0] && data.data[0].data;
  const shelf = page && page.shelfMapping && page.shelfMapping.mostRecentVersion;
  const seeAll = shelf && shelf.seeAllAction;
  const shelves = seeAll && seeAll.pageData && seeAll.pageData.shelves;
  const items = shelves && shelves[0] && shelves[0].items;
  if (!items) {
    throw Error('Could not find version history in App Store page');
  }
  return items;
}

function cleanVersion (item) {
  const released = new Date(item.secondarySubtitle);
  return {
    versionDisplay: item.primarySubtitle,
    releaseNotes: item.text,
    releaseDate: released.toISOString().slice(0, 10),
    releaseTimestamp: released.toISOString()
  };
}

function isComplete (item) {
  return Boolean(item.primarySubtitle) && !isNaN(new Date(item.secondarySubtitle));
}

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
      const url = `https://apps.apple.com/${opts.country}/app/id${opts.id}`;
      return common.request(url, DEFAULT_HEADERS, opts.requestOptions);
    })
    .then((html) => historyItems(serverData(html))
      .filter(isComplete)
      .map(cleanVersion));
}

module.exports = versionHistory;
