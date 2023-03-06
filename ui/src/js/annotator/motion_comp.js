import { guiFPS } from "./video";

/// Used to determine system fps and calculate playback
/// schedules based on a given video fps

export class MotionComp {
  constructor() {
    this._interval = null;
    this._monitorFps = null;
    this._times = [];

    // This takes ~1/3 sec
    this._TRIALS = 20;

    // First we need to do a couple of trials to figure out what the
    // interval of the system is.
    let calcTimes = (now) => {
      this._times.push(now);
      if (this._times.length > this._TRIALS) {
        this.calculateMonitorFPS();
        console.info(`Calculated FPS interval = ${this._interval} (${this._monitorFps})`);
      }

      else {
        window.requestAnimationFrame(calcTimes);
      }
    };
    window.requestAnimationFrame(calcTimes);
  }

  calculateMonitorFPS() {
    let mode = new Map();
    // Calculate the mode of the delta over the calls ignoring the first few.
    for (let idx = 2; idx < this._TRIALS - 1; idx++) {
      let delta = this._times[idx + 1] - this._times[idx];
      if (delta < 4.1666) { // Cap out at 240Hz
        delta = 4.1666;
      }
      let fps = Math.round(1000.0 / (delta));
      if (mode.has(fps)) {
        mode.set(fps, mode.get(fps) + 1);
      }

      else {
        mode.set(fps, 1);
      }
    }

    let maxOccurance = 0;

    for (const canidate of mode.keys()) {
      let occurance = mode.get(canidate);
      if (canidate > 0 && occurance > maxOccurance) {
        maxOccurance = occurance;
        this._monitorFps = canidate;
      }
    }

    if (Math.abs(this._monitorFps - 240) < 10) {
      this._monitorFps = 240;
    }
    else if (Math.abs(this._monitorFps - 120) < 10) {
      this._monitorFps = 120;
    }
    else if (Math.abs(this._monitorFps - 60) < 5) {
      this._monitorFps = 60;
    }
    else if (Math.abs(this._monitorFps - 30) < 5) {
      this._monitorFps = 30;
    }

    this._interval = 1000.0 / this._monitorFps;
    this._times = [];
  }

  clearTimesVector() {
    this._times = [];
  }

  periodicRateCheck(now) {
    this._times.push(now);
    if (this._times.length > this._TRIALS) {
      const oldMonitor = this._monitorFps;
      this.calculateMonitorFPS();
      if (oldMonitor != this._monitorFps) {
        console.warn(`ALERT: New FPS interval = ${this._interval} (${this._monitorFps})`);
        console.warn("ALERT: Recalculating playback scheduled");
        this.computePlaybackSchedule(this._videoFps, this._factor);
      }
    }
  }

  /// Given a video at a frame rate calculate the frame update
  /// schedule:
  ///
  /// Example:
  ///
  ///  Animations  *       *       *       *       * ....
  ///  60 fps :    |   0   |   1   |   2   |   3   | ....
  ///  48 fps :    |   0      |    1      |     2     | ...
  ///  30 fps :    |   0   |   0   |   1   |   1   | ....
  ///  15 fps :    |   0   |   0   |   0   |   0   | ....
  ///
  /// Fractional fps are displayed at best effort based on the
  /// monitor's actual display rate (likely 60 fps)
  ///
  /// In the example above, 48fps is actually displayed at
  /// 60fps but interpolated to be as close to 48 fps
  /// Animations  *       *       *       *       * ....
  /// 48 fps :    |   0   |   1   |   1   |   2   | .... (effective 45 fps)
  ///
  computePlaybackSchedule(videoFps, factor) {
    // Cache these in case we need to recalculate later
    this._videoFps = Math.round(1000 * videoFps) / 1000;
    this._factor = factor;

    // Compute a 3-slot schedule for playback
    let animationCyclesPerFrame = this.animationCycles(videoFps, factor);
    let regularSize = Math.round(animationCyclesPerFrame);
    let fractional = animationCyclesPerFrame - regularSize;
    let largeSize = regularSize + Math.ceil(fractional * 3);
    let smallSize = regularSize + Math.floor(fractional * 3);
    const MAX_SCHEDULE_LENGTH = 12;
    this._schedule = [];
    this._lengthOfSchedule = 0;

    for (let idx = 0; idx < MAX_SCHEDULE_LENGTH; idx++) {
      const mode = idx % 3;
      let newSize = null;
      if (mode == 0 || mode == 2) {
        newSize = regularSize;
      }
      else if (mode == 1) {
        const largeProposed = ((2 + this._schedule.length) * 1000) / ((this._lengthOfSchedule + largeSize + regularSize) * this._interval);
        const smallProposed = ((2 + this._schedule.length) * 1000) / ((this._lengthOfSchedule + smallSize + regularSize) * this._interval);
        const largeDelta = Math.abs(largeProposed - videoFps);
        const smallDelta = Math.abs(smallProposed - videoFps);
        console.info(`largeD = ${largeDelta}; smallD = ${smallDelta}`);

        if (largeDelta < smallDelta) {
          newSize = largeSize;
        }

        else {
          newSize = smallSize;
        }
      }
      this._lengthOfSchedule += newSize;
      this._schedule.push(newSize);
    }
    let update = 0;
    this._updatesAt = [];
    for (let idx = 0; idx < this._schedule.length; idx++) {
      this._updatesAt.push(update);
      update += this._schedule[idx];
    }
    this._targetFPS = (this._schedule.length * 1000) / (this._lengthOfSchedule * this._interval);
    let msg = "Playback schedule = " + this._schedule + "\n";
    msg += "Updates @ " + this._updatesAt + "\n";
    msg += "Frame Increment = " + this.frameIncrement(this._videoFps, factor) + "\n";
    msg += "Target FPS = " + this._targetFPS + "\n";
    msg += "video FPS = " + videoFps + "\n";
    msg += "factor = " + factor + "\n";
    console.info(msg);
    //if (this._diagnosticMode == true)
    //{
    //  Utilities.sendNotification(msg, true);
    //}
  }

  /// Given an animation idx, return true if it is an update cycle
  timeToUpdate(animationIdx) {
    let relIdx = animationIdx % this._lengthOfSchedule;
    return this._updatesAt.includes(relIdx);
  }

  animationCycles(fps, factor) {
    let target_fps = fps * factor;
    let max_fps = Math.max(15, this._videoFps);
    target_fps = Math.min(max_fps, target_fps);
    return (this._monitorFps / target_fps);
  }
  frameIncrement(fps, factor) {
    let target_fps = fps * factor;
    let max_fps = Math.min(this._monitorFps, Math.max(15, this._videoFps));
    let clicks = Math.ceil(target_fps / max_fps);

    return Math.floor(clicks);
  }

  // Returns the number of ticks that have occured since the last
  // report
  animationIncrement(now, last) {
    let difference = now - last;
    let increment = Math.round(difference / this._interval);
    // Handle start up burst
    if (isNaN(increment)) {
      increment = 0;
    }
    increment = Math.min(increment, 2);
    return increment;
  }

  get targetFPS() {
    return this._targetFPS;
  }
}
