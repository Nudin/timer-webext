/* globals data, CreateNewLap, stopwatch, MiliSecToTime */
'use strict';

var StopwatchHandler = {
  Start: outputElem => {
    if (!('stopwatch' in data)) {
      stopwatch.Start();
      data.stopwatch = {};
      data.stopwatch.startTime = stopwatch.StartTime;
      data.stopwatch.state = 'running';
      const intervalId = setInterval(function() {
        outputElem.innerText = MiliSecToTime(stopwatch.ElapsedTime);
      }, 77);
      data.stopwatch.intervalId = intervalId;
      chrome.storage.local.set({'data':data});
    }
  },
  Stop: () => {
    if ('stopwatch' in data) {
      clearInterval(data.stopwatch.intervalId);
      data.stopwatch.stopTime = new Date().getTime();
      data.stopwatch.state = 'stop';
      chrome.storage.local.set({'data':data});
    }
  },
  Reset: () => {
    if ('stopwatch' in data) {
      clearInterval(data.stopwatch.intervalId);
      delete data.stopwatch;
      chrome.storage.local.set({'data':data});
    }
  },
  Continue: outputElem => {
    stopwatch.StartTime = data.stopwatch.startTime;
    const intervalId = setInterval(function() {
      outputElem.innerText = MiliSecToTime(stopwatch.ElapsedTime);
    }, 77);
    data.stopwatch.intervalId = intervalId;
    chrome.storage.local.set({'data':data});
  },
  Resume: outputElem => {
    if ('stopwatch' in data) {
      if (data.stopwatch.state === 'stop') {
        data.stopwatch.startTime = stopwatch.StartTime = new Date().getTime() -
         (data.stopwatch.stopTime - data.stopwatch.startTime);
        const intervalId = setInterval(function() {
          outputElem.innerText = MiliSecToTime(stopwatch.ElapsedTime);
        }, 77);
        data.stopwatch.intervalId = intervalId;
        data.stopwatch.state = 'running';
        chrome.storage.local.set({'data':data});
      }
    }
  },
  Lap: () => {
    if ('stopwatch' in data) {
      if (data.stopwatch.state === 'running') {
        const newLap = {
          lapId: data.stopwatch.laps === undefined ? 1 : data.stopwatch.laps.length + 1,
          elapsedTime: stopwatch.ElapsedTime,
          diff: data.stopwatch.laps === undefined ? stopwatch.ElapsedTime :
            stopwatch.ElapsedTime - data.stopwatch.laps[0].elapsedTime
        };

        if (data.stopwatch.laps === undefined) {
          data.stopwatch.laps = [];
        }
        data.stopwatch.laps.unshift(newLap);
        chrome.storage.local.set({'data':data});
        CreateNewLap(newLap);
      }
    }
  }
};
