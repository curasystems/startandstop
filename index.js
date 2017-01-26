const events = require('events')

module.exports = class StartAndStop extends events.EventEmitter {
  
  static new(config) {
    return new StartAndStop(config)
  }
  
  constructor(config) {
    super()

    this.config = config
  }

  start(cb) {
    this._run(this.config, 'start', 'started', cb)
  }

  stop(cb) {
    this._run(this.config, 'stop', 'stopped', cb)
  }

  _run(config, functionName, finishEventName, cb) {
    this._runNextStepsInParallel(this.config, functionName, (err) => {
      this.emit(finishEventName)
      if (cb) {
        cb(err)
      }
    })
  }

  _runNextStepsInParallel(config, functionName, cb) {
    const nextStepsInParallel = config

    let stepsInProgress = nextStepsInParallel.length

    nextStepsInParallel.forEach((step) => {
      // this.emit(`starting-${step.name}`)
      const fn = step[functionName]

      if (fn) {
        fn((err) => {
          stepsInProgress--

          if (stepsInProgress == 0) {
            setImmediate(cb)
          }
        })
      }
    })
  }
}

