'use strict';

window.setTimeout(function () {
  chrome.storage.local.get("version", e => {
    if (!e.version) {
      var version = chrome.runtime.getManifest().version;
      var homepage = chrome.runtime.getManifest().homepage_url;
      var url = homepage + "?v=" + version + "&type=install";
      chrome.tabs.create({"url": url, "active": true});
      chrome.storage.local.set({"version": version}, function () {});
    }
  });
}, 3000);

chrome.runtime.onMessage.addListener(function ({method, name, params}) {
  if (method === "alarms.create") {
    chrome.alarms.create(name, params);
  }
});

chrome.alarms.onAlarm.addListener(alarm => {
  chrome.windows.create({'url': 'data/alarmShow/alarmShow.html', 'type': 'popup', width: 500, height: 400}, function(newWindow) {
    chrome.storage.local.get('currentWindow', result => {
      if (result.currentWindow !== undefined) {
        chrome.windows.get(result.currentWindow, window => {
          if (window !== undefined && window.id === result.currentWindow) {
            chrome.windows.remove(result.currentWindow);
          }
        });
      }
    });
    chrome.storage.local.set({'currentWindow': newWindow.id});
    if (alarm.name.indexOf('timer') !== -1) {
      chrome.storage.local.get('timerData', result => {
        const relatedTimerIndex = result.timerData.findIndex(p => p.timerId === parseInt(alarm.name[alarm.name.length - 1]));
        chrome.storage.local.set({'currentTimer': result.timerData[relatedTimerIndex]});
      });
    }
    else {
      chrome.storage.local.get('alarmData', result => {
        if (result.alarmData !== undefined) {
          let alarmName;
          let relatedAlarmIndex;
          if (alarm.name.indexOf('snooze') !== -1) {
            alarmName = alarm.name.substring(6, alarm.name.length);
            relatedAlarmIndex = result.alarmData.findIndex(f => f.id === parseInt(alarmName));
          }
          else {
            alarmName = alarm.name;
            relatedAlarmIndex = result.alarmData.findIndex(f =>
              f.alarmList.some(p => f.id + p === alarmName));
          }
          chrome.storage.local.set({'currentAlarm': result.alarmData[relatedAlarmIndex]});
          chrome.storage.local.set({'alarmData': result.alarmData});
        }
      });
    }
  });
});

if (chrome.runtime.setUninstallURL) {
  var version = chrome.runtime.getManifest().version;
  var homepage = chrome.runtime.getManifest().homepage_url;
  var url = homepage + "?v=" + version + "&type=uninstall";
  chrome.runtime.setUninstallURL(url, function () {});
}
