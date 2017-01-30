const test = require('tape')
const startAndStop = require('..')

test('start events emitted after all steps completed', (t) => {
  t.plan(1)

  let completedSteps = 0

  /* eslint-disable no-bitwise */
  const sas = startAndStop.new([
    { name: 'step1', start: (cb) => { completedSteps |= 1; cb() } },
    { name: 'step2', start: (cb) => { completedSteps |= 2; cb() } },
    { name: 'step3', start: (cb) => { completedSteps |= 4; cb() } }    
  ])
  /* eslint-enable */

  sas.start()

  sas.on('started', () => {
    t.equal(completedSteps, 1 + 2 + 4)
  })
})

test('a number of events raised per step', (t) => {
  t.plan(3 * 4)

  /* eslint-disable no-bitwise */
  const sas = startAndStop.new([
    { name: 'step1', start: cb => cb() },
    { name: 'step2', start: cb => cb() },
    { name: 'step3', start: cb => cb() }    
  ])
  /* eslint-enable */

  sas.start()

  sas.on('step-start-begin', (step) => {
    t.pass(`step-start-begin raised ${step.name}`)
  })

  sas.on('step-start-end', (step) => {
    t.pass(`step-start-end raised ${step.name}`)
  })
  
  sas.on('step', (step) => {
    t.pass(`step raised ${step.name}`)
  })

  sas.on('step-started', (step) => {
    t.pass(`step-started raised ${step.name}`)
  })
})

test('error events emitted when a step fails', (t) => {
  t.plan(4)

  /* eslint-disable no-bitwise */
  const sas = startAndStop.new([
    { name: 'step1', start: cb => cb() },
    { name: 'step2', start: cb => cb('failed') },
    { name: 'step3', start: cb => cb('failed too') }     
  ])
  /* eslint-enable */

  sas.start()

  sas.on('start-error', () => {
    t.pass('start-error emitted')
  })

  sas.on('error', () => {
    t.pass('error emitted')
  })

  sas.on('step-start-error', (error, step) => {
    t.pass(`Error '${error}' emitted for ${step.name}`)
  })
})
