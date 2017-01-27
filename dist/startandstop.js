'use strict';

//      

const events = require('events');

                              

                        
               
                   
                  
 

                                      
             
             
 

                                  
                             
                                
 

                                                          

class StartAndStop extends events.EventEmitter {
  
               
              
               
                
              

  static new(config      ) {
    return new StartAndStop(config)
  }
  
  constructor(config      ) {
    super();

    this.starting = this.stopping = this.started = null;
    this.stopped = true;

    this.config = config;
  }

  start(cb            ) {
    if (this.starting) {
      this.once('started', cb);
      return
    }

    if (this.stopping) {
      this.once('run-completed', () => {
        this.start(cb);
      });
      return
    }

    this.starting = true;
    this._run(this.config, 'start', 'started', (error) => {
      this.starting = false;
      this.started = error == null;

      if (cb) {
        cb(error);
      }
    });
  }

  stop(cb            ) {
    if (this.stopping) {
      this.once('stopped', cb);
      return
    }

    if (this.starting) {
      this.once('run-completed', () => {
        this.stop(cb);
      });
      return
    }
    
    this.stopping = true;
    this._run(this.config, 'stop', 'stopped', (error) => {
      this.stopping = false;
      this.stopped = error == null;

      if (cb) {
        cb(error);
      }
    });
  }

  _run(steps      , functionName       , finishEventName       , cb            ) {
    this._runSteps(steps, functionName, finishEventName, (error) => {
      if (error) {
        this.emit('error', error);        
        this.emit(`${functionName}-error`, error);
      } else {
        this.emit(finishEventName, error);
      }
      
      cb(error);

      setImmediate(() => {
        this.emit('run-completed', error);
      });
    });
  }
    
  _runSteps(steps      , functionName       , finishEventName       , cb            ) {
    const nextParallelSteps = this._gatherParallelSteps(steps);
    const remainingSteps = steps.slice(nextParallelSteps.length);  

    this._runNextStepsInParallel(nextParallelSteps, functionName, finishEventName, (error) => {
      if (error) {
        cb(error);
        return
      }
      
      if (remainingSteps.length > 0) {
        const subSteps       = (remainingSteps[0]    );
        const subsequentSteps = remainingSteps.slice(1);
        
        this._runSteps(subSteps, functionName, finishEventName, (innerStepsError) => {
          if (innerStepsError) {
            cb(innerStepsError);
            return
          }
          this._runSteps(subsequentSteps, functionName, finishEventName, cb);
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

  _runNextStepsInParallel(config       ,
    functionName       ,
    finishEventName       ,
    runStepsCallback            ) {
    const self = this;
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
          this.emit(`step-${functionName}-begin`, step);
          fn(error => onStepFinished(error, step));
        });
      } else {
        this.emit(`step-${functionName}-begin`, step);
        this.emit(`step-${functionName}-end`, step);
        this.emit(`step-${finishEventName}`, step);

        stepsInProgress -= 1;
        
        if (stepsInProgress === 0) {
          onAllStepsFinished();  
        }
      }
    });

    function onStepFinished(error, step     ) {
      self.emit(`step-${functionName}-end`, step);
      
      if (error) {
        failures.push({ step, error });
        self.emit(`step-${functionName}-error`, error, step);
      } else {
        self.emit(`step-${finishEventName}`, step);
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
