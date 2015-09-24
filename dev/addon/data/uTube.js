// ==UserScript==
// @version     0.0.2
// @name        μTube
// @namespace   https://github.com/ParticleCore
// @description YouTube extra small
// @icon        https://raw.githubusercontent.com/ParticleCore/Particle/gh-pages/images/YT%2Bicon.png
// @match       *://www.youtube.com/*
// @match       *://m.youtube.com/*
// @exclude     *://m.youtube.com/embed/*
// @exclude     *://www.youtube.com/embed/*
// @run-at      document-start
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// @noframes
// ==/UserScript==
(function () {
    "use strict";
    var algo,
        ytconfig,
        settings,
        events     = [],
        globals    = {},
        userscript = typeof GM_info === "object";
    function xhr(method, call, url, setRequestHeader) {
        var request;
        if (userscript && url.split(window.location.origin).length < 2) {
            GM_xmlhttpRequest({
                url: url,
                method: method,
                onload: call
            });
        } else {
            request = new XMLHttpRequest();
            request.addEventListener("load", call);
            request.open(method, url, true);
            if (setRequestHeader) {
                request.setRequestHeader(setRequestHeader[0], setRequestHeader[1]);
            }
            request.send();
        }
    }
    function eventHandler(target, event, call, capture, type) {
        function splitEvents(events) {
            eventHandler(target, events, call, capture, type);
        }
        if (Array.isArray(event)) {
            event.forEach(splitEvents);
            return;
        }
        if (target.events && target.events[event] && target.events[event][call.name]) {
            target.removeEventListener(event, target.events[event][call.name], !!capture);
            delete target.events[event][call.name];
            if (JSON.stringify(target.events[event]) === "{}") {
                delete target.events[event];
            }
        }
        if (!type) {
            target.addEventListener(event, call, !!capture);
            target.events = target.events || {};
            target.events[event] = target.events[event] || {};
            target.events[event][call.name] = call;
            if (events.indexOf(target) < 0 && (String(target)).split("HTML").length > 1) {
                events.push(target);
            }
        }
    }
    function clearOrphans() {
        var i = events.length;
        while (i) {
            i -= 1;
            if (!document.contains(events[i])) {
                events[i].remove();
                events.splice(i, 1);
            }
        }
    }
    function timeConvert(time) {
        var temp = [];
        temp.push(Math.floor(time / 3600));
        temp.push(Math.floor(time % 3600 / 60));
        temp.push(("0" + Math.floor(time % 3600 % 60)).slice(-2));
        if (temp[0] === 0) {
            temp.shift();
        }
        if (temp[1] === 0) {
            temp[1] = "00";
        }
        return temp.join(":");
    }
    function deCipher(sig) {
        var i,
            temp;
        sig = sig.split("");
        i = algo.cipher && algo.cipher.length;
        while (i) {
            i -= 1;
            if (algo.cipher[i] > 0) {
                temp = sig[0];
                sig[0] = sig[algo.cipher[i] % sig.length];
                sig[algo.cipher[i]] = temp;
            } else if (algo.cipher[i] < 0) {
                sig.splice(0, -algo.cipher[i]);
            } else {
                sig.reverse();
            }
        }
        return sig.join("");
    }
    function playerUI(event) {
        var timer,
            video    = document.getElementById("video_player"),
            played   = document.getElementById("played"),
            elapsed  = document.getElementById("time_elapsed"),
            buffered = document.getElementById("buffered"),
            scrubber = document.getElementById("scrubber");
        switch (event.type) {
        case "play":
            return document.documentElement.classList.add("playing");
        case "pause":
            return document.documentElement.classList.add("paused");
        case "ended":
            return document.documentElement.className = "ended";
        case "waiting":
            return document.documentElement.classList.add("buffering");
        case "playing":
            document.documentElement.classList.remove("buffering");
            return document.documentElement.classList.remove("paused");
        case "suspend":
        case "progress":
            if (video.buffered.length > 0) {
                buffered.style.right = (event.type === "suspend" && "0") || (1 - video.buffered.end(video.buffered.length - 1) / video.duration) * 100 + "%";
            } else {
                buffered.style.right = "100%";
            }
            break;
        case "seeking":
        case "timeupdate":
            timer = timeConvert(video.currentTime + 1);
            if (elapsed.textContent !== timer) {
                if (!video.duration) {
                    elapsed.textContent = "0:00";
                    played.style.right = scrubber.style.right = buffered.style.right = "100%";
                    return;
                }
                if (!scrubber.scrubbing) {
                    elapsed.textContent = timer;
                }
            }
            played.style.right = (1 - video.currentTime / video.duration) * 100 + "%";
            if (!scrubber.scrubbing) {
                scrubber.style.right = played.style.right;
            }
            break;
        }
    }
    function initPlayer() {
        var video = document.getElementById("video_player");
        eventHandler(video, ["play", "pause", "ended", "seeking", "playing", "waiting", "progress", "suspend", "timeupdate"], playerUI);
        document.documentElement.removeAttribute("class");
        document.getElementById("controls").style.backgroundImage = "url(" + (ytconfig.args.iurlsd || ytconfig.args.iurlhq || ytconfig.args.iurlmq) + ")";
        document.getElementById("time_total").textContent = timeConvert(ytconfig.args.length_seconds);
        //audio itag video.src = ytconfig.itag["140"].url + ((ytconfig.itag["140"].s && "&signature=" + deCipher(ytconfig.itag["140"].s)) || "");
        //video.src = ytconfig.itag["22"].url + ((ytconfig.itag["22"].s && "&signature=" + deCipher(ytconfig.itag["22"].s)) || "");
        video.src = ytconfig.itag["18"].url + ((ytconfig.itag["18"].s && "&signature=" + deCipher(ytconfig.itag["18"].s)) || "");
    }
    function buildCipher(event) {
        var i;
        event = event.response || event.target.response;
        algo = {};
        algo.first = event.match(/[\w\W]{2}\=\{[\w\W]{2}\:function\(a([\w\W]*?)a\[0\]\=a\[b%a\.length\]([\w\W]*?)\}\}/) || false;
        algo.first = algo.first[0] && algo.first[0].replace(/([\w\W]*?)=\{/, "").split("},");
        algo.second = event.match(/a\=a\.split\(""\);([\w\W]*?)return a\.join\(""\)/) || false;
        algo.second = algo.second[0] && algo.second[0].split(";");
        if (algo.first && algo.second) {
            i = algo.first.length;
            while (i) {
                i -= 1;
                algo.splicer = algo.splicer || (algo.first[i].match(".splice") && algo.first[i].split(":")[0]) || false;
                algo.replace = algo.replace || (algo.first[i].match(".length") && algo.first[i].split(":")[0]) || false;
                algo.reverse = algo.reverse || (algo.first[i].match(".reverse") && algo.first[i].split(":")[0]) || false;
            }
            algo.cipher = [];
            i = algo.second.length;
            while (i) {
                i -= 1;
                if (algo.second[i].match("." + algo.replace)) {
                    algo.cipher.push(algo.second[i].split(",")[1].replace(")", ""));
                } else if (algo.second[i].match("." + algo.splicer)) {
                    algo.cipher.push("-" + algo.second[i].split(",")[1].replace(")", ""));
                } else if (algo.second[i].match("." + algo.reverse)) {
                    algo.cipher.push(0);
                }
            }
        }
        globals[globals.playerid] = algo.cipher;
        console.log(globals);
        initPlayer();
        window.console.log(algo);
    }
    function initConfig(event) {
        var i;
        function parseStreams(stream) {
            var j,
                k,
                id,
                temp;
            ytconfig.itag = ytconfig.itag || {};
            stream = stream.split(",");
            j = stream.length;
            while (j) {
                j -= 1;
                id = stream[j].split(/itag=([0-9]*?)(\&|$)/)[1];
                ytconfig.itag[id] = {};
                temp = stream[j].split("&");
                k = temp.length;
                while (k) {
                    k -= 1;
                    ytconfig.itag[id][temp[k].split("=")[0]] = decodeURIComponent(temp[k].split("=")[1]).replace(/\+/g, " ");
                }
            }
        }
        event = event.response || event.target.response;
        event = JSON.parse(event);
        i = event.length;
        while (i) {
            i -= 1;
            if (event[i].data && event[i].data.swfcfg) {
                ytconfig = event[i].data.swfcfg;
            }
        }
        parseStreams(ytconfig.args.adaptive_fmts);
        parseStreams(ytconfig.args.url_encoded_fmt_stream_map);
        globals.playerid = ytconfig.assets.js.split(/html5player-([\w\W]*?)\//)[1];
        if (!globals[globals.playerid]) {
            xhr("GET", buildCipher, window.location.protocol + ytconfig.assets.js);
        } else {
            initPlayer();
        }
        window.console.info(ytconfig);
    }
    function initUI(event) {
        var xMax,
            xMin,
            parents,
            prefetch,
            isHidden  = document.getElementById("controls") && window.getComputedStyle(document.getElementById("controls")).opacity === "0",
            initiated = document.documentElement.classList.length > 0,
            container = document.getElementById("video_container"),
            video     = document.getElementById("video_player"),
            elapsed   = document.getElementById("time_elapsed"),
            progress  = document.getElementById("progress"),
            scrubber  = document.getElementById("scrubber"),
            oneTouch  = event.touches && event.touches.length < 2,
            state     = video && !video.paused;
        function activePlayer() {
            document.documentElement.classList.remove("active");
        }
        if (event.type === "touchstart") {
            if (oneTouch) {
                globals.swipe = false;
            }
        }
        if (event.type === "touchmove" || event.type === "touchstart") {
            if (oneTouch) {
                if (progress && progress.contains(event.target) && !isHidden && initiated) {
                    event.preventDefault();
                    if (event.type === "touchstart") {
                        globals.swipe = true;
                        scrubber.scrubbing = true;
                        document.documentElement.classList.add("seeking");
                    }
                    xMin = event.touches[0].pageX > progress.offsetLeft + 16;
                    xMax = event.touches[0].pageX < progress.offsetLeft + progress.offsetWidth - 16;
                    if (xMin && xMax) {
                        scrubber.style.right = (1 - ((event.touches[0].pageX - progress.offsetLeft - 16) / (progress.offsetWidth - 32))) * 100 + "%";
                        elapsed.textContent = timeConvert(((event.touches[0].pageX - progress.offsetLeft - 16) / (progress.offsetWidth - 32)) * video.duration + 1);
                    } else if (!xMin && xMax) {
                        scrubber.style.right = "100%";
                        elapsed.textContent = "0:01";
                    } else if (xMin && !xMax) {
                        scrubber.style.right = "0%";
                        elapsed.textContent = timeConvert(video.duration + 1);
                    }
                }
            }
        }
        if (event.type === "touchend") {
            if (oneTouch) {
                if (!globals.swipe && (!container || !container.contains(event.target))) {
                    parents = event.target.parentNode;
                    while (parents.parentNode) {
                        prefetch = parents.href && parents.href.split(/\?|\&|=/g);
                        if (prefetch && prefetch.indexOf("v") > -1 && parents.getAttribute("onclick").split("clk(this)").length > 1) {
                            window.console.log(prefetch);
                            globals.url = prefetch[prefetch.indexOf("v") + 1];
                            return xhr("GET", initConfig, window.location.protocol + "//www.youtube.com/watch?app=desktop&spf=navigate&v=" + globals.url);
                        }
                        parents = parents.parentNode;
                    }
                    return;
                }
                if (video && event.target.id === "middle_section" && !isHidden) {
                    video[(state && "pause") || "play"]();
                }
                if (scrubber && scrubber.scrubbing) {
                    delete scrubber.scrubbing;
                    document.documentElement.classList.remove("seeking");
                    video.currentTime = (1 - (Number(scrubber.style.right.replace("%", "")) / 100)) * video.duration;
                    if (video.paused) {
                        document.documentElement.classList.add("paused");
                    }
                }
                if (container && container.contains(event.target) && initiated) {
                    window.clearTimeout(globals.active);
                    document.documentElement.classList.add("active");
                    globals.active = window.setTimeout(activePlayer, 2000);
                }
            }
        }
    }
    function initStyle() {
        var style = document.createElement("style");
        style.id = "ivory_style";
        style.textContent = "body, html{" +
            "    height: initial !important;" +
            "    position: relative;" +
            "}" +
            "#player{" +
            "    height: 100% !important;" +
            "    opacity: 1;" +
            "    overflow: initial;" +
            "    top: 46px;" +
            "    z-index: initial;" +
            "}" +
            "#player, ._mkd{" +
            "    height: 56.25vw;" +
            "    max-width: initial;" +
            "    width: 100%;" +
            "}" +
            "._mkd > a{" +
            "    display: none;" +
            "}" +
            "#video_container{" +
            "    background: #000;" +
            "    height: 56.25vw;" +
            "    position: sticky;" +
            "    top: 0;" +
            "    width: 100%;" +
            "    z-index: 120;" +
            "}" +
            "#video_player, #controls{" +
            "    height: 100%;" +
            "    position: absolute;" +
            "    width: 100%;" +
            "}" +
            "#controls{" +
            "    background: center / cover;" +
            "    opacity: 1;" +
            "}" +
            ".playing:not(.paused) #controls, .playing:not(.paused) #middle_section{" +
            "    transition: opacity 1s 2s;" +
            "    opacity: 0;" +
            "}" +
            ".playing.active #controls, .playing.active #middle_section{" +
            "    transition: opacity .5s;" +
            "    opacity: 1;" +
            "}" +
            ".playing #controls, .seeking #controls, .paused #controls{" +
            "    background: none !important;" +
            "}" +
            "#middle_section{" +
            "    background: no-repeat 0 / cover;" +
            "    background-image: url(data:image/png;base64,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);" +
            "    position: relative;" +
            "    top: 50%;" +
            "    height: 50px;" +
            "    width: 50px;" +
            "    margin: 0 auto;" +
            "    transform: translateY(-50%);" +
            "}" +
            ".paused #middle_section{" +
            "    animation: unmorph .5s steps(11, end) forwards;" +
            "}" +
            //".playing:not(.paused):not(.buffering) #middle_section{" +
            ".playing:not(.paused) #middle_section{" +
            "    animation: morph .5s steps(11, end) forwards;" +
            "}" +
            ".buffering #middle_section{" +
            "    background-image: none;" +
            "}" +
            "@keyframes morph{" +
            "    0% {background-position: 0 0;}" +
            "    100% {background-position: -550px 0;}" +
            "}" +
            "@keyframes unmorph{" +
            "    0% {background-position: -550px 0;}" +
            "    100% {background-position: 0 0;}" +
            "}" +
            "#top_section, #bottom_section{" +
            "    height: 25%;" +
            "    max-height: 200px;" +
            "    position: absolute;" +
            "    box-sizing: padding-box;" +
            "    width: 100%;" +
            "}" +
            "#top_section:before, #bottom_section:before{" +
            "    content: '';" +
            "    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAADHCAMAAADveskSAAABuVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB168jWAAAAk3RSTlOgAZidBAkGAwgtgwKGiHIPMYwSHo8VkZIvGRscmwtucJ8jECd8loV6M55+JZl0KSoKBQ46Ew09PhRAFhcYB0U0Rx8MSjlMRBEoAFFSU1RDVldYWVpbXF1eO2BhYmNkZWZnaGlqa2xtICEiX3V2d3h5KyxVf4CBgjU2NziJios8jY4/kEFCk5SVRpdISZpLnE1OT1AGY4i/AAAAyElEQVQYV2XOr0oEcRTF8fODDwaLYYMGQRBmgqJVk2DcfQqDeYNg8C0MG0w+xzzDbjYOmLbJBIMTXDDsMMsil8u593u4f0w1Ig7Fr9iIuPIhbqxGculLVL5ttGIiKitxjlZUiqIVZcheXKsVRWN7oxeVteJe8SaOBnoijt0qimKpU6k1ipnGTLHU68euGavt/q1W2qHaxUT3j+2iGb7txJm423M24kBMB7YQp2I9TM1HOh91see9i0cvIi7Eg1fx5FlELX7Ep8gfbu4yHVZkRtsAAAAASUVORK5CYII=) repeat-x  0 / contain;" +
            "    height: 100%;" +
            "    left: 0;" +
            "    top: 0;" +
            "    position: absolute;" +
            "    width: 100%;" +
            "}" +
            "#top_section:before{" +
            "    transform: rotate(180deg);" +
            "}" +
            "#bottom_section{" +
            "    bottom: 0;" +
            "    font-size: 12px;" +
            "    color: #FFF;" +
            "    overflow: hidden;" +
            "    text-shadow: 0 0 1px #000;" +
            "}" +
            "#menu, #audio, #cards, #screen_mode{" +
            "    background: no-repeat 0 / contain;" +
            "    float: right;" +
            "    height: 50px;" +
            "    transform: translateY(-50%);" +
            "    position: relative;" +
            "    top: 26px;" +
            "    width: 50px;" +
            "}" +
            "#menu{" +
            "    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAAWlBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////////////////////8AAAAAAAAAAAAAAAAAAAB9N2OeAAAAHnRSTlMAAQMGCg0PEAkSHictMCQ8Tlpg+/Pv28+/AgwUGiAoqMGtAAAApUlEQVRo3u3YYQqCQBRF4XeHqQUUMPtfnRTUAkZoAiTUIOhJDwY73z9BPSB4Bc0AAACA7shx6sTM2uTrK7MjclxFakxEh0VkdDwDV0RZr1tXhUWUNB+ERbQpklyRDwc/jGz3l5HVO+554XcUya5IXQ5kUGRUeKRci3Q/m9nt1NqlDBHfk/Q29Q+mnqlnhZl6pp6pZ+qZeqaeqWfqe/iBAwAAAHToCbtcsm9uacbqAAAAAElFTkSuQmCC);" +
            "}" +
            "#cards{" +
            "    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAAb1BMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGRkarq6vU1NTi4uLw8PD5+fkAAAAAAAAvLy+5ubns7Oz///8AAAAAAAAYGBi2trb7+/sAAAAAAACJiYn29vYUFBTW1tYAAAAXFxe6uroAAAD5+fmsszdUAAAAJXRSTlMADB8qMDc9JDhNbYeXprgIKUd1o78CI0F0twYxX69AikBCdiC33GsyNAAAAUxJREFUeF7t2NlugzAQhtFx2My+DWC2pAl5/2dsbyo1qCmWflfiYs4LfJJtYQ90EkIIIYQQQgh18fwgDAPfu6h/KkQ6TtIsL4o8S5NYR+47ZVU3Lf/QNnVVkktdP5iRd0Yz9B05M83Lyr9Yl3kiR5Q2/IbRylHjeuO3blcnlUnvGruKngjWzYb/ZOaOUP3CLz6+8IulJ1B5X3cRol1kHUrCVIaPImwqgqh65KPl4rFWhIgebKGJCKFbttBqAqiYrcTIem0JW0k2IOKlzMcbz5x6QMTPmI+PMHPmA5Egt4vkARAJC7tIESKRp13kGZ5yufCNx48wkeMjvCV2keQCfVbsIrHCPpA2kVYTImpsIk3k+tIiAi4t5Po9yUMCfxKd5HGHP1PP/uDGRwf3QxCu6+9W4xw+mD6AwRQbsd1T2/fPgk3ROQghhBBCCCE+AXvxbCg9fyChAAAAAElFTkSuQmCC);" +
            "}" +
            "#audio{" +
            "    background-image: url(data:image/png;base64,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);" +
            "    float: left;" +
            "}" +
            "#time_elapsed, #progress, #time_total, #screen_mode{" +
            "    position: relative;" +
            "    top: calc(100% - 20px);" +
            "    transform: translateY(-50%);" +
            "}" +
            "#time_elapsed{" +
            "    float: left;" +
            "    margin-left: 12px;" +
            "}" +
            "#progress{" +
            "    height: 100%;" +
            "    overflow: hidden;" +
            "    position: relative;" +
            "}" +
            "#progress_center{" +
            "    background: rgba(255, 255, 255, .2);" +
            "    height: 2px;" +
            "    left: 16px;" +
            "    right: 16px;" +
            "    top: 50%;" +
            "    transform: translateY(-50%);" +
            "    position: absolute;" +
            "}" +
            "#progress:before, #buffered, #played, #scrubber{" +
            "    height: 100%;" +
            "    position: absolute;" +
            "}" +
            "#buffered, #played{" +
            "    left: 0;" +
            "}" +
            "#buffered{" +
            "    background: #FFF;" +
            "    opacity: .8;" +
            "}" +
            "#played{" +
            "    background: #E62117;" +
            "}" +
            "#scrubber{" +
            "    display: none;" +
            "}" +
            "#scrubber:after{" +
            "    background: #E62117;" +
            "    border-radius: 100%;" +
            "    content: '';" +
            "    height: 12px;" +
            "    width: 12px;" +
            "    top: 50%;" +
            "    position: absolute;" +
            "    transform: translate(-50%, -50%);" +
            "}" +
            ".playing #scrubber, .ended #scrubber{" +
            "    display: initial;" +
            "}" +
            "#time_total, #screen_mode{" +
            "    float: right;" +
            "}" +
            "#screen_mode{" +
            "    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAACTFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////////////8AAAAAAAD////////29vYREREAAAAAAAAAAAAAAAD////////Ly8sQEBAAAAAAAAAAAAD////////Q0NAWFhYAAAAAAAAAAAAAAAAAAAD////////////Ozs4PDw8AAAAAAAAAAADGxsbGxsb///8LCwsAAAAAAAAQEBCsrKzGxsb///////8ICAgAAAAAAAASEhLIyMi/v78DAwMAAAAAAAANDQ3CwsL///////+6uroDAwMAAAALCwu8vLz///+ysrIAAAAAAAAAAAC3t7f////////09PQAAAAAAAAAAAAAAAAAAAAAAACwsLCqqqoAAAAAAACoqKj///+xsbGgoKD////Y2NgKCgqfn5/Ozs4REREAAAAAAACoqKjW1tYFBQUAAAAAAAAFBQX4+PgUFBTb29uzs7PNzc339/cAAAAAAADT09P///////+np6f09PQAAADa2toICAitra2wsLADAwOgoKC3t7ejo6O9vb0AAADBwcGtra3IyMgQEBAAAAAAAAC1tbX///8QEBAAAAAAAAC5ubnMzMwREREAAADAwMDMzMwPDw8NDQ3FxcXGxsbGxsYLCwvIyMgAAADExMQAAAAMDAzCwsIAAAA0NDT///8AAAArKysAAAArKyvKysr29vYvLy/////ExMTy8vL09PTv7+8AAAAAAAAAAAAAAAD6l3NfAAAAxHRSTlMAAQMGCg0PEAAJEh4nLTAkPE5aYPPv289IDL/AyLmZf21kwcvUkms0McbY13ZKLhwUEcXH2dJjOR0ExcLOYDgLk7vI2sxeNht0tshbNRpitMncxFo9X7LdwVczGbDK3rtULxYIAjesskcjqt+dps24MZ+tTCYOjaYwOzov60zGoNDWSyXH4eSxzivAXZW/WZ/DpsZdyqvNYklsr9Bzan6w15OYs9+5YbXczHG7E8IHuMofSetcVFZTzsxGyLu9vMRMIgUqN0l+fgAAA21JREFUeF7t1+db00AcwPHmmpQmkA5QShpRadXigFBcjaNVEapC3atUEGjR1onSOnBbF+69995b3Av/Me+SR61V3/DcvfK+7/t82jTJ73eG/yEajUaj0Wg0GgOMLGfKyczEsUbAmM1mbAjghdw80ZKZmJcr8AAnYhSsNnt+QWb5dptVMOJE2Fxbr97Z9bLlsjgRLs9e6MiusMgq4URMYr7DmZ0DM5JjKfgLAi8XEUSeVNy3X/+SjD+eAOJyDxg4yG7zlGbcwtgRefCQocPKypUKr/4w4kfkMbJTHj5i5KjRPklloA0J7Ehl8VhNeTPerwQAQwZx953wACrvq+5V1wShQgRx9Bs0ZSpSCqfV1oWgQgTpby+bPgMqM2fNnuMJsYAIUjK3fPS8+S6na+aCheH6CAtIIAUexeevXgSVhsaJTc0t0RgJpLRCUlprl2jK0niCAyQQi1cNBOvmLIOKe/kKUVCJIDkMCAQ94WNQWbW6DSLYX/WOfNFkgEqovmmNS17bnkwBzEMLIfY8zgAVNtIcX7e+3RLhY5jHr0MfIAZNaUmIG5IRSWXM/6qHi0RRERogmgminCCkeGjgRNBKZLXqAwQVA6oKYn8aaD+TJDQDeoD8+rA5O0YHdUT7Mgmflwc9QMz/jFH5lCBwUaAh8LJujMc7El4jPgQZUiS5SUy0sNqP1PezzR0+3oApZMf4iGXL1m3x5oimaPvZhR070xJOBKSSW3bt3rO3qT6EFO2hlfeFO1M4EVVo21/VsGr5xLAHTTE4EhByotyEFxEPNsjwbXnocF0woHqJIIBLxI+gd3Lj0doaRaooJYHEoi3NTSvRfFlw/ECronhIIGbARurDy5Ay62m1X7SVEECQEvIcPoXmfuHpM2ft54ggDFTqas9ryvaLly6TQJASCNYcuOJCW9/Va9fJIEhRWqtvyFAZcfMWIQS9wBT/7TtoTx5ydzJ+RD/geysU8ez9D0hxV+JHAP8QHfBLPTb7pYGPoOKS8SOPH6bnagf8knOXrz85KTthuBEm8Oz5zwP+i0a3S0de4kW45Ksqx48mV8o60tWZwoqkX49zZiW/LUtLeC/Xuz6LP/7ep89+hceH6JvDl/DLzLrK/F+93XhvYcGX7izP7Fta8UYB5oeRl1KmzFIS3w0Yw38QjUaj0Wg0Gu078w/ufCnxKEoAAAAASUVORK5CYII=);" +
            "    height: 50px;" +
            "    width: 50px;" +
            "}" +
            "#outer, #inner{" +
            "    background: no-repeat center / contain;" +
            "    display: none;" +
            "    position: absolute;" +
            "    left: -5px;" +
            "    top: -5px;" +
            "    right: -5px;" +
            "    bottom: -5px;" +
            "    animation-duration: 5s;" +
            "    animation-iteration-count: infinite;" +
            "    animation-timing-function: linear;" +
            "}" +
            ".buffering #outer, .buffering #inner{" +
            "    display: initial;" +
            "}" +
            "#outer{" +
            "    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALgAAAC4CAMAAABn7db1AAADAFBMVEX///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+/LkhhAAAA/3RSTlMAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1O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);" +
            "    animation-name: outer;" +
            "}" +
            "#inner{" +
            "    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALgAAAC4CAQAAAD6Ou5MAAAQvklEQVR4Xu3d67NldWHm8c+z9rl200DTlwg0AiLxgkDUqOUNjTVotMYkRvMq/9n8AdaUMRGcXCwTKwmZOMEoXmIgcokoAt10I9A0nNve65l5M1Upla6m+wC1m/XZVfu8/56n1v7tF7t+qdfTZLAEpuCTKfgUfDIFn4JPwSdT8Cn4ZAo+BZ9MwafgU/DJFHwKPpmCT8EnU/Ap+BR8MgWfgk+m4FPwyRR8Cj4Fn0zBp+CTKfgUfDIFn4JPwSdT8Cn4ZAo+BZ9MwafgkxX7z784n4AgqIgKYFABBEBmNm1mo+vWsjKsP+9/etawk7ldO9nuli2LAUQFQQBRA6gBAREVr+R/LEHw/XbAVY477FCvyiFXWBOSCJS0uz3nxbyQFz3nGS942Rtg+YMfdp3rXNujucKGIWPbcWjRVpVUZMPVkqFjtnsuZzztKU95bgp+oQ652c2uc6wHwmhhTwuggNAoLIKkqzma4323l53OU/1pfurFKfj5DI71nX7bWxwwmNvVFCqgiF8V0GbRhSRdd1Pfmjuc9LD/cNo4Bf91gxN5d3/bEWtdZM8IAAEQBUANqAEQqhmzZ+i6tzmROz3sQb8wTsEB4LfcmdscNhjtakUUQAUSRQJoUDoaAFFBx4wWieM9mnd50Pc9MwUH1nqnD7m+iyzMiQoKQEQMHSQM1USLsVKjsU3bQQFRqRqTHPHJ3Op+P7T7pg+et/eDwzus2U0LoAg6JGZYGO3lRS/Ztmdhp6ybWc2Ggz00zDpYoYvUGEAUQ80tXO+/u7Xf8eib+ZvmgX7CF/1OZ91pR0RVhJiZiV0nPei+3tsv98u+4s/65/4897o3/+9v/qxf6Zd9uffmvj7opF0xM2sYEEGpHTO/ky/mEw68WRd+XT/hts5sG6MCEENnxr6cMx7vEzndF7Pj1y0ssIVTYH045Jgb3ORoDnTIwqgBhLnR1bnbdf7RU2++hb/LF9xOdjJSUSWZda1xygP5hq/4poecseNC7DjjId/sV3yjDwynxFpmQgDG7OB2X/CuN1vwD/YPnLBnDlCRwYZZnvIP+ap7POB5F+N5D7inX+0/eKqzbnQgKDC3lxP+wAffNME7c5fP5FC3laIq6VrXnerf+kr/zpNGl2L0ZP7OV/K3OWU9a8IgQG075DO5y+zNEHwtn+7dNjsXiooMXc1LuX/8cv/eKfvllL/35eF+L1k1ABFins3c7dNdyxIEv9Tcd1mxCxVFV8Wj/Qv3Omm/nXSvv/BoYpUAwm5X3JW7rV7OwWc+2Y+onQIq6bpd/+prHrKw/1h4yF/4V7vWBQA7qY/kY8t/LPz1biJq+KiPttkjKsjQjZzxj75r4bX0vL9yKp9wNNsdA8Kutd6VXf+cy3Lh7+tdhuxVEGXohid6r/stvNYWud+9nuh6BgDsZsXv5X0uv+C9xaccGBfFqBCrHvVVP/F6+Um+mketSkQEWTjQT7nlcgt+2N05ajeKqHGw3gf7Z572OsrTvurBrBmAQWU3x/LpHL6cvtqv9JNuthtAmVntI8Nf9jmvt+f8ZdZ6qz0LAHtu6ifzvzK/XBZ+u/dlYVEEHbKeJ/yV57wRnutf5udZN1BB5hbD+9x+uSz8Sh+x3i0AstZT/tpJb5Cc8jf+2LFsQ1T2upmPeMzZpVx4/+uLD7vBdktUZdW5ftNPvZF+6ps5l1Ug1HZv8OHlXzi39AOZWwiEoQvf9m8AQNRrqwCA/Jujfi9DR4gsOs8HPOqx5Q6+4UMOdUuCEqv5sW9TjChYmBm8VmqwCgAI33Zd3pNdhSbzHsqH8qTtpQteALnF2+xABV3L8+6zDRTAaCbqtVExM/oVO+7rieHq7kQR2fE2t+Tfl/eUsto7utkRKLPwHU/4NVGj2n/klf+ZT/hOZcYgymjTHVaXduG52c0KEN3wWL5Tv8kcsWq/1aoVI+LX+U7e0Vu8FFBpbu7NeXg5Fz70vT1kQRVdse1+LzmP2F81ol7RS+7PdlYqgix6yHsNS7nwnPC2aCEaKx7Kj+t8ds2sWNgfozWrgnhFP3ZH3mWR1qAd9Ja81eNLFRzoO3NVdwkqMy/7fvecR9Vobs2lq8FBg8HovPby/dzYtc4h7LnKO/p4lu6RspmbzToyGkWHPt3HnJ+ouVFdqphZEaPzw2OezhADMGbIjcPm8i38hN+yB9CYeyQvuQCDHXsOoi5Oja40U8T54aU84oamDaJ73tITeWTZgt80XjFsARg872EXrHasWDFe5JN73YC4MH3Y+4erLajKXq/ITUsVvGy6MWNLFWZ+llN1oWrLzAEz9eqMVh2yYqEu2Kn+rEcsIirtmBtt2lqmZ/gxx7soIOm8j1m4cGYW5gYuIviKubpwFrPHMk8iBjUsetyxpVp4jjlgQRFmed7JenUGOwarXp1NB40Gr9LJnHV150R04UCO+fnyLDw91lUjUGPG037pImw5h7gwo6sdEhfhlz2dDILImNUek6VZuE1HjAXRZPB0d1yUhbl1ozq/0cKmAXURdvK0d4rCoKMjNr28PMGvsQBKunDSRapz9qyf/8RiYd0hm6Iu0kmLDlkEWOSaJQreA640EoVZznnORQpetuPK8yRfWHONVXMVF+m5nsuVWRQDY69y0LPLEvzKrLSDgqx4vudcgsHCWYesvOK5+6jBnktyzgs5XAGpmStZkuAONVFFjDMv5ZKCMxi96GqDX1WDI2J0ic7lpcwIKsShpTml5EBCEeBley5RjPYMv3HfM3WpsjdsMYCIJJtLs/BxQ9ICyaJbtR/OGmyYA2Bh09H92s3LFk0KJdlYmuDWk45BJeOYndgP9bzD1gAsHHBcjfZDd4xDxg4qzWB9eYKvNBSUdj7aDzF61mFXiNpzaB9zY55WQIiV5Qk+AyqkNPbHYOFFW/ZsOmFFjAb7ZBwlVASdLU3wsSlEUVH7ZVU9bss7bXnCnv2sEkFQabo0pxQLoEDFvqgZnnIOXOF6LMT+yJACFWWxNAvPXCoKNRtX7YuZ0ZNesmZUuw65wS8s9udYyKpZFhVEYr40wbtjlLFBmyEbtR8WnvGyNQWx6wrXO2UUl6psZEghmox2lif4VsYmirSDA6Iu0WDXlhUFEHMHrdoRlyrpgQxtVETHbC1NcOc6mhWUOmDdtksQg7kzAgCo0TGn7JqJS7KeAy1ElNG5JQouAJWFK3rFpQQfjLa9YMegAIDacNwv7V3qs/wKV1gMKoohSxS85+zmgAXFOB+udsgZF6Vm4lnnzF4h6MKaG7zopIWZi3aoVw9zAgzdzvIEz7k+54ouiFHGcTNH+lMXJeq0l60ZvZLaccBbLu3j88iw2XkRYfDcEgXvS32uN9ujaHW8NoPx4nL/0pYVdT4xd8Bxz6q4CHFtq0FFV/Kcl5bni89ezkRCleJaB7xKMWBux8yFWFi3gtFFONBrQ4OBDJyxtzQLxzO2O3QRYHTEEee8KiNesCOo84Oqo7advZjoR4cjHSMoQ7fzDEsTvJx2roezoCpjD7q+P3PhrNjyS4OKCxcbrnDGOateletz0KIgMuvZnl6i4Hi2T+dYd4vQpG/zPTsXnnu0bRCvTtVow7aFFRdsvW9rUgq6kqc9u1wL3/P4+B5DxhFYuMGJPuYCvWjXjsHFGG2a2bHlgp1wQxcB0cGYx7O3ZD+MHX/WF6xWUG0P9p0u2JZdMxdrYc2mC+edOZhCVFa90J+xRAuHPN0nHRYtVNzSa/pL5xWDLTtipi7eAodte9kgzq/X9BZJK0oy86Snly64ef6z7zBYQBkd827/23mNFuYWBpduZsWqqvPz7hwzApHBXv6z8+ULrj/xQccsqsjChjvzo571ilbseNHMYD+MZq521s75V3Vl78yq7QrKSs704Viq4CNw2n84augYlD03eG//0SvasjDYTwtrBnPn8d7c0L0IyNB6KM8s67UyP/CsWVB00fQDjnsFtW3P/qpVm6LqNzruA0kWUdCZZ/uD5b2S4CkP90OigB3H+zH3dAQAao7RoGp/jVhH7FkIABiHfizHbQ9GAxrNw55iWReuP3LWrCiM3XWH2+h/eVELCwuvlZmZmfg1787t9owVYJazfsTS/tYev/Cgj2deUJl33cc87QxABEG8VgooCMDRfLzr2aWisOLf84tY4oVb9F+c6kZVxai7PdFPWfFftl2vh/z/pQus9FNOZK+IIBvDM7nfYrkXzpnxn30+K53HKLRjbu/p/kPLaEREvbZqMChGJT6e2zu2ATWsjPP8szPLfwcE381v944u2ii6sObjXvRdiNdPFeD9Pm6WXSgS6/mR78KyL5xF/6nX5+puF4VdB3062/2xN0Ru66cdzBZAWfds/qmLXB5XEvRx3+68qxTQbVf1993ijXBLfz9X2gYKq+a+3ccvm0s3Yrw/1+a95m0U2q0e8Xl/4ydeX+/w2Ry1ozEimmHW77sfLo9HCrIzfitXuiXbBZDdHs8f9pt+4PXzO7nb4e62UYNRWO9/+padXGZXEpzpN/pM16AKzW6vyefd1ZnXw8xd+XyP2k2DqEHXnMxfO3MZ3uOTJ/o3Pt9rbFOAnR703xzpfZ71muoRd+W91mwDRdgYnhn/yi8u1ysJHvK3ztkUqGq73ZV+MH/oVq+lW/2hD1qxrQEhNvuib+YR4LJ6hkPh+2Y+20O2FMCuWW/pNfmh7/ml/XeN97vT4cy7gAoam14cvuHHlWUPPnpl/W5GdzvcbYCyMPZqd+Xt/k8e6o79s+5dPpzrxLyFqBLrOePv+gBBLuuLkx5wT09ar6oK2syjN/ULvpjbbNgPG7nNF/MFN9F5GhEMsJaT7vHAm+VqsJ+4pz/NullRRVnYzkrv6B/7kt91jUtxjd/1JX/sDivZtogCorOs+2nu8TBvluA87mv9QWtNoKK0e9m16T39nD/xWW930Kt10NvzWX+Sz3lPNrNrT4MgxHrqB77Wx3kzBed0v55vOWvDClGA0a4da270YV/wJZ9xm+M2Dc5nsOm423wmX/KFftiN1uzYNQYAVmw461u+7jRvtuBs9T73enRkXagCWvPu4iq35qP+qH+aL/mcj7vTrU54i2OucpVj3uKEW93p4z7nS/7UH/lob3UVdjtPAQixTh51j/tsvVmv6K2H+qT3+0CPdC/zoioKo1HKhs3xmKjd7NgzjqM9rGboYLXr1prWmBot2kFRBJQVq3m2/+p7OVu8WYPD2fy9R30ot3XdvCMBMaKli2iaJitdK0HQSjFaqGpBUAUVhqx0Jz/o/Xmi063f0Cec6iPu9FYb2lELiApSpYiRAGkVAFExIkAMjW2P+qGH7HrjGbzxYNcPfa1f92/OWel6ViQKAAgIVU0BgCoIxIr1rvRcfuzrvuaHdsG0cAC86Ece7lu9y429phtqYexIBQAFFEABMcpgMJNse8bPPOTntv1GU3DY9rBHHM2Nvcn1Dnc9MwsLo6JF/Oq7VGIwy8zCTk73yT7uZ84oTMHPr073dL43Hsu147U55nCvynrRkJYCQlIple2ezXM9nafHp51WYAp+oeoZz+SH3XRVruyVDvt/79k0GKxQmHc0Zms8m7N93tm+4AVbAFPwi7Nly0nEqlVrVsysGsjYPYvOs2uve2oppF5Pk8ESmIJPpuBT8MkUfAo+BZ9Mwafgkyn4FHwyBZ+CT8EnU/Ap+GQKPgWfTMGn4FPwyRR8Cj6Zgk/BJ1PwKfgUfDIFn4JPpuBT8MkUfAo+BZ9Mwafgkyn4FHwyBZ+CT/4vg87khSIUsQcAAAAASUVORK5CYII=);" +
            "    animation-name: inner;" +
            "}" +
            "@keyframes outer{" +
            "    0% {transform: rotate(0deg);}" +
            "    100% {transform: rotate(1080deg);}" +
            "}" +
            "@keyframes inner{" +
            "    0% {transform: rotate(720deg);}" +
            "    100% {transform: rotate(0deg);}" +
            "}" +
            "#menu_section{" +
            "    display: none;" +
            "    background: rgba(0, 0, 0, .75);" +
            "    position: absolute;" +
            "    text-align: center;" +
            "    left: 0;" +
            "    top: 0;" +
            "    right: 0;" +
            "    bottom: 0;" +
            "}" +
            "#subtitles, #quality, #download{" +
            "    background: no-repeat 0 / contain;" +
            "    transform: translateY(-50%);" +
            "    display: inline-block;" +
            "    height: 80px;" +
            "    width: 80px;" +
            "    top: 50%;" +
            "    position: relative;" +
            "}" +
            "#subtitles{" +
            "    background-image: url(data:image/png;base64,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);" +
            "}" +
            "#quality{" +
            "    background-image: url(data:image/png;base64,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);" +
            "}" +
            "#download{" +
            "    background-image: url(data:image/png;base64,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);" +
            "}";
        document.documentElement.appendChild(style);
    }
    function initIvory(event) {
        var video   = document.getElementById("video_container"),
            player  = document.getElementById("player"),
            content = document.getElementById("content"),
            videoId = window.location.href.split(/\?|\&|=/g),
            watch   = window.location.href.split("/watch?").length > 1;
        if (!video && player && videoId.indexOf("v") > 0) {
            player.innerHTML = "<div id='video_container'>\n" +
                "    <video id='video_player' preload='none'></video>\n" +
                "    <div id='controls'>\n" +
                "        <div id='top_section'>\n" +
                "            <div id='menu'></div>\n" +
                "            <div id='cards'></div>\n" +
                "            <div id='audio'></div>\n" +
                "        </div>\n" +
                "        <div id='bottom_section'>\n" +
                "            <div id='time_elapsed'>0:00</div>\n" +
                "            <div id='screen_mode'></div>\n" +
                "            <div id='time_total'></div>\n" +
                "            <div id='progress'>\n" +
                "                <div id='progress_center'>\n" +
                "                    <div id='buffered'></div>\n" +
                "                    <div id='played'></div>\n" +
                "                    <div id='scrubber'></div>\n" +
                "                </div>\n" +
                "            </div>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "    <div id='middle_section'>\n" +
                "        <div id='outer'></div>\n" +
                "        <div id='inner'></div>\n" +
                "    </div>\n" +
                "    <div id='menu_section'>\n" +
                "        <div id='download'></div>\n" +
                "        <div id='subtitles'></div>\n" +
                "        <div id='quality'></div>\n" +
                "    </div>\n" +
                "</div>\n";
            video = document.getElementById("video_container");
        } else if (video && videoId.indexOf("v") < 1) {
            video.remove();
        }
        if (video && videoId.indexOf("v") > 0 && globals.url !== videoId[videoId.indexOf("v") + 1]) {
            globals.url = videoId[videoId.indexOf("v") + 1];
            xhr("GET", initConfig, window.location.protocol + "//www.youtube.com/watch?app=desktop&spf=navigate&v=" + globals.url);
        } else if (globals.url) {
            delete globals.url;
        }
        /*if (content) {
            eventHandler(content, "blazer:module_transition_1", initIvory);
        }*/
    }
    eventHandler(window, "readystatechange", initIvory, true);
    eventHandler(window, "hashchange", initIvory);
    eventHandler(window, ["touchstart", "touchmove", "touchend"], initUI);
    initStyle();
}());