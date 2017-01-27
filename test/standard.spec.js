const test = require('tape')
const startAndStop = require('..')

test('New it and run with normal async functions run in parallel', (t) => {
  t.plan(1 + 3)

  const sas = startAndStop.new([
    { name: 'step1', start: step },
    { name: 'step2', start: step },
    { name: 'step3', start: step }
  ])
  
  sas.start(() => {
    t.pass('start completed')
  })

  function step(cb) {
    t.pass('called step')
    setTimeout(cb, 1)
  }
})

test('start callback called after all steps completed ', (t) => {
  t.plan(2)

  let completedSteps = 0

  /* eslint-disable no-bitwise */
  const sas = startAndStop.new([
    { name: 'step1', start: (cb) => { completedSteps |= 1; cb() } },
    { name: 'step2', start: (cb) => { completedSteps |= 2; cb() } },
    { name: 'step3', start: (cb) => { completedSteps |= 4; cb() } }    
  ])
  /* eslint-enable */

  sas.start(() => {
    t.equal(completedSteps, 1 + 2 + 4)
  })

  t.equal(completedSteps, 0)
})
 
test('a new array signals a new section to run after previous steps ', (t) => {
  t.plan(3)

  let completedSteps = 0

  /* eslint-disable no-bitwise */
  const sas = startAndStop.new([
    { name: 'step1', start: (cb) => { setTimeout(() => { completedSteps |= 1; cb() }, 15) } },
    { name: 'step2', start: (cb) => { setTimeout(() => { completedSteps |= 2; cb() }, 10) } },
    [
      { name: 'step3', start: runStep3 }    
    ]
  ])
   
  function runStep3(cb) {
    t.equal(completedSteps, 1 + 2)
    completedSteps |= 4
    cb()
  }
  /* eslint-enable */

  sas.start(() => {
    t.equal(completedSteps, 1 + 2 + 4)
  })

  t.equal(completedSteps, 0)
})

test('execution continuous AFTER the array again', (t) => {
  t.plan(5)

  let completedSteps = 0

  /* eslint-disable no-bitwise */
  const sas = startAndStop.new(
    [
      { name: 'step1', start: (cb) => { setTimeout(() => { completedSteps |= 1; cb() }, 15) } },
      { name: 'step2', start: (cb) => { setTimeout(() => { completedSteps |= 2; cb() }, 10) } },
      [
        { name: 'step3', start: runStep3 }    
      ],
      { name: 'step4', start: (cb) => { t.equal(completedSteps, 1 + 2 + 4); setTimeout(() => { completedSteps |= 8; cb() }, 45) } },
      { name: 'step5', start: (cb) => { t.equal(completedSteps, 1 + 2 + 4); setTimeout(() => { completedSteps |= 16; cb() }, 40) } },
    ]
  )
  
  function runStep3(cb) {
    t.equal(completedSteps, 1 + 2)
    setTimeout(() => {
      completedSteps |= 4
      cb()
    }, 20)
  }
  /* eslint-enable */

  sas.start(() => {
    t.equal(completedSteps, 1 + 2 + 4 + 8 + 16)
  })

  t.equal(completedSteps, 0)
})

test('execution can be nested', (t) => {
  t.plan(6)

  let completedSteps = 0

  /* eslint-disable no-bitwise */
  const sas = startAndStop.new([
    { name: 'step1', start: (cb) => { setTimeout(() => { completedSteps |= 1; cb() }, 15) } },
    { name: 'step2', start: (cb) => { setTimeout(() => { completedSteps |= 2; cb() }, 10) } },
    [
      { name: 'step3', start: runStep3 },
      [
        { name: 'step3s', start: runStep3s }    
      ],
    ],
    { name: 'step4', start: (cb) => { t.equal(completedSteps, 1 + 2 + 4 + 128); setTimeout(() => { completedSteps |= 8; cb() }, 45) } },
    { name: 'step5', start: (cb) => { t.equal(completedSteps, 1 + 2 + 4 + 128); setTimeout(() => { completedSteps |= 16; cb() }, 40) } },
  ])
  
  function runStep3(cb) {
    t.equal(completedSteps, 1 + 2)
    setTimeout(() => {
      completedSteps |= 4
      cb()
    }, 20)
  }

  function runStep3s(cb) {
    t.equal(completedSteps, 1 + 2 + 4)
    setTimeout(() => {
      completedSteps |= 128
      cb()
    }, 10)
  }
  /* eslint-enable */

  sas.start(() => {
    t.equal(completedSteps, 1 + 2 + 4 + 8 + 16 + 128)
  })

  t.equal(completedSteps, 0)
})

test('start callback called after all steps completed asynchronously ', (t) => {
  t.plan(1)

  let completedSteps = 0

  const sas = startAndStop.new([
    { name: 'step1', start: (cb) => { setTimeout(() => { completedSteps += 1; cb() }, 10) } },
    { name: 'step2', start: (cb) => { completedSteps += 2; cb() } },
    { name: 'step3', start: (cb) => { completedSteps += 4; cb() } }    
  ])

  sas.start(() => {
    t.equal(completedSteps, 1 + 2 + 4)
  })
})

test('emit started event when started ', (t) => {
  t.plan(1)

  let completedSteps = 0

  const sas = startAndStop.new([
    { name: 'step1', start: (cb) => { setTimeout(() => { completedSteps += 1; cb() }, 10) } },
    { name: 'step2', start: (cb) => { completedSteps += 2; setImmediate(cb) } },
    { name: 'step3', start: (cb) => { completedSteps += 4; setImmediate(cb) } }    
  ])

  sas.start()

  sas.on('started', () => {
    t.equal(completedSteps, 1 + 2 + 4)
  })
})


test('run stop functions when stopping again ', (t) => {
  t.plan(4)

  const sas = startAndStop.new([
    { name: 'step1', start: step, stop: stopStep },
    { name: 'step2', start: step, stop: stopStep },
    { name: 'step3', start: step, stop: stopStep } 
  ])

  function step(cb) {
    t.comment('executed start step')
    cb()
  }

  function stopStep(cb) {
    t.pass('executed stop step')
    cb()
  }

  sas.start(() => {
    sas.stop(() => {
      t.pass('stopped')
    })
  })
})


test('report error in start callback when a step emits an error', (t) => {
  t.plan(7)

  const sas = startAndStop.new([
    { name: 'step1', start: step, stop: stopStep },
    { name: 'step2', start: failingStep, stop: stopStep },
    { name: 'step3', start: step, stop: stopStep } 
  ])

  function step(cb) {
    t.comment('executed start step')
    setImmediate(cb)
  }

  function failingStep(cb) {
    t.pass('executed failing step')
    setTimeout(() => cb('something wrong'), 10)
  }

  function stopStep(cb) {
    t.fail('should not be called')
    cb()
  }

  sas.start((err) => {
    t.notLooseEqual(err, null, 'start should have failed')
    t.equals(err.failure.step.name, 'step2')
    t.equals(err.failure.error, 'something wrong')
   
    t.equals(err.failures.length, 1)
    t.deepEqual(err.failures[0].step, err.failure.step)
  })

  sas.on('error', () => {
    t.pass('Error event emitted')
  })
})

test('errors stop execution of next steps', (t) => {
  t.plan(1)

  /* eslint-disable no-bitwise */
  const sas = startAndStop.new([
    { name: 'step1', start: cb => cb('failed') },
    [ 
      { name: 'step2', start: () => t.fail('should not have been called') }
    ]
  ])
  /* eslint-enable */
  sas.start((error) => {
    t.notLooseEqual(error, null)
  })

  sas.on('error', () => {})
})

test('when started stop is delayed until stop if completed', (t) => {
  t.plan(1)

  let startCalled = false

  /* eslint-disable no-bitwise */
  const sas = startAndStop.new(
    [
      { name: 'step1', start: (cb) => { setTimeout(cb, 50) } },
    ]
  )
  
  sas.start(() => { startCalled = true })

  sas.stop(() => {
    t.ok(startCalled)
  })
})
