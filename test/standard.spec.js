const test = require('tape')
const util = require('util')
const startAndStop = require('..')

test('New it and run with normal async functions run in parallel', (t) => {
  t.plan(4)

  const sas = startAndStop.new([
    { name: 'step1', start: step },
    { name: 'step2', start: step },
    { name: 'step3', start: step }    
  ])

  sas.start(() => {
    t.pass('start completed')
  })

  function step(cb){
    t.pass('called step')
    setTimeout(cb,1)
  }
})

test('start callback called after all steps completed ', (t) => {
  t.plan(1)

  let completedSteps = 0

  const sas = startAndStop.new([
    { name: 'step1', start: (cb) => { completedSteps += 1; cb() } },
    { name: 'step2', start: (cb) => { completedSteps += 2; cb() } },
    { name: 'step3', start: (cb) => { completedSteps += 4; cb() } }    
  ])

  sas.start(() => {
    t.equal( completedSteps, 1 + 2 + 4 )
  })
})

test('start callback called after all steps completed asynchronously ', (t) => {
  t.plan(1)

  let completedSteps = 0

  const sas = startAndStop.new([
    { name: 'step1', start: (cb) => { setTimeout( ()=>{ completedSteps += 1; cb() } ,10) } },
    { name: 'step2', start: (cb) => { completedSteps += 2; setImmediate(cb) } },
    { name: 'step3', start: (cb) => { completedSteps += 4; setImmediate(cb) } }    
  ])

  sas.start(() => {
    t.equal( completedSteps, 1 + 2 + 4 )
  })
})

test('emit started event when started ', (t) => {
  t.plan(1)

  let completedSteps = 0

  const sas = startAndStop.new([
    { name: 'step1', start: (cb) => { setTimeout( ()=>{ completedSteps += 1; cb() } ,10) } },
    { name: 'step2', start: (cb) => { completedSteps += 2; setImmediate(cb) } },
    { name: 'step3', start: (cb) => { completedSteps += 4; setImmediate(cb) } }    
  ])

  sas.start()

  sas.on('started', () => {
    t.equal( completedSteps, 1 + 2 + 4 )
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

  sas.start( () => {
    sas.stop( () => {
      t.pass('stopped')
    })
  })
})


test('emit error when a step emits an error', (t) => {
  t.plan(6)

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
    setTimeout(() => cb('something wrong'),10)
  }

  function stopStep(cb) {
    t.fail('should not be called')
    cb()
  }

  sas.start( (err) => {
    t.notLooseEqual(err, null, 'start should have failed')
    t.equals( err.failure.step.name, 'step2' )
    t.equals( err.failure.error, 'something wrong' )
   
    t.equals( err.failures.length, 1 )
    t.deepEqual( err.failures[0].step,  err.failure.step )
  })
})

