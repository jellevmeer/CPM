const runModel = require('./run-model-test.js')
const cliProgress = require('cli-progress')
const os = require('os')
const {Worker, isMainThread, parentPort, workerData} = require('worker_threads')
const WorkerPool = require('./multithreading-worker-pool.js')
const pool = new WorkerPool('./multithreading-worker.js')

// Sweep parameters - runModel input is params = jICM_TE, jICM_lumen, used_seed, volstep_lumen
let seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
let J_TEs = [5, 10, 15, 20, 25, 30, 35]
let J_Lumens = [25, 30, 35, 40, 45, 50, 55, 60, 65]


let volstep_lumen = [0.02]
//let jICM_TE = 20, jICM_lumen = 40, grow = 0.04
//let seed = 1
  
//console.time('All tasks');

// Constructing input parameter array:
// Model input requires : jICM_TE, jICM_lumen, used_seed, volstep_lumen
let tasks = []
for (const grow of volstep_lumen){
  for (const seed of seeds){
    for (const jICM_TE of J_TEs){
      for (const jICM_lumen of J_Lumens){
        tasks.push([jICM_TE, jICM_lumen, seed, grow])
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


/*
// Single core worker setup: 
// Requires worker.js to have an output, to resolve function runworker()

//let input = [jICM_TE, jICM_lumen, seed, grow]
// Running the model synchroneously
function runWorker(workerData) {
  return new Promise((resolve, reject) => {
    // Create a new worker
    const worker = new Worker('./multithreading-worker.js', {workerData})
    
    // Listen for messages from the worker
    worker.on('message', resolve)
    
    // Listen for errors
    worker.on('error', reject)
    
    // Listen for worker exit
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code: ${code}`))
      }
    })
  })
}

// Run the worker
async function run(input) {
  try {
    // Send data to the worker and get the result
    const result = await runWorker(input)
    console.log('Worker result:', result)
  } catch (err) {
    console.error('Worker error:', err)
  }
}

console.time('Multicore')
for (const seed of seeds){ 
  let input = [jICM_TE, jICM_lumen, seed, grow]
  run(input).catch(err => console.error(err))
}
console.timeEnd('Multicore')


/*
if (isMainThread) {

  const worker = new Worker(__filename, {workerData : runModel(jICM_TE, jICM_lumen, seed, grow)} )
  worker.on('error',(err) => {
    console.error('Worker error:', err)
  })

  worker.on("exit", (code) => {
    if (code !== 0) {
      reject(new Error("Worker stopped working with exit code ${code}"))
    }
  })

} else {

*/
