# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Node.js module for scraping application data from the iTunes/Mac App Store. Provides an interface similar to [google-play-scraper](https://github.com/facundoolano/google-play-scraper).

## Commands

```bash
# Run all tests
npm test

# Run a single test file
npx mocha test/lib.app.js --timeout 8000

# Run tests matching a pattern
npx mocha --grep "should fetch valid" --timeout 8000

# Lint
npm run lint
```

## Architecture

### Entry Point
- `index.js` - Exports all scraper methods and constants. Also provides `memoized()` factory for caching results.

### Core Library (`lib/`)
Each scraper method has its own file:
- `app.js` - Fetch full app details by id or bundleId
- `list.js` - Fetch apps from iTunes collections (top free, top paid, etc.)
- `search.js` - Search apps by term
- `developer.js` - Fetch apps by developer id
- `reviews.js` - Fetch app reviews
- `ratings.js` - Fetch app ratings and histogram
- `similar.js` - Fetch "customers also bought" apps
- `suggest.js` - Get search term suggestions
- `privacy.js` - Fetch app privacy details
- `version-history.js` - Fetch app version history

### Shared Modules
- `lib/common.js` - HTTP request handling (`doRequest`), iTunes lookup API wrapper (`lookup`), and app data normalization (`cleanApp`)
- `lib/constants.js` - Enums for collections, categories, devices, sort options, and market/country codes

### Key Patterns
- All methods return Promises
- Methods accept options object with `country` (2-letter code, defaults to 'us') and `lang` parameters
- Apps can be identified by `id` (trackId) or `appId` (bundleId)
- Request throttling via `throttled-request` when `limit` option is set
- Debug logging via `debug` module (enable with `DEBUG=app-store-scraper`)
