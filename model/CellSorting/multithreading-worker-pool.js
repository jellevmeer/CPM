//const WorkerPool = require('./worker_pool')
const os = require('os')
const {Worker, threadId} = require('worker_threads')

// numWorkers is dependent on CPU core for your own device, you can always reduce this number in _initialize()

//code taken from w3school https://www.w3schools.com/nodejs/nodejs_worker_threads.asp and slightly modified:
class WorkerPool { 
  constructor(workerScript, numWorkers = os.cpus().length) {
    this.workerScript = workerScript
    this.numWorkers = numWorkers
    this.workers = []
    this.freeWorkers = []
    this.tasks = []
    
    // Initialize workers
    this._initialize();
  }
  
  _initialize() {
    // Create all workers
    //for (let i = 0; i < this.numWorkers; i++) {
    //for (let i = 0; i < (this.numWorkers - 2); i++) {
    for (let i = 0; i < 9; i++) {
     
      this._createWorker()
    }
  }
  
  _createWorker() {
    const worker = new Worker(this.workerScript);
    
    worker.on('message', (result) => {
      // Get the current task
      const { resolve } = worker.currentTask
      
      // Resolve the task with the result
      resolve(result);
      
      //  Reset the current task of the worker
      worker.currentTask = null

      // Add this worker back to the free workers pool
      this.freeWorkers.push(worker);
      
      // Process the next task if any
      this._processQueue();
    })
    
    worker.on('error', (err) => {
      // If a worker errors, terminate it and create a new one
      if (worker.currentTask) {
        worker.currentTask.reject(err);
      }
      console.error(`Worker error: ${err}`);
      this._removeWorker(worker);
      this._createWorker();
      
      // Process the next task
      if (this.tasks.length > 0) {
        //const { reject } = this.tasks.shift();
        //reject(err);
        this._processQueue();
      }
    })
    
    // Optionally create a new worker after exiting, but this also registers close()
    worker.on('exit', (code) => {  
      if (code !== 0) {
        console.error(`Worker exited with code ${code}`);
        this._removeWorker(worker);
        //this._createWorker();
      }
    })
    
    // Add to free workers
    this.workers.push(worker)
    this.freeWorkers.push(worker)
  }
  
  _removeWorker(worker) {
    // Remove from the workers arrays
    this.workers = this.workers.filter(w => w !== worker)
    this.freeWorkers = this.freeWorkers.filter(w => w !== worker)
  }
  
  _processQueue() {
    // If there are tasks and free workers, process the next task
    if (this.tasks.length > 0 && this.freeWorkers.length > 0) {
      const task = this.tasks.shift()
      const worker = this.freeWorkers.pop();
      worker.currentTask = task

      worker.postMessage(task.taskData);
      console.log("worker data sent:", task.taskData)
      console.log('Worker Thread ID:', worker.threadId)
    }
  }
  
  // Run a task on a worker
  runTask(taskData) {
    return new Promise((resolve, reject) => {
      const task = { taskData, resolve, reject }
      this.tasks.push(task)
      this._processQueue()
    });
  }
  
  // Close all workers when done
  close() {
    for (const worker of this.workers) {
      worker.terminate()
    }
  }
}

module.exports = WorkerPool
