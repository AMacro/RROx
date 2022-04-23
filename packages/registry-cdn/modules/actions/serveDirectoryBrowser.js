import path from 'path';

import asyncHandler from '../utils/asyncHandler.js';
import { getPackage } from '../utils/npm.js';
import serveBrowsePage from './serveBrowsePage.js';

async function findMatchingEntries({directory, files}, filename) {
  const entries = {};

  for(let rawEntry of files) {
    // Most packages have header names that look like `package/index.js`
    // so we shorten that to just `index.js` here. A few packages use a
    // prefix other than `package/`. e.g. the firebase package uses the
    // `firebase_npm/` prefix. So we just strip the first dir name.
    const entry = {
      ...rawEntry,
      path: rawEntry.path.replace(/^[^/]+/g, ''),
      rawPath: rawEntry.path,
      type: 'file'
    };

    // Dynamically create "directory" entries for all subdirectories
    // in this entry's path. Some tarballs omit directory entries for
    // some reason, so this is the "brute force" method.
    let dir = path.dirname(entry.path);
    while (dir !== '/') {
      if (!entries[dir] && path.dirname(dir) === filename) {
        entries[dir] = { path: dir, type: 'directory' };
      }
      dir = path.dirname(dir);
    }

    if (path.dirname(entry.path) !== filename)
      continue;

    entries[entry.path] = entry;
  }

  return entries;
}

async function serveDirectoryBrowser(req, res) {
  const stream = await getPackage(req.packageName, req.packageVersion, req.log);

  const filename = req.filename.slice(0, -1) || '/';
  const entries = await findMatchingEntries(stream, filename);

  if (Object.keys(entries).length === 0) {
    return res.status(404).send(`Not found: ${req.packageSpec}${req.filename}`);
  }

  req.browseTarget = {
    path: filename,
    type: 'directory',
    details: entries
  };

  serveBrowsePage(req, res);
}

export default asyncHandler(serveDirectoryBrowser);
