// @flow

const events = require('events')

type Steps = Array<Step|Steps>

declare interface Step {
  name: string;
  start?: Function;
  stop?: Function;
  this?: any;
}

declare interface StepExecutionError {
  step: Step;
  error: any;
}

declare interface ExecutionError {
  failure:StepExecutionError;
  failures:StepExecutionError[];
}

declare function RunCallback(error?:ExecutionError): void;

export default class StartAndStop extends events.EventEmitter {
  
  starting:bool
  started:bool
  stopping:bool
  stopped:bool

  config:Steps

  static new(config:Steps) {
    return new StartAndStop(config)
  }
  
  constructor(config:Steps) {
    super()

    this.starting = this.stopping = this.started = false
    this.stopped = true

    this.config = config
  }

  start(cb:RunCallback) {
    this.stopped = false
    this._runGuard(this.config, 'stopping', 'starting', 'start', 'started', cb)
  }

  stop(cb:RunCallback) {
    const reversedConfiguration = this._reverseSteps(this.config)

    this.started = false
    this._runGuard(reversedConfiguration, 'starting', 'stopping', 'stop', 'stopped', cb)
  }

  _reverseSteps(steps:Steps) {
    const reversedSteps = []

    for (let i = steps.length - 1; i >= 0; i -= 1) {
      const currentStep = steps[i]
      if (Array.isArray(currentStep)) {
        reversedSteps.push(this._reverseSteps(currentStep))
      } else {
        reversedSteps.push(currentStep)
      }
    }

    return reversedSteps
  }

  _runGuard(steps:Steps,
    alternate:string,
    progressVar:string,
    functionName:string,
    finishEventName:string,
    cb:RunCallback) {
    const indexableThis: {[key:string]: any } = this

    if (indexableThis[finishEventName]) {
      throw new Error(`Already ${finishEventName}`)
    }

    if (indexableThis[progressVar]) {
      this.once(finishEventName, cb)
      return
    }

    if (indexableThis[alternate]) {
      this.once('run-completed', () => {
        const fn:Function = indexableThis[functionName]
        fn.call(this, cb)
      })
      return
    }
    
    indexableThis[progressVar] = true
    this._run(steps, functionName, finishEventName, (error) => {
      indexableThis[progressVar] = false
      indexableThis[finishEventName] = error == null

      if (cb) {
        cb(error)
      }
    })
  }

  _run(steps:Steps, functionName:string, finishEventName:string, cb:RunCallback) {
    setImmediate(() => {
      this._runSteps(steps, functionName, finishEventName, (error) => {
        if (error) {
          this.emit('error', error)        
          this.emit(`${functionName}-error`, error)
        } else {
          this.emit(finishEventName, error)
        }
        
        cb(error)

        setImmediate(() => {
          this.emit('run-completed', error)
        })
      })
    })
  }
    
  _runSteps(steps:Steps, functionName:string, finishEventName:string, cb:RunCallback) {
    const nextParallelSteps = this._gatherParallelSteps(steps)
    const remainingSteps = steps.slice(nextParallelSteps.length)  

    this._runNextStepsInParallel(nextParallelSteps, functionName, finishEventName, (error) => {
      if (error) {
        cb(error)
        return
      }
      
      if (remainingSteps.length > 0) {
        const subSteps:Steps = (remainingSteps[0]:any)
        const subsequentSteps = remainingSteps.slice(1)
        
        this._runSteps(subSteps, functionName, finishEventName, (innerStepsError) => {
          if (innerStepsError) {
            cb(innerStepsError)
            return
          }
          this._runSteps(subsequentSteps, functionName, finishEventName, cb)
        })
      } else {
        cb(error)
      }
    })
  }

  _gatherParallelSteps(steps:Steps) : Step[] {
    const stepsForParallelExecution:Step[] = []

    for (let i = 0; i < steps.length; i += 1) {
      const step:any = steps[i]

      if (Array.isArray(step)) {
        break
      }

      stepsForParallelExecution.push(step)
    }

    return stepsForParallelExecution
  }

  _runNextStepsInParallel(config:Step[],
    functionName:string,
    finishEventName:string,
    runStepsCallback:RunCallback) {
    const self = this
    const nextStepsInParallel = config

    let stepsInProgress = nextStepsInParallel.length
    const failures:StepExecutionError[] = []

    if (stepsInProgress === 0) {
      setImmediate(runStepsCallback)
      return
    }

    nextStepsInParallel.forEach((step) => {
      // this.emit(`starting-${step.name}`)
      let fn:Function = (step:any)[functionName]

      if (!fn) {
        fn = nopStep
      }

      setImmediate(() => {
        this.emit(`step-${functionName}-begin`, step)

        const thisInstanceForStepFunction = step.this || this

        fn.call(thisInstanceForStepFunction, error => onStepFinished(error, step))
      })
    })

    function nopStep(cb) {
      setImmediate(cb)
    }

    function onStepFinished(error, step:Step) {
      self.emit(`step-${functionName}-end`, step)
      self.emit('step', step, error)
      
      if (error) {
        failures.push({ step, error })
        self.emit(`step-${functionName}-error`, error, step)
      } else {
        self.emit(`step-${finishEventName}`, step)
      }

      stepsInProgress -= 1
      
      if (stepsInProgress === 0) {
        onAllStepsFinished()  
      }
    }

    function onAllStepsFinished() {
      setImmediate(() => {
        if (failures.length > 0) {
          const error = {
            failure: failures[0],
            failures
          }
          runStepsCallback(error)
        } else {
          runStepsCallback()
        }
      })
    }
  }
}

