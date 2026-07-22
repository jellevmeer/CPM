//const runModel = require('./run-model-cellsorting-test.js')   // Basic model used for testing 
const runModel = require('./run-model-cellsorting.js')          // Actual model used for sorting measurements

const {Worker, isMainThread, parentPort, workerData, threadId} = require('worker_threads')
const path = require ('path')

//runModel(workerData)

// Node JS model simulation - for different workers
  //Loop over input data and run the model with parameterSet
  // data structure should be: 
function modelling(data) {
    //  runModel(data[0], data[1], data[2], data[3])

  let jEpi_Epi = data[0]
  let jPre_Pre = data[1]
  let seed = data[2]
  let perimeterSize = data[3]
  // Running the model using the given input parameters
  runModel(jEpi_Epi, jPre_Pre, seed, perimeterSize)

  const result = [jEpi_Epi, jPre_Pre, seed, perimeterSize]
  return result
}


// Use parentPort.postMessage(result) to send a message(output) from the worker to the main file
parentPort.on('message', (data) => {
  const result = modelling(data)
  parentPort.postMessage(result)
})

