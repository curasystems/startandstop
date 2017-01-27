//      

const events = require('events');

module.exports = class StartAndStop extends events.EventEmitter {
  
            

  static new(config) {
    return new StartAndStop(config)
  }
  
  constructor(config    ) {
    super();

    this.config = config;
  }

  start(cb         ) {
    this._run(this.config, 'start', 'started', cb);
  }

  stop(cb         ) {
    this._run(this.config, 'stop', 'stopped', cb);
  }

  _run(config    , functionName       , finishEventName       , cb         ) {
    this._runNextStepsInParallel(this.config, functionName, (err) => {
      this.emit(finishEventName);
      if (cb) {
        cb(err);
      }
    });
  }

  _runNextStepsInParallel(config    , functionName       , runStepsCallback         ) {
    const nextStepsInParallel = config;

    let stepsInProgress = nextStepsInParallel.length;
    const failures = [];

    nextStepsInParallel.forEach((step) => {
      // this.emit(`starting-${step.name}`)
      const fn = step[functionName];

      if (fn) {
        setImmediate(() => {
          fn(error => onStepFinished(error, step));
        });
      }
    });

    function onStepFinished(error, step) {
      if (error) {
        failures.push({ error, step });
      }

      stepsInProgress -= 1;
      
      if (stepsInProgress === 0) {
        onAllStepsFinished();  
      }
    }

    function onAllStepsFinished() {
      setImmediate(() => {
        if (failures.length > 0) {
          const error = {
            failure: failures[0],
            failures
          };
          runStepsCallback(error);
        } else {
          runStepsCallback();
        }
      });
    }
  }
};
//# sourceMappingURL=startandstop.es6.js.map
