jest.mock('fs');

const fs      = require('fs');
const mkdirp  = require('mkdirp');
const path    = require('path');

import h from '../testlib/helpers';
import Storage from '../src/lib/storage';

describe('The storage module', () => {
  let dir = '/tmp';
  beforeEach(() => {
    process.env.EVERGREEN_HOME = dir;
    /* Make sure memfs is flushed every time */
    fs.volume.reset();
    mkdirp.sync(dir);
  });

  describe('homeDirectory()', () => {
    it('should return a path', () => {
      const home = Storage.homeDirectory();
      // this should look like a path
      expect(path.basename(home)).toBeTruthy();
    });
  });

  describe('jenkinsHome()', () => {
    it('should return a path', () => {
      const home = Storage.jenkinsHome();

      // this should look like a path
      expect(path.basename(home)).toBeTruthy();
      expect(home.startsWith(Storage.homeDirectory())).toBeTruthy();
    });
  });

  describe('pluginsDirectory()', () => {
    it('should return a path', () => {
      const plugins = Storage.pluginsDirectory();

      // this should look like a path
      expect(path.basename(plugins)).toBeTruthy();
      expect(plugins.startsWith(Storage.jenkinsHome())).toBeTruthy();
    });
  });

  describe('removePlugins()', () => {
    it('should return cleanly on empty plugins', () => {
      expect(Storage.removePlugins());
    });
    it('should not error if file not found', async () => {
      await expect(Storage.removePlugins(['not-found']));
    });
    it('should remove all files in a list', async () => {
      const filenames = ['first', 'second', 'third', 'fourth'];
      const pluginPath = Storage.pluginsDirectory();
      mkdirp.sync(pluginPath);
      filenames.forEach((filename) => {
        fs.mkdirSync(`${pluginPath}/${filename}`)
        h.touchFile(`${pluginPath}/${filename}/testfile`); // make sure we remove a directory with files
        h.touchFile(`${pluginPath}/${filename}.hpi`);
        expect(h.checkFileExists(`${pluginPath}/${filename}`)).toBeTruthy();
        expect(h.checkFileExists(`${pluginPath}/${filename}/testfile`)).toBeTruthy();
        expect(h.checkFileExists(`${pluginPath}/${filename}.hpi`)).toBeTruthy();
      });
      await Storage.removePlugins(filenames);
      filenames.forEach((filename) => {
        expect(h.checkFileExists(`${pluginPath}/${filename}/testfile`)).toBeFalsy();
        expect(h.checkFileExists(`${pluginPath}/${filename}`)).toBeFalsy();
        expect(h.checkFileExists(`${pluginPath}/${filename}.hpi`)).toBeFalsy();
      });
    });
  });
});
