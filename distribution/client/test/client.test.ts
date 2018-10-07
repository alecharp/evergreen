const mkdirp   = require('mkdirp');

import tmp from 'tmp';
import Client from '../src/client';
import Storage from '../src/lib/storage';

describe('The base client module', () => {
  it('should interpret properly', () => {
    expect(Client).toBeTruthy();
  });

  describe('flavorCheck', () => {
    beforeEach( () => {
      const evergreenHome = tmp.dirSync({unsafeCleanup: true}).name;
      Storage.homeDirectory = (() => evergreenHome );
      mkdirp.sync(Storage.jenkinsHome());
    });

    it('should throw an error with no flavor defined', () => {
      expect(() => {
        delete process.env.FLAVOR;
        new Client();
      }).toThrow();
    });
  });

  describe('isOffline()', () => {
    let client = null;

    beforeEach( () => {
      const evergreenHome = tmp.dirSync({unsafeCleanup: true}).name;
      Storage.homeDirectory = (() => evergreenHome );
      mkdirp.sync(Storage.jenkinsHome());
      process.env.FLAVOR = 'docker-cloud';
      client = new Client();
    });


    it('should default to false', () => {
      expect(client.isOffline()).toBeFalsy();
    });

    describe('when EVERGREEN_OFFLINE is set', () => {
      beforeEach(() => {
        jest.resetModules();
        process.env.EVERGREEN_OFFLINE = '1';
      });

      afterEach(() => {
        jest.resetModules();
      });

      it('should be true', () => {
        expect(client.isOffline()).toBeTruthy();
      });
    });
  });
});
