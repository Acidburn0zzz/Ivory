var pageMod       = require("sdk/page-mod"),
    simplePrefs   = require("sdk/simple-prefs"),
    simpleStorage = require("sdk/simple-storage");

function settingsHandler(worker) {
    function settingsUpdate() {
        worker.port.emit("ivorySettings", simpleStorage.storage.ivorySettings);
    }
    function settingsGate(event) {
        if (event.set && typeof event.set === "object") {
            simpleStorage.storage.ivorySettings = event.set;
            simplePrefs.prefs["ivoSets"] = (simplePrefs.prefs["ivoSets"] > "0" && "0") || "1";
        }
    }
    function detachGhosts() {
        simplePrefs.removeListener("ivoSets", settingsUpdate);
        this.port.removeListener("ivorySettings", settingsGate);
    }
    simpleStorage.storage.ivorySettings = simpleStorage.storage.ivorySettings || {};
    worker.on("detach", detachGhosts);
    simplePrefs.on("ivoSets", settingsUpdate);
    worker.port.on("ivorySettings", settingsGate);
    worker.port.emit("ivorySettings", simpleStorage.storage.ivorySettings);
}

pageMod.PageMod({
    include: "*.youtube.com",
    attachTo: ["top", "frame"],
    contentScriptWhen: "start",
    contentScriptFile: "./uTube.js",
    contentStyleFile: "./uTube.css",
    onAttach: settingsHandler
});