'use strict';

//      

const events = require('events');

                              

                        
               
                   
                  
 

                                      
             
             
 

                                  
                             
                                
 

                                                          

class StartAndStop extends events.EventEmitter {
  
               
              
               
              

              

  static new(config      ) {
    return new StartAndStop(config)
  }
  
  constructor(config      ) {
    super();

    this.starting = this.stopping = this.started = false;
    this.stopped = true;

    this.config = config;
  }

  start(cb            ) {
    this.stopped = false;
    this._runGuard(this.config, 'stopping', 'starting', 'start', 'started', cb);
  }

  stop(cb            ) {
    this.started = false;
    this._runGuard(this.config, 'starting', 'stopping', 'stop', 'stopped', cb);
  }

  _runGuard(steps      ,
    alternate       ,
    progressVar       ,
    functionName       ,
    finishEventName       ,
    cb            ) {
    const indexableThis                       = this;

    if (indexableThis[finishEventName]) {
      throw new Error(`Already ${finishEventName}`)
    }

    if (indexableThis[progressVar]) {
      this.once(finishEventName, cb);
      return
    }

    if (indexableThis[alternate]) {
      this.once('run-completed', () => {
        const fn          = indexableThis[functionName];
        fn.call(this, cb);
      });
      return
    }
    
    indexableThis[progressVar] = true;
    this._run(this.config, functionName, finishEventName, (error) => {
      indexableThis[progressVar] = false;
      indexableThis[finishEventName] = error == null;

      if (cb) {
        cb(error);
      }
    });
  }

  _run(steps      , functionName       , finishEventName       , cb            ) {
    setImmediate(() => {
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
      let fn          = (step    )[functionName];

      if (!fn) {
        fn = nopStep;
      }

      setImmediate(() => {
        this.emit(`step-${functionName}-begin`, step);
        fn(error => onStepFinished(error, step));
      });
    });

    function nopStep(cb) {
      setImmediate(cb);
    }

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
