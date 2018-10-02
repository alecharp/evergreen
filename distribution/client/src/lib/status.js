'use strict';

const fs     = require('fs');
const path   = require('path');

const logger   = require('winston');
const Storage  = require('./storage');
const Checksum = require('./checksum');


/*
 * The status module is responsible for collecting and reporting the current
 * state of this instance to the Evergreen backend `Status` service
 */
class Status {
  constructor(app, options) {
    this.options = options || {};
    this.token = null;
    this.uuid = null;
    this.app = app;
  }

  /*
   * Return the timezone string for this client, e.g. America/Los_Angeles, UTC,
   * etc
   */
  getTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  authenticate(uuid, token) {
    this.uuid = uuid;
    this.token = token;
    return this;
  }

  /*
   * Create a status record in the backend for this particular instance
   */
  async create() {
    let api = this.app.service('status');
    let record = {
      uuid: this.uuid,
      flavor: this.options.flavor,
      timezone: this.getTimezone(),
    };
    return api.create(record, {
    })
      .then((res) => {
        logger.info('Created a Status record with server side ID %d', res.id);
        return true;
      })
      .catch((err) => {
        /* 400 errors are most likely attempts to recreate the same Status for
         * this instance.
         *
         * We need a better way to run a HEAD request to check before POSTing a
         * new status, but it's unclear whether that's supported in feathersjs
         * or not
         */
        if (err.code != 400) {
          logger.error('Failed to create a Status record', err);
        } else {
          logger.debug('Status record not changed');
        }
        return false;
      });
  }

  reportLevel(updateLevel) {
    let api = this.app.service('status');
    let record = {
      uuid: this.uuid,
      updateId: updateLevel,
    };
    return api.patch(null, record, {
      query: {
        uuid: this.uuid,
      },
    })
      .then(() => {
        logger.info(`Currently at Update Level ${updateLevel}`);
      })
      .catch((err) => {
        logger.error('Failed to update the Status record with the current level', err.message, err.status);
      });
  }

  reportVersions() {
    logger.debug('Reporting versions to the backend');
    return this.app.service('versions').create({
      uuid: this.uuid,
      manifest: this.collectVersions(),
    }, {
    })
      .then((res) => {
        logger.debug('successfully reported versions', res);
      })
      .catch((err) => {
        logger.error('Failed to report versions', err);
      });
  }

  /*
   * Collect and report the versions of the software installed on the instance
   */
  collectVersions() {
    const versions = {
      schema: 1,
      container: {
        commit: null,
        tools: {
          java: null,
        },
      },
      client: {
        version: null,
      },
      jenkins: {
        core: null,
        plugins: {
        }
      }
    };

    Object.assign(versions.container.tools, process.versions);

    versions.jenkins.core = Checksum.signatureFromFile(path.join(Storage.jenkinsHome(), 'jenkins.war'));

    /*
     * Grab the version of the container from the root of the filesystem
     */
    const commitFile = '/commit.txt';
    if (fs.existsSync(commitFile)) {
      versions.container.commit = fs.readFileSync(commitFile, 'utf8');
    }

    try {
      const files = fs.readdirSync(Storage.pluginsDirectory());
      files.forEach((file) => {
        const matched = file.match(/^(.*).hpi$/);
        if (matched) {
          const name = matched[1];
          const fullPath = path.join(Storage.pluginsDirectory(), file);
          versions.jenkins.plugins[name] = Checksum.signatureFromFile(fullPath);
        }
      });
    } catch (err) {
      if (err.code == 'ENOENT') {
        logger.warn('No plugins found from which to report versions');
      } else {
        throw err;
      }
    }

    return versions;
  }

}

module.exports = Status;
