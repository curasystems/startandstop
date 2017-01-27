// @flow

const events = require('events')

type Steps = Array<Step|Steps>

declare interface Step {
  name: string;
  start?: Function;
  stop?: Function;
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
  
  config:Steps

  static new(config:Steps) {
    return new StartAndStop(config)
  }
  
  constructor(config:Steps) {
    super()

    this.config = config
  }

  start(cb:RunCallback) {
    this._run(this.config, 'start', 'started', cb)
  }

  stop(cb:RunCallback) {
    this._run(this.config, 'stop', 'stopped', cb)
  }

  _run(steps:Steps, functionName:string, finishEventName:string, cb:RunCallback) {
    this._runSteps(steps, functionName, (error) => {
      this.emit(finishEventName)
      setImmediate(() => {
        if (cb) {
          cb(error)
        }
      })
    })
  }
    
  _runSteps(steps:Steps, functionName:string, cb:RunCallback) {
    const nextParallelSteps = this._gatherParallelSteps(steps)
    const remainingSteps = steps.slice(nextParallelSteps.length)  

    this._runNextStepsInParallel(nextParallelSteps, functionName, (error) => {
      if (remainingSteps.length > 0) {
        const subSteps:Steps = (remainingSteps[0]:any)
        const subsequentSteps = remainingSteps.slice(1)
        
        this._runSteps(subSteps, functionName, (innerStepsError) => {
          if (innerStepsError) {
            cb(innerStepsError)
            return
          }
          this._runSteps(subsequentSteps, functionName, cb)
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

  _runNextStepsInParallel(config:Step[], functionName:string, runStepsCallback:RunCallback) {
    const nextStepsInParallel = config

    let stepsInProgress = nextStepsInParallel.length
    const failures:StepExecutionError[] = []

    if (stepsInProgress === 0) {
      setImmediate(runStepsCallback)
      return
    }

    nextStepsInParallel.forEach((step) => {
      // this.emit(`starting-${step.name}`)
      const fn:Function = (step:any)[functionName]

      if (fn) {
        setImmediate(() => {
          fn(error => onStepFinished(error, step))
        })
      }
    })

    function onStepFinished(error, step:Step) {
      if (error) {
        failures.push({ step, error })
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

