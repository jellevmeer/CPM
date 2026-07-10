const runModel = require('./run-model-test.js')

const {Worker, isMainThread, parentPort, workerData, threadId} = require('worker_threads')
const path = require ('path')

//runModel(workerData)

// Node JS model simulation - for different workers
  //Loop over input data and run the model with parameterSet
  // data structure should be: 
function modelling(data) {
    //  runModel(data[0], data[1], data[2], data[3])
  let jICM_TE = data[0]
  let jICM_lumen = data[1]
  let seed = data[2]
  let volstep_lumen = data[3]
  // Running the model using the given input parameters
  runModel(jICM_TE, jICM_lumen, seed, volstep_lumen)

  const result = [jICM_TE, jICM_lumen, seed, volstep_lumen]
  return result
}


// Use parentPort.postMessage(result) to send a message(output) from the worker to the main file
parentPort.on('message', (data) => {
  const result = modelling(data)
  parentPort.postMessage(result)
})

