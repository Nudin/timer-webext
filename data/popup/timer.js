'use strict';

function Timer(time, startTime, stopTime, remainingTime) {
  this.StartTime = startTime || new Date().getTime();
  this.StopTime = stopTime;
  this.Time = time;
  this.RemainingTime = time - (remainingTime || 0);

  Object.defineProperty(this, 'ElapsedTime', {
    get: () => {
      return Math.round(this.RemainingTime / 1000) - (Math.round((new Date().getTime() / 1000) - (this.StartTime / 1000)));
    }
  });
}
