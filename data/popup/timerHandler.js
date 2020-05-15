/* globals timerData, MiliSecToTimeSec, Timer, timerEdit, UIHandler */
'use strict';

var TimerHandler = {
  Create: newTimerData => {
    const newObj = {
      timerId: timerData.length > 0 ? Math.max(...timerData.map(p => p.timerId)) + 1 : 1,
      name: newTimerData.name,
      time: newTimerData.time,
      hours: newTimerData.hours,
      minutes: newTimerData.minutes,
      seconds: newTimerData.seconds,
      sound: document.querySelector('.timerPage-edit-sound-active').dataset.sound,
      isRunning: false,
      intervalId: null
    };
    timerData.push(newObj);
    TimerHandler.PrepareUI(newObj);
    if (timerData.length === 1) {
      document.querySelector('.timerPage').classList.remove('timerPage-noTimers');
    }
    chrome.storage.local.set({'timerData': timerData});
  },
  Update: (timerId, newTimerData) => {
    const relatedTimerIndex = timerData.findIndex(p => p.timerId === parseInt(timerId));
    const relatedTimer = timerData.find(p => p.timerId === parseInt(timerId));
    relatedTimer.name = newTimerData.name;
    relatedTimer.time = newTimerData.time;
    relatedTimer.hours = newTimerData.hours;
    relatedTimer.minutes = newTimerData.minutes;
    relatedTimer.seconds = newTimerData.seconds;
    relatedTimer.sound = document.querySelector('.timerPage-edit-sound-active').dataset.sound;
    relatedTimer.isRunning = false;
    timerData[relatedTimerIndex] = relatedTimer;
    chrome.storage.local.set({'timerData': timerData});

    const timerRelatedElem = document.querySelector('[data-timer-id="' + timerId + '"]');
    timerRelatedElem.querySelector('.time').innerText = MiliSecToTimeSec(relatedTimer.time);
    timerRelatedElem.querySelector('.timerPage-item-info-name').innerText = relatedTimer.name;
    timerRelatedElem.querySelector('.timerPage-item-info-time').innerText = MiliSecToTimeSec(relatedTimer.time);
  },
  Remove: timerId => {
    const relatedTimerIndex = timerData.findIndex(p => p.timerId === parseInt(timerId));
    const relatedTimer = timerData.find(p => p.timerId === parseInt(timerId));
    const timerRelatedElem = document.querySelector('[data-timer-id="' + timerId + '"]');
    timerRelatedElem.remove();
    chrome.alarms.clear('timer' + timerId);
    clearInterval(relatedTimer.intervalId);
    timerData.splice(relatedTimerIndex, 1);
    chrome.storage.local.set({'timerData': timerData});
    if (timerData.length < 4) {
      document.querySelector('.timerPage-addTimer').style.display = 'inline-block';
    }
    if (timerData.length === 0) {
      const timerPageElem = document.querySelector('.timerPage');
      timerPageElem.classList.remove('timerPage-pageShow');
      timerPageElem.classList.add('timerPage-noTimers');
      timerPageElem.classList.add('timerPage-pageShow');
    }
  },
  Start: function(timerObj, continueTimer = false) {
    const relatedTimerIndex = timerData.findIndex(p => p.timerId === parseInt(timerObj.timerId));
    const timer = new Timer(timerObj.time, timerObj.startTime, timerObj.stopTime, timerObj.remainingTime);
    if (continueTimer === false) {
      chrome.alarms.create('timer' + timerObj.timerId.toString(), {delayInMinutes: timer.RemainingTime / 1000 / 60});
    }
    const timerRelatedElem = document.querySelector('[data-timer-related="' + timerObj.timerId + '"]');
    const timerRelatedPlayElem = document.querySelector('[data-timer-related-play="' + timerObj.timerId + '"]');
    timerRelatedPlayElem.classList.add('icon-pause');
    const intervalId = setInterval(function() {
      timerRelatedElem.innerText = MiliSecToTimeSec(timer.ElapsedTime * 1000);
      if (timer.ElapsedTime <= 0) {
        clearInterval(intervalId);
        timerRelatedPlayElem.classList.remove('icon-pause');
        TimerHandler.Reset(timerObj.timerId, false);
        timerRelatedElem.innerText = MiliSecToTimeSec(0);
      }
    }, 1000);
    timerObj.intervalId = intervalId;
    if (continueTimer === false) {
      timerObj.startTime = new Date().getTime();
    }
    timerData[relatedTimerIndex] = timerObj;
    chrome.storage.local.set({'timerData': timerData});
  },
  Stop: function(timerObj) {
    const relatedTimerIndex = timerData.findIndex(p => p.timerId === parseInt(timerObj.timerId));
    clearInterval(timerObj.intervalId);
    timerObj.isRunning = false;
    timerObj.stopTime = new Date().getTime();
    timerObj.remainingTime = (timerObj.remainingTime || 0) + (timerObj.stopTime - timerObj.startTime);
    timerObj.startTime = undefined;
    chrome.alarms.clear('timer' + timerObj.timerId.toString(), () => {});
    timerData[relatedTimerIndex] = timerObj;
    chrome.storage.local.set({'timerData': timerData});
  },
  Reset: function(timerId, userSelect = true) {
    const relatedTimerIndex = timerData.findIndex(p => p.timerId === parseInt(timerId));
    const relatedTimer = timerData.find(p => p.timerId === parseInt(timerId));
    const timerRelatedElem = document.querySelector('[data-timer-related="' + timerId + '"]');
    const timerRelatedPlayElem = document.querySelector('[data-timer-related-play="' + timerId + '"]');
    timerRelatedPlayElem.classList.remove('icon-pause');
    clearInterval(relatedTimer.intervalId);
    if (userSelect === true) {
      chrome.alarms.clear('timer' + timerId.toString());
    }
    timerRelatedElem.innerText = MiliSecToTimeSec(relatedTimer.time);
    relatedTimer.isRunning = false;
    relatedTimer.remainingTime = undefined;
    relatedTimer.stopTime = undefined;
    relatedTimer.startTime = undefined;
    timerData[relatedTimerIndex] = relatedTimer;
    chrome.storage.local.set({'timerData': timerData});
  },
  PrepareUI: newTimer => {
    if (timerData.length >= 4) {
      document.querySelector('.timerPage-addTimer').style.display = 'none';
    }
    const newTimerElem = document.createElement('div');
    newTimerElem.className = 'timerPage-item';
    newTimerElem.dataset.timerId = newTimer.timerId;

    newTimerElem.addEventListener('mousedown', function(e) {
      if (e.target.closest('.timerPage-item-op')) {
        return;
      }
      this.classList.add('timerPage-item-mouseDown');
    });

    newTimerElem.addEventListener('mouseup', function(e) {
      if (e.target.closest('.timerPage-item-op')) {
        return;
      }
      this.classList.remove('timerPage-item-mouseDown');
      const timerPageEditElem = document.getElementById('timerPageEdit');
      timerPageEditElem.classList.add('timerPage-edit-show');
      timerEdit.isEdit = true;
      timerEdit.timerId = this.dataset.timerId;

      const relatedTimer = timerData.find(p => p.timerId === parseInt(timerEdit.timerId));
      const txtTimerNameElem = document.getElementById('txtTimerName');
      txtTimerNameElem.value = relatedTimer.name;
      txtTimerNameElem.focus();

      const hoursValueElem = document.getElementById('hoursValue');
      hoursValueElem.setAttribute('contenteditable', true);
      const minutesValueElem = document.getElementById('minutesValue');
      const secondsValueElem = document.getElementById('secondsValue');

      hoursValueElem.innerText = ('00' + relatedTimer.hours).slice(-2);
      hoursValueElem.dataset.value = relatedTimer.hours;
      minutesValueElem.innerText = ('00' + relatedTimer.minutes).slice(-2);
      minutesValueElem.dataset.value = relatedTimer.minutes;
      secondsValueElem.innerText = ('00' + relatedTimer.seconds).slice(-2);
      secondsValueElem.dataset.value = relatedTimer.seconds;

      const activeSound = document.querySelector('.timerPage-edit-sound-active');
      activeSound.classList.remove('timerPage-edit-sound-active');
      const newActiveSoundElem = document.querySelector('.timerPage-edit-sounds span[data-sound="' + relatedTimer.sound + '"]');
      newActiveSoundElem.classList.add('timerPage-edit-sound-active');
    });

    newTimerElem.addEventListener('mouseleave', function() {
      if (this.classList.contains('timerPage-item-mouseDown')) {
        this.classList.remove('timerPage-item-mouseDown');
      }
    });

    const remainingTimeElem = document.createElement('span');
    remainingTimeElem.className = 'time time-lg';
    remainingTimeElem.innerText = MiliSecToTimeSec(newTimer.time - (newTimer.remainingTime || 0) + 500);
    remainingTimeElem.dataset.timerRelated = newTimer.timerId;

    newTimerElem.appendChild(remainingTimeElem);

    const timerItemOpElem = document.createElement('div');
    timerItemOpElem.className = 'timerPage-item-op';

    const timerItemRemoveElem = document.createElement('span');
    timerItemRemoveElem.className = 'icon-remove';

    const timerItemPopupElem = document.createElement('span');
    timerItemPopupElem.className = 'icon-popup';

    const timerItemPlayElem = document.createElement('span');
    timerItemPlayElem.className = 'icon-play';
    timerItemPlayElem.dataset.timerRelatedPlay = newTimer.timerId;

    const timerItemBackElem = document.createElement('span');
    timerItemBackElem.className = 'icon-back';

    timerItemOpElem.appendChild(timerItemRemoveElem);
    timerItemOpElem.appendChild(timerItemPopupElem);
    timerItemOpElem.appendChild(timerItemPlayElem);
    timerItemOpElem.appendChild(timerItemBackElem);

    newTimerElem.appendChild(timerItemOpElem);

    const timerItemInfoElem = document.createElement('div');
    timerItemInfoElem.className = 'timerPage-item-info';

    const timerItemName = document.createElement('span');
    timerItemName.className = 'timerPage-item-info-name';
    timerItemName.innerText = newTimer.name;
    timerItemName.title = newTimer.name;

    const timerItemTime = document.createElement('span');
    timerItemTime.className = 'timerPage-item-info-time';
    timerItemTime.innerText = MiliSecToTimeSec(newTimer.time);

    timerItemInfoElem.appendChild(timerItemName);
    timerItemInfoElem.appendChild(timerItemTime);

    newTimerElem.appendChild(timerItemInfoElem);

    document.querySelector('.timerPage-items').appendChild(newTimerElem);
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
          if (currentValue === 100) {
            currentValue = 0;
          }
        }
        else {
          if (currentValue === -1) {
            currentValue = 99;
          }
        }
        target.dataset.value = currentValue.toString();
        target.innerText = ('00' + currentValue).slice(-2);
        break;
      case 'minutes':
      case 'seconds':
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
