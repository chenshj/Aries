(function($, aries) {
    'use strict';
    var path, $base, dialogHashKey = "&ui-state=dialog";

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
            var uri = url ? this.parseUrl(url) : location,
                hash = this.parseUrl(url || location.href).hash;

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
            return this.parseUrl(this.getLocation());
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
                absUrl = this.documentBase;
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
            } else if (path.isSameDomain(u, this.documentBase)) {
                return u.hrefNoHash.replace(this.documentBase.domain, "").split(dialogHashKey)[0];
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
            return url.replace(this.documentBase.domain, "");
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
            return u.protocol && u.domain !== this.documentUrl.domain ? true : false;
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
                return ( !this.isPath(u.hash) && u.hash && ( u.hrefNoHash === this.documentUrl.hrefNoHash || ( this.documentBaseDiffers && u.hrefNoHash === this.documentBase.hrefNoHash ) ) );
            }
            return ( /^#/ ).test(u.href);
        },

        squash: function(url, resolutionUrl) {
            var href, cleanedUrl, search, stateIndex,
                isPath = this.isPath(url),
                uri = this.parseUrl(url),
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
            stateIndex = cleanedUrl.indexOf(this.uiStateKey);

            // store the ui state keys for use
            if (stateIndex > -1) {
                uiState = cleanedUrl.slice(stateIndex);
                cleanedUrl = cleanedUrl.slice(0, stateIndex);
            }

            // make the cleanedUrl absolute relative to the resolution url
            href = path.makeUrlAbsolute(cleanedUrl, resolutionUrl);

            // grab the search from the resolved url since parsing from
            // the passed url may not yield the correct result
            search = this.parseUrl(href).search;

            // TODO all this crap is terrible, clean it up
            if (isPath) {
                // reject the hash if it's a path or it's just a dialog key
                if (path.isPath(preservedHash) || preservedHash.replace("#", "").indexOf(this.uiStateKey) === 0) {
                    preservedHash = "";
                }

                // Append the UI State keys where it exists and it's been removed
                // from the url
                if (uiState && preservedHash.indexOf(this.uiStateKey) === -1) {
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
            return hash.replace("#", "").indexOf(this.uiStateKey) === 0;
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
            var u = path.parseUrl(path.makeUrlAbsolute(url, this.documentBase)),

            // Does the url have the same path as the document?
                samePath = u.hrefNoHash === this.documentUrl.hrefNoHash ||
                    ( this.documentBaseDiffers &&
                        u.hrefNoHash === this.documentBase.hrefNoHash ),

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

})(jQuery, window.aries);