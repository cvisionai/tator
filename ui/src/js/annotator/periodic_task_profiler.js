export class PeriodicTaskProfiler {
  constructor(name, alert_interval, verbose) {
    this._name = name;
    if (alert_interval == undefined) {
      alert_interval = 1000;
    }
    this._alert_interval = alert_interval;
    this._times = [];
    this._verbose = verbose;
  }
  push(this_time) {
    return;
    this._times.push(this_time);
    if (this._times.length % this._alert_interval == 0) {
      this.stats(true);
    }
  }
  stats(flush) {
    let maxDelta = Number.MIN_SAFE_INTEGER;
    let minDelta = Number.MAX_SAFE_INTEGER;
    let delta_sum = 0;
    let max_delta = 0;
    for (let idx = 0; idx < this._times.length; idx++) {
      delta_sum += this._times[idx];
      if (this._times[idx] > max_delta) {
        max_delta = this._times[idx];
      }
    }
    let avg_delta = delta_sum / this._times.length;
    console.info(`${this._name} performance ${avg_delta}ms - Worst = ${max_delta} ms`);
    if (this._verbose) {
      console.info(`${this._name} TIMES = ${this._times}`);
    }
    if (flush) {
      this._times = [];
    }
  }
}
