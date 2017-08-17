'use strict';

var countryLanguage = require('country-language');
var domino = require('domino');
var U = require('./Utils.js').Utils;

// Stub for now
function MediaWiki(logger, config) {
    this.logger = logger;

    // Normalize args
    this.base = config.base.replace(/\/$/, '') + '/';
    this.wikiPath = config.wikiPath !== undefined && config.wikiPath !== true ? config.wikiPath : 'wiki';
    this.apiPath = config.apiPath || 'w/api.php';
    this.domain = config.domain || '';
    this.username = config.username;
    this.password = config.password;
    this.spaceDelimiter = config.spaceDelimiter;

    // Computed properties
    this.webUrl = this.base + this.wikiPath + '/';
    this.apiUrl = this.base + this.apiPath + '?';

    // State
    this.namespaces = {};
    this.namespacesToMirror = [];
}

MediaWiki.prototype.login = function(downloader, cb) {
    if (this.username && this.password) {
        var url = this.apiUrl + 'action=login&format=json&lgname=' + this.username + '&lgpassword=' + this.password;
        if (this.domain) {
            url = url + '&lgdomain=' + this.domain;
        }

        this.downloader.downloadContent(url, function(content, responseHeaders) {
            var body = content.toString();
            var jsonResponse = JSON.parse(body)['login'];
            this.downloader.loginCookie = jsonResponse['cookieprefix'] + '_session=' + jsonResponse['sessionid'];

            if (jsonResponse['result'] == 'SUCCESS') {
                cb();
            } else {
                url = url + '&lgtoken=' + jsonResponse['token'];
                this.downloader.downloadContent(url, function (content, responseHeaders) {
                    body = content.toString();
                    jsonResponse = JSON.parse(body)['login'];

                    if (jsonResponse['result'] == 'Success') {
                        this.downloader.loginCookie = jsonResponse['cookieprefix'] + '_session=' + jsonResponse['sessionid'];
                        cb();
                    } else {
                        console.error('Login failed');
                        process.exit(1);
                    }
                });
            }
        });
    } else {
        cb();
    }
};

MediaWiki.prototype.getTextDirection = function(downloader, cb) {
    var logger = this.logger;
    logger.log('Getting text direction...');

    downloader.downloadContent(this.webUrl, function (content, responseHeaders) {
        var body = content.toString();
        var doc = domino.createDocument(body);
        var contentNode = doc.getElementById('mw-content-text');
        var languageDirectionRegex = /\"pageLanguageDir\"\:\"(.*?)\"/;
        var parts = languageDirectionRegex.exec(body);
        var ltr;
        if (parts && parts[1]) {
            ltr = (parts[1] === 'ltr');
        } else if (contentNode) {
            ltr = (contentNode.getAttribute('dir') == 'ltr' ? true : false);
        } else {
            logger.log('Unable to get the language direction, fallback to ltr');
            ltr = true;
        }

        logger.log('Text direction is ' + (ltr ? 'ltr' : 'rtl'));
        cb(ltr);
    });
};

MediaWiki.prototype.getSiteInfo = function(downloader, zimConfig, cb) {
    var self = this;
    this.logger.log('Getting web site name...');
    var url = this.apiUrl + 'action=query&meta=siteinfo&format=json&siprop=general|namespaces|statistics|variables|category|wikidesc';
    downloader.downloadContent(url, function (content, responseHeaders) {
        var body = content.toString();
        var entries = JSON.parse(body)['query']['general'];

        /* Welcome page */
        if (!zimConfig.mainPageId && !zimConfig.articleList) {
            zimConfig.mainPageId = entries['mainpage'].replace(/ /g, self.spaceDelimiter);
        }

        /* Site name */
        if (!zimConfig.name) {
            zimConfig.name = entries['sitename'];
        }

        /* Language */
        zimConfig.langIso2 = entries['lang'];
        countryLanguage.getLanguage(zimConfig.langIso2, function (error, language) {
            if (error || !language.iso639_3) {
                zimConfig.langIso3 = zimConfig.langIso2;
            } else {
                zimConfig.langIso3 = language.iso639_3;
            }
            cb();
        });
    });
};

MediaWiki.prototype.getNamespaces = function(addNamespaces, downloader, cb) {
    var self = this;
    var url = this.apiUrl + 'action=query&meta=siteinfo&siprop=namespaces|namespacealiases&format=json';
    downloader.downloadContent(url, function(content, responseHeaders) {
        var body = content.toString();
        ['namespaces', 'namespacealiases'].map(function(type) {
            var entries = JSON.parse(body)['query'][type];
            Object.keys(entries).map(function(key) {
                var entry = entries[key];
                var name = entry['*'].replace(/ /g, self.spaceDelimiter);
                var number = entry['id'];
                var allowedSubpages = ('subpages' in entry);
                var isContent = entry['content'] !== undefined || addNamespaces.contains(number) ? true : false;
                var canonical = entry['canonical'] ? entry['canonical'].replace(/ /g, self.spaceDelimiter) : '';
                var details = { 'number': number, 'allowedSubpages': allowedSubpages, 'isContent': isContent };

                /* Namespaces in local language */
                self.namespaces[U.lcFirst(name)] = details;
                self.namespaces[U.ucFirst(name)] = details;

                /* Namespaces in English (if available) */
                if (canonical) {
                    self.namespaces[U.lcFirst(canonical)] = details;
                    self.namespaces[U.ucFirst(canonical)] = details;
                }

                /* Is content to mirror */
                if (isContent) {
                    self.namespacesToMirror.push(name);
                }
            });
        });

        cb();
    });
};

module.exports = {
    MediaWiki: MediaWiki,
};