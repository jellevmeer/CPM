// Measure Cell Sorting Score for a specific model:
// note: do not forget to change the model input in multithreading-worker.js too!

const runModel = require('./run-model-cellsorting-test.js')   //Basic model used for testing 
//const runModel = require('./run-model-cellsorting.js')      //Actual model used for sorting measurements

const os = require('os')
const {Worker, isMainThread, parentPort, workerData} = require('worker_threads')
const WorkerPool = require('./multithreading-worker-pool.js')
const pool = new WorkerPool('./multithreading-worker-cellsorting.js')

// Sweep parameters - runModel input is params = jEpi_Epi, jPre_Pre, seed, perimeterSize
// Differentiation Weight can be changed in the model itself (function secondDifferentiation)

// Testing parameter set:
let seeds = [6]
let jEpi_Epi = [1]
let jPre_Pre = [1]
let perimeterSize = [1.2] // [1.0, 1.10, 1.20, 1.30]

/*
// Measurement parameter set:
let seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
let jEpi_Epi = [1, 2, 4, 5, 7, 10, 15]
let jPre_Pre = [1, 2, 4, 5, 7, 10, 15]
let perimeterSize = [1.0] // [1.0, 1.10, 1.20, 1.30]
*/

  
//console.time('All tasks');

// Constructing input parameter array:
// Model input requires : jEpi_Epi, jPre_Pre, seed, perimeterSize
let tasks = []
for (const perimeter of perimeterSize){
  for (const seed of seeds){
    for (const jPre of jPre_Pre){
      for (const JEpi of jEpi_Epi){
        tasks.push([JEpi, jPre, seed, perimeter])
       }
    }
  }
}


// Send the tasks to a pool of workers, stagger output until all are completed.
// The number of workers depends on the CPU cores of your device.
// Function includes a console timer for the duration of the worker pool, and error catchers.
async function runTasks(tasks) {
  console.time(`Task`)
  try {
    // Run all tasks in parallel
    const results = await Promise.all(
      tasks.map(task => {
        //console.time(`Task`)
        return pool.runTask(task)
          .then(result => {
           // console.timeEnd(`Task`)
            return result;
          });
      })
    )    
	console.log( "done:", results)
    // Log results
}  catch (err) {
    console.error('Error running tasks:', err);
  } finally {
    console.timeEnd(`Task`)
    pool.close();
  }
}

runTasks(tasks).catch(console.error)



