'use strict';

document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get('currentAlarm', result => {
    if (result.currentAlarm !== undefined) {
      const audioElem = document.getElementById('audio');
      audioElem.src = '../sounds/' + result.currentAlarm.sound;
      audioElem.play();
      const snoozeTime = result.currentAlarm.snooze;
      if (snoozeTime !== 'disabled') {
        const btnSnoozeElem = document.getElementById('btnSnooze');
        btnSnoozeElem.style.display = 'block';
        btnSnoozeElem.addEventListener('click', function() {
          chrome.alarms.create('snooze' + result.currentAlarm.id,
              {when: new Date().getTime() + parseInt(snoozeTime) * 60 * 1000});
          CloseCurrentWindow();
        });
        setTimeout(function() {
          audioElem.pause();
        }, 60000);
      }
      else {
        setTimeout(function() {
          audioElem.pause();
        }, 60000);
      }
      document.querySelector('.name').innerText = result.currentAlarm.name;
      document.getElementsByTagName('title')[0].innerText = chrome.i18n.getMessage('aside_alarm') + ' - ' + result.currentAlarm.name;
      document.querySelector('.time').innerText = ('00' + result.currentAlarm.hours).slice(-2) + ' : ' +
        ('00' + result.currentAlarm.minutes).slice(-2);
      chrome.storage.local.remove('currentAlarm');
    }
  });

  chrome.storage.local.get('currentTimer', result => {
    if (result.currentTimer !== undefined) {
      chrome.storage.local.remove('currentTimer');
      const audioElem = document.getElementById('audio');
      audioElem.src = '../sounds/' + result.currentTimer.sound;
      audioElem.play();
      document.getElementsByTagName('title')[0].innerText = chrome.i18n.getMessage('aside_alarm') + ' - ' + result.currentTimer.name;
      document.querySelector('.name').innerText = result.currentTimer.name;
      document.querySelector('.time').innerText = MiliSecToTimeSec(result.currentTimer.time);
      chrome.storage.local.remove('currentTimer');
      setTimeout(function() {
        document.getElementById('btnDismiss').click();
      }, 60000);
    }
  });
});

window.addEventListener('resize', () => {
  window.resizeTo(500, 400);
});

document.getElementById('btnDismiss').addEventListener('click', () => {
  CloseCurrentWindow();
});

function CloseCurrentWindow() {
  chrome.windows.getCurrent(currentWindow => {
    chrome.windows.remove(currentWindow.id);
  });
}

function MiliSecToTimeSec(ms) {
    // Pad to 2 or 3 digits, default is 2
  var pad = (n, z = 2) => ('00' + n).slice(-z);
  return pad(ms / 3.6e6 | 0) + ':' + pad((ms % 3.6e6) / 6e4 | 0) + ':' + pad((ms % 6e4) / 1000 | 0);
}

// locales
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  const value = e.dataset.i18nValue || 'textContent';
  e[value] = chrome.i18n.getMessage(e.dataset.i18n);
});
