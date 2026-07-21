//const used_seed= 47
//const jICM_TE = 20, jICM_lumen = 40, volstep_lumen = 0.04

const {Worker, isMainThread, parentPort, workerData} = require('worker_threads');


module.exports = function model(jICM_TE, jICM_lumen, used_seed, volstep_lumen){

	let CPM = require("./artistoo-cjs.js")

	// Value logging to txt file
	const fs = require('fs');

	const file_name = "MCSParametersICM-TE-Lumen"
	const ext = "-adh3.txt"

	const filepath = "C:\\Users\\jelle\\Rstudio\\my_WD\\raw_data\\Artistoo\\ParameterOptimizationICM-TE-LUMEN\\" + file_name + ext 
	const filepath_values = "C:\\Users\\jelle\\Rstudio\\my_WD\\raw_data\\Artistoo\\ParameterOptimizationICM-TE-LUMEN\\" + file_name  + "_2" + ext

	// Writable arrays to transfer to filepath/filepath_values:
	const measurement = []
	const values = []

	/*
	fs.appendFileSync("C:\\Users\\jelle\\Rstudio\\my_WD\\raw_data\\Artistoo\\Test.txt", data, 'utf8', (err) => {
	if (err) {
		console.error('Error writing file:', err);
		return;
	}
	console.log('File written successfully!');
	});
	*/


	/*	----------------------------------
		CELL CLASSES
		----------------------------------
	*/


	class Blastomeres extends CPM.Cell {

		/** The constructor of class Blastomere.
		 * @param {object} conf - configuration settings of the simulation, containing the
		 * relevant parameters. Note: this should include all constraint parameters.
		 * @param {CellKind} kind - the cellkind of this cell, the parameters of kind are used 
		 * when parameters are not explicitly overwritten
		 * @param {CellId} id - the CellId of this cell (its key in the CPM.cells), unique identifier
		 *  @param {CPMEvol} C - the CPM - used among others to draw random numbers
		 * */
		constructor (conf, kind, id, C) {
			super(conf, kind, id, C)

			/** Store the constructor of each cellKind on the grid, in order
			@type {CellObject}
			*/
			this.cellclasses = this.conf["CELLS"]

			/** Store the {@Cell} of each cell on the grid. 
			@example
			this.cells[1] // cell object of cell with cellId 1
			@type {Cell}
			*/
			this.cells =[new CPM.Cell(conf, 0, -1, this)]

			/** encode cell-specific target volume for a simple growth algorithm such that the V can be halved after division
			 * @type{Number}
			*/
			this.V = this.conf["V"][kind]

			/** encode cell-specific target volume post-birth function for a cell growth algorithm 
			 * which is based on the initial target V when the cell is created
			 * @type{Number}
			*/
			this.initialV = this.conf["V"][kind]

			/** encode cell-specific target perimeter for a simple growth algorithm such that the P can be halved after division
			 * @type{Number}
			*/
			this.P = this.conf["P"][kind]

			/** encode cell-specific target perimeter for a simple growth algorithm 
			 * which is based on the initial target P when the cell is created
			 * @type{Number}
			*/
			this.initialP = this.conf["P"][kind]

			/** encode cell-specific cell division counter 
			 * @type{Number}
			*/
			this.nDiv = 0

			/** encode cell-specific polarization check 
			 * @type{String}
			*/
			this.Polarized = "not yet"

			/** encode cell-specific shape as length major axis/minor axis
			 * @type{number}
			*/
			this.distortion = []
			
			/** encode average cell-specific shape as length major axis/minor axis
			 *  a base value of 1 ensures that cell pre-100MCS of existence have a low division probability
			 * @type{number}
			*/
			this.avgDistortion = 1

			/** encode cell-specific cell division max volume  
			 * @type{Number}
			*/
			this.maxVol = 0

			/** holds the ids of the parent cells, all seeded cells have parent -1 
			*  @type{Array}
			*/
			this.parentId = [-1]

			/** holds the ids of the daughter cells originating from this cell, 
			*  including daughter cell with the same id as the parent 
			*  @type{Array}
			*/
			this.daughterId = [this.id]

		}

		/**
		 *  Halves target volume and adds parent cell id to this.parentId to track cell lineages
		 * @param {Cell} parent - the parent (or other daughter) cell
		 */ 

		birth(parent){
			super.birth(parent)
			this.parentId = parent.parentId.slice()
			this.parentId.push(parent.id)

			// Volume of the daughter and the parent cell is halved after division with a possible 5% variation
			// Perimeter of the daughter and the parent cell is also changed after division
			let V = parent.V
			let P = parent.P

			let maxPercentageDev = 5
			let delta_VP = (this.C.ran(0, maxPercentageDev * 10) / 1000)
			//let delta_VP = (maxPercentageDev) / 100
			let vol_dev = (delta_VP * V/2)
			let per_dev = (P * 0.70 * delta_VP)
			let j = this.C.ran(0, 1)

			if (j == 0){
				this.V = Math.round(V / 2 + vol_dev)
				this.initialV = Math.round(V / 2 + vol_dev)

				parent.V = Math.round(V / 2 - vol_dev)
				parent.initialV = Math.round(V / 2 - vol_dev)

				this.P = P * 0.70 + per_dev
				this.initialP = P * 0.70 + per_dev

				parent.P = P * 0.70 - per_dev
				parent.initialP = P * 0.70 - per_dev

			}
			if (j == 1){
				this.V = Math.round(V / 2 - vol_dev)
				this.initialV = Math.round(V / 2 - vol_dev)

				parent.V = Math.round(V / 2 + vol_dev)
				parent.initialV = Math.round(V / 2 + vol_dev)

				this.P = P * 0.70 - per_dev
				this.initialP = P * 0.70 - per_dev

				parent.P = P * 0.70	+ per_dev				
				parent.initialP = P * 0.70	+ per_dev		
		
			}
			//Inherit polarization of parent cellIds 
			this.Polarized = parent.Polarized
		}

		/** Replace a {@link CellId} for a cell of {@link CellKind} "kind", and create elements
		 for this cell in the relevant arrays (cellvolume, t2k).
		@param {CellId} id of the cell to be replaced (Should be a Number)
		@param {CellKind} kind - of the cell that is made*/

		newCellID(id, kind){
			// Check if the id is a number
			if (typeof id === "string"){
				id = Number(id)
			}
			let cell = this.C.cells[id]
			
			//Object.assign(this.C.cells[id], object)
			//structuredClone(this.C.cells[id], object)
			let object = {P: cell.P, Polarized: cell.Polarized, V: cell.V, avgDistortion: cell.avgDistortion,
				daughterId: cell.daughterId, distortion: cell.distortion, initialP: cell.initialP,
				initialV: cell.initialV, maxVol: cell.maxVol, nDiv: cell.nDiv, parentId: cell.parentId
			}
			//Change cellKind of the selected cell
			this.C.setCellKind(id, kind)
			//cell = new this.conf["CELLS"][kind](this.conf, kind, id, this)
			
			this.C.cells[id] = new this.conf["CELLS"][kind](this.conf, kind, id, this.C)		

			// Add the original parameters back to the new cell, but this shouldn't overwrite
			// some of the conf parameters.
			this.C.cells[id].P = object.P, this.C.cells[id].Polarized = object.Polarized, this.C.cells[id].V = object.V, this.C.cells[id].avgDistortion = object.avgDistortion,
			this.C.cells[id].daughterId = object.daughterId, this.C.cells[id].parentId = object.parentId, this.C.cells[id].distortion = object.distortion, 
			this.C.cells[id].initialP = object.initialP, this.C.cells[id].initialV = object.initialV, this.C.cells[id].maxVol = object.maxVol, this.C.cells[id].nDiv = object.nDiv

		}
	}


	/** A class encoding a lumen cell which will grow into the blastocoel
	 */
	class Lumen extends CPM.Cell {

		/** The constructor of class SuperCell.
		 * @param {object} conf - configuration settings of the simulation, containing the
		 * relevant parameters. Note: this should include all constraint parameters.
		 * @param {CellKind} kind - the cellkind of this cell, the parameters of kind are used 
		 * when parameters are not explicitly overwritten
		 * @param {CellId} id - the CellId of this cell (its key in the CPM.cells), unique identifier
		 *  @param {CPMEvol} C - the CPM - used among others to draw random numbers
		 * */
		constructor (conf, kind, id, C) {
			super(conf, kind, id, C)

			/** encode cell-specific target volume for a simple growth algorithm such that the V can be altered upon division
			 * @type{Number}
			*/
			this.V = this.conf["V"][kind]

			/** Encode cell-specific target volume for a cell growth algorithm 
			 *  based on the initial target V when the cell is created
			 * @type{Number}
			*/
			this.initialV = this.conf["V"][kind]

			/** encode cell-specific target perimeter for a simple growth algorithm such that the P can be altered after fusion
			 * @type{Number}
			*/
			this.P = this.conf["P"][kind]

			/** encode cell-specific target perimeter for a simple growth algorithm 
			 * which is based on the initial target P when the cell is created
			 * @type{Number}
			*/
			this.initialP = this.conf["P"][kind]

			/** encode cell-specific target volume for a simple growth algorithm
			 * @type{Number}
			*/
			this.maxVol = 0

			/** holds the ids of the parent cells, all seeded cells have parent -1 
			*  @type{Array}
			*/
			this.parentId = [-1]
		}
	/*
		birth(parent){
			super.birth(parent)
			this.parentId = parent.parentId.slice()
			this.parentId.push(parent.id)
			
			// Volume of the daughter and the parent cell is halved after division
			this.V = parent.V = this.initialV

			// Perimeter of the daughter and the parent cell is halved after division
			this.P = parent.P = this.initialP	
		}	
	*/
	}

	/** A class encoding the trophectoderm (TE)
	 */
	class TE extends Blastomeres {

		/** The constructor of class TE.
		 * @param {object} conf - configuration settings of the simulation, containing the
		 * relevant parameters. Note: this should include all constraint parameters.
		 * @param {CellKind} kind - the cellkind of this cell, the parameters of kind are used 
		 * when parameters are not explicitly overwritten
		 * @param {CellId} id - the CellId of this cell (its key in the CPM.cells), unique identifier
		 *  @param {CPMEvol} C - the CPM - used among others to draw random numbers
		 * */
		constructor (conf, kind, id, C) {
			super(conf, kind, id, C)

			//this.V = this.conf["V"][kind]
			//this.P = this.conf["P"][kind]

			/** Encode cell-specific target volume for a cell growth algorithm 
			 *  based on the initial target V when the cell is created
			 * @type{Number}
			*/
			//this.initialV = this.V 

			/** encode cell-specific target perimeter for a simple growth algorithm 
			 * which is based on the initial target P when the cell is created
			 * @type{Number}
			*/
			//this.initialP = this.P

			/** encode cell-specific counter if it is mistakingly internalized post-cavitiation
			 * @type{Number}
			*/
			this.internalCounter = 0

			/** encode cell-specific division state
			 * @type{Number}
			*/
			this.divisionState = "No"

		}
		/**
		 *  Halves target volume and adds parent cell id to this.parentId to track cell lineages
		 * @param {Cell} parent - the parent (or other daughter) cell
		 */ 

		birth(parent){
			//super.birth(parent) 				// since TE is an extention of blastomeres, the birth function is called three times (TE, Blastomeres & Cell)
			this.parentId = parent.parentId.slice()
			this.parentId.push(parent.id)

			// Volume of the daughter and the parent cell is halved after division with a possible 5% variation
			// Perimeter of the daughter and the parent cell is also changed after division
			let V = parent.V
			let P = parent.P

			let maxPercentageDev = 5
			let delta_VP = (this.C.ran(0, maxPercentageDev * 10) / 1000)
			//let delta_VP = (maxPercentageDev) / 100
			let vol_dev = (delta_VP * V/2)
			let per_dev = (P * 0.65 * delta_VP)
			let j = this.C.ran(0, 1)

			if (j == 0){
				this.V = Math.round(V / 2 + vol_dev)
				this.initialV = Math.round(V / 2 + vol_dev)

				parent.V = Math.round(V / 2 - vol_dev)
				parent.initialV = Math.round(V / 2 - vol_dev)

				this.P = P * 0.65 + per_dev
				this.initialP = P * 0.65 + per_dev

				parent.P = P * 0.65 - per_dev
				parent.initialP = P * 0.65 - per_dev

			}
			if (j == 1){
				this.V = Math.round(V / 2 - vol_dev)
				this.initialV = Math.round(V / 2 - vol_dev)

				parent.V = Math.round(V / 2 + vol_dev)
				parent.initialV = Math.round(V / 2 + vol_dev)

				this.P = P * 0.65 - per_dev
				this.initialP = P * 0.65 - per_dev

				parent.P = P * 0.65	+ per_dev				
				parent.initialP = P * 0.65	+ per_dev		
		
			}
			//Inherit polarization of parent cellIds 
			this.Polarized = parent.Polarized
		}


	}

	/** A class encoding the inner cell mass (ICM)
	 */
	class ICM extends Blastomeres {

		/** The constructor of class SuperCell.
		 * @param {object} conf - configuration settings of the simulation, containing the
		 * relevant parameters. Note: this should include all constraint parameters.
		 * @param {CellKind} kind - the cellkind of this cell, the parameters of kind are used 
		 * when parameters are not explicitly overwritten
		 * @param {CellId} id - the CellId of this cell (its key in the CPM.cells), unique identifier
		 *  @param {CPMEvol} C - the CPM - used among others to draw random numbers
		 * */
		constructor (conf, kind, id, C) {
			super(conf, kind, id, C)

			/** encode cell-specific division state
			 * @type{Number}
			*/
			this.divisionState = "No"

			/** Parameter used for disconnectedness ICM 
			 * @type{Number}
			*/
			this.disconnectedness = 0
		}
		
		/*
		birth(parent){
			this.parentId = parent.parentId.slice()
			this.parentId.push(parent.id)

			// Volume and perimeter of the daughter and the parent cell is kept the same after division
			this.V = parent.V
			let initialV = parent.V
			this.P = parent.P
			let initialP = parent.P

			//Inherit polarization of parent cellIds 
			this.Polarized = parent.Polarized
		}
		
		birth(parent){
			this.parentId = parent.parentId.slice()
			this.parentId.push(parent.id)

			let V = parent.V, P = parent.P
			let maxPercentageDev = 5
			let delta_VP = (this.C.ran(0, maxPercentageDev * 10) / 1000)
			let vol_dev = (delta_VP * V/2)
			let per_dev = (P * 0.50 * delta_VP)
			let j = this.C.ran(0, 1)

			if (j == 0){
				this.V = Math.round(V / 2 + vol_dev)
				this.initialV = Math.round(V / 2 + vol_dev)

				parent.V = Math.round(V / 2 - vol_dev)
				parent.initialV = Math.round(V / 2 - vol_dev)

				this.P = P * 0.50 + per_dev
				this.initialP = P * 0.50 + per_dev

				parent.P = P * 0.50 - per_dev
				parent.initialP = P * 0.50 - per_dev

			}
			if (j == 1){
				this.V = Math.round(V / 2 - vol_dev)
				this.initialV = Math.round(V / 2 - vol_dev)

				parent.V = Math.round(V / 2 + vol_dev)
				parent.initialV = Math.round(V / 2 + vol_dev)

				this.P = P * 0.50 - per_dev
				this.initialP = P * 0.50 - per_dev

				parent.P = P * 0.50	+ per_dev				
				parent.initialP = P * 0.50	+ per_dev		
			}
		}	*/		
	}


	/*	----------------------------------
		CONFIGURATION SETTINGS
		----------------------------------
	*/
	let config = {

		// Grid settings
		ndim : 2,
		field_size : [250,250],
		
		// CPM parameters and configuration
		conf : {
			// Basic CPM parameters
			torus : [false,false],				// Should the grid have linked borders?
			seed : used_seed,							// Seed for random number generation.
			T : 20,								// CPM temperature
			
			// Defining CELLS loads CPMEvol instead of CPM
			CELLS : ["empty", Blastomeres, Lumen, TE, ICM],
			
			// Constraint parameters. 
			// Mostly these have the format of an array in which each element specifies the
			// parameter value for one of the cellkinds on the grid.
			// First value is always cellkind 0 (the background) and is often not used.
			
			// Adhesion parameters:
			J : [ 
				[0, 20, 1000, 20, 120],                  	// Background cell
				[20, 15, 20, 1, 1],                   		// Blastomeres
				[1000, 20, 18, 20, jICM_lumen],                   	// Lumen 
				[20, 1, 20, 1, jICM_TE],							// TE
				[120, 1, jICM_lumen, jICM_TE, 1]							// ICM
			],

			
			// VolumeConstraint parameters
			LAMBDA_V : [0,50,50, 50, 50],					// VolumeConstraint importance per cellkind
			V : [0,5000, 100, 200, 200],					// Target volume of each cellkind
	
			// Cell growth parameters (post-cleavage divisions):
			// If (target volume - current volume) is < VOLCHANGE_THRESHOLD, 
			// target volume for a cell is increased by VOLSTEP
			VOLCHANGE_THRESHOLD : 10,
			VOLSTEP : [0, 0.01, volstep_lumen, 0.01, 0.01],
			PERSTEP : [0, 0.0042, 0.025, 0.005, 0.005],
	// for low icm  growth: volstep = 0.005, perstep = 0.0065

			// PerimeterConstraint parameters
			LAMBDA_P: [0,2, 0, 1, 2],				    	// PerimeterConstraint importance per cellkind
			P: [0,900, 200, 100, 100] 				    	// Target perimeter of each cellkind		
		},
		
		// Simulation setup and configuration: this controls stuff like grid initialization,
		// runtime, and what the output should look like.
		simsettings : {
		
			// Cells on the grid
			NRCELLS : [1, 0, 0, 0],						// Number of cells to seed for all non-background cellkinds.
			BURNIN : 100,
			RUNTIME : 7500,
			RUNTIME_BROWSER : "Inf",
			
			// Visualization
			CANVASCOLOR : "EEEEEE",		
			CELLCOLOR : ["000000", "0000FF", "6F2DA8", "ED7117"],
			SHOWBORDERS : [true, true, true, true],					// Should cellborders be displayed?
		//SHOWBORDERS : [true, false, false, false],			// Should cellborders be displayed?

			BORDERCOL : ["DDDDDD", "DDDDDD", "DDDDDD", "DDDDDD"],	// color of the cell borders
			zoom : 2,												// zoom in on canvas with this factor.
			
			// Output images
			SAVEIMG : false,							// Should a png image of the grid be saved
			// during the simulation?
			IMGFRAMERATE : 10,							// If so, do this every <IMGFRAMERATE> MCS.
			SAVEPATH : "C:/Users/jelle/Documents/Artistoo/output/img/MCSParametersICM-TE-Lumen",	// ... And save the image in this folder.
			EXPNAME : "MCSParametersICM-TE-Lumen" + "_" + used_seed + "_" + jICM_TE + "_" + jICM_lumen, 				// Used for the filename of output images.
			
			// Output stats etc
			STATSOUT : { browser: false, node: true }, 	// Should stats be computed?
			LOGRATE : 10000								// Output stats every <LOGRATE> MCS.

		}
	}
	/*	---------------------------------- */
	let sim, meter, Cim
	let running = true

	function toggleAnim(){
		running = !running
		if( running ){
			step()
		}
	}

		/* The following functions are defined below and will be added to
			the simulation object. If Custom-methods above is set to false,
			this object is ignored and not used in the html/node files. */
		let custommethods = {
			postMCSListener : postMCSListener,
			zygoteDivision : zygoteDivision,
			initializeGrid : initializeGrid,
			divideCell : divideCell,
			drawCanvas : drawCanvas,
			backgroundBorderpixelCounter : backgroundBorderpixelCounter,
			borderPixelCounter : borderPixelCounter,
			perimeterCounter : perimeterCounter,
			compaction : compaction,
			polarization : polarization,
			cell_number : cell_number,
			toggleAnim : toggleAnim,
			resetButton : resetButton,
			weighted_random : weighted_random,
			cellShape : cellShape,
			cellGrowth : cellGrowth,
			cellDivision : cellDivision,
			newCellDivision : newCellDivision,
			cavitation : cavitation,
			arrayShuffle : arrayShuffle,
			lumenGrowth : lumenGrowth,
			lineageSwitch : lineageSwitch,
			fusion : fusion,
			disconnectedness : disconnectedness,
			boundaryLength : boundaryLength,
			fusionEmbryo : fusionEmbryo,
			run : run,
			dataLogger : dataLogger,
			outputPNG : outputPNG
		}
		sim = new CPM.Simulation( config, custommethods )		// Always add run to custommethods

		if( !Cim ){
			sim.addCanvas()
		} else {
			Cim.sim = sim
		}
		
		sim.Cim.el.onclick = toggleAnim
		running = true

		// option to draw lineages based on cellId and their daughterIds, and based on polarization
		sim.trace_cellid = []
		sim.drawDaughterColors = false
		sim.drawPolarColors = false

	function step(){
		sim.step()
	/*	if( sim.conf["RUNTIME_BROWSER"] == "Inf" | sim.time+1 < sim.conf["RUNTIME_BROWSER"] ){
			requestAnimationFrame( step )
		} */
	}

	let div_time = 0

	function initializeGrid(){
		// add the initializer if not already there
		if( !this.helpClasses["gm"] ){ this.addGridManipulator() }

		// Seed 1 Zygote at middle of the simulation
		this.gm.seedCellAt( 1, [this.C.extents[0]/2, this.C.extents[1]/2] )   
	}


	let old_cells = 0
	let icmDivisionArray = []
	let cavitationCount = 0, fusionCount = 0, timeCounter = 0, lineageSwitchCount = 0
	let fusion_time = 999999, timeLumenGrowth = 999999
	let boundaryLengthMeasurements = 0
	let pictureCounter = -1

	let global_total_TE = 17
	let global_total_ICM =  16
	/* The following custom methods will be added to the simulation object */
	function postMCSListener(){
		let total_cells = this.cell_number([1, 3, 4])
		let lumen_id = 0

		if(sim.time == 0){
		//	this.htmlSymmetricalMatrix()
		}

		//Prevent zygoteDivisions from throwing errors when ICM cells are added to 1 id
		if (cavitationCount < 1){ 
			this.zygoteDivision()
		}

		// Check the perimeter every 50 MCS and every time a cell has divided
		if (sim.time % 50 == 0 || total_cells > old_blastomeres){
			//let bg_borderpixels = this.backgroundBorderpixelCounter(borderPixelCounter(1))
			//console.log(bg_borderpixels)
			//console.log(this.perimeterCounter(bg_borderpixels))
			old_blastomeres = total_cells
		}

		if (total_cells == 6){
		this.compaction()
		}

		if (total_cells >= 6){
		this.polarization()
		}

		// Calculate cell shape for each cell
		for( let i of this.C.cellIDs() ){
			if(this.C.cellKind(i) == 1 || this.C.cellKind(i) == 3 || this.C.cellKind(i) == 4 ){		
				this.cellShape(i)
			}
		}

	/*	// Output PNG at specific moments instead of using IMGFRAMERATE
		if (total_cells == 1 && pictureCounter < 0){
			this.outputPNG()
			pictureCounter++
		}
		if (total_cells == 4 && pictureCounter < 1){
			this.outputPNG()
			pictureCounter++
		}
		if (total_cells == 15 && pictureCounter < 2){
			this.outputPNG()
			pictureCounter++
		}
		if (this.C.cells[lumen_id].V == 500 && pictureCounter < 3){
			this.outputPNG()
			pictureCounter++
		}
	*/

		// First differentiation event
		// Loop over all cellIds, if they are polarized assign them to the TE class, if they are Apolar they become ICM
		// Not yet polarized cells are differentiated based on their position in the embryo
		if (total_cells == 16){
			for( let i of this.C.cellIDs()){
				if (this.C.cellKind(i) == 1){
					if( this.C.cells[i].Polarized == "Polar"){		
						this.C.cells[i].newCellID(i,3)
					} else if (this.C.cells[i].Polarized == "Apolar"){
						this.C.cells[i].newCellID(i, 4)
					}
					// Additional control due to polarization condition being randomly assigned with a delay
					else if (this.C.cells[i].Polarized == "not yet"){
						let bg_borderpixels = this.backgroundBorderpixelCounter(this.borderPixelCounter(1))		
						if (bg_borderpixels[i].length > 0 ){
							this.C.cells[i].Polarized = "Polar"
							this.C.cells[i].newCellID(i,3)
						} else {
							this.C.cells[i].Polarized = "Apolar"
							this.C.cells[i].newCellID(i,4)
						}
					}	
				}
			}
		} 

		// Cavitation can be staggered with the div_time parameter to allow cell differentiation upon formation of the 16th cell prior to lumen formation
		if (total_cells >= 16 && cavitationCount < 1 && div_time > 50){
			this.cavitation()
			cavitationCount++

			// Collect the cellIDs of the ICM cells present on the grid for 1 round of cleavage division
			for (let i of this.C.cellIDs()){
				if (this.C.cellKind(i) == 4){		
					icmDivisionArray.push(i)
				}
			}		
		}

		for( let i of this.C.cellIDs() ){
			if( this.C.cellKind(i) == 2 ){		
				lumen_id = i
			}
		}

		if (total_cells >= 16 && icmDivisionArray.length > 0  && this.C.cells[lumen_id].V > 1500){

			icmDivisionArray = this.cellDivision(icmDivisionArray)
			// input of this.cellDivision should be the icmDivisionArray
			// output of this.cellDivision should be a shorter icmDivisionArray by 1
			
		}
		

		// Lumen growth & TE/ICM cell divisions (including cell growth)
		let total_te = this.cell_number([3])


		if (total_cells >= 16 ){ 
			this.lumenGrowth()

			// If a TE cell is inside the blastocyst for X number of MCS, convert it to an ICM cell
			let linSwitchOutput = this.lineageSwitch()
			if (linSwitchOutput != undefined){
				icmDivisionArray.push(linSwitchOutput)
				lineageSwitchCount++
			} 
		}
		
		if (total_cells >= 16 && cavitationCount > 0){
			this.newCellDivision()
		}	

		let bltime1 = 0, bltime2 = 0, bltime3 =  0, bltime4 = 0, bltime5 = 0
		let blIcm_TE1, blIcm_TE2, blIcm_TE3, blIcm_TE4, blIcm_TE5
		let blIcm_Lumen1, blIcm_Lumen2, blIcm_Lumen3, blIcm_Lumen4, blIcm_Lumen5


	// Boundary length measurements:
	if (this.C.cells[lumen_id].V > 150 && boundaryLengthMeasurements < 1){		
		let [blIcm_TE1, blIcm_Lumen1] = this.boundaryLength()
		bltime1 = sim.time

		let data = String([this.C.conf.seed, jICM_TE, jICM_lumen, bltime1, blIcm_TE1 , blIcm_Lumen1, this.C.cells[lumen_id].V])
		measurement.push(data)
		boundaryLengthMeasurements++
	}

	if (this.C.cells[lumen_id].V % 500 == 0 && timeCounter < 1){		//Measurement every 500 Vlumen 
		let [blIcm_TE1, blIcm_Lumen1] = this.boundaryLength()
		bltime1 = sim.time

		let data = String([this.C.conf.seed, jICM_TE, jICM_lumen, bltime1, blIcm_TE1 , blIcm_Lumen1, this.C.cells[lumen_id].V])
		measurement.push(data)

		//this.outputPNG()
	}

	/*
	if (this.C.cells[lumen_id].V == 2500 && boundaryLengthMeasurements < 1){
			let [blIcm_TE1, blIcm_Lumen1] = this.boundaryLength()
			bltime1 = sim.time
			boundaryLengthMeasurements++
			console.log("time of measurement1:", bltime1, "Volume lumen:", this.C.cells[lumen_id].V, "ICM-TE:", blIcm_TE1, "ICM-Lumen:", blIcm_Lumen1)
		}
		else if (this.C.cells[lumen_id].V == 5000 && boundaryLengthMeasurements < 1){
			let [blIcm_TE1, blIcm_Lumen1] = this.boundaryLength()
			bltime1 = sim.time
			boundaryLengthMeasurements++
			console.log("time of measurement1:", bltime1, "Volume lumen:", this.C.cells[lumen_id].V, "ICM-TE:", blIcm_TE1, "ICM-Lumen:", blIcm_Lumen1)
		} else if (this.C.cells[lumen_id].V == 7500 && boundaryLengthMeasurements < 2){
			let [blIcm_TE2, blIcm_Lumen2] =  this.boundaryLength()
			bltime2 = sim.time
			boundaryLengthMeasurements++
			console.log("time of measurement2:", bltime2, "Volume lumen:", this.C.cells[lumen_id].V, "ICM-TE:", blIcm_TE2, "ICM-Lumen:", blIcm_Lumen2)
		} else if (this.C.cells[lumen_id].V >= 12500 && boundaryLengthMeasurements < 3){
			let [blIcm_TE3, blIcm_Lumen3] =  this.boundaryLength()
			bltime3 = sim.time
			boundaryLengthMeasurements++
			console.log("time of measurement3:", bltime3, "Volume lumen:", this.C.cells[lumen_id].V, "ICM-TE:", blIcm_TE3, "ICM-Lumen:", blIcm_Lumen3)
		} 
	*/
		// Save the time when the lumen is fully grown
		if (this.C.cells[lumen_id].V == 12500 && timeCounter < 1){
			timeLumenGrowth = sim.time
			timeCounter++
			//console.log("Fully grown lumen at time:", timeLumenGrowth)
		}
		
	// measure every X MCS after max lumen is reached for Y times

		if (this.C.cells[lumen_id].V == 12500  && sim.time == (timeLumenGrowth + 250)){		//Measurement every 250MCS post max growth
			let [blIcm_TE1, blIcm_Lumen1] = this.boundaryLength()
			bltime1 = sim.time

		let data = String([this.C.conf.seed, jICM_TE, jICM_lumen, bltime1, blIcm_TE1 , blIcm_Lumen1, this.C.cells[lumen_id].V])
		measurement.push(data)
			//this.outputPNG()
		}
		/*
		if (this.C.cells[lumen_id].V == 12500  && sim.time == (timeLumenGrowth + 500)){		//Measurement every 250MCS post max growth
			let [blIcm_TE1, blIcm_Lumen1] = this.boundaryLength()
			bltime1 = sim.time

		let data = String([this.C.conf.seed, jICM_TE, jICM_lumen, bltime1, blIcm_TE1 , blIcm_Lumen1, this.C.cells[lumen_id].V])
			this.dataLogger(filepath, data)
		}
		if (this.C.cells[lumen_id].V == 12500  && sim.time == (timeLumenGrowth + 750)){		//Measurement every 250MCS post max growth
			let [blIcm_TE1, blIcm_Lumen1] = this.boundaryLength()
			bltime1 = sim.time

		let data = String([this.C.conf.seed, jICM_TE, jICM_lumen, bltime1, blIcm_TE1 , blIcm_Lumen1, this.C.cells[lumen_id].V])
			this.dataLogger(filepath, data)
		}
			if (this.C.cells[lumen_id].V == 12500  && sim.time == (timeLumenGrowth + 1000)){		//Measurement every 250MCS post max growth
			let [blIcm_TE1, blIcm_Lumen1] = this.boundaryLength()
			bltime1 = sim.time

		let data = String([this.C.conf.seed, jICM_TE, jICM_lumen, bltime1, blIcm_TE1 , blIcm_Lumen1, this.C.cells[lumen_id].V])
			this.dataLogger(filepath, data)
		}
*/

	/*
		if (this.C.cells[lumen_id].V == 12500 && boundaryLengthMeasurements < 4  && sim.time == (timeLumenGrowth + 250)){
			let [blIcm_TE4, blIcm_Lumen4] =  this.boundaryLength()
			bltime4 = sim.time
			boundaryLengthMeasurements++
			console.log("time of measurement4:", bltime4, "ICM-TE:", blIcm_TE4, "ICM-Lumen:", blIcm_Lumen4)
		} else if (this.C.cells[lumen_id].V == 12500 && boundaryLengthMeasurements < 5 && sim.time == (timeLumenGrowth + 500)){
			let [blIcm_TE5, blIcm_Lumen5] =  this.boundaryLength()
			bltime5 = sim.time
			boundaryLengthMeasurements++
			console.log("time of measurement5:", bltime5, "ICM-TE:", blIcm_TE5, "ICM-Lumen:", blIcm_Lumen5)
		}
	*/
		// Fuse the lumen into one cell id
		if (this.C.cells[lumen_id].V == 12500 && fusionCount < 1 && sim.time == (timeLumenGrowth + 251)){
			this.fusion()
			fusionCount++
			fusion_time = sim.time
		}
		// Calculate statistics on the fused ICM
		if (sim.time == (fusion_time + 1)){

			this.disconnectedness()
			for(let i of this.C.cellIDs()){
				if(this.C.cellKind(i) == 4){	
					//Output - ICM cellshape: 
					//this.C.cells[i].distortion

					//Output - ICM split up or not(1/0)
					//console.log("The shape of the ICM is now" + "\t" + this.C.cells[i].distortion)
					//this.toggleAnim()
					let data = String([this.C.conf.seed, jICM_TE, jICM_lumen, sim.time, "Shape ICM", this.C.cells[i].distortion])
					values.push(data)

					let data2 = String([this.C.conf.seed, jICM_TE, jICM_lumen, sim.time, "Disconnectedness ICM", this.C.cells[i].disconnectedness])
					values.push(data2)

					let data3 = String([this.C.conf.seed, jICM_TE, jICM_lumen, sim.time, "Volume growth % lumen",  this.C.conf["VOLSTEP"][2]])
					values.push(data3)

					let data4 = String([this.C.conf.seed, jICM_TE, jICM_lumen, sim.time, "Volume lumen", this.C.conf["V"][2]])
					values.push(data4)
				}
			}
		}	
		
		if (sim.time == (fusion_time + 2)){
			this.fusionEmbryo()
		}	
		if (sim.time == (fusion_time + 3)){
			//console.log("The final shape of the embryo is now:" + "\t" + this.C.cells[1].distortion)
			//this.toggleAnim()
			let data = String([this.C.conf.seed, jICM_TE, jICM_lumen, sim.time, "Shape Zygote", this.C.cells[1].distortion])
			values.push(data)

			// Output measurements to their respective files
			this.dataLogger(filepath, measurement)
			this.dataLogger(filepath_values, values)

		}
		
	}

		/**
		 * Count the number of cells present on the grid for one or a combination of cellkinds
		 * @param {Array} cellkinds - the cellkind of this cell, the parameters of kind are used 
		 * @return {Number}  Total number of cells for specified cellkinds
		 */ 

	function cell_number(cellkinds){
		let nr_cells = 0

		for( let i of this.C.cellIDs() ){
			for (let kind of cellkinds){

				if( this.C.cellKind(i) == kind){		
					nr_cells++
				}
			}
		}	
		return nr_cells
	}
		//let item = ["asym", "sym"], weight = [0.9, 0.1]

	// Weighted random function
	function weighted_random(item, weight){
		if (item.length != weight.length){
			throw new Error("Item and weight should have the same size!")
		}

		//Calculate cumulative weights and the maxCumWeight
		const cumWeight = []
		for (let i = 0; i < weight.length; i++){
			cumWeight[i] = weight[i] + (cumWeight[i - 1] || 0)
		}
		const maxCumWeight = cumWeight[cumWeight.length - 1]

		// Generate a pseudorandom number based on [0 : maxCumWeight], and look up the item associated
		const random_number = maxCumWeight * this.C.random()
		for (let index = 0; index < item.length; index++){
			if(cumWeight[index] >= random_number){
				return [item[index], index]
			}
		}
	}
		// Shuffle an array, algorithm is a Durstenfeld shuffle (modern Fisher-Yates shuffle)
	function arrayShuffle(array){
			for (let i = array.length - 1; i >= 1; i--){
				let j = Math.floor(this.C.random() * (i + 1));			//Math.random is not seeded!
				[array[i], array[j]] = [array[j], array[i]];
			}
			return array;
	}

	// To do:
	// fix divided cells
		const divided_cells = []
		// Calculate the number of largest cells, based on the amount of cleavage division stages 
		// that have occured (exp_division).
		let exp_division = 0
		let largest_V_slice = 2 ** exp_division

	function zygoteDivision (){	
		// add the initializer if not already there
		if( !this.helpClasses["gm"] ){ this.addGridManipulator() }
		
		let all_volumes = [] 

		// Iterating over all cells to collect cell volumes
		for( let i of this.C.cellIDs() ){
			if( this.C.cellKind( i ) == 1 ){		
				//total_cells++
				all_volumes.push(this.C.cells[i].V)
			}
		}

		// Sort largest volumes descendingly to correct for % volume deviation between cells
		// Collect slice of all volumes based on the amount of celldivisions that have taken place to mimic prevent cells from dividing faster than other cells
		let largest_V = all_volumes.sort(function(a, b){return b - a})
		let largest_Vs = largest_V.slice(0, largest_V_slice)	
		//console.log("These are the largest volumes:" + "\t" + largest_V)
		
		let largest_cells = [] 

		// Construct an array with cellIDs containing the largest volume
		for( let i of this.C.cellIDs() ){
			if ( this.C.cellKind(i) == 1 ){
				for (let j of largest_Vs){
					if ( this.C.cells[i].V == j ){
						if (!largest_cells.includes(i)){
							largest_cells.push(i)
						}
					}			
				}
			}	
		}

		let total_cells = this.cell_number([1, 3, 4])

		// Dividing function for cells with the largest volume, the function divides up to a predefined total cell number
		if( total_cells < 16 && div_time >= 100){

			let largest_cell_list = largest_cells.map( x => x ) 

			this.arrayShuffle(largest_cell_list)
			if ( this.C.random() < 0.1 ){

				// Randomly generate integer j to select cellId for cell division, also serves as local minimum time interval for division
				let j = this.C.ran(0, largest_cell_list.length - 1)
				//let random_cell = largest_cell_list[j]
				let random_cell = largest_cell_list[j]

				// Divide a cell with the highest volume, and increase nDiv for parent and daughter cellId
				let lastnewdiv = this.divideCell(random_cell)
				this.C.cells[random_cell].nDiv ++
				this.C.cells[lastnewdiv].nDiv ++

				// Add daughter cellIds to all parent cells
				for (let i = 1; i < this.C.cells[lastnewdiv].parentId.length; i++){
					let cellid = this.C.cells[lastnewdiv].parentId[i]
					this.C.cells[cellid].daughterId.push(lastnewdiv) 
				}

				// Visual check random number, chosen cellId + what cell is divided, and how this changes the largest_cells array
			//	console.log(largest_cell_list + "\t" + "all the big cells in function"+ "\t" + sim.time)
				//console.log(j + "\t" + sim.time)
			//	console.log(random_cell + "\t" + "save me"+ "\t" + sim.time)

				// contains all parent cell ids that have divided
				divided_cells.push(random_cell)

				//console.log(divided_cells)
				//console.log(largest_cells + "\t" + "before splicing me, length array is:" + "\t" + largest_cells.length)

				largest_cell_list.splice(j, 1)
				largest_V_slice --
				
			//	console.log(largest_cell_list + "\t" + "after splicing me, length array is:" + "\t" + largest_cell_list.length)

				// Reset minimum division time 
				if (largest_cell_list.length == 0){
					div_time = 0
					exp_division ++
					largest_V_slice = 2 ** exp_division
				}

				// Console log for time, all divided cellIds, cellID parent cell + target volume parent, cellID daughter cell + target volume daughter cell
				//console.log(sim.time + "\t" +  divided_cells + "\t" + random_cell + "\t" + sim.C.cells[random_cell].V + "\t" + lastnewdiv + "\t" + sim.C.cells[lastnewdiv].V )
			}		

		}
	}


		// This iterator returns coordinates and cellid for all non-background border pixels on the grid. 
		// This function creates an object with a key for each cell on the grid, and as
		// corresponding value an array with all the borderpixels of that cell. 
		// Each pixel is stored by its ArrayCoordinate.
		/**
		 @param {number} kind cellKind to calculate the borderpixels of
		*/ 
	function borderPixelCounter(kind){

		let cellborderpixels = {}
			
		for( let [arraycoord,id] of this.C.cellBorderPixels() ){
			if (this.C.cellKind(id) == kind ){
				if( !cellborderpixels[id] ){
					cellborderpixels[id] = [arraycoord]
				} else {
					cellborderpixels[id].push( arraycoord )
				}
			}
		}
		return cellborderpixels
		//console.log(cellborderpixels)
	}

		// Counts the number of unique background borderpixels for every cellId with cellKind == 1
	function backgroundBorderpixelCounter(cellborderpixels){

		/** This function computes a list of all pixels that border on cells and belong to the background.
			@param {CellId} cellid the unique cell id of the cell to get neighbors from.
			@param {CellArrayObject} cellborderpixels object produced by {@link BorderPixelsByCell}, with keys for each cellid
			and as corresponding value the border pixel indices of their pixels.
			@returns {CellObject} a dictionairy with keys = neighbor cell ids, and 
			values = number of neighbor cellpixels at the border.
		*/
				
		let neigh_borderpixels = {}
		
		//loop over all cellIds' borderpixels to identify pixels with a neighbouring background pixel to calculate the perimeter of the cell cluster
		//this assumes that there are no interior borderpixels within the cleavage stage that neighbour with background pixels
		for (let cellid in cellborderpixels){
			neigh_borderpixels[cellid] = []
			let cbp = cellborderpixels[cellid]

			//loop over border pixels of cell
			for ( let cellpix = 0; cellpix < cbp.length; cellpix++ ) {

				//get neighbouring pixels of borderpixel of cell
				let neighbours_of_borderpixel_cell = this.C.neigh( cbp[cellpix] )

				//loop over neighbouring pixels and identify cellId and index belonging to neighbour pixel (ArrayCoordinate) 
				for ( let neighborpix of neighbours_of_borderpixel_cell ) {
					let neighbor_id = this.C.pixt( neighborpix )
					let neigh_index = this.C.grid.p2i(neighborpix)

					// Add all unique background pixels to an array with length of the array as a proxy for the perimeter.
					if (neighbor_id == 0) {
						if( !neigh_borderpixels[cellid].includes(neigh_index) ){
							neigh_borderpixels[cellid].push(neigh_index)
						}
					}
				}
			}
		}
		return neigh_borderpixels
	}


	// Count the total number of background pixels that border on the developing structure
	function perimeterCounter(neigh_borderpixels){
		let perimeter = 0

		for (let cellid in neigh_borderpixels){
			perimeter = perimeter + neigh_borderpixels[cellid].length	
		}
		//console.log(neigh_borderpixels)
		//console.log( sim.time + "\t" + "The number of background borderpixels making up the perimeter is:" + "\t" + perimeter)
		return perimeter

		// Writing output to text file for further visualization
		// Time, the seed, number of cells, perimeter pixel number, adhesion to background, adhesion between blastomeres
		const data = String([sim.time, this.C.conf.seed, this.cell_number(), perimeter, [this.C.conf["J"][0][1]], [this.C.conf["J"][1][1]]])

	/*
		fs.appendFileSync(filepath, data + "\n", 'utf8', (err) => {
			if (err) {
				console.error('Error writing file:', err);
				return;
			} 
		})

	*/
	}

		// Divide ICM cells post-cavitation to incorporate a volume difference with TE cells (since blastomeres are the same size as TE)
		// Input is an array of ICM cells
	function cellDivision(idArray){

		if (this.C.random() < 0.01){
			//console.log("these are the ICM cells still able to divide pre-shuffle:", idArray)
			idArray = this.arrayShuffle(idArray)
			let id = idArray[0]
			let cell = this.C.cells[id]

			//Additional check if the id belongs to an ICM cell and to prevent undefined id inputs
			if (this.C.cellKind(id) == 4){	

				// Divide a cell and increase nDiv for parent and daughter cellId
				let lastnewdiv = this.divideCell(id)
				cell.nDiv ++
				cell.avgDistortion = 0
				this.C.cells[lastnewdiv].nDiv ++
				this.C.cells[lastnewdiv].avgDistortion = 0

				// Add daughter cellIds to all parent cells, by looping over the parent cell
				// and adding the daughter ID to each one
				for (let i = 1; i < this.C.cells[lastnewdiv].parentId.length; i++){
					let cellid = this.C.cells[lastnewdiv].parentId[i]
					this.C.cells[cellid].daughterId.push(lastnewdiv) 
				}
				// Change idArray after divisions
				idArray.splice(0, 1)
				//console.log(sim.time + "\t" + id + "\t" + cell.V + "\t" + lastnewdiv + "\t" + sim.C.cells[lastnewdiv].V
				//+ "\t" + "Cellkind:" + "\t" + this.C.cellKind(cell.id))
				//console.log("these are the ICM cells still able to divide: post-shuffle/selection", idArray)
				
			}
		}
		return idArray
		
	}


		// Increase the target volume and perimeter of all cells on the grid
		// Cell divides once it has grown to 1.75-2.25x its initial size
		// Count TE cells to be divided + total nr TE cells < Global desired number of TE cells for cell division

	function cellGrowth(){
		let te_cells = this.cell_number([3]), te_cells_tbd = 0
		for (let i of this.C.cells){
			if (i.divisionState == "Yes"){
				te_cells_tbd++
			}
		}

		for (let i of this.C.cellIDs()){
			if (typeof i === "string"){
				i = Number(i)
			}
			let cell = this.C.cells[i]
	//this.C.cellKind(i) == 4 || 
			if ((this.C.cellKind(i) == 3) && cell.avgDistortion > 4.5){
				// An elongated cell shape increases the chance of cellgrowth and mitosis
				let random = 0.01 * cell.avgDistortion
				// Assign a max volume of 1.25-1.75x to each cell, as a volume target for division
					
				if (this.C.random() < random && cell.maxVol == 0 && (te_cells + te_cells_tbd) < global_total_TE){
					cell.maxVol = this.C.ran(175, 225) / 100
					cell.divisionState = "Yes"
				}
			}
				if (cell.V >= (cell.maxVol * cell.initialV) && cell.maxVol > 0){
						// Divide a cell and increase nDiv for parent and daughter cellId
						// Also reset the maxVol and avgDistortion for each cell
						let lastnewdiv = this.divideCell(i)
						cell.nDiv ++
						cell.maxVol = 0
						cell.avgDistortion = 0
						cell.divisionState = "No"

						this.C.cells[lastnewdiv].nDiv ++
						this.C.cells[lastnewdiv].maxVol = 0
						this.C.cells[lastnewdiv].avgDistortion = 0
						this.C.cells[lastnewdiv].divisionState = "No"

						// Add daughter cellIds to all parent cells, by looping over the parent cell
						// and adding the daughter ID to each one
						for (let i = 1; i < this.C.cells[lastnewdiv].parentId.length; i++){
							let cellid = this.C.cells[lastnewdiv].parentId[i]
							this.C.cells[cellid].daughterId.push(lastnewdiv) 
						}
						//console.log(sim.time + "\t" + i + "\t" + cell.V + "\t" + lastnewdiv + "\t" + sim.C.cells[lastnewdiv].V
						//	+ "\t" + "Cellkind:" + "\t" + this.C.cellKind(cell.id))
					

				} else if (cell.V < (cell.maxVol * cell.initialV) && cell.maxVol > 0) {
				// Constant increase of cell volume and perimeter based on value just after division
				// Minimum division time is inherently included by VOLSTEP/PERSTEP percentages	
					if (cell.V-this.C.getVolume(i) < this.C.conf["VOLCHANGE_THRESHOLD"]){
						cell.V += cell.initialV * this.C.conf["VOLSTEP"][cell.kind]
						cell.P += cell.initialP * this.C.conf["PERSTEP"][cell.kind]
					} 	
				}
		}
	}


		// Cellgrowth and celldivision through increasing the target volume and perimeter of cells.
		// Being able to grow is randomly decided, in addition to customizable conditionals.
		// Cell divides once it has grown to [a, b] * the initial size, where a < b.
		// The number of cells than can divide is specified through global variables global_total_TE & global_total_ICM
		// note: this function is designed for the use of the birth function belonging to the blastomeres class for the TE cells.

	function newCellDivision(){
		// Count the number of TE/ICM cells present on the grid
		let te_cells = this.cell_number([3]), te_cells_tbd = 0
		let icm_cells = this.cell_number([4]), icm_cells_tbd = 0
		let lumen_id 

		// Count the number of TE/ICM cells that are currently dividing
		// Includes a check so that this function does not throw an error post-fusion/disconnectedness measurement
		for (let i of this.C.cellIDs()){
			if (typeof i === 'undefined'){
				return
			} else if(this.C.cellKind(i) == 2){		
				lumen_id = i
			} else if (this.C.cells[i].divisionState == "Yes" && this.C.cellKind(i) == 3){
				te_cells_tbd++
			} else if (this.C.cells[i].divisionState == "Yes" && this.C.cellKind(i) == 4){
				icm_cells_tbd++
			}
		}

		for (let i of this.C.cellIDs()){
			let cell = this.C.cells[i]

			// Assign a maxVolume to cells based on a random function influenced by the cellshape. 
			// With the option to add extra conditionals for division (see avgDistortion requirement TE cells).
			if (this.C.cellKind(i) == 3 && cell.avgDistortion > 5 && this.C.cells[lumen_id].V > 2500){ 		
				// An elongated cell shape increases the chance of cellgrowth and mitosis
				let random = 0.001 * cell.avgDistortion		
				if (this.C.random() < random && cell.maxVol == 0 && (te_cells + te_cells_tbd) < global_total_TE){
					cell.maxVol = this.C.ran(175, 225) / 100
					cell.divisionState = "Yes"
					te_cells_tbd++
				}
			} else if (this.C.cellKind(i) == 4 && this.C.cells[lumen_id].V > 5000 && icmDivisionArray.length == 0){		
				let random = 0.001 * cell.avgDistortion				
				if (this.C.random() < random && cell.maxVol == 0 && (icm_cells + icm_cells_tbd) < global_total_ICM){
					cell.maxVol = this.C.ran(125, 150) / 100
					cell.divisionState = "Yes"
					icm_cells_tbd++
				}
			}

			if (cell.maxVol != 0 && this.C.cellKind(cell.id) != 2){
			// Cell is able to divide when maxVol is reached
				if (cell.V >= (cell.maxVol * cell.initialV)){
						let lastnewdiv = this.divideCell(i)
						cell.nDiv ++
						cell.maxVol = 0
						cell.avgDistortion = 0
						cell.divisionState = "No"

						this.C.cells[lastnewdiv].nDiv ++
						this.C.cells[lastnewdiv].maxVol = 0
						this.C.cells[lastnewdiv].avgDistortion = 0
						this.C.cells[lastnewdiv].divisionState = "No"

						// Add daughter cellIds to all parent cells
						for (let i = 1; i < this.C.cells[lastnewdiv].parentId.length; i++){
							let cellid = this.C.cells[lastnewdiv].parentId[i]
							this.C.cells[cellid].daughterId.push(lastnewdiv) 
						}
						//console.log("newCellDivision function:")
						//console.log(sim.time + "\t" + cell.id + "\t" + cell.V + "\t" + lastnewdiv + "\t" + sim.C.cells[lastnewdiv].V 
						//+ "\t" + "Cellkind:" + "\t" + this.C.cellKind(cell.id))
					
				} // Cell grows if maxVol is not yet reached (constant increase of cell volume and perimeter)
				else if (cell.V < (cell.maxVol * cell.initialV)){	
					if (cell.V-this.C.getVolume(i) < this.C.conf["VOLCHANGE_THRESHOLD"]){
						cell.V += cell.initialV * this.C.conf["VOLSTEP"][cell.kind]
						cell.P += cell.initialP * this.C.conf["PERSTEP"][cell.kind]
					} 	// this.C.cellKind(cell.id) != 4 && for ICM 1stdivision when blastocoel is formed (ICM smaller?)
				}
			}	
		}
	}


		// Lumen grows every MCS by VOLSTEP / PERSTEP
	function lumenGrowth(maxVol = 12500){
		for( let i of this.C.cellIDs() ){
			if( this.C.cellKind(i) == 2 ){
				let cell = this.C.cells[i]
				if (cell.maxVol == 0){
					cell.maxVol = maxVol
				}

				if (cell.V < cell.maxVol){
				// Constant increase of cell volume and perimeter based on value just after division
				// Minimum division time is inherently included by VOLSTEP/PERSTEP percentages	
					if (cell.V-this.C.getVolume(i) < 10){
						cell.V += cell.initialV * this.C.conf["VOLSTEP"][cell.kind]
						cell.P += cell.initialP * this.C.conf["PERSTEP"][cell.kind]
					} 	
				}
				/*
				if (cell.V >= (cell.maxVol * cell.initialV)){
					// Divide a cell and increase nDiv for parent and daughter cellId
					// Also reset the maxVol for each cell
					if (this.C.random() < 0.1){
						this.divideCell(i)
					}
				}	
				*/	
			}		
		}
	}

	// Change the adhesion perimeters for blastomere cells to mimic compaction, at n = 6 blastomeres
	function compaction(){
		let nr_cells = this.cell_number([1])

		//Change all J parameters in conf to increase compaction
		if (nr_cells == 6) {
			for( let i of this.C.cellIDs() ){
				if( this.C.cellKind( i ) == 1 ){		
					this.C.cells[i].conf["J"][0][1] = this.C.cells[i].conf["J"][1][0] = 80 
				}
			}
		}	
	}

		// Loop over all unique pixel ids for each cellId and assign a polarization Yes/No value based on the localization of the cell in the embryo. 
		// Polarization occurs gradually for the outer cells similar to asynchronous polarization in vivo
	function polarization(){
		let bg_borderpixels = this.backgroundBorderpixelCounter(this.borderPixelCounter(1))

		for (let cellid of Object.keys(bg_borderpixels)){
			//console.log(bg_borderpixels[cellid])
			if (bg_borderpixels[cellid].length > 0 ){
				if (this.C.cells[cellid].Polarized == "Apolar" || this.C.cells[cellid].Polarized == "not yet"){
					if (this.C.random() < 0.03){
						this.C.cells[cellid].Polarized = "Polar"
					}
				}
			}
			// Asymmetrically divided and subsequently internalized cells get reassigned to the Apolar class
			if (bg_borderpixels[cellid].length == 0 && this.C.cells[cellid].Polarized == "Polar"){
				this.C.cells[cellid].Polarized = "Apolar"
			}
		}
	}

		// Reassign internalized TE cells to Apolar and change their class to ICM after a specific MCS period
		// Output is the changed cellId
	function lineageSwitch(){
		
		let bg_borderpixels_te = this.backgroundBorderpixelCounter(this.borderPixelCounter(3))
		for (let cellid of Object.keys(bg_borderpixels_te)){
			if (bg_borderpixels_te[cellid].length == 0 && this.C.cells[cellid].Polarized == "Polar"){
				this.C.cells[cellid].internalCounter++
			}

			// Asymmetrically divided and subsequently internalized cells get reassigned to the Apolar class
			if (bg_borderpixels_te[cellid].length == 0 && this.C.cells[cellid].internalCounter > 200){
				this.C.cells[cellid].Polarized = "Apolar"
				this.C.cells[cellid].newCellID(cellid, 4)
				//console.log("Converted cellid" + "\t" + cellid + "\t" + "from TE to ICM following a period of internalization.")
				return cellid
			}
		}
	}


		// Measure the circularity of the cell shape (distortion) for each cell
	function cellShape(id){
		let C = this.C
		let cp = C.getStat( CPM.PixelsByCell )[id], com = C.getStat( CPM.Centroids )[id]			//CPM. since we are calling from the CELL class
		let bxx = 0, bxy = 0, byy=0, cx, cy, x2, T, D, x1, y1, L2, L1, shape

		// Loop over the pixels belonging to this cell
		for( let j = 0 ; j < cp.length ; j ++ ){
			cx = cp[j][0] - com[0] // x position rel to centroid
			cy = cp[j][1] - com[1] // y position rel to centroid

			// sum of squared distances:
			// Covariance matrix [[Bxx, Bxy][Bxy, Byy]]
			bxx += cx*cx
			bxy += cx*cy
			byy += cy*cy
		}

		// Characteristic polynomial of a 2x2 matrix:
		// f(L) = L * L - (Trace(M))L + Determinant(M), where M = matrix, L = eigenvalues
		T = bxx + byy						//Trace of the covariance matrix
		D = bxx*byy - bxy*bxy				//Determinant of the covariance matrix

		L1 = T/2 + Math.sqrt(T*T/4 - D)			// Calculate the eigenvalue with a higher magnitude
		L2 = T/2 - Math.sqrt(T*T/4 - D)			// Calculate eigenvalue with a lower magnitude

		x1 = L2 - byy							// Eigenvector x coordinate (direction) corresponding to the smaller eigenvalue L2
		x2 = L1 - byy							// Eigenvector x coordinate (direction) corresponding to the larger eigenvalue L1

		// Calculate the major/minor axis distortion parameter to measure cell shape
		shape = L1 / L2
		//console.log(id + "\t" + "shortest axis x1:" + "\t" + L2 + "longest axis x2:" + "\t" + L1 )
		let distortion = this.C.cells[id].distortion
		distortion.push(shape) 
		
		// Calculate the average distortion every 50 MCS
		if (distortion.length == 50){
			let avg_distortion = 0
			for (let i of distortion){
				avg_distortion += i 
			}
			avg_distortion = avg_distortion / 50
			this.C.cells[id].avgDistortion = avg_distortion
			this.C.cells[id].distortion = []
		}
	}

	function divideCell(id){
	// Standard CPM function, non-modified
		let C = this.C
		let torus = C.conf.torus.indexOf(true) >= 0
		if( C.ndim != 2 || torus ){
			throw("The divideCell methods is only implemented for 2D non-torus lattices yet!")
		}
		let cp = C.getStat( CPM.PixelsByCell )[id], com = C.getStat( CPM.Centroids )[id]			//CPM. since we are calling from the CELL class
		let bxx = 0, bxy = 0, byy=0, cx, cy, x2, y2, side, T, D, x0, y0, x1, y1, L2

		if (typeof cp === 'undefined'){
			return console.log("Cellid is undefined")
		}

		// Loop over the pixels belonging to this cell
		for( let j = 0 ; j < cp.length ; j ++ ){
			cx = cp[j][0] - com[0] // x position rel to centroid
			cy = cp[j][1] - com[1] // y position rel to centroid

			// sum of squared distances:
			// Covariance matrix [[Bxx, Bxy][Bxy, Byy]]
			bxx += cx*cx
			bxy += cx*cy
			byy += cy*cy
		}

		// This code computes a "dividing line", which is perpendicular to the longest
		// axis of the cell.
		if( bxy == 0 ){
			x0 = 0
			y0 = 0
			x1 = 1
			y1 = 0
		} else {
			T = bxx + byy						//Trace of the covariance matrix
			D = bxx*byy - bxy*bxy				//Determinant of the covariance matrix

			// Characteristic polynomial of a 2x2 matrix:
			// f(L) = L * L - (Trace(M))L + Determinant(M), where M = matrix, L = eigenvalues
			//L1 = T/2 + Math.sqrt(T*T/4 - D)		// Change to x1 = L1 - byy to calculate the eigenvalue with a higher magnitude, and thus the eigenvector in the direction of the largest variance

			L2 = T/2 - Math.sqrt(T*T/4 - D)			// L - Characteristic polynomial of a 2x2 matrix, solved for eigenvalue(lambda, or L)
			x0 = 0
			y0 = 0
			x1 = L2 - byy							// Eigenvector x coordinate (line) corresponding to the smaller eigenvalue L2
			y1 = bxy								// Eigenvector y coordinate
		}
		// console.log( id )
		// create a new ID for the second cell
		
		let nid = C.makeNewCellID( C.cellKind( id ))
		if (C.hasOwnProperty("cells")){			//check if cells class is used
			C.birth( nid, id )					//birth function from CPMEvol class extention
		}
		
		// Loop over the pixels belonging to this cell
		//let sidea = 0, sideb = 0
		//let pix_id = []
		//let pix_nid = []
		//let sidea = 0, sideb=0

		for( let j = 0 ; j < cp.length ; j ++ ){
			// coordinates of current cell relative to center of mass
			x2 = cp[j][0]-com[0]
			y2 = cp[j][1]-com[1]

			// Depending on which side of the dividing line this pixel is,
			// set it to the new type
			side = (x1 - x0)*(y2 - y0) - (x2 - x0)*(y1 - y0)
			if( side > 0 ){
				//sidea++
				C.setpix( cp[j], nid ) 
				// console.log( cp[j] + " " + C.cellKind( id ) )
				//pix_nid.push( cp[j] )
			} else {
				//pix_id.push( cp[j] )
				//sideb++

			}
		}
		//console.log( "3 " + C.cellKind( id ) )
		//cp[id] = pix_id
		//cp[nid] = pix_nid
		C.stat_values = {} // remove cached stats or this will crash!!!
		return nid
	}

		//Initialize lumen formation by seeding a lumen at the morula stage
	function cavitation(){
		let bicellular_borderpixels = [], bicellular_neighbours = []
		let multicellular_borderpixels = [], multicellular_neighbours = []
		let cbpTE = this.borderPixelCounter(3)
		let cbpICM = this.borderPixelCounter(4)

		let cellborderpixels = {...cbpTE, ...cbpICM}
		//console.log(cellborderpixels)
		//loop over all cellIds' borderpixels to identify pixels with a neighbouring background pixel 
		for (let cellid in cellborderpixels){
			let cbp = cellborderpixels[cellid]

			//loop over border pixels of cell
			for ( let cellpix = 0; cellpix < cbp.length; cellpix++ ) {

				//get the neighbouring pixels of each borderpixel in array coordinates
				let neighbours_of_borderpixel_cell = this.C.neigh(cbp[cellpix])
				let borderpixId = this.C.pixt(cbp[cellpix])				//cell Ids of borderpixels
				let borderpixIndex= this.C.grid.p2i(cbp[cellpix])		//Index coordinates of borderpixels

				let unique_ids = [], te_ids = 0, icm_ids = 0
				//loop over all neighbouring pixels and identify cellId and index belonging to neighbour pixel (Index Coordinate) 
				for (let neighborpix of neighbours_of_borderpixel_cell) {
					let neighbor_id = this.C.pixt( neighborpix )
					
					// Compares pixel values (cellIds) of neighbour pixels to the center pixel
					// Resulting from selecting all neighbouring borderpixels, this will always be atleast 2 unique ids (own cell and neighbouring cell). 
					// If this is 3 or more unique cellids, you have found a multicellular intersection, else a bicellular intersection.
					// This selection ignores multicellular junctions with the background
					if (neighbor_id != 0 && !unique_ids.includes(neighbor_id)) {
						unique_ids.push(neighbor_id)
					}
					// An extra selection is included that excludes ICM-ICM-ICM junction seeding location for blastocoel
					if (this.C.cellKind(neighbor_id) == 4){
						te_ids++
					} else if (this.C.cellKind(neighbor_id) == 3){
						icm_ids++
					}
				}	
				// Add an array of the borderpixel's neighbouring pixels (with their IndexCoordinate through neighi()) to an object with 
				// the borderpixel's index coordinate as a key. 
				let neigh_borderpixIndex = this.C.neighi(borderpixIndex)

				// Loop over the array of neighbouring borderpixels located in the object.
				// Exclude borderpixels if one of their neighbourpixels is already present somewhere in the object.
				if (unique_ids.length == 2 && te_ids >= 1 && icm_ids >= 1){
					for (let neigh_pix of neigh_borderpixIndex){
						if( !bicellular_neighbours.includes(neigh_pix) ){
							bicellular_neighbours.push(neigh_pix)
							if (!bicellular_borderpixels.includes(borderpixIndex)){
								bicellular_borderpixels.push(borderpixIndex)
							}
						}
					}
				} else if (unique_ids.length >= 3 && te_ids >= 1 && icm_ids >= 1){
					for (let neigh_pix of neigh_borderpixIndex){
						if( !multicellular_neighbours.includes(neigh_pix) ){
							multicellular_neighbours.push(neigh_pix)
							if (!multicellular_borderpixels.includes(borderpixIndex)){
								multicellular_borderpixels.push(borderpixIndex)
							}
						}
					}		
				}
			}
		}
	
		// Total seeding points: --> To do: make this scale with selecting indices?
		//console.log(bicellular_borderpixels)
		//console.log(multicellular_borderpixels)
		
		// Randomly select several indices to seed lumen at, and collect their array coordinates. 
		// The variable in the while loops indicates the number of lumens that you want to seed.
		let seedingCoordinates = []
		let sample, seeding_method, nr_lumen = 0
		let method = this.C.ran(0, 1)
		
		if (method == 0){
			seeding_method = bicellular_borderpixels
			//console.log("bicellular lumen")
		} else if (method == 1){
			seeding_method = multicellular_borderpixels
			//console.log("multicellular lumen")
		}

		while (nr_lumen < 1){
			sample = this.C.ran(0, (seeding_method.length - 1))
			seedingCoordinates.push(this.C.grid.i2p(seeding_method[sample]))
			nr_lumen++
		}
		//console.log(sim.time,"The lumen has been seeded at:", seedingCoordinates)

		let data = String([this.C.conf.seed, jICM_TE, jICM_lumen, sim.time, "Seeding method", method])
		values.push(data)

		// Loop over the randomly sampled array coordinates and seed them on the grid
		for (let coordinate of seedingCoordinates){
			this.gm.seedCellAt(2, coordinate)   
		}

		// Allow the function to only be called once
		//this.cavitation = function(){}
	}


		// This function groups all ICM cells together into 1 cellId 
	function fusion(){
		let connection = this.C.getStat(CPM.ConnectedComponentsByCell)
		//console.log("ConnectedComponentsbyCell", connection)
		let connection_filtered = {}

		let icm_cellids = []
		for (let i of this.C.cellIDs()){
			if (this.C.cellKind(i) == 4){
				icm_cellids.push(i)
			}
		}

		// Convert all ICM cells into 1 ICM cell by assigning their pixels to the ICM cell with the lowest cellId
		let icm_id = icm_cellids[0]
		for (let id of icm_cellids){
			if (id != icm_id){
				let cp = this.C.getStat(CPM.PixelsByCell)[id]

				// Calculate volume and perimeter of the ICM cell after fusion
				let total_V = this.C.cells[icm_id].V + this.C.cells[id].V
				let total_P = this.C.cells[icm_id].P + this.C.cells[id].P

				this.gm.assignCellPixels(cp, 4, icm_id)

				this.C.cells[icm_id].V = total_V
				this.C.cells[icm_id].P = total_P
			}
		}

		// Reset the distortion values to calculate the final shape of the ICM through this.disconnectedness()
		//  Post-fusion measurements cannot happen in the same MCS as the fusion event
		this.C.cells[icm_id].distortion = []
		this.C.cells[icm_id].avgDistortion = 0
	}

	// Calculate the final circularity of the embryo
	function fusionEmbryo(){
		let remaining_cells = []
		for (let i of this.C.cellIDs()){
			remaining_cells.push(i)
		}
		let finalId = remaining_cells[0]
		for (let id of remaining_cells){
			if (id != finalId){
				let cp = this.C.getStat(CPM.PixelsByCell)[id]

				// Calculate volume and perimeter of the ICM cell after fusion
				let total_V = this.C.cells[finalId].V + this.C.cells[id].V
				let total_P = this.C.cells[finalId].P + this.C.cells[id].P

				this.gm.assignCellPixels(cp, 4, finalId)

				this.C.cells[finalId].V = total_V
				this.C.cells[finalId].P = total_P
			}
		}
		this.C.cells[finalId].distortion = []
		this.C.cells[finalId].avgDistortion = 0
	}

		// Identify if the ICM is intact at a specific point during the simulation
	function disconnectedness(){
		let connection = this.C.getStat(CPM.ConnectedComponentsByCell)
		//console.log(connection)
		let connection_filtered = {}
		let icm_cellids = []
		// Identify ICM cell id	
		for (let i of this.C.cellIDs()){
			if (this.C.cellKind(i) == 4){
				icm_cellids.push(i)
			}
		}
		let icm_id = icm_cellids[0]

		// Filter connected components for ICM cell id(s) 
		for (let cellid of Object.keys(connection)){
			if (icm_id == cellid){
				connection_filtered[cellid] = connection[cellid]	
			}
		}
		
		// Check if the ICM is in one piece or not
		if (connection_filtered[icm_id].length > 1){
			//console.log("ICM is split")
			this.C.cells[icm_id].disconnectedness = 1
		}
		//console.log(connection_filtered)
		//console.log("Volume of the ICM is:", this.C.cells[icm_id].V )

	}

		// Used for subsetting an object for a specified list of keys
		/**  
		 * @param {Object} sourceObject - the Object that has to be subsetted
		 * @param {Array} keys - an array of keys also present in sourceObject
		 * @return {Object} subsetObject - sourceObject with only key : value pairs if key in keys
		**/
		// Input sourceObject: Object
	function objectSubsetter(sourceObject, keys){
		const newObject = {}
		keys.forEach(key => {newObject[key] = sourceObject[key]})
		return newObject
	}

	// Calculate the boundary length between the ICM - TE and the ICM - lumen
	function boundaryLength(){
		let icm_id = [], te_id = [], lumen_id
		let boundaryObject = this.C.getStat(CPM.CellNeighborList)
		//console.log(boundaryObject)

		for (let cell of this.C.cellIDs()){		
			if (this.C.cellKind(cell) == 4){
				icm_id.push(cell)
			} 
			if (this.C.cellKind(cell) == 3){
				te_id.push(cell)
			} 	
			if (this.C.cellKind(cell) == 2){
				lumen_id = cell
			} 		
		}

		let ICM_boundary = {}
		let ICM_boundary_TE = [], ICM_boundary_TE_value = 0
		let ICM_boundary_lumen = [], ICM_boundary_lumen_value = 0
		//console.log("this is icm id", icm_id)
		//console.log("this is lumen id:", lumen_id)
		//console.log("this is te id:", te_id)

		// Filter boundary object for ICM cells only and loop over these cells' boundaries
		ICM_boundary = objectSubsetter(boundaryObject, icm_id)
		//console.log("this is icm boundary", ICM_boundary)	

		for (const [key, value] of Object.entries(ICM_boundary)){
			//console.log("1st for loop key:", key, "value:", value)

			//Iterate over the object containing boundary lengths with each cellID and sum the boundary length with TE or lumen
			for (const [cellid, length] of Object.entries(value)){
					//console.log("2nd for loop key:", cellid, "value:", length)
				if (te_id.includes(cellid)){
					ICM_boundary_TE.push(length)			//Sanity check: length of this array should correspond to visual interactions
					ICM_boundary_TE_value += length
				} else if (cellid == lumen_id){	
					ICM_boundary_lumen.push(length)
					ICM_boundary_lumen_value += length
				}
			}	
		}
		//console.log("this is icm boundary", ICM_boundary)
		//console.log("Boundary ICM with te", ICM_boundary_TE, "value:", ICM_boundary_TE_value)
		//console.log("Boundary ICM with lumen", ICM_boundary_lumen, "value:", ICM_boundary_lumen_value)

		return [ICM_boundary_TE_value, ICM_boundary_lumen_value]
	}



	// Custom drawing function 
	function drawCanvas(){
		// Add the canvas if required
		if( !this.helpClasses["canvas"] ){ this.addCanvas() }

		// Clear canvas
		this.Cim.clear( this.conf["CANVASCOLOR"] || "FFFFFF" )
		let nrcells=this.conf["NRCELLS"], cellborders = this.conf["SHOWBORDERS"]

		// Loop over all cell types and colour them + their borders
		for(let cellkind = 0; cellkind < nrcells.length; cellkind ++ ){
			if (cellkind == 0){
				this.Cim.drawCells( cellkind + 1, "000000")
			}else if (cellkind == 1){
				this.Cim.drawCells( cellkind + 1, "4169E1")
			} else if (cellkind == 2){
				this.Cim.drawCells( cellkind + 1, "6F2DA8")
			} else if (cellkind == 3){
				this.Cim.drawCells( cellkind + 1, "ED7117")
			}
		}	
			// Specific cell Id visualization (requires specific cell Id input on Lineage Trace Cell Id <input>)
			// Allows for the visualization of multiple cellIds
			// Error catcher is included for when the cell Id does not yet exist
			try {	
				if (sim.C.trace_cellid[0] > 0 || sim.C.trace_cellid.length > 1){
					for(let cell of sim.C.trace_cellid){
						sim.Cim.drawPixelSet( sim.C.getStat(CPM.PixelsByCell)[Object.keys(sim.C.cells)[cell]], "00FF00") 
					}	
				}
			} catch (err){
				//console.log("Cell Id input error")
			}

			// Daughter cell Id visualization  (requires checkbox on html to be checked)
			// Error catcher is included for when the cell Id does not yet exist	
			try {
				if (sim.drawDaughterColors){
					for (let cell of sim.C.trace_cellid){
						let daughters = this.C.cells[cell].daughterId 
						for (let i of daughters){
							i = i.toString()
							sim.Cim.drawPixelSet( sim.C.getStat(CPM.PixelsByCell)[Object.keys(sim.C.cells)[i]], "00FF00" ) 
						}
					}	
				}
			} catch (err){
				//console.log("Cell Id does not exist or cannot be visualized")
			}

			// Polarization visualization (requires checkbox on html to be checked)
			// Error catcher is included for when polarization has not yet occured 		
			try {
				if (sim.drawPolarColors){
					for (let i of this.C.cellIDs()){
						i = i.toString()
						if (sim.C.cells[i].Polarized == "Polar"){
							sim.Cim.drawPixelSet( sim.C.getStat(CPM.PixelsByCell)[Object.keys(sim.C.cells)[i]], "40E0D0" ) 
						}
					}
				}
			} catch (err){
				//console.log("Cell Id does not exist or cannot be visualized")
			}

			// Draw cell borders if required for all cellkinds
			for( let cell = 0; cell < nrcells.length; cell ++ ){
				if ( cellborders[cell] && cell == 0 ){
					this.Cim.drawCellBorders( cell + 1, "c30101" )
				}	else if ( cellborders[cell] && cell == 1 ){
				this.Cim.drawCellBorders( cell + 1, "151B54" )
				}	else if ( cellborders[cell] && cell == 2 ){
				this.Cim.drawCellBorders( cell + 1, "c30101" )
				}	else if ( cellborders[cell] && cell == 3 ){
				this.Cim.drawCellBorders( cell + 1, "c30101" )
				}
			}
	}


	// Toggle functions for checkboxes necessary for visualization
	// Checkboxes are mutually exclusive
	function changeColor(){
		sim.drawDaughterColors = !sim.drawDaughterColors

		const checkbox = document.getElementById("polarize")
		if (checkbox.checked){
			checkbox.checked = !checkbox.checked 
			sim.drawPolarColors = !sim.drawPolarColors

		}
	}

	function changePolarColor(){
		sim.drawPolarColors = !sim.drawPolarColors

		const checkbox = document.getElementById("trace_daughter")
		if (checkbox.checked){
			checkbox.checked = !checkbox.checked
			sim.drawDaughterColors = !sim.drawDaughterColors
	
		}
	}	

	function resetButton(){
		sim.C.reset()
		const canvas = document.querySelector('canvas');
		if (canvas) {
			canvas.remove();
		}
		initialize()
	}



	function logStats(){
		// count the cell IDs currently on the grid:
		let nrcells = 0
		for( let i of this.C.cellIDs() ){
			nrcells++
		}
		console.log( this.time + "\t" + nrcells )
	}

	// Node.js specific: Write input data to a .txt file specified in filepath
	
	/** The constructor of class Blastomere.
	 * @param {string} filepath - The output filepath
	 *  @param {array} data - An array containing strings that will be synchroneously written to a file located in filepath
	 * */
	function dataLogger(filepath, data){
		for (let string of data){
			fs.appendFileSync(filepath, string + "\n", 'utf8', (err) => {
				if (err) {
					console.error('Error writing file:', err);
					return;
				} 
			})
		}
	}

	// Node.js specific: IMG saver to call at specific events in the simulation
	function outputPNG(){
		if (this.mode == "node"){
			this.drawCanvas()
			let outpath = this.conf["SAVEPATH"], expname = this.conf["EXPNAME"] || "mysim"
			this.Cim.writePNG( outpath +"/" + expname + "-t"+this.time+".png")
		}
	}

	function run(){
			while( this.time < this.conf["RUNTIME"] ){
			
				this.step()
				div_time++
			}
	}
		
	sim.run()

}
