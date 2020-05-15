'use strict';

{
  chrome.alarms.create = function (name, params) {
    chrome.runtime.sendMessage({"method": "alarms.create", name, params});
  };
}

var AlarmHandler = {
  Create: newAlarm => {
    const nextId = alarmData.length > 0 ? Math.max(...alarmData.map(p => p.id)) + 1 : 1;
    const alarmIdList = [];
    newAlarm.days.forEach(p => alarmIdList.push(p));
    const newObj = {
      id: nextId,
      alarmList: alarmIdList,
      name: newAlarm.name,
      sound: document.querySelector('.alarmPage-edit-sound-active').dataset.sound,
      hours: newAlarm.hours,
      minutes: newAlarm.minutes,
      repeatWeekly: newAlarm.repeatWeekly,
      days: newAlarm.days.length > 0 ? newAlarm.days : [alarmIdList[0].toString()],
      snooze: newAlarm.snooze,
      state: true
    };
    alarmData.unshift(newObj);
    if (alarmData.length === 1) {
      document.querySelector('.alarmPage').classList.remove('alarmPage-noAlarms');
    }
    const insertedItem = AlarmHandler.PrepareUI(newObj);
    AlarmHandler.SetAlarm(newObj);
    chrome.storage.local.set({'alarmData': alarmData});
    return insertedItem;
  },
  SetAlarm: alarmObj => {
    const weekDuration = 7 * 24 * 60;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const nowHours = now.getHours();
    const nowMinutes = now.getMinutes();

    const futureHours = alarmObj.hours;
    const futureMinutes = alarmObj.minutes;

    const alarmTime = (futureHours * 60 + futureMinutes) - (nowHours * 60 + nowMinutes);
    let finalAlarmTime;
    if (alarmTime < 0) {
      finalAlarmTime = (alarmTime + 24 * 60) * 60 * 1000;
    }
    else {
      finalAlarmTime = alarmTime * 60 * 1000;
    }
    alarmObj.alarmList.forEach(p => {
      const currentDayOfWeek = p;
      let duration = Number(currentDayOfWeek) - dayOfWeek;
      if (alarmTime >= 0 && duration < 0) {
        duration = 7 + duration;
      }
      if (alarmTime < 0 && duration > 0) {
        duration--;
      }
      else if (alarmTime < 0 && duration <= 0) {
        duration = 6 + duration;
      }

      const nextDayTime = duration * 24 * 60 * 60 * 1000;
      if (alarmObj.repeatWeekly === true) {
        chrome.alarms.create(alarmObj.id.toString() + p,
          {when: (new Date().getTime() - new Date().getSeconds() * 1000) + nextDayTime + finalAlarmTime,
            periodInMinutes: weekDuration});
      }
      else {
        chrome.alarms.create(alarmObj.id.toString() + p,
            {when: (new Date().getTime() - new Date().getSeconds() * 1000) + nextDayTime + finalAlarmTime});
      }
    });

    const tempDays = alarmObj.alarmList.map(p => {
      if (Number(p) < dayOfWeek) {
        return Number(p) + 10;
      }
      else if (Number(p) === dayOfWeek && alarmTime < 0) {
        return Number(p) + 10;
      }
      else {
        return Number(p);
      }
    });
    const nearestDay = tempDays.findIndex(p => p === Math.min(...tempDays));
    let duration = Number(alarmObj.alarmList[nearestDay]) - dayOfWeek;
    if (alarmTime >= 0 && duration < 0) {
      duration = 7 + duration;
    }
    if (alarmTime < 0 && duration > 0) {
      duration--;
    }
    else if (alarmTime < 0 && duration <= 0) {
      duration = 6 + duration;
    }

    const nextDayTime = (duration) * 24 * 60 * 60 * 1000;

    const minutesDuration = 60 * 1000;
    const hoursDuration = 60 * minutesDuration;
    const dayDuration = 24 * hoursDuration;
    const dayText = Math.floor((finalAlarmTime + nextDayTime) / dayDuration);
    const dayMod = (finalAlarmTime + nextDayTime) % dayDuration;
    const hoursText = Math.floor(dayMod / hoursDuration);
    const minutesText = Math.floor((dayMod % hoursDuration) / minutesDuration);
    const tooltipElem = document.querySelector('.tooltip');
    tooltipElem.textContent = chrome.i18n.getMessage('alarm_tooltip_one') + ' ' + (dayText > 0 ? dayText + ' ' + chrome.i18n.getMessage('alarm_tooltip_days') + ' ' : '') +
      (hoursText > 0 ? (dayText > 0 ? (' ' + chrome.i18n.getMessage('and_text') + ' ') : '') + hoursText + ' ' + chrome.i18n.getMessage('alarm_tooltip_hours') + ' ' : '') +
      (minutesText > 0 ? (hoursText > 0 ? (' ' + chrome.i18n.getMessage('and_text') + ' ') : '') + minutesText + ' ' + chrome.i18n.getMessage('alarm_tooltip_minutes') + ' ' : '') + ' ' + chrome.i18n.getMessage('alarm_tooltip_from_now') + '.';
    tooltipElem.classList.add('tooltip-show');
    setTimeout(() => tooltipElem.classList.remove('tooltip-show'), 5000);
  },
  Remove: (alarmId, callback) => {
    if (alarmData.length > 0) {
      alarmData.find(f => f.id === Number(alarmId)).alarmList.forEach(p => {
        chrome.alarms.clear(alarmId + p.toString(), () => {});
      });
      const relatedAlarmIndex = alarmData.findIndex(p => p.id === parseInt(alarmId));
      alarmData.splice(relatedAlarmIndex, 1);
      chrome.storage.local.set({'alarmData': alarmData});
      if (alarmData.length === 0) {
        const alarmPageElem = document.querySelector('.alarmPage');
        alarmPageElem.classList.remove('alarmPage-pageShow');
        alarmPageElem.classList.add('alarmPage-noAlarms');
        alarmPageElem.classList.add('alarmPage-pageShow');
      }
      callback();
    }
  },
  DisableAlarm: alarm => {
    alarm.alarmList.forEach(p => {
      chrome.alarms.clear(alarm.id + p.toString(), () => {
      });
    });
  },
  PrepareUI: newAlarm => {
    const newItemElem = document.createElement('div');

    newItemElem.addEventListener('click', function(e) {
      if (e.target.closest('.alarmPage-item-icons')) {
        return;
      }
      const alarmPageEditElem = document.getElementById('alarmPageEdit');
      alarmPageEditElem.classList.add('alarmPage-edit-show');
      alarmEdit.isEdit = true;
      alarmEdit.alarmId = this.dataset.alarmId;

      const relatedAlarm = alarmData.find(p => p.id === parseInt(alarmEdit.alarmId));
      const txtAlarmNameElem = document.getElementById('txtAlarmName');
      txtAlarmNameElem.value = relatedAlarm.name;
      const alarmHoursValueElem = document.getElementById('alarmHoursValue');
      const alarmMinutesValueElem = document.getElementById('alarmMinutesValue');

      const snoozeTimeElem = document.getElementById('snoozePageEdit');
      snoozeTimeElem.querySelector('[value="' + relatedAlarm.snooze + '"]').checked = true;

      [...document.querySelectorAll('.alarmPage-edit-date-active')].forEach(p => {
        p.classList.remove('alarmPage-edit-date-active');
      });

      relatedAlarm.alarmList.forEach(p => {
        document.querySelector('[data-day = "' + p + '"]').classList.add('alarmPage-edit-date-active');
      });

      alarmHoursValueElem.textContent = ('00' + relatedAlarm.hours).slice(-2);
      alarmHoursValueElem.dataset.value = relatedAlarm.hours;
      alarmMinutesValueElem.textContent = ('00' + relatedAlarm.minutes).slice(-2);
      alarmMinutesValueElem.dataset.value = relatedAlarm.minutes;

      const activeSound = document.querySelector('.alarmPage-edit-sound-active');
      activeSound.classList.remove('alarmPage-edit-sound-active');
      const newActiveSoundElem = document.querySelector('.alarmPage-edit-sounds span[data-sound="' + relatedAlarm.sound + '"]');
      newActiveSoundElem.classList.add('alarmPage-edit-sound-active');

      document.getElementById('chkRepeat').checked = relatedAlarm.repeatWeekly;
    });

    newItemElem.className = 'alarmPage-item';
    if (newAlarm.state === false) {
      newItemElem.classList.add('alarmPage-item-disabled');
    }
    newItemElem.dataset.alarmId = newAlarm.id;

    const newItemIcons = document.createElement('div');
    newItemIcons.className = 'alarmPage-item-icons';

    newItemElem.appendChild(newItemIcons);

    // const iconAlarmElem = document.createElement('span');
    // iconAlarmElem.className = 'alarmPage-item-aramIcon icon-alarm';

    const toggleSwitchElem = document.createElement('label');
    toggleSwitchElem.className = 'switch';
    const toggleSwitchCheckElem = document.createElement('input');
    toggleSwitchCheckElem.addEventListener('change', e => {
      newItemElem.classList.add('alarmPage-item-disabled');
      const alarmItemElem = e.target.closest('.alarmPage-item');
      alarmItemElem.classList.toggle('alarmPage-item-disabled');
      const relatedAlarm = alarmData.find(p => p.id === parseInt(e.target.closest('.alarmPage-item').dataset.alarmId));
      const relatedAlarmIndex = alarmData.findIndex(p => p.id === parseInt(e.target.closest('.alarmPage-item').dataset.alarmId));
      if (e.target.checked === false) {
        newItemElem.classList.add('alarmPage-item-disabled');
        AlarmHandler.DisableAlarm(relatedAlarm);
        alarmData[relatedAlarmIndex].state = false;
        chrome.storage.local.set({'alarmData': alarmData});
      }
      else {
        AlarmHandler.SetAlarm(relatedAlarm);
        alarmData[relatedAlarmIndex].state = true;
        chrome.storage.local.set({'alarmData': alarmData});
        newItemElem.classList.remove('alarmPage-item-disabled');
      }
    });
    toggleSwitchCheckElem.type = 'checkbox';
    toggleSwitchCheckElem.checked = true;
    const toggleSwitchSliderElem = document.createElement('span');
    toggleSwitchSliderElem.className = 'switch-slider';

    toggleSwitchElem.appendChild(toggleSwitchCheckElem);
    toggleSwitchElem.appendChild(toggleSwitchSliderElem);
    newItemIcons.appendChild(toggleSwitchElem);

    const iconRemoveElem = document.createElement('span');
    iconRemoveElem.className = 'alarmPage-item-removeIcon icon-remove';

    newItemIcons.appendChild(iconRemoveElem);

    if (newAlarm.state === false) {
      toggleSwitchCheckElem.checked = false;
    }

    const itemDateElem = document.createElement('div');
    itemDateElem.className = 'alarmPage-item-date';
    const itemSundayElem = document.createElement('span');
    itemSundayElem.dataset.itemDay = '0';
    itemSundayElem.innerText = 'S';
    const itemMondayElem = document.createElement('span');
    itemMondayElem.dataset.itemDay = '1';
    itemMondayElem.innerText = 'M';
    const itemTuesdayElem = document.createElement('span');
    itemTuesdayElem.dataset.itemDay = '2';
    itemTuesdayElem.innerText = 'T';
    const itemWednesdayElem = document.createElement('span');
    itemWednesdayElem.dataset.itemDay = '3';
    itemWednesdayElem.innerText = 'W';
    const itemThursdayElem = document.createElement('span');
    itemThursdayElem.dataset.itemDay = '4';
    itemThursdayElem.innerText = 'T';
    const itemFridayElem = document.createElement('span');
    itemFridayElem.dataset.itemDay = '5';
    itemFridayElem.innerText = 'F';
    const itemSaturdayElem = document.createElement('span');
    itemSaturdayElem.dataset.itemDay = '6';
    itemSaturdayElem.innerText = 'S';

    if (newAlarm.repeatWeekly === true) {
      const itemWeekElem = document.createElement('span');
      itemWeekElem.className = 'icon-week';
      itemDateElem.appendChild(itemWeekElem);
    }

    itemDateElem.appendChild(itemSundayElem);
    itemDateElem.appendChild(itemMondayElem);
    itemDateElem.appendChild(itemTuesdayElem);
    itemDateElem.appendChild(itemWednesdayElem);
    itemDateElem.appendChild(itemThursdayElem);
    itemDateElem.appendChild(itemFridayElem);
    itemDateElem.appendChild(itemSaturdayElem);
    itemDateElem.appendChild(itemSaturdayElem);


    newItemElem.appendChild(itemDateElem);

    for (var i = 0; i < 7; i++) {
      if (newAlarm.alarmList.findIndex(p => p === i.toString()) > -1) {
        itemDateElem.querySelector('[data-item-day = "' + i.toString() + '"]').classList.add('alarmPage-item-date-active');
      }
    }

    const itemNameElem = document.createElement('span');
    itemNameElem.className = 'alarmPage-item-name';
    itemNameElem.innerText = newAlarm.name;
    itemNameElem.title = newAlarm.name;
    newItemElem.appendChild(itemNameElem);

    const itemTimeElem = document.createElement('span');
    itemTimeElem.className = 'alarmPage-item-time';
    itemTimeElem.innerText = ('00' + newAlarm.hours).slice(-2) + ':' + ('00' + newAlarm.minutes).slice(-2);
    newItemElem.appendChild(itemTimeElem);

    const targetWrapperElem = document.querySelector('.alarmPage-items');
    targetWrapperElem.insertBefore(newItemElem, targetWrapperElem.firstChild);

    return newItemElem;
  },
  ChangeTimerFor: (target, action = 'increase') => {
    let currentValue = parseInt(target.dataset.value);
    if (action === 'increase') {
      currentValue++;
    }
    else {
      currentValue--;
    }
    switch (target.dataset.type) {
      case 'hours':
        if (action === 'increase') {
          if (currentValue === 24) {
            currentValue = 0;
          }
        }
        else {
          if (currentValue === -1) {
            currentValue = 23;
          }
        }
        target.dataset.value = currentValue.toString();
        target.innerText = ('00' + currentValue).slice(-2);
        break;
      case 'minutes':
        if (action === 'increase') {
          if (currentValue === 60) {
            currentValue = 0;
          }
        }
        else {
          if (currentValue === -1) {
            currentValue = 59;
          }
        }
        target.dataset.value = currentValue.toString();
        target.innerText = ('00' + currentValue).slice(-2);
        break;
    }
  }
};
