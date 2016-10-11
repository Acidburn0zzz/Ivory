// ==UserScript==
// @version         0.0.1
// @name            Block YouTube Ads
// @namespace       https://github.com/ParticleCore
// @description     Take control over YouTube ads
// @icon            https://raw.githubusercontent.com/ParticleCore/Ivory/gh-pages/images/YTAB%2Bicon.png
// @match           *://www.youtube.com/*
// @exclude         *://www.youtube.com/tv*
// @exclude         *://www.youtube.com/embed/*
// @exclude         *://www.youtube.com/live_chat*
// @run-at          document-start
// @downloadURL     https://github.com/ParticleCore/Ivory/raw/master/src/Userscript/YouTubeAdBlocker.user.js
// @homepageURL     https://github.com/ParticleCore/Ivory
// @supportURL      https://github.com/ParticleCore/Ivory/wiki
// @contributionURL https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=UMVQJJFG4BFHW
// @grant           GM_getValue
// @grant           GM_setValue
// @noframes
// ==/UserScript==
(function () {
    "use strict";
    function inject(is_userscript) {
        function check(path, scope){
            var i, temp;
            scope = scope || window;
            path = path.split(".").reverse();
            i = path.length;
            temp = scope[path[--i]];
            while (temp && i--) {
                temp = temp[path[i]];
            }
            return i === -1;
        }


        function cleanParents(element) {
            var child, parent;
            child = element;
            while (child) {
                parent = child.parentNode;
                if (parent.childElementCount > 1) {
                    child.outerHTML = "";
                    break;
                }
                child = parent;
            }
        }
        /*function modSetConfig(original) {
            return function(data, value) {
                if (data === "ADS_DATA") {
                    return;
                }
                if (data.ADS_DATA) {
                    delete data.ADS_DATA;
                }
                return original.apply(this, arguments);
            };
        }*/
        function modSetConfig(data, value) {
            if (data === "ADS_DATA") {
                return;
            }
            if (data.ADS_DATA) {
                delete data.ADS_DATA;
            }
            return store.originalSetConfig.apply(this, arguments);
        }
        /*function modPlayerCreate(original) {
            return function (player_id, config) {
                delete config.args.ad3_module;
                return original.apply(this, arguments);
            };
        }*/
        function modPlayerCreate(player_id, config) {
            delete config.args.ad3_module;
            return store.originalPlayerCreate.apply(this, arguments);
        }
        function checkSplit() {
            if (this.match("ad3_module")) {
                console.log(String.prototype.split.caller, this.match("ad3_module"));
                return store.originalSplit.apply(this.replace("ad3_module", "no_module"), arguments);
            }
            return store.originalSplit.apply(this, arguments);
        }
        function checkParse(text) {
            if (text.match("ad3_module")) {
                console.log(JSON.parse.caller, text.match("ad3_module"));
                text = text.replace("ad3_module", "no_module");
            }
            return store.originalParse.apply(this, arguments);
        }
        function scriptExit(event) {
            if (store.settings.video_sidebar_ad && event.target.getAttribute("name") === "www/base") {
                //window.yt.setConfig = modSetConfig(window.yt.setConfig);
                store.originalSetConfig = window.yt.setConfig;
                window.yt.setConfig = modSetConfig;
            } else if (store.settings.video_ad && event.target.getAttribute("name") === "player/base") {
                //window.yt.player.Application.create = modPlayerCreate(window.yt.player.Application.create);
                store.originalPlayerCreate = window.yt.player.Application.create;
                window.yt.player.Application.create = modPlayerCreate;
            }
        }
        function pageLoaded(event) {
            var i, temp, child, parent;
            if (store.settings.home_ad && window.location.pathname === "/") {
                temp = document.querySelectorAll(
                    "#header," +
                    "#feed-pyv-container"
                );
            } else if (store.settings.search_ad && window.location.pathname === "/results") {
                temp = document.querySelectorAll(
                    ".ad-div," +
                    ".pyv-afc-ads-container," +
                    ".video-list-item:not(.related-list-item):not(.dashboard-widget-item)"
                );
            }
            if (temp) {
                i = temp.length;
                while (i--) {
                    cleanParents(temp[i]);
                    console.log("cleaned");
                }
            }
        }

        function cleanUp() {
            if (store.originalSetConfig && check("yt.setConfig")) {
                window.yt.setConfig = store.originalSetConfig;
            }
            if (store.originalPlayerCreate && check("yt.player.Application.create")) {
                window.yt.player.Application.create = store.originalPlayerCreate;
            }
            if (store.originalSplit) {
                String.prototype.split = store.originalSplit;
            }
            if (store.originalParse) {
                JSON.parse = store.originalParse;
            }
            if (window.chrome) {
                document.documentElement.removeEventListener("load", scriptExit, true);
            } else {
                document.removeEventListener("afterscriptexecute", scriptExit);
            }
            document.removeEventListener("spfdone", pageLoaded);
            document.removeEventListener("readystatechange", pageLoaded, true);
        }

        function initialize() {
            // if store exists then this isn't running for the first time
            if (store) {
                cleanUp();
            } else {
                store = {
                    settings: {
                        home_ad: true,
                        search_ad: true,
                        video_ad: true,
                        video_sidebar_ad: true
                    }
                };
            }

            if (store.settings.video_ad || store.settings.video_sidebar_ad) {
                if (store.settings.video_ad) {
                    store.originalSplit = String.prototype.split;
                    store.originalParse = JSON.parse;
                    String.prototype.split = checkSplit;
                    JSON.parse = checkParse;
                }
                if (window.chrome) {
                    document.documentElement.addEventListener("load", scriptExit, true);
                } else {
                    document.addEventListener("afterscriptexecute", scriptExit);
                }
            }
            if (store.settings.home_ad || store.settings.search_ad) {
                document.addEventListener("spfdone", pageLoaded);
                document.addEventListener("readystatechange", pageLoaded, true);
            }
        }

        var store;

        initialize();
    }
    function contentScriptMessages() {
        var key1, key2, gate, sets, locs, observer;
        key1 = "ivorysend";
        key2 = "getlocale";
        gate = document.documentElement;
        sets = gate.dataset[key1] || null;
        locs = gate.dataset[key2] || null;
        if (!gate.contentscript) {
            gate.contentscript = true;
            observer = new MutationObserver(contentScriptMessages);
            return observer.observe(gate, {
                attributes: true,
                attributeFilter: ["data-" + key1, "data-" + key2]
            });
        }
        if (sets) {
            if (ivory.is_userscript) {
                ivory.GM_setValue(ivory.id, sets);
            } else {
                chrome.storage.local.set({ivorySettings: JSON.parse(sets)});
            }
            document.documentElement.removeAttribute("data-ivorysend");
        } else if (locs) {
            document.documentElement.dataset.setlocale = chrome.i18n.getMessage(locs);
        }
    }
    function filterChromeKeys(keys) {
        if (keys[ivory.id] && keys[ivory.id].new_value) {
            document.documentElement.dataset.ivoryreceive = JSON.stringify(
                (keys[ivory.id].new_value && keys[ivory.id].new_value[ivory.id]) || keys[ivory.id].new_value || {}
            );
        }
    }
    function main(event) {
        var holder;
        if (!event && ivory.is_userscript) {
            event = JSON.parse(ivory.GM_getValue(ivory.id, "{}"));
        }
        if (event) {
            event = JSON.stringify(event[ivory.id] || event);
            document.documentElement.dataset.user_settings = event;
            /*if (ivory.is_userscript) {
                holder = document.createElement("link");
                holder.rel = "stylesheet";
                holder.type = "text/css";
                holder.href = "https://particlecore.github.io/Ivory/stylesheets/YouTubeAdBlocker.css";
                document.documentElement.appendChild(holder);
            } else if (window.chrome) {
                holder = document.createElement("style");
                holder.textContent = //
                    "#DNT:hover:after," +
                    "#player-console > div," +
                    "#P-content input[type='radio']:checked + label:before," +
                    "#P-content input[type='checkbox']:checked + label:before{" +
                    "    background-image: url(chrome-extension://" + window.chrome.runtime.id + "/images/sprite.png);" +
                    "}";
                document.documentElement.appendChild(holder);
            }*/
            holder = document.createElement("style");
            holder.textContent = //
                "#header," +
                "#feed-pyv-container," +
                ".ad-div," +
                ".pyv-afc-ads-container," +
                ".video-list-item:not(.related-list-item):not(.dashboard-widget-item) {" +
                "   display: none !important;" +
                "}";
            document.documentElement.appendChild(holder);
            holder = document.createElement("script");
            holder.textContent = "(" + inject + "(" + ivory.is_userscript + "))";
            document.documentElement.appendChild(holder);
            holder.remove();
            if (!ivory.is_userscript) {
                chrome.storage.onChanged.addListener(filterChromeKeys);
            }
        }
    }
    var ivory = {
        id: "ivorySettings",
        is_userscript: typeof GM_info === "object"
    };
    if (ivory.is_userscript) {
        ivory.GM_getValue = GM_getValue;
        ivory.GM_setValue = GM_setValue;
        main();
    } else {
        chrome.storage.local.get(ivory.id, main);
    }
    contentScriptMessages();
}());