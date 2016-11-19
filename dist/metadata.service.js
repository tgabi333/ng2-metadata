import { Inject, Injectable } from '@angular/core';
import { Title, DOCUMENT } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import { PageTitlePositioning } from './models/page-title-positioning';
export var MetadataLoader = (function () {
    function MetadataLoader() {
    }
    return MetadataLoader;
}());
export var MetadataStaticLoader = (function () {
    function MetadataStaticLoader(metadataSettings) {
        this.metadataSettings = metadataSettings;
    }
    MetadataStaticLoader.prototype.getSettings = function () {
        return this.metadataSettings;
    };
    return MetadataStaticLoader;
}());
export var MetadataService = (function () {
    function MetadataService(router, document, titleService, activatedRoute, currentLoader) {
        var _this = this;
        this.router = router;
        this.document = document;
        this.titleService = titleService;
        this.activatedRoute = activatedRoute;
        this.currentLoader = currentLoader;
        this.metadataSettings = currentLoader.getSettings();
        console.log(this.metadataSettings);
        this.isSet = {};
        this.router.events
            .filter(function (event) { return (event instanceof NavigationEnd); })
            .subscribe(function (routeData) {
            var route = _this.activatedRoute;
            while (route.children.length > 0) {
                route = route.firstChild;
                if (route.snapshot.routeConfig.data) {
                    var metadata = route.snapshot.routeConfig.data['metadata'];
                    if (!!metadata) {
                        _this.updateMetadata(metadata, routeData.url);
                    }
                }
            }
        });
    }
    MetadataService.prototype.setTitle = function (title, override) {
        if (override === void 0) { override = false; }
        var ogTitleElement = this.getOrCreateMetaTag('og:title');
        if (!this.metadataSettings) {
            switch (this.metadataSettings.pageTitlePositioning) {
                case PageTitlePositioning.AppendPageTitle:
                    title = (!override
                        && !!this.metadataSettings.pageTitleSeparator
                        && !!this.metadataSettings.applicationName
                        ? (this.metadataSettings.applicationName + this.metadataSettings.pageTitleSeparator)
                        : '')
                        + (!!title ? title : (this.metadataSettings.defaults['title'] || ''));
                    break;
                case PageTitlePositioning.PrependPageTitle:
                    title = (!!title ? title : (this.metadataSettings.defaults['title'] || ''))
                        + (!override
                            && !!this.metadataSettings.pageTitleSeparator
                            && !!this.metadataSettings.applicationName
                            ? (this.metadataSettings.pageTitleSeparator + this.metadataSettings.applicationName)
                            : '');
                    break;
            }
        }
        if (!title) {
            console.warn('WARNING: No "page title" specified.');
        }
        ogTitleElement.setAttribute('content', title);
        this.titleService.setTitle(title);
    };
    MetadataService.prototype.setTag = function (tag, value) {
        if (tag === 'title') {
            throw new Error(("Attempt to set " + tag + " through 'setTag': 'title' is a reserved tag name. ")
                + "Please use 'MetadataService.setTitle' instead.");
        }
        value = !!value
            ? value
            : (this
                .metadataSettings
                ? (this.metadataSettings.defaults ? this.metadataSettings.defaults[tag] : '')
                : '');
        if (!value) {
            return;
        }
        var tagElement = this.getOrCreateMetaTag(tag);
        tagElement.setAttribute('content', value);
        this.isSet[tag] = true;
        if (tag === 'description') {
            var ogDescriptionElement = this.getOrCreateMetaTag('og:description');
            ogDescriptionElement.setAttribute('content', value);
        }
        else if (tag === 'author') {
            var ogAuthorElement = this.getOrCreateMetaTag('og:author');
            ogAuthorElement.setAttribute('content', value);
        }
        else if (tag === 'publisher') {
            var ogPublisherElement = this.getOrCreateMetaTag('og:publisher');
            ogPublisherElement.setAttribute('content', value);
        }
        else if (tag === 'og:locale') {
            var availableLocales = this.metadataSettings
                ? (this.metadataSettings.defaults ? this.metadataSettings.defaults['og:locale:alternate'] : '')
                : '';
            this.updateLocales(value, availableLocales);
            this.isSet['og:locale:alternate'] = true;
        }
        else if (tag === 'og:locale:alternate') {
            var ogLocaleElement = this.getOrCreateMetaTag('og:locale');
            var currentLocale = ogLocaleElement.getAttribute('content');
            this.updateLocales(currentLocale, value);
            this.isSet['og:locale'] = true;
        }
    };
    MetadataService.prototype.createMetaTag = function (name) {
        var el = this.document.createElement('meta');
        el.setAttribute(name.lastIndexOf('og:', 0) === 0 ? 'property' : 'name', name);
        this.document.head.appendChild(el);
        return el;
    };
    MetadataService.prototype.getOrCreateMetaTag = function (name) {
        var selector = "meta[name=\"" + name + "\"]";
        if (name.lastIndexOf('og:', 0) === 0) {
            selector = "meta[property=\"" + name + "\"]";
        }
        var el = this.document.querySelector(selector);
        if (!el) {
            el = this.createMetaTag(name);
        }
        return el;
    };
    MetadataService.prototype.deleteMetaTags = function (name) {
        var _this = this;
        var selector = "meta[name=\"" + name + "\"]";
        if (name.lastIndexOf('og:', 0) === 0) {
            selector = "meta[property=\"" + name + "\"]";
        }
        var elements = this.document.querySelectorAll(selector);
        if (!!elements) {
            elements.forEach(function (el) {
                _this.document.head.removeChild(el);
            });
        }
    };
    MetadataService.prototype.updateLocales = function (currentLocale, availableLocales) {
        var _this = this;
        if (!currentLocale) {
            currentLocale = this.metadataSettings
                ? (this.metadataSettings.defaults ? this.metadataSettings.defaults['og:locale'] : '')
                : '';
        }
        var html = this.document.querySelector('html');
        html.setAttribute('lang', currentLocale);
        if (!!currentLocale && !!availableLocales) {
            this.deleteMetaTags('og:locale:alternate');
            availableLocales.split(',')
                .forEach(function (locale) {
                if (currentLocale !== locale) {
                    var el = _this.createMetaTag('og:locale:alternate');
                    el.setAttribute('content', locale.replace(/-/g, '_'));
                }
            });
        }
    };
    MetadataService.prototype.updateMetadata = function (metadata, currentUrl) {
        var _this = this;
        if (metadata === void 0) { metadata = {}; }
        if (metadata.disabled) {
            return;
        }
        this.setTitle(metadata.title, metadata.override);
        Object.keys(metadata)
            .forEach(function (key) {
            var value = metadata[key];
            if (key === 'title' || key === 'override') {
                return;
            }
            else if (key === 'og:locale') {
                value = value.replace(/-/g, '_');
            }
            else if (key === 'og:locale:alternate') {
                var currentLocale = metadata['og:locale'];
                _this.updateLocales(currentLocale, metadata[key]);
                return;
            }
            _this.setTag(key, value);
        });
        if (!this.metadataSettings) {
            return;
        }
        if (!!this.metadataSettings.defaults) {
            Object.keys(this.metadataSettings.defaults)
                .forEach(function (key) {
                var value = _this.metadataSettings.defaults[key];
                if (key in _this.isSet || key in metadata || key === 'title' || key === 'override') {
                    return;
                }
                else if (key === 'og:locale') {
                    value = value.replace(/-/g, '_');
                }
                else if (key === 'og:locale:alternate') {
                    var currentLocale = metadata['og:locale'];
                    _this.updateLocales(currentLocale, _this.metadataSettings.defaults[key]);
                    return;
                }
                _this.setTag(key, value);
            });
        }
        if (!!this.metadataSettings.applicationUrl) {
            this.setTag('og:url', this.metadataSettings.applicationUrl + currentUrl.replace(/\/$/g, ''));
        }
    };
    MetadataService.decorators = [
        { type: Injectable },
    ];
    MetadataService.ctorParameters = [
        { type: Router, },
        { type: undefined, decorators: [{ type: Inject, args: [DOCUMENT,] },] },
        { type: Title, },
        { type: ActivatedRoute, },
        { type: MetadataLoader, },
    ];
    return MetadataService;
}());
