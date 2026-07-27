# Artistoo-based CPM
A Cellular Potts Model (CPM) of human blastocyst development. This model can be used as framwork to study cell morphological changes during development.

## Description

This project uses the Artistoo library for their base CPM structure, and many of the functions originate from there.
The model is dependent on various parameters, and their effect on the blastocyst development can be studied visually,
or with an output function in a Node.js script. This CPM was constructed as part of a six month MSc internship.

The model is available as a .js file with HTML output, or a Node js script, which allows for more in depth parameter sweeping.

A multithreaded approach to run several Nodejs simulations simulataneously has been established to optimize parameters. This is available for measuring boundary lengths between ICM-Trophectoderm & ICM-Lumen, but also for cell sorting between EPI and PrE.

To run these parameter sweeps, a worker.js file, a worker-pool.js file, a sweep-model file and a node script are all required. The node script should contain a module function which wraps around the entire model, where input parameters can be defined. These should match the arrays of parameters in the  sweep-model file, see the CellSorting or the BoundaryLength directory as example. You can also define the maximum number of CPUs to use in the worker-pool.js files, to modify the number of simulations that are running simultaneously. Parameter measurement outputs are written to a .txt file, with the additional option of capturing PNGs during the simulation's runtime.

## Getting Started

### Dependencies

* Node.js
* Package manager npm
* Visual Studio Code, or another JS editor
* Artistoo

### Installing

* To install base Artistoo, see https://artistoo.net/manual/index.html
* Modifications might need to be made to relative file paths within the .js files, if you start moving directories around.

## Authors
Jelle van Meer

## Acknowledgments
* [ingewortel](https://github.com/ingewortel/artistoo)

