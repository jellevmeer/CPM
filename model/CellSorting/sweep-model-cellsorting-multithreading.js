const runModel = require('./run-model-cellsorting.js')
const os = require('os')
const {Worker, isMainThread, parentPort, workerData} = require('worker_threads')
const WorkerPool = require('./multithreading-worker-pool.js')
const pool = new WorkerPool('./multithreading-worker-cellsorting.js')

// Sweep parameters - runModel input is params = jEpi_Epi, jPre_Pre, seed, perimeterSize
// Testing parameter set
//let seeds = [1, 2, 3, 4, 5]

let seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
let jEpi_Epi = [1, 2, 4, 5, 7, 10, 15]
let jPre_Pre = [1, 2, 4, 5, 7, 10, 15]
let perimeterSize = [1.3] // [1.10, 1.20, 1.30]

/*
// Parameter set used for measurements
let seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
let jEpi_Epi = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
let jPre_Pre = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
let perimeterSize = [1.00] // [1.10, 1.20, 1.30]
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



