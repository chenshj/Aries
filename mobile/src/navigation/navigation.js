/**
 * Created by chenshj on 2014/5/6.
 */
(function($, aries) {
    'use strict';
    var path, $base,
        dialogHashKey = "&ui-state=dialog",
        initialHref = location.href;

    aries.path = path = {
        uiStateKey: "&ui-state",

        // This scary looking regular expression parses an absolute URL or its relative
        // variants (protocol, site, document, query, and hash), into the various
        // components (protocol, host, path, query, fragment, etc that make up the
        // URL as well as some other commonly used sub-parts. When used with RegExp.exec()
        // or String.match, it parses the URL into a results array that looks like this:
        //
        //     [0]: http://jblas:password@mycompany.com:8080/mail/inbox?msg=1234&type=unread#msg-content
        //     [1]: http://jblas:password@mycompany.com:8080/mail/inbox?msg=1234&type=unread
        //     [2]: http://jblas:password@mycompany.com:8080/mail/inbox
        //     [3]: http://jblas:password@mycompany.com:8080
        //     [4]: http:
        //     [5]: //
        //     [6]: jblas:password@mycompany.com:8080
        //     [7]: jblas:password
        //     [8]: jblas
        //     [9]: password
        //    [10]: mycompany.com:8080
        //    [11]: mycompany.com
        //    [12]: 8080
        //    [13]: /mail/inbox
        //    [14]: /mail/
        //    [15]: inbox
        //    [16]: ?msg=1234&type=unread
        //    [17]: #msg-content
        //
        urlParseRE: /^\s*(((([^:\/#\?]+:)?(?:(\/\/)((?:(([^:@\/#\?]+)(?:\:([^:@\/#\?]+))?)@)?(([^:\/#\?\]\[]+|\[[^\/\]@#?]+\])(?:\:([0-9]+))?))?)?)?((\/?(?:[^\/\?#]+\/+)*)([^\?#]*)))?(\?[^#]+)?)(#.*)?/,

        // Abstraction to address xss (Issue #4787) by removing the authority in
        // browsers that auto decode it. All references to location.href should be
        // replaced with a call to this method so that it can be dealt with properly here
        getLocation: function(url) {
            var uri = url ? path.parseUrl(url) : location,
                hash = path.parseUrl(url || location.href).hash;

            // mimic the browser with an empty string when the hash is empty
            hash = hash === "#" ? "" : hash;

            // Make sure to parse the url or the location object for the hash because using location.hash
            // is auto decoded in firefox, the rest of the url should be from the object (location unless
            // we're testing) to avoid the inclusion of the authority
            return uri.protocol + "//" + uri.host + uri.pathname + uri.search + hash;
        },

        //return the original document url
        getDocumentUrl: function(asParsedObject) {
            return asParsedObject ? $.extend({}, path.documentUrl) : path.documentUrl.href;
        },

        parseLocation: function() {
            return path.parseUrl(path.getLocation());
        },

        /**
         * 解析URL为对像，该对象描述URL的各组成部分，
         * 可以通过属性快速访问URL各部分的值。
         * @param url URL
         * @returns {*} URL描述对象
         */
        parseUrl: function(url) {
            // 如果接收到的实参是一个对象，我们认为这是一个已经解析过的URL对象，
            // 将直接返回此对象给调用者。
            if ($.type(url) === "object") {
                return url;
            }

            var matches = path.urlParseRE.exec(url || "") || [];

            // 创建一个允许使用者通过属性名访问URL正则表达式子匹配项的对象。
            // IE返回空字符串而不是像其他浏览器一样返回undefined，所以我们
            // 将返回结果统一标准化为空字符串，以便在任何浏览器中保持一致。
            return {

                /**
                 * 超文本链接
                 */
                href: matches[0] || "",

                /**
                 *无哈希值（#号后部分）的超文本链接
                 */
                hrefNoHash: matches[1] || "",

                /**
                 * 无查询（？后部分）的超文本链接
                 */
                hrefNoSearch: matches[2] || "",

                /**
                 * 完整域名
                 */
                domain: matches[3] || "",

                /**
                 * 协议
                 */
                protocol: matches[4] || "",

                /**
                 * 双斜线
                 */
                doubleSlash: matches[5] || "",

                /**
                 * 授权信息，包括用户名、密码、主机名、端口号
                 */
                authority: matches[6] || "",

                /**
                 * 用户名
                 */
                username: matches[8] || "",

                /**
                 * 密码
                 */
                password: matches[9] || "",

                /**
                 * 主机，包括主机名、端口号
                 */
                host: matches[10] || "",

                /**
                 * 主机名
                 */
                hostname: matches[11] || "",

                /**
                 * 端口号
                 */
                port: matches[12] || "",

                /**
                 * 路径，域名后斜线表示的资源路径
                 */
                pathname: matches[13] || "",

                /**
                 * 目录，路径后第一个节点
                 */
                directory: matches[14] || "",

                /**
                 * 文件名，路径后第二个节点
                 */
                filename: matches[15] || "",

                /**
                 * 查询，？后部分
                 */
                search: matches[16] || "",

                /**
                 * 哈希值，#后部分
                 */
                hash: matches[17] || ""
            };
        },

        //Turn relPath into an asbolute path. absPath is
        //an optional absolute path which describes what
        //relPath is relative to.
        makePathAbsolute: function(relPath, absPath) {
            var absStack,
                relStack,
                i, d;

            if (relPath && relPath.charAt(0) === "/") {
                return relPath;
            }

            relPath = relPath || "";
            absPath = absPath ? absPath.replace(/^\/|(\/[^\/]*|[^\/]+)$/g, "") : "";

            absStack = absPath ? absPath.split("/") : [];
            relStack = relPath.split("/");

            for (i = 0; i < relStack.length; i++) {
                d = relStack[ i ];
                switch (d) {
                    case ".":
                        break;
                    case "..":
                        if (absStack.length) {
                            absStack.pop();
                        }
                        break;
                    default:
                        absStack.push(d);
                        break;
                }
            }
            return "/" + absStack.join("/");
        },

        /**
         * 判断两个URL是否属于同一个域。
         * @param absUrl1 绝对地址URL1。
         * @param absUrl2 绝对地址URL2。
         * @returns {boolean} 域相同返回true，否则返回false。
         */
        isSameDomain: function(absUrl1, absUrl2) {
            return path.parseUrl(absUrl1).domain === path.parseUrl(absUrl2).domain;
        },

        /**
         * 判断URL是否为相对地址。
         * @param url 待判断URL。
         * @returns {boolean} 待判断URL为相对地址时返回true，否则返回false。
         */
        isRelativeUrl: function(url) {
            // 所有相对URL地址的共同之处为，无协议部分。
            return path.parseUrl(url).protocol === "";
        },

        /**
         * 判断URL地址是否为绝对地址
         * @param url 待判断URL
         * @returns {boolean} 待判断URL为绝对地址时返回true，否则返回false。
         */
        isAbsoluteUrl: function(url) {
            return path.parseUrl(url).protocol !== "";
        },

        /**
         * 将指定的相对地址URL转换为绝对地址。
         * 该方法能够处理所有相关的变量（协议，站点，文档，查询，代码片段）。
         * @param relUrl 待转换相对地址URL
         * @param absUrl 参照绝对地址URL
         * @returns {*} 转换后的绝对地址URL
         */
        makeUrlAbsolute: function(relUrl, absUrl) {
            if (!path.isRelativeUrl(relUrl)) {
                return relUrl;
            }

            if (absUrl === undefined) {
                absUrl = path.documentBase;
            }

            var relObj = path.parseUrl(relUrl),
                absObj = path.parseUrl(absUrl),
                protocol = relObj.protocol || absObj.protocol,
                doubleSlash = relObj.protocol ? relObj.doubleSlash : ( relObj.doubleSlash || absObj.doubleSlash ),
                authority = relObj.authority || absObj.authority,
                hasPath = relObj.pathname !== "",
                pathname = path.makePathAbsolute(relObj.pathname || absObj.filename, absObj.pathname),
                search = relObj.search || ( !hasPath && absObj.search ) || "",
                hash = relObj.hash;

            return protocol + doubleSlash + authority + pathname + search + hash;
        },

        /**
         * 添加查询参数到指定的URL后
         * @param url 待处理URL
         * @param params 参数字符串或者对象
         * @returns {string} 附件参数后的URL
         */
        addSearchParams: function(url, params) {
            var u = path.parseUrl(url),
                p = ( typeof params === "object" ) ? $.param(params) : params,
                s = u.search || "?";
            return u.hrefNoSearch + s + ( s.charAt(s.length - 1) !== "?" ? "&" : "" ) + p + ( u.hash || "" );
        },

        convertUrlToDataUrl: function(absUrl) {
            var u = path.parseUrl(absUrl);
            if (path.isEmbeddedPage(u)) {
                // For embedded pages, remove the dialog hash key as in getFilePath(),
                // and remove otherwise the Data Url won't match the id of the embedded Page.
                return u.hash
                    .split(dialogHashKey)[0]
                    .replace(/^#/, "")
                    .replace(/\?.*$/, "");
            } else if (path.isSameDomain(u, path.documentBase)) {
                return u.hrefNoHash.replace(path.documentBase.domain, "").split(dialogHashKey)[0];
            }

            return window.decodeURIComponent(absUrl);
        },

        //get path from current hash, or from a file path
        get: function(newPath) {
            if (newPath === undefined) {
                newPath = path.parseLocation().hash;
            }
            return path.stripHash(newPath).replace(/[^\/]*\.[^\/*]+$/, "");
        },

        //set location hash to path
        set: function(path) {
            location.hash = path;
        },

        /**
         * 判断指定的URL是否为路径（以斜线开始）。
         * @param url 待判断URL
         * @returns {boolean} URL为路径返回true，否则返回false。
         */
        isPath: function(url) {
            return ( /\// ).test(url);
        },

        /**
         * 返回一个移除了窗口位置信息（协议/主键名/路径名）的地址。
         * @param url 待处理URL。
         * @returns {XML|string|void|*} 处理后的地址。
         */
        clean: function(url) {
            return url.replace(path.documentBase.domain, "");
        },

        //just return the url without an initial #
        /**
         * 截取URL开头的#，用来处理URL对象的hash部分，返回hash值
         * @param url url对象的hash部分（#+hash值）。
         * @returns {XML|string|void|*} 截取的hash值。
         */
        stripHash: function(url) {
            return url.replace(/^#/, "");
        },

        stripQueryParams: function(url) {
            return url.replace(/\?.*$/, "");
        },

        //remove the preceding hash, any query params, and dialog notations
        cleanHash: function(hash) {
            return path.stripHash(hash.replace(/\?.*$/, "").replace(dialogHashKey, ""));
        },

        isHashValid: function(hash) {
            return ( /^#[^#]+$/ ).test(hash);
        },

        //check whether a url is referencing the same domain, or an external domain or different protocol
        //could be mailto, etc
        isExternal: function(url) {
            var u = path.parseUrl(url);
            return u.protocol && u.domain !== path.documentUrl.domain ? true : false;
        },

        hasProtocol: function(url) {
            return ( /^(:?\w+:)/ ).test(url);
        },

        isEmbeddedPage: function(url) {
            var u = path.parseUrl(url);

            //if the path is absolute, then we need to compare the url against
            //both the this.documentUrl and the documentBase. The main reason for this
            //is that links embedded within external documents will refer to the
            //application document, whereas links embedded within the application
            //document will be resolved against the document base.
            if (u.protocol !== "") {
                return ( !path.isPath(u.hash) && u.hash && ( u.hrefNoHash === path.documentUrl.hrefNoHash || ( path.documentBaseDiffers && u.hrefNoHash === path.documentBase.hrefNoHash ) ) );
            }
            return ( /^#/ ).test(u.href);
        },

        squash: function(url, resolutionUrl) {
            var href, cleanedUrl, search, stateIndex,
                isPath = path.isPath(url),
                uri = path.parseUrl(url),
                preservedHash = uri.hash,
                uiState = "";

            // produce a url against which we can resole the provided path
            resolutionUrl = resolutionUrl || (path.isPath(url) ? path.getLocation() : path.getDocumentUrl());

            // If the url is anything but a simple string, remove any preceding hash
            // eg #foo/bar -> foo/bar
            //    #foo -> #foo
            cleanedUrl = isPath ? path.stripHash(url) : url;

            // If the url is a full url with a hash check if the parsed hash is a path
            // if it is, strip the #, and use it otherwise continue without change
            cleanedUrl = path.isPath(uri.hash) ? path.stripHash(uri.hash) : cleanedUrl;

            // Split the UI State keys off the href
            stateIndex = cleanedUrl.indexOf(path.uiStateKey);

            // store the ui state keys for use
            if (stateIndex > -1) {
                uiState = cleanedUrl.slice(stateIndex);
                cleanedUrl = cleanedUrl.slice(0, stateIndex);
            }

            // make the cleanedUrl absolute relative to the resolution url
            href = path.makeUrlAbsolute(cleanedUrl, resolutionUrl);

            // grab the search from the resolved url since parsing from
            // the passed url may not yield the correct result
            search = path.parseUrl(href).search;

            // TODO all this crap is terrible, clean it up
            if (isPath) {
                // reject the hash if it's a path or it's just a dialog key
                if (path.isPath(preservedHash) || preservedHash.replace("#", "").indexOf(path.uiStateKey) === 0) {
                    preservedHash = "";
                }

                // Append the UI State keys where it exists and it's been removed
                // from the url
                if (uiState && preservedHash.indexOf(path.uiStateKey) === -1) {
                    preservedHash += uiState;
                }

                // make sure that pound is on the front of the hash
                if (preservedHash.indexOf("#") === -1 && preservedHash !== "") {
                    preservedHash = "#" + preservedHash;
                }

                // reconstruct each of the pieces with the new search string and hash
                href = path.parseUrl(href);
                href = href.protocol + "//" + href.host + href.pathname + search + preservedHash;
            } else {
                href += href.indexOf("#") > -1 ? uiState : "#" + uiState;
            }

            return href;
        },

        isPreservableHash: function(hash) {
            return hash.replace("#", "").indexOf(path.uiStateKey) === 0;
        },

        // Escape weird characters in the hash if it is to be used as a selector
        hashToSelector: function(hash) {
            var hasHash = ( hash.substring(0, 1) === "#" );
            if (hasHash) {
                hash = hash.substring(1);
            }
            return ( hasHash ? "#" : "" ) + hash.replace(/([!"#$%&'()*+,./:;<=>?@[\]^`{|}~])/g, "\\$1");
        },

        // return the substring of a filepath before the sub-page key, for making
        // a server request
        getFilePath: function(path) {
            var splitkey = "&" + aries.subPageUrlKey;
            return path && path.split(splitkey)[0].split(dialogHashKey)[0];
        },

        // check if the specified url refers to the first page in the main
        // application document.
        isFirstPageUrl: function(url) {
            // We only deal with absolute paths.
            var u = path.parseUrl(path.makeUrlAbsolute(url, path.documentBase)),

            // Does the url have the same path as the document?
                samePath = u.hrefNoHash === path.documentUrl.hrefNoHash ||
                    ( path.documentBaseDiffers &&
                        u.hrefNoHash === path.documentBase.hrefNoHash ),

            // Get the first page element.
                fp = aries.firstPage,

            // Get the id of the first page element if it has one.
                fpId = fp && fp[0] ? fp[0].id : undefined;

            // The url refers to the first page if the path matches the document and
            // it either has no hash value, or the hash is exactly equal to the id
            // of the first page element.
            return samePath &&
                ( !u.hash ||
                    u.hash === "#" ||
                    ( fpId && u.hash.replace(/^#/, "") === fpId ) );
        },

        // Some embedded browsers, like the web view in Phone Gap, allow
        // cross-domain XHR requests if the document doing the request was loaded
        // via the file:// protocol. This is usually to allow the application to
        // "phone home" and fetch app specific data. We normally let the browser
        // handle external/cross-domain urls, but if the allowCrossDomainPages
        // option is true, we will allow cross-domain http/https requests to go
        // through our page loading logic.
        isPermittedCrossDomainRequest: function(docUrl, reqUrl) {
            return aries.allowCrossDomainPages &&
                (docUrl.protocol === "file:" || docUrl.protocol === "content:") &&
                reqUrl.search(/^https?:/) !== -1;
        }
    };

    path.documentUrl = path.parseLocation();

    $base = $("head").find("base");

    path.documentBase = $base.length ?
        path.parseUrl(path.makeUrlAbsolute($base.attr("href"), path.documentUrl.href)) :
        path.documentUrl;

    path.documentBaseDiffers = (path.documentUrl.hrefNoHash !== path.documentBase.hrefNoHash);

    //return the original document base url
    path.getDocumentBase = function(asParsedObject) {
        return asParsedObject ? $.extend({}, path.documentBase) : path.documentBase.href;
    };

    function History (stack, index) {
        this.stack = stack || [];
        this.activeIndex = index || 0;
    }

    $.extend(History.prototype, {
        // addNew is used whenever a new page is added
        add: function(url, data) {
            data = data || {};

            //if there's forward history, wipe it
            if (this.getNext()) {
                this.clearForward();
            }

            // if the hash is included in the data make sure the shape
            // is consistent for comparison
            if (data.hash && data.hash.indexOf("#") === -1) {
                data.hash = "#" + data.hash;
            }

            data.url = url;
            this.stack.push(data);
            this.activeIndex = this.stack.length - 1;
        },

        //wipe urls ahead of active index
        clearForward: function() {
            this.stack = this.stack.slice(0, this.activeIndex + 1);
        },

        closest: function(url) {
            var closest, a = this.activeIndex;

            // First, take the slice of the history stack before the current index and search
            // for a url match. If one is found, we'll avoid avoid looking through forward history
            // NOTE the preference for backward history movement is driven by the fact that
            //      most mobile browsers only have a dedicated back button, and users rarely use
            //      the forward button in desktop browser anyhow
            closest = this.find(url, this.stack.slice(0, a));

            // If nothing was found in backward history check forward. The `true`
            // value passed as the third parameter causes the find method to break
            // on the first match in the forward history slice. The starting index
            // of the slice must then be added to the result to get the element index
            // in the original history stack :( :(
            //
            // TODO this is hyper confusing and should be cleaned up (ugh so bad)
            if (closest === undefined) {
                closest = this.find(url, this.stack.slice(a), true);
                closest = closest === undefined ? closest : closest + a;
            }

            return closest;
        },

        direct: function(opts) {
            var newActiveIndex = this.closest(opts.url), a = this.activeIndex;

            // save new page index, null check to prevent falsey 0 result
            // record the previous index for reference
            if (newActiveIndex !== undefined) {
                this.activeIndex = newActiveIndex;
                this.previousIndex = a;
            }

            // invoke callbacks where appropriate
            //
            // TODO this is also convoluted and confusing
            if (newActiveIndex < a) {
                ( opts.present || opts.back || $.noop )(this.getActive(), "back");
            } else if (newActiveIndex > a) {
                ( opts.present || opts.forward || $.noop )(this.getActive(), "forward");
            } else if (newActiveIndex === undefined && opts.missing) {
                opts.missing(this.getActive());
            }
        },

        find: function(url, stack, earlyReturn) {
            stack = stack || this.stack;

            var entry, i, length = stack.length, index;

            for (i = 0; i < length; i++) {
                entry = stack[i];

                if (decodeURIComponent(url) === decodeURIComponent(entry.url) ||
                    decodeURIComponent(url) === decodeURIComponent(entry.hash)) {
                    index = i;

                    if (earlyReturn) {
                        return index;
                    }
                }
            }

            return index;
        },

        getActive: function() {
            return this.stack[this.activeIndex];
        },

        getLast: function() {
            return this.stack[this.previousIndex];
        },

        getNext: function() {
            return this.stack[this.activeIndex + 1];
        },

        getPrev: function() {
            return this.stack[this.activeIndex - 1];
        }

    });

    function Navigator (history) {
        this.history = history;
        this.ignoreInitialHashChange = true;

        aries.window.bind({
            "popstate.history": $.proxy(this.popstate, this),
            "hashchange.history": $.proxy(this.hashchange, this)
        });
    }

    $.extend(Navigator.prototype, {
        squash: function(url, data) {
            var state, href, hash = path.isPath(url) ? path.stripHash(url) : url;

            href = path.squash(url);

            // make sure to provide this information when it isn't explicitly set in the
            // data object that was passed to the squash method
            state = $.extend({
                hash: hash,
                url: href
            }, data);

            // replace the current url with the new href and store the state
            // Note that in some cases we might be replacing an url with the
            // same url. We do this anyways because we need to make sure that
            // all of our history entries have a state object associated with
            // them. This allows us to work around the case where $.mobile.back()
            // is called to transition from an external page to an embedded page.
            // In that particular case, a hashchange event is *NOT* generated by the browser.
            // Ensuring each history entry has a state object means that onPopState()
            // will always trigger our hashchange callback even when a hashchange event
            // is not fired.
            window.history.replaceState(state, state.title || document.title, href);

            return state;
        },

        hash: function(url, href) {
            var parsed, loc, hash, resolved;

            // Grab the hash for recording. If the passed url is a path
            // we used the parsed version of the squashed url to reconstruct,
            // otherwise we assume it's a hash and store it directly
            parsed = path.parseUrl(url);
            loc = path.parseLocation();

            if (loc.pathname + loc.search === parsed.pathname + parsed.search) {
                // If the pathname and search of the passed url is identical to the current loc
                // then we must use the hash. Otherwise there will be no event
                // eg, url = "/foo/bar?baz#bang", location.href = "http://example.com/foo/bar?baz"
                hash = parsed.hash ? parsed.hash : parsed.pathname + parsed.search;
            } else if (path.isPath(url)) {
                resolved = path.parseUrl(href);
                // If the passed url is a path, make it domain relative and remove any trailing hash
                hash = resolved.pathname + resolved.search + (path.isPreservableHash(resolved.hash) ? resolved.hash.replace("#", "") : "");
            } else {
                hash = url;
            }

            return hash;
        },

        // TODO reconsider name
        go: function(url, data, noEvents) {
            var state, href, hash, popstateEvent,
                isPopStateEvent = $.event.special.navigate.isPushStateEnabled();

            // Get the url as it would look squashed on to the current resolution url
            href = path.squash(url);

            // sort out what the hash sould be from the url
            hash = this.hash(url, href);

            // Here we prevent the next hash change or popstate event from doing any
            // history management. In the case of hashchange we don't swallow it
            // if there will be no hashchange fired (since that won't reset the value)
            // and will swallow the following hashchange
            if (noEvents && hash !== path.stripHash(path.parseLocation().hash)) {
                this.preventNextHashChange = noEvents;
            }

            // IMPORTANT in the case where popstate is supported the event will be triggered
            //      directly, stopping further execution - ie, interupting the flow of this
            //      method call to fire bindings at this expression. Below the navigate method
            //      there is a binding to catch this event and stop its propagation.
            //
            //      We then trigger a new popstate event on the window with a null state
            //      so that the navigate events can conclude their work properly
            //
            // if the url is a path we want to preserve the query params that are available on
            // the current url.
            this.preventHashAssignPopState = true;
            window.location.hash = hash;

            // If popstate is enabled and the browser triggers `popstate` events when the hash
            // is set (this often happens immediately in browsers like Chrome), then the
            // this flag will be set to false already. If it's a browser that does not trigger
            // a `popstate` on hash assignement or `replaceState` then we need avoid the branch
            // that swallows the event created by the popstate generated by the hash assignment
            // At the time of this writing this happens with Opera 12 and some version of IE
            this.preventHashAssignPopState = false;

            state = $.extend({
                url: href,
                hash: hash,
                title: document.title
            }, data);

            if (isPopStateEvent) {
                popstateEvent = new $.Event("popstate");
                popstateEvent.originalEvent = {
                    type: "popstate",
                    state: null
                };

                this.squash(url, state);

                // Trigger a new faux popstate event to replace the one that we
                // caught that was triggered by the hash setting above.
                if (!noEvents) {
                    this.ignorePopState = true;
                    aries.window.trigger(popstateEvent);
                }
            }

            // record the history entry so that the information can be included
            // in hashchange event driven navigate events in a similar fashion to
            // the state that's provided by popstate
            this.history.add(state.url, state);
        },

        // This binding is intended to catch the popstate events that are fired
        // when execution of the `$.navigate` method stops at window.location.hash = url;
        // and completely prevent them from propagating. The popstate event will then be
        // retriggered after execution resumes
        //
        // TODO grab the original event here and use it for the synthetic event in the
        //      second half of the navigate execution that will follow this binding
        popstate: function(event) {
            var hash, state;

            // Partly to support our test suite which manually alters the support
            // value to test hashchange. Partly to prevent all around weirdness
            if (!$.event.special.navigate.isPushStateEnabled()) {
                return;
            }

            // If this is the popstate triggered by the actual alteration of the hash
            // prevent it completely. History is tracked manually
            if (this.preventHashAssignPopState) {
                this.preventHashAssignPopState = false;
                event.stopImmediatePropagation();
                return;
            }

            // if this is the popstate triggered after the `replaceState` call in the go
            // method, then simply ignore it. The history entry has already been captured
            if (this.ignorePopState) {
                this.ignorePopState = false;
                return;
            }

            // If there is no state, and the history stack length is one were
            // probably getting the page load popstate fired by browsers like chrome
            // avoid it and set the one time flag to false.
            // TODO: Do we really need all these conditions? Comparing location hrefs
            // should be sufficient.
            if (!event.originalEvent.state &&
                this.history.stack.length === 1 &&
                this.ignoreInitialHashChange) {
                this.ignoreInitialHashChange = false;

                if (location.href === initialHref) {
                    event.preventDefault();
                    return;
                }
            }

            // account for direct manipulation of the hash. That is, we will receive a popstate
            // when the hash is changed by assignment, and it won't have a state associated. We
            // then need to squash the hash. See below for handling of hash assignment that
            // matches an existing history entry
            // TODO it might be better to only add to the history stack
            //      when the hash is adjacent to the active history entry
            hash = path.parseLocation().hash;
            if (!event.originalEvent.state && hash) {
                // squash the hash that's been assigned on the URL with replaceState
                // also grab the resulting state object for storage
                state = this.squash(hash);

                // record the new hash as an additional history entry
                // to match the browser's treatment of hash assignment
                this.history.add(state.url, state);

                // pass the newly created state information
                // along with the event
                event.historyState = state;

                // do not alter history, we've added a new history entry
                // so we know where we are
                return;
            }

            // If all else fails this is a popstate that comes from the back or forward buttons
            // make sure to set the state of our history stack properly, and record the directionality
            this.history.direct({
                url: (event.originalEvent.state || {}).url || hash,

                // When the url is either forward or backward in history include the entry
                // as data on the event object for merging as data in the navigate event
                present: function(historyEntry, direction) {
                    // make sure to create a new object to pass down as the navigate event data
                    event.historyState = $.extend({}, historyEntry);
                    event.historyState.direction = direction;
                }
            });
        },

        // NOTE must bind before `navigate` special event hashchange binding otherwise the
        //      navigation data won't be attached to the hashchange event in time for those
        //      bindings to attach it to the `navigate` special event
        // TODO add a check here that `hashchange.navigate` is bound already otherwise it's
        //      broken (exception?)
        hashchange: function(event) {
            var history, hash;

            // If hashchange listening is explicitly disabled or pushstate is supported
            // avoid making use of the hashchange handler.
            if (!$.event.special.navigate.isHashChangeEnabled() ||
                $.event.special.navigate.isPushStateEnabled()) {
                return;
            }

            // On occasion explicitly want to prevent the next hash from propogating because we only
            // with to alter the url to represent the new state do so here
            if (this.preventNextHashChange) {
                this.preventNextHashChange = false;
                event.stopImmediatePropagation();
                return;
            }

            history = this.history;
            hash = path.parseLocation().hash;

            // If this is a hashchange caused by the back or forward button
            // make sure to set the state of our history stack properly
            this.history.direct({
                url: hash,

                // When the url is either forward or backward in history include the entry
                // as data on the event object for merging as data in the navigate event
                present: function(historyEntry, direction) {
                    // make sure to create a new object to pass down as the navigate event data
                    event.hashchangeState = $.extend({}, historyEntry);
                    event.hashchangeState.direction = direction;
                },

                // When we don't find a hash in our history clearly we're aiming to go there
                // record the entry as new for future traversal
                //
                // NOTE it's not entirely clear that this is the right thing to do given that we
                //      can't know the users intention. It might be better to explicitly _not_
                //      support location.hash assignment in preference to $.navigate calls
                // TODO first arg to add should be the href, but it causes issues in identifying
                //      embeded pages
                missing: function() {
                    history.add(hash, {
                        hash: hash,
                        title: document.title
                    });
                }
            });
        }
    });

    // TODO consider queueing navigation activity until previous activities have completed
    //      so that end users don't have to think about it. Punting for now
    // TODO !! move the event bindings into callbacks on the navigate event
    aries.navigate = function(url, data, noEvents) {
        aries.navigate.navigator.go(url, data, noEvents);
    };

    // expose the history on the navigate method in anticipation of full integration with
    // existing navigation functionalty that is tightly coupled to the history information
    aries.navigate.history = new History();

    // instantiate an instance of the navigator for use within the $.navigate method
    aries.navigate.navigator = new Navigator(aries.navigate.history);

    var loc = path.parseLocation();
    aries.navigate.history.add(loc.href, {hash: loc.hash});

})(jQuery, window.aries);