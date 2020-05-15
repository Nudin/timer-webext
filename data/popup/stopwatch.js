'use strict';

function Stopwatch() {
  this.StartTime = null;
  this.EndTime = null;
  this.isRunning = false;

  Object.defineProperty(this, 'ElapsedTime', {
    get: () => {
      if (this.StartTime !== null) {
        return (new Date().getTime() - this.StartTime);
      }
    }
  });
}

Stopwatch.prototype.Start = function() {
  this.isRunning = true;
  this.StartTime = new Date().getTime();
};

Stopwatch.prototype.Stop = function() {
  if (this.isRunning === false) {
    return;
  }
  this.StopTime = new Date().getTime();
  this.IsRunning = false;
};
