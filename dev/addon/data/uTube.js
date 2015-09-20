// ==UserScript==
// @version     0.0.1
// @name        μTube
// @namespace   https://github.com/ParticleCore
// @description YouTube extra small
// @icon        https://raw.githubusercontent.com/ParticleCore/Particle/gh-pages/images/YT%2Bicon.png
// @match       *://www.youtube.com/*
// @match       *://m.youtube.com/*
// @exclude     *://m.youtube.com/embed/*
// @exclude     *://www.youtube.com/embed/*
// @run-at      document-start
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==
(function () {
    "use strict";
    var algo,
        ytconfig,
        events     = [],
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
    function filterScripts(event) {
        if (event.target.src && event.target.src.split("/pagead/").length > 1) {
            window.console.log(event.target);
            event.preventDefault();
        }
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
        var size,
            timer,
            video    = document.getElementById("video_player"),
            played   = document.getElementById("played"),
            elapsed  = document.getElementById("time_elapsed"),
            buffered = document.getElementById("buffered"),
            scrubber = document.getElementById("scrubber");
        switch (event.type) {
        case "play":
            return;
        case "ended":
            return;
        case "waiting":
            return;
        case "progress":
            size = 100 - (video.buffered.end(video.buffered.length - 1) / ytconfig.args.length_seconds * 100) + "%";
            if (buffered.style.right !== size) {
                buffered.style.right = size;
            }
            break;
        case "timeupdate":
            timer = timeConvert(video.currentTime);
            if (elapsed.textContent !== timer) {
                elapsed.textContent = timer;
            }
            return played.style.right = scrubber.style.right = 100 - (video.currentTime / ytconfig.args.length_seconds * 100) + "%";
        }
    }
    function initPlayer() {
        var video = document.getElementById("video_player");
        video.style.background = "url(" + ytconfig.args.iurl + ") no-repeat 0 / cover";
        video.src = ytconfig.itag["22"].url + ((ytconfig.itag["22"].s && "&signature=" + deCipher(ytconfig.itag["22"].s) + "&title=" + ytconfig.args.title) || "");
        document.getElementById("time_total").textContent = timeConvert(ytconfig.args.adaptive_fmts.split(/dur%3D([0-9.]*?)(%26|$|,)/)[1]);
        eventHandler(video, "play", playerUI);
        eventHandler(video, "ended", playerUI);
        eventHandler(video, "waiting", playerUI);
        eventHandler(video, "progress", playerUI);
        eventHandler(video, "timeupdate", playerUI);
    }
    function buildCipher(event) {
        var i;
        event = event.response || event.target.response;
        algo = {};
        algo.first = event.match(/[\w\W]{2}\=\{[\w\W]{2}\:function\(a([\w\W]*?)a\[0\]\=a\[b%a\.length\]([\w\W]*?)\}\}/) || false;
        algo.first = algo.first[0] && algo.first[0].replace(/([\w\W]*?)=\{/, "").split("},");
        algo.second = event.match(/a\=a\.split\(""\);([\w\W]*?)return a\.join\(""\)/) || false;
        algo.second = algo.second[0] && algo.second[0].split(";");
        window.console.log(algo);
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
            initPlayer();
        }
        window.console.log(algo);
    }
    function initUI(event) {
        var state,
            player;
        if (event.type === "touchend") {
            state = document.documentElement.classList.contains("playing");
            player = document.getElementById("video_player");
            if (player && event.target.id === "middle_section") {
                player[(state && "pause") || "play"]();
                document.documentElement.classList[(state && "remove") || "add"]("playing");
            }
        }
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
        xhr("GET", buildCipher, window.location.protocol + ytconfig.assets.js);
        parseStreams(ytconfig.args.adaptive_fmts);
        parseStreams(ytconfig.args.url_encoded_fmt_stream_map);
        window.console.info(ytconfig);
    }
    function initStyle() {
        var style = document.createElement("style");
        style.id = "ivory_style";
        style.textContent = "body, html{\n" +
            "    height: initial !important;\n" +
            "    position: relative;\n" +
            "}\n" +
            "#player{\n" +
            "    height: 100% !important;\n" +
            "    opacity: 1;\n" +
            "    overflow: initial;\n" +
            "    top: 46px;\n" +
            "    z-index: initial;\n" +
            "}\n" +
            "#player, ._mkd{\n" +
            "    height: 56.25vw;\n" +
            "    max-width: initial;\n" +
            "    width: 100%;\n" +
            "}\n" +
            "._mkd > a{\n" +
            "    display: none;\n" +
            "}\n" +
            "#video_container{\n" +
            "    background: #000 center / cover;\n" +
            "    height: 56.25vw;\n" +
            "    position: sticky;\n" +
            "    top: 0;\n" +
            "    width: 100%;\n" +
            "    z-index: 120;\n" +
            "}\n" +
            "#video_player, #controls{\n" +
            "    height: 100%;\n" +
            "    position: absolute;\n" +
            "    width: 100%;\n" +
            "}\n" +
            "#middle_section{\n" +
            "    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAABCCAMAAADUivDaAAAClFBMVEUAAAD///////8AAAD///8AAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAD///8AAAAAAAD///8AAAAAAAAAAAA7OzsAAAAAAAAAAAD///8AAAAAAAAAAAD///8AAAD///8AAAAAAAAAAAAAAAD///////////8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAD///8AAAAFBQX///////8AAAAAAAAAAAD///8AAAAAAAAAAAD+/v5WVlbj4+P///8WFhb9/f2fn5+Hh4d+fn4AAAAjIyMnJyenp6cAAAAAAAD39/f////u7u7y8vIPDw/BwcH///////8AAAAAAAD09PTr6+szMzMLCwv7+/vj4+MDAwP///8AAAAAAADHx8dMTEz////v7++zs7MwMDD///////8aGhq+vr7///8AAADn5+dBQUH///8AAADz8/MAAAAAAACUlJT///+2trbd3d1ycnL///+hoaEDAwMICAjr6+v///8NDQ2MjIywsLAUFBT7+/upqakfHx/4+Ph8fHwAAABEREQrKyt2dnbMzMzk5OSQkJCPj491dXWurq6YmJi7u7v+/v7Q0NCEhITT09NhYWGenp7////4+Pj+/v66urr6+vqamprn5+f29vb///+tra3f399/f3/m5ube3t52dnadnZ3a2toAAACbm5vY2Nhra2vn5+fm5ubFxcVNTU3Ly8tXV1fR0dFhYWEAAADX19dra2uEhISbm5v29vb8/PzJyclLS0vj4+Nra2s387uPAAAA3HRSTlMAywAU2ToBbwPMBAUIBgsSLwkOEM/NFw0KGjEeD1Ag1TMd2iscziETOYlYYF3oSkgb0DDjKlQ8X9jS7Cw2YlMmTCUoGVY9Rz4Y0VxC00Zt3+RZQSfdZUM4zJjn4nftwbWvIn5/x2tX7OXs7HPV2+dPbuzqhHDtyGvUNBXak9zLz4Te6Xq+1yPJjeotzGdNr+u9yKHmtWpwytZyrLp2zLd8zKZhjIGD3cm4uZPLvtLs2qnfnnPh7e3T7b7UzODK5J/Y5KlyxUSz4qTo6MCRwpTFmWbHnaiyy829kbx7hfcvCQAAAoBJREFUeF6l2GV3E0EYBeDIdtlIk5BCA5FS9+KaFCgqLVKgpYWiUtzdvRQo7u7u7u7uzp9hh0PP/bCf3nnnBzznbDL3zrxjsqia3WHXVJPsspgsmtNrTYupY1fliWh3wOOPpFqBkAlXIPf2scz68XFpNYHQiGDS5HD4Qv/WDfxxbiAkwh2fVVRRdn7+gqzOjQNAKIS1pFyxNWrZZNCEVS16eBJinJpKJqKmKGZzbR2ZeS4ju58nWSBUooZO6Eg3pfDa4iX5BZGGQSAkQiCJhaPvjejdJ6muN1qTIQTSKnHM1JEHRnVpKhAqAWTLuMEDO3Zq38EnEAKBldJ94qSxZ8c3a963q8+hEgkgC3OmnZzRJqptrAsIiTDbUuYU5bwe0jOU3k4gJAJIrXpLlw0YOjtUsnKeQGgEkF6rHz1euy53mAgxlQCy4cXL4ry5qQIhEkDuhi9dLkYTEAggO6+Gj6MJSASQirLraAIKgWVoAjrxvwluoAnIRHUT3EQTkAk0wRk0AZ0wNgGdMDYBnUAT3EITUAk0wSk0AZFAE7xCE9AJNMG2PH+y16HSCTTB/QchT6xTikATPLyS4NJkCIT4xBMm8fQ080M2bWb+nLMOMf/UyovbxdbySW+tHbt38Tb4ovV7Rcy80jGrer48kxX2O1uHi8oJSlfOwf1H8wvWMIpv357p2c849Vu6MYN3CJSuOHKYdxS9ecs8EN+914/lVMax/OHjJ97l4PMXySsK8sy4KCHPjOta5VfkmUgY80wjkGfeBbrqG/IsRXw35JlAGPJMG6yQZ7nBKr38H/EDeZYYMhVDnsmjrmL7+Qt5lhq4f//BwM0c+zmPD1bW4wP/CeQvUsDJy6gMHTkAAAAASUVORK5CYII=) no-repeat 0 / contain;\n" +
            "    position: relative;\n" +
            "    top: 50%;\n" +
            "    width: 8.4%;\n" +
            "    margin: 0 auto;\n" +
            "    max-height: 66px;\n" +
            "    max-width: 66px;\n" +
            "    transform: translateY(-50%);\n" +
            "}\n" +
            "#middle_section:before{\n" +
            "    content: '';\n" +
            "    display: block;\n" +
            "    padding-top: 100%;\n" +
            "}\n" +
            ".playing #middle_section{\n" +
            "    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAABCCAMAAADUivDaAAAASFBMVEX///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///////////////////9c+P1bAAAAGHRSTlMAAQQICw0QExQXJSwvNjpHXGlvy9nj8/YQRbHYAAAAn0lEQVR4Xu3Yuw6EIBCFYQS5yn1xff833UoikWQKrTbn1H++foaxhQuptBmnlRR8YeeIiq/W+RDHBe/syjtAVMJuKZc6ruS0WdEBopIuHd/7juRkB4hK+by3+/bsVQeISofSPve1EnQHiMrEOiVqNB0gqj8gQIAAAQIECBAgQIAAAQLEK0em8nlKXE9dopIuTYnrwU1Uz8/+58+HF14gPw1r73E3aIeaAAAAAElFTkSuQmCC);\n" +
            "}\n" +
            "#top_section, #bottom_section{\n" +
            "    height: 25%;\n" +
            "    max-height: 200px;\n" +
            "    position: absolute;\n" +
            "    padding: 0 12px 0 10px;\n" +
            "    box-sizing: padding-box;\n" +
            "    width: 100%;\n" +
            "}\n" +
            "#top_section:before, #bottom_section:before{\n" +
            "    content: '';\n" +
            "    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAADHCAMAAADveskSAAABuVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB168jWAAAAk3RSTlOgAZidBAkGAwgtgwKGiHIPMYwSHo8VkZIvGRscmwtucJ8jECd8loV6M55+JZl0KSoKBQ46Ew09PhRAFhcYB0U0Rx8MSjlMRBEoAFFSU1RDVldYWVpbXF1eO2BhYmNkZWZnaGlqa2xtICEiX3V2d3h5KyxVf4CBgjU2NziJios8jY4/kEFCk5SVRpdISZpLnE1OT1AGY4i/AAAAyElEQVQYV2XOr0oEcRTF8fODDwaLYYMGQRBmgqJVk2DcfQqDeYNg8C0MG0w+xzzDbjYOmLbJBIMTXDDsMMsil8u593u4f0w1Ig7Fr9iIuPIhbqxGculLVL5ttGIiKitxjlZUiqIVZcheXKsVRWN7oxeVteJe8SaOBnoijt0qimKpU6k1ipnGTLHU68euGavt/q1W2qHaxUT3j+2iGb7txJm423M24kBMB7YQp2I9TM1HOh91see9i0cvIi7Eg1fx5FlELX7Ep8gfbu4yHVZkRtsAAAAASUVORK5CYII=) repeat-x  0 / contain;\n" +
            "    height: 100%;\n" +
            "    left: 0;\n" +
            "    top: 0;\n" +
            "    position: absolute;\n" +
            "    width: 100%;\n" +
            "}\n" +
            "#top_section:before{\n" +
            "    transform: rotate(180deg);\n" +
            "}\n" +
            "#bottom_section{\n" +
            "    bottom: 0;\n" +
            "    font-size: 12px;\n" +
            "    color: #FFF;\n" +
            "    text-shadow: 0 0 1px #000;\n" +
            "}\n" +
            "#menu{\n" +
            "    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAcAgMAAAAhJhaVAAAADFBMVEX///8AAAAAAAD////4MiRfAAAABHRSTlMAHjPMw5IDSwAAABVJREFUeF5jyFrJsP8fGgIJggF5sgAukiW9zWUjDgAAAABJRU5ErkJggg==) repeat-x  0 / contain;\n" +
            "    top: 20px;\n" +
            "    margin-right: 10px;\n" +
            "    position: relative;\n" +
            "    float: right;\n" +
            "    height: 26px;\n" +
            "    transform: translateY(-50%);\n" +
            "    width: 7px;\n" +
            "}\n" +
            "#time_elapsed, #progress, #time_total, #screen_mode{\n" +
            "    position: relative;\n" +
            "    top: calc(100% - 20px);\n" +
            "    transform: translateY(-50%);\n" +
            "}\n" +
            "#time_elapsed{\n" +
            "    float: left;\n" +
            "}\n" +
            "#progress{\n" +
            "    height: 20px;\n" +
            "    overflow: hidden;\n" +
            "    position: relative;\n" +
            "}\n" +
            "#progress_center{\n" +
            "    background: rgba(255, 255, 255, .2);\n" +
            "    height: 2px;\n" +
            "    left: 16px;\n" +
            "    right: 16px;\n" +
            "    top: 50%;\n" +
            "    transform: translateY(-50%);\n" +
            "    position: absolute;\n" +
            "}\n" +
            "#progress:before, #buffered, #played, #scrubber{\n" +
            "    height: 100%;\n" +
            "    position: absolute;\n" +
            "}\n" +
            "#buffered, #played{\n" +
            "    left: 0;\n" +
            "}\n" +
            "#buffered{\n" +
            "    background: #FFF;\n" +
            "    opacity: .8;\n" +
            "}\n" +
            "#played{\n" +
            "    background: #E62117;\n" +
            "}\n" +
            "#scrubber:after{\n" +
            "    background: #E62117;\n" +
            "    border-radius: 100%;\n" +
            "    content: '';\n" +
            "    height: 12px;\n" +
            "    width: 12px;\n" +
            "    top: 50%;\n" +
            "    position: absolute;\n" +
            "    transform: translate(-50%, -50%);\n" +
            "}\n" +
            "#time_total, #screen_mode{\n" +
            "    float: right;\n" +
            "}\n" +
            "#screen_mode{\n" +
            "    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAMAAADzapwJAAAAP1BMVEUAAAD///////8AAAAAAABmZmb8/Py4uLgAAAAAAAAAAAAvLy8AAAAAAAD39/e3t7cAAAD+/v4AAAAAAAAAAAB9rMXQAAAAFXRSTlMAAMxeN3jJmg01CWhcFsaZNsoyMwydwgDkAAAAg0lEQVR4Xm3RWRLDIAwDUAGGLJA99z9rHVwKMdXnQ+NhRiBXQgDMN3C2xLWcQmXdHv4dCew0Aoq9uGZXXPGUfdeMxw+/aGZftzg3TPKzM143MP+4hKv3FU8mKdaHuK1+MiafrVn8YQO7YuyDfVzzSNmFexfuXHEeiv3NdaiQetbtdu0PtL4EmTMaQuYAAAAASUVORK5CYII=);\n" +
            "    margin-left: 20px;\n" +
            "    height: 22px;\n" +
            "    width: 22px;\n" +
            "}\n";
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
                "        </div>\n" +
                "        <div id='middle_section'></div>\n" +
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
                "</div>\n";
            video = document.getElementById("video_container");
        } else if (video && videoId.indexOf("v") < 1) {
            video.remove();
        }
        if (video && videoId.indexOf("v") > 0 && ytconfig !== window.location.href) {
            document.documentElement.removeAttribute("class");
            ytconfig = window.location.href;
            xhr("GET", initConfig, window.location.protocol + "//www.youtube.com/watch?app=desktop&spf=navigate&v=" + videoId[videoId.indexOf("v") + 1]);
        }
        /*if (content) {
            eventHandler(content, "blazer:module_transition_1", initIvory);
        }*/
    }
    if (window.frameElement && window.frameElement.nodeName === "IFRAME") {
        eventHandler(window, "beforescriptexecute", filterScripts, true);
    } else {
        eventHandler(window, "readystatechange", initIvory, true);
        eventHandler(window, "hashchange", initIvory);
        eventHandler(window, "touchend", initUI);
        initStyle();
    }
    window.console.log(window.frameElement && window.frameElement.nodeName === "IFRAME");
}());