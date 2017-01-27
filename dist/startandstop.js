'use strict';

//      

const events = require('events');

                              

                        
               
                   
                  
 

                                      
             
             
 

                                  
                             
                                
 

                                                          

class StartAndStop extends events.EventEmitter {
  
              

  static new(config      ) {
    return new StartAndStop(config)
  }
  
  constructor(config      ) {
    super();

    this.config = config;
  }

  start(cb            ) {
    this._run(this.config, 'start', 'started', cb);
  }

  stop(cb            ) {
    this._run(this.config, 'stop', 'stopped', cb);
  }

  _run(steps      , functionName       , finishEventName       , cb            ) {
    this._runSteps(steps, functionName, (error) => {
      this.emit(finishEventName);
      setImmediate(() => {
        if (cb) {
          cb(error);
        }
      });
    });
  }
    
  _runSteps(steps      , functionName       , cb            ) {
    const nextParallelSteps = this._gatherParallelSteps(steps);
    const remainingSteps = steps.slice(nextParallelSteps.length);  

    this._runNextStepsInParallel(nextParallelSteps, functionName, (error) => {
      if (remainingSteps.length > 0) {
        const subSteps       = (remainingSteps[0]    );
        const subsequentSteps = remainingSteps.slice(1);
        
        this._runSteps(subSteps, functionName, (innerStepsError) => {
          if (innerStepsError) {
            cb(innerStepsError);
            return
          }
          this._runSteps(subsequentSteps, functionName, cb);
        });
      } else {
        cb(error);
      }
    });
  }

  _gatherParallelSteps(steps      )          {
    const stepsForParallelExecution        = [];

    for (let i = 0; i < steps.length; i += 1) {
      const step     = steps[i];

      if (Array.isArray(step)) {
        break
      }

      stepsForParallelExecution.push(step);
    }

    return stepsForParallelExecution
  }

  _runNextStepsInParallel(config       , functionName       , runStepsCallback            ) {
    const nextStepsInParallel = config;

    let stepsInProgress = nextStepsInParallel.length;
    const failures                      = [];

    if (stepsInProgress === 0) {
      setImmediate(runStepsCallback);
      return
    }

    nextStepsInParallel.forEach((step) => {
      // this.emit(`starting-${step.name}`)
      const fn          = (step    )[functionName];

      if (fn) {
        setImmediate(() => {
          fn(error => onStepFinished(error, step));
        });
      }
    });

    function onStepFinished(error, step     ) {
      if (error) {
        failures.push({ step, error });
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
}

module.exports = StartAndStop;
//# sourceMappingURL=startandstop.js.map
