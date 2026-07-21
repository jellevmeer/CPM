const runModel = require('./run-model-test.js');
const cliProgress = require('cli-progress')
const {Worker, isMainThread, parentPort, workerData} = require('worker_threads');

// Sweep parameters - runModel input is params = jICM_TE, jICM_lumen, used_seed, volstep_lumen
const tasks = []
let seeds = [1, 2]
let J_TEs = [20, 30]
let J_Lumens = [40, 60]
let volstep_lumen = [0.04, 0.06]

// Progress bar
//Example: progress [{bar}] {percentage}% | ETA: {eta}s | {value}/{total} is rendered as progress [========================================] 100% | ETA: 0s | 200/200

//const bar1 = new cliProgress.SingleBar({format : 'progress' + [{bar}] + '{percentage}% || ETA: {eta}s || {value}/{total} Chunks'}, cliProgress.Presets.shades_classic);
const bar1 = new cliProgress.SingleBar({stopOnComplete = true}, cliProgress.Presets.shades_classic);

let maxLength = seeds.length * J_TEs.length * J_Lumens.length * volstep_lumen
bar1.start(maxLength, 0)

// Running the model synchroneously
for (const grow of volstep_lumen){
  for (const seed of seeds){
    for (const jICM_TE of J_TEs){
      for (const jICM_lumen of J_Lumens){
        runModel(jICM_TE, jICM_lumen, seed, grow)
        bar1.increment()
      }
    }
  }
}

/*for (const grow of volstep_lumen){
  for (const seed of seeds){
    for (const jICM_TE of J_TEs){
      for (const jICM_lumen of J_Lumens){
        tasks.push(limit(() =>
          runModel(jICM_TE, jICM_lumen, seed, volstep_lumen)
        ))
        bar1.increment()
      }
    }
  }
}
*/

//await Promise.all(tasks); ~not allowed in this syntax?

//error: await is only valid in async functions and the top level bodies of modules

