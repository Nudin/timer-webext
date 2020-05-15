/* globals Stopwatch, StopwatchHandler, AlarmHandler, TimerHandler, UIHandler */
'use strict';

var data;
var alarmData;
var timerData;
var config = {activeTab: 'alarmPage'};
const stopwatch = new Stopwatch();
const audio = new Audio();
const timerEdit = {
  isEdit: false,
  timerId: null
};

const alarmEdit = {
  isEdit: false,
  alarmId: null
};

const reloadData = callback => {
  chrome.storage.local.get('data', result => {
    data = result.data || {};
    callback();
  });
};

const reloadTimerData = callback => {
  chrome.storage.local.get('timerData', result => {
    timerData = result.timerData || [];
    callback();
  });
};

const reloadAlarmData = callback => {
  chrome.storage.local.get('alarmData', result => {
    alarmData = result.alarmData || [];
    callback();
  });
};

const stopwatchRearrangeButtons = () => {
  const stopwatchOpButtons = [...document.querySelectorAll('[data-stopwatch-op]')];
  stopwatchOpButtons.forEach(p => p.classList.remove('button-show'));
  if (!('stopwatch' in data)) {
    stopwatchOpButtons.find(p => p.dataset.stopwatchOp === 'start').classList.add('button-show');
  }
  else {
    if (data.stopwatch.state === 'running') {
      stopwatchOpButtons.find(p => p.dataset.stopwatchOp === 'stop').classList.add('button-show');
      stopwatchOpButtons.find(p => p.dataset.stopwatchOp === 'lap').classList.add('button-show');
    }
    else if (data.stopwatch.state === 'stop') {
      stopwatchOpButtons.find(p => p.dataset.stopwatchOp === 'reset').classList.add('button-show');
      stopwatchOpButtons.find(p => p.dataset.stopwatchOp === 'resume').classList.add('button-show');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get('config', result => {
    if (result.config !== undefined) {
      config = result.config;
    }
    document.querySelector('[data-page="' + config.activeTab + '"]').click();
  });

  reloadTimerData(() => {
    timerData.forEach(p => {
      TimerHandler.PrepareUI(p);
      if (p.isRunning === true) {
        TimerHandler.Start(p, true);
      }
    });
    if (timerData.length > 0) {
      document.querySelector('.timerPage').classList.remove('timerPage-noTimers');
    }
  });

  reloadAlarmData(() => {
    if (alarmData.length > 0) {
      alarmData.sort((a, b) => {
        const hourDiff = b.hours - a.hours;
        return hourDiff === 0 ? b.minutes - a.minutes : hourDiff;
      });
      alarmData.forEach(p => {
        AlarmHandler.PrepareUI(p);
        document.querySelector('.alarmPage').classList.remove('alarmPage-noAlarms');
      });
    }
  });

  reloadData(() => {
    stopwatchRearrangeButtons();
    if ('stopwatch' in data) {
      const lblStopwatchElem = document.getElementById('lblStopwatch');
      if (data.stopwatch.state === 'running') {
        StopwatchHandler.Continue(lblStopwatchElem);
      }
      else if (data.stopwatch.state === 'stop') {
        lblStopwatchElem.innerText = MiliSecToTime(data.stopwatch.stopTime - data.stopwatch.startTime);
      }

      if (data.stopwatch.laps) {
        for (let i = data.stopwatch.laps.length - 1; i >= 0; i--) {
          CreateNewLap(data.stopwatch.laps[i]);
        }
      }
    }
  });

  document.getElementById('btnSaveTimer').value = chrome.i18n.getMessage('timerPage_edit_save');
  document.getElementById('btnSaveAlarm').value = chrome.i18n.getMessage('alarmPage_edit_save');
  document.getElementById('btnSetSnooze').value = chrome.i18n.getMessage('alarmPage_edit_snooze');
  document.getElementById('btnSnoozeClose').value = chrome.i18n.getMessage('close');
  document.querySelector('[data-day = "' + new Date().getDay() + '"]').classList.add('alarmPage-edit-date-active');

  SetEditableTimes();
});

document.addEventListener('click', e => {
  e.stopPropagation();
  const lblStopwatchElem = document.getElementById('lblStopwatch');
  const stopwatchLapElem = document.querySelector('.stopwatchPage-laps');
  switch (e.target.id) {
    case 'btnStartStopwatch':
      StopwatchHandler.Start(lblStopwatchElem);
      stopwatchRearrangeButtons();
      break;
    case 'btnStopStopwatch':
      StopwatchHandler.Stop();
      stopwatchRearrangeButtons();
      break;
    case 'btnResumeStopwatch':
      StopwatchHandler.Resume(lblStopwatchElem);
      stopwatchRearrangeButtons();
      break;
    case 'btnResetStopwatch':
      lblStopwatchElem.innerText = '00:00:00.000';
      StopwatchHandler.Reset();
      while (stopwatchLapElem.firstChild) {
        stopwatchLapElem.removeChild(stopwatchLapElem.firstChild);
      }
      stopwatchRearrangeButtons();
      break;
    case 'btnLapStopwatch':
      StopwatchHandler.Lap(stopwatchLapElem);
      break;
    case 'hoursIncrease':
      TimerHandler.ChangeTimerFor(document.getElementById('hoursValue'));
      break;
    case 'hoursDecrease':
      TimerHandler.ChangeTimerFor(document.getElementById('hoursValue'), 'decrease');
      break;
    case 'minutesIncrease':
      TimerHandler.ChangeTimerFor(document.getElementById('minutesValue'));
      break;
    case 'minutesDecrease':
      TimerHandler.ChangeTimerFor(document.getElementById('minutesValue'), 'decrease');
      break;
    case 'secondsIncrease':
      TimerHandler.ChangeTimerFor(document.getElementById('secondsValue'));
      break;
    case 'secondsDecrease':
      TimerHandler.ChangeTimerFor(document.getElementById('secondsValue'), 'decrease');
      break;
    case 'alarmHoursIncrease':
      AlarmHandler.ChangeTimerFor(document.getElementById('alarmHoursValue'));
      break;
    case 'alarmHoursDecrease':
      AlarmHandler.ChangeTimerFor(document.getElementById('alarmHoursValue'), 'decrease');
      break;
    case 'alarmMinutesIncrease':
      AlarmHandler.ChangeTimerFor(document.getElementById('alarmMinutesValue'));
      break;
    case 'alarmMinutesDecrease':
      AlarmHandler.ChangeTimerFor(document.getElementById('alarmMinutesValue'), 'decrease');
      break;
    case 'btnSnoozeClose':
      CloseSnoozeEdit();
      break;
  }

  if (e.target.classList.contains('snooze-button')) {
    const snoozePageEditElem = document.getElementById('snoozePageEdit');
    snoozePageEditElem.classList.add('snoozePage-edit-show');
  }

  if (e.target.className === 'icon-popup') {
    const timerElems = document.querySelectorAll('.timerPage-item');
    timerElems.forEach(p => {
      p.classList.add('timerPage-item-hide');
    });
    const itemElem = e.target.closest('.timerPage-item');
    itemElem.querySelector('.icon-remove').style.display = 'none';
    const addTimerElem = document.querySelector('.timerPage-addTimer');
    addTimerElem.style.display = 'none';
    itemElem.classList.remove('timerPage-item-hide');
    itemElem.style.fontSize = '400%';
    e.target.className = 'icon-smallsize';
    return;
  }

  if (e.target.className === 'icon-smallsize') {
    const timerElems = document.querySelectorAll('.timerPage-item');
    timerElems.forEach(p => {
      p.classList.remove('timerPage-item-hide');
    });
    const itemElem = e.target.closest('.timerPage-item');
    itemElem.querySelector('.icon-remove').style.display = 'inline-block';
    const addTimerElem = document.querySelector('.timerPage-addTimer');
    addTimerElem.style.display = 'inline-block';
    itemElem.style.fontSize = '17px';
    e.target.className = 'icon-popup';
  }

  if (e.target.classList.contains('navigation-item')) {
    const navigationActiveElem = document.querySelector('.navigation-item-active');
    const pageShowElem = document.querySelector('[class$="-pageShow"]');

    navigationActiveElem.classList.remove('navigation-item-active');
    pageShowElem.classList.remove(pageShowElem.classList[pageShowElem.classList.length - 1]);
    e.target.classList.add('navigation-item-active');

    const relatedPageElem = document.getElementById(e.target.dataset.page);
    relatedPageElem.classList.add(e.target.dataset.page + '-pageShow');
    config.activeTab = e.target.dataset.page;
    chrome.storage.local.set({'config': config});
  }

  if (e.target.classList.contains('icon-play')) {
    e.target.classList.toggle('icon-pause');
    const relatedTimerId = e.target.closest('.timerPage-item').dataset.timerId;
    const relatedTimer = timerData.find(p => p.timerId === parseInt(relatedTimerId));
    if (relatedTimer.isRunning === false) {
      relatedTimer.isRunning = true;
      TimerHandler.Start(relatedTimer);
    }
    else {
      TimerHandler.Stop(relatedTimer);
    }
  }

  if (e.target.className === 'icon-back') {
    TimerHandler.Reset(parseInt(e.target.closest('.timerPage-item').dataset.timerId));
  }

  if (e.target.classList.contains('alarmPage-edit-sound')) {
    const activeSound = document.querySelector('.alarmPage-edit-sound-active');
    activeSound.classList.remove('alarmPage-edit-sound-active');
    e.target.classList.add('alarmPage-edit-sound-active');
    audio.src = '../sounds/' + e.target.dataset.sound;
    audio.pause();
    audio.play();
  }

  if (e.target.classList.contains('timerPage-edit-sound')) {
    const activeSound = document.querySelector('.timerPage-edit-sound-active');
    activeSound.classList.remove('timerPage-edit-sound-active');
    e.target.classList.add('timerPage-edit-sound-active');
    audio.src = '../sounds/' + e.target.dataset.sound;
    audio.pause();
    audio.play();
  }

  if (e.target.classList.contains('alarmPage-edit-date')) {
    e.target.classList.toggle('alarmPage-edit-date-active');
  }
  if (e.target.className === 'icon-remove') {
    TimerHandler.Remove(e.target.closest('.timerPage-item').dataset.timerId);
  }

  if (e.target.classList.contains('alarmPage-item-removeIcon')) {
    const relatedItem = e.target.closest('.alarmPage-item');
    AlarmHandler.Remove(relatedItem.dataset.alarmId, () => {
      relatedItem.classList.add('alarmPage-item-remove');
      setTimeout(() => {
        relatedItem.remove();
      }, 1000);
    });
  }

  if (e.target.classList.contains('alarmPage-addAlarm')) {
    const alarmPageEditElem = document.getElementById('alarmPageEdit');
    alarmPageEditElem.classList.add('alarmPage-edit-show');
    ResetNewAlarmForm();
  }

  if (e.target.classList.contains('timerPage-addTimer')) {
    const timerPageEditElem = document.getElementById('timerPageEdit');
    timerPageEditElem.classList.add('timerPage-edit-show');
    ResetNewTimerForm();
  }

  if (e.target.className === 'alarmPage-edit-close') {
    CloseAlarmEdit();
    audio.pause();
  }

  if (e.target.className === 'timerPage-edit-close') {
    CloseTimerEdit();
    audio.pause();
  }

  if (e.target.className === 'snoozePage-edit-close') {
    CloseSnoozeEdit();
  }
});

function MiliSecToTime(ms) {
    // Pad to 2 or 3 digits, default is 2
  var pad = (n, z = 2) => ('00' + n).slice(-z);
  return pad(ms / 3.6e6 | 0) + ':' + pad((ms % 3.6e6) / 6e4 | 0) + ':' + pad((ms % 6e4) / 1000 | 0) + '.' + pad(((ms % 1000)), 3);
}

function MiliSecToTimeSec(ms) {
    // Pad to 2 or 3 digits, default is 2
  var pad = (n, z = 2) => ('00' + n).slice(-z);
  return pad(ms / 3.6e6 | 0) + ':' + pad((ms % 3.6e6) / 6e4 | 0) + ':' + pad((ms % 6e4) / 1000 | 0);
}

function CreateNewLap(newLap) {
  const lapItemElem = document.createElement('div');
  lapItemElem.className = 'lapItem';

  const lapItemIdElem = document.createElement('span');
  lapItemIdElem.className = 'lapItem-lapId';
  lapItemIdElem.innerText = ('00' + newLap.lapId).slice(-2);

  const lapItemElapsedElem = document.createElement('span');
  lapItemElapsedElem.className = 'lapItem-elapsedTime';
  lapItemElapsedElem.innerText = MiliSecToTime(newLap.elapsedTime);

  const lapItemDiffElem = document.createElement('span');
  lapItemDiffElem.innerText = MiliSecToTime(newLap.diff);

  lapItemElem.appendChild(lapItemElapsedElem);
  lapItemElem.appendChild(lapItemDiffElem);
  lapItemElem.appendChild(lapItemIdElem);

  const lapTargetElem = document.querySelector('.stopwatchPage-laps');
  lapTargetElem.insertBefore(lapItemElem, lapTargetElem.firstChild);
}

function CloseAlarmEdit() {
  const alarmPageEditElem = document.getElementById('alarmPageEdit');
  alarmPageEditElem.classList.remove('alarmPage-edit-show');
  setTimeout(function() {
    const btnSaveAlarmElem = document.getElementById('btnSaveAlarm');
    if (btnSaveAlarmElem.classList.contains('button-disabled')) {
      btnSaveAlarmElem.classList.remove('button-disabled');
    }
  }, 20);
}

function CloseTimerEdit() {
  const timerPageEditElem = document.getElementById('timerPageEdit');
  timerPageEditElem.classList.remove('timerPage-edit-show');
  setTimeout(function() {
    const btnSaveTimerElem = document.getElementById('btnSaveTimer');
    if (btnSaveTimerElem.classList.contains('button-disabled')) {
      btnSaveTimerElem.classList.remove('button-disabled');
    }
  }, 20);
}

function CloseSnoozeEdit() {
  const snoozePageEditElem = document.getElementById('snoozePageEdit');
  snoozePageEditElem.classList.remove('snoozePage-edit-show');
}

chrome.runtime.onMessage.addListener(request => {
  if (request.action === 'removeAlarm') {
    const alarmElem = document.querySelector('[data-alarm-Id = "' + request.alarmId + '"]');
    alarmElem.remove();
    chrome.storage.local.get('alarmData', result => {
      alarmData = result.alarmData;
    });
  }
});

function PrepareTimerObj() {
  const txtTimerNameElem = document.getElementById('txtTimerName');
  const hoursValue = parseInt(document.getElementById('hoursValue').dataset.value);
  const minutesValue = parseInt(document.getElementById('minutesValue').dataset.value);
  const secondsValue = parseInt(document.getElementById('secondsValue').dataset.value);

  if (hoursValue === 0 && minutesValue === 0 && secondsValue < 59) {
    return false;
  }

  return {
    name: txtTimerNameElem.value,
    time: hoursValue * 3600000 + minutesValue * 60000 + secondsValue * 1000,
    hours: hoursValue,
    minutes: minutesValue,
    seconds: secondsValue
  };
}

document.querySelector('#frmTimer').addEventListener('submit', e => {
  e.preventDefault();
  const data = PrepareTimerObj();
  const timerValidatorElem = document.querySelector('#timerValidator');
  if (data === false) {
    timerValidatorElem.classList.add('validation-show');
    setTimeout(function() {
      timerValidatorElem.classList.remove('validation-show');
    }, 5000);
    return;
  }
  if (timerEdit.isEdit === true) {
    TimerHandler.Update(timerEdit.timerId, data);
    timerEdit.isEdit = false;
    timerEdit.timerId = null;
  }
  else {
    TimerHandler.Create(data);
  }
  CloseTimerEdit();
  audio.pause();
  e.target.reset();
  timerValidatorElem.classList.remove('validation-show');
});

function PrepareAlarmObj() {
  const selectedDays = [];
  [...document.querySelectorAll('.alarmPage-edit-date-active')].forEach(p => {
    selectedDays.push(p.dataset.day);
  });
  if (selectedDays.length === 0) {
    return false;
  }
  const txtAlarmNameElem = document.getElementById('txtAlarmName');
  const hoursValue = parseInt(document.getElementById('alarmHoursValue').dataset.value);
  const minutesValue = parseInt(document.getElementById('alarmMinutesValue').dataset.value);
  const chkRepeatElem = document.getElementById('chkRepeat');

  const snoozeTimeElem = document.getElementById('snoozePageEdit');
  const snoozeSelectedTime = snoozeTimeElem.querySelector(':checked').value;

  return {
    name: txtAlarmNameElem.value,
    hours: hoursValue,
    minutes: minutesValue,
    repeatWeekly: chkRepeatElem.checked,
    days: selectedDays,
    snooze: snoozeSelectedTime
  };
}

document.querySelector('#frmAlarm').addEventListener('submit', e => {
  e.preventDefault();
  const data = PrepareAlarmObj();
  const alarmValidatorElem = document.querySelector('#alarmValidator');
  if (data === false) {
    alarmValidatorElem.classList.add('validation-show');
    setTimeout(function() {
      alarmValidatorElem.classList.remove('validation-show');
    }, 5000);
    return;
  }
  if (alarmEdit.isEdit === true) {
    AlarmHandler.Remove(alarmEdit.alarmId, () => {
      document.querySelector('.alarmPage-item[data-alarm-id="' + alarmEdit.alarmId + '"]').remove();
    });
    const updatedItem = AlarmHandler.Create(data);
    setTimeout(function() {
      updatedItem.classList.add('alarmPage-item-edit');
    }, 300);
    setTimeout(function() {
      updatedItem.classList.remove('alarmPage-item-edit');
    }, 5000);
    alarmEdit.isEdit = false;
    alarmEdit.timerId = null;
  }
  else {
    const insertedItem = AlarmHandler.Create(data);
    setTimeout(function() {
      insertedItem.classList.add('alarmPage-item-new');
    }, 300);
    setTimeout(function() {
      insertedItem.classList.remove('alarmPage-item-new');
    }, 5000);
  }
  CloseAlarmEdit();
  audio.pause();
});

// locales
[...document.querySelectorAll('[data-i18n]')].forEach(e => {
  const value = e.dataset.i18nValue || 'textContent';
  e[value] = chrome.i18n.getMessage(e.dataset.i18n);
});

function ResetNewTimerForm() {
  const timerHoursValueElem = document.getElementById('hoursValue');
  const timerMinutesValueElem = document.getElementById('minutesValue');
  const timerSecondsValueElem = document.getElementById('secondsValue');

  document.getElementById('txtTimerName').value = '';

  timerHoursValueElem.textContent = '00';
  timerHoursValueElem.dataset.value = '0';
  timerMinutesValueElem.textContent = '00';
  timerMinutesValueElem.dataset.value = '0';
  timerSecondsValueElem.textContent = '00';
  timerSecondsValueElem.dataset.value = '0';
}

function ResetNewAlarmForm() {
  [...document.querySelectorAll('.alarmPage-edit-date-active')].forEach(p => {
    p.classList.remove('alarmPage-edit-date-active');
  });
  document.querySelector('[data-day = "' + new Date().getDay() + '"]').classList.add('alarmPage-edit-date-active');

  document.getElementById('txtAlarmName').value = '';

  const alarmHoursValueElem = document.getElementById('alarmHoursValue');
  const alarmMinutesValueElem = document.getElementById('alarmMinutesValue');

  alarmHoursValueElem.textContent = '00';
  alarmHoursValueElem.dataset.value = '0';
  alarmMinutesValueElem.textContent = '00';
  alarmMinutesValueElem.dataset.value = '0';

  const activeSound = document.querySelector('.alarmPage-edit-sound-active');
  activeSound.classList.remove('alarmPage-edit-sound-active');
  const defaultSoundElem = document.querySelector('.alarmPage-edit-sounds span[data-sound="alarm1.mp3"]');
  defaultSoundElem.classList.add('alarmPage-edit-sound-active');

  document.getElementById('chkRepeat').checked = false;
}

function SetEditableTimes() {
  const hoursValueElem = document.getElementById('hoursValue');
  const minutesValueElem = document.getElementById('minutesValue');
  const secondsValueElem = document.getElementById('secondsValue');
  const alarmHoursValueElem = document.getElementById('alarmHoursValue');
  const alarmMinutesValueElem = document.getElementById('alarmMinutesValue');

  const btnSaveTimerElem = document.getElementById('btnSaveTimer');
  const btnSaveAlarmElem = document.getElementById('btnSaveAlarm');

  UIHandler.EditableKeypress(hoursValueElem);
  UIHandler.EditableBlur(hoursValueElem);
  UIHandler.PreventPasteFor(hoursValueElem);
  UIHandler.EditableKeypress(alarmHoursValueElem);
  UIHandler.EditableBlur(alarmHoursValueElem, value => {
    if (Number(value) > 23) {
      alarmHoursValueElem.focus();
      UIHandler.SelectAllText(alarmHoursValueElem);
      btnSaveAlarmElem.classList.add('button-disabled');
    }
    else {
      btnSaveAlarmElem.classList.remove('button-disabled');
    }
  });
  UIHandler.PreventPasteFor(alarmHoursValueElem);

  UIHandler.EditableKeypress(alarmMinutesValueElem);
  UIHandler.EditableBlur(alarmMinutesValueElem, value => {
    if (Number(value) > 59) {
      alarmMinutesValueElem.focus();
      UIHandler.SelectAllText(alarmMinutesValueElem);
      btnSaveAlarmElem.classList.add('button-disabled');
    }
    else {
      btnSaveAlarmElem.classList.remove('button-disabled');
    }
  });
  UIHandler.PreventPasteFor(alarmMinutesValueElem);

  UIHandler.EditableKeypress(minutesValueElem);
  UIHandler.EditableBlur(minutesValueElem, value => {
    if (Number(value) > 59) {
      minutesValueElem.focus();
      UIHandler.SelectAllText(minutesValueElem);
      btnSaveTimerElem.classList.add('button-disabled');
    }
    else {
      btnSaveTimerElem.classList.remove('button-disabled');
    }
  });
  UIHandler.PreventPasteFor(minutesValueElem);

  UIHandler.EditableKeypress(secondsValueElem);
  UIHandler.EditableBlur(secondsValueElem, value => {
    if (Number(value) > 59) {
      minutesValueElem.focus();
      UIHandler.SelectAllText(secondsValueElem);
      btnSaveTimerElem.classList.add('button-disabled');
    }
    else {
      btnSaveTimerElem.classList.remove('button-disabled');
    }
  });
  UIHandler.PreventPasteFor(secondsValueElem);
}
