
function initialize(){
	 /* 	The following functions are defined below and will be added to
	 	the simulation object. If Custom-methods above is set to false,
	 	this object is ignored and not used in the html/node files. */
	 let custommethods = {
	 	initializeGrid : initializeGrid,
	 	drawOnTop: drawOnTop
	 }
	sim = new CPM.Simulation( config, custommethods )
    let pconstraint = new CPM.PersistenceConstraint( 
        {
            // PersistenceConstraint parameters
            LAMBDA_DIR: [0,100,100], 				// PersistenceConstraint importance per ck
            PERSIST: [0,.7,0.2]						// Weight of the persistent direction in the
            // computation of the new direction per cellkind
    } )
    sim.C.add( pconstraint )

	meter = new FPSMeter({left:"auto", right:"5px"})
	step()
}

function step(){
	sim.step()
	meter.tick()
	if( sim.conf["RUNTIME_BROWSER"] == "Inf" | sim.time+1 < sim.conf["RUNTIME_BROWSER"] ){
		requestAnimationFrame( step )
	}
}

// This is the same as the basic initializeGrid() function, but now we
// also allow each cell to have a small burnin period just after seeding.
function initializeGrid(){
	
	// add the GridManipulator if not already there and if you need it
	if( !this.helpClasses["gm"] ){ this.addGridManipulator() }
	
	
	// CHANGE THE CODE BELOW TO FIT YOUR SIMULATION
	
	let nrcells = this.conf["NRCELLS"], cellkind, i
		
	// Seed the right number of cells for each cellkind
	for( cellkind = 0; cellkind < nrcells.length; cellkind ++ ){
			
		for( i = 0; i < nrcells[cellkind]; i++ ){
			// first cell always at the midpoint. Any other cells
			// randomly.				
			if( i == 0 ){
				this.gm.seedCellAt( cellkind+1, this.C.midpoint )
			} else {
				this.gm.seedCell( cellkind+1 )
			}
			// Burnin for each cell
			for( let b = 0; b < 5; b++ ){
				this.C.monteCarloStep()
			}
		}
	}
}

function drawOnTop(){

	let pdc = this.C.getConstraint( "PersistenceConstraint" )
	let ctx = this.Cim.context(), zoom = this.conf["zoom"]
	let prefdir = ( pdc.conf["LAMBDA_DIR"][ cellkind+1 ] > 0  ) || false
	ctx.beginPath()
	ctx.lineWidth = 2*zoom

	for( let i of this.C.cellIDs() ){
		
		// Only draw for cells that have a preferred direction.
		//if( i == 0 ) continue
		prefdir = ( pdc.conf["LAMBDA_DIR"][ this.C.cellKind( i ) ] > 0  ) || false
		if( !prefdir ) continue
			
		ctx.moveTo( 
			pdc.cellcentroidlists[i][0][0]*zoom,
			pdc.cellcentroidlists[i][0][1]*zoom)
		ctx.lineTo( (pdc.cellcentroidlists[i][0][0]+.1*pdc.celldirections[i][0])*zoom,
			(pdc.cellcentroidlists[i][0][1]+.1*pdc.celldirections[i][1])*zoom)
	}
	ctx.stroke()		
}

/* Old function */


function initialize(){
	 /* 	The following functions are defined below and will be added to
	 	the simulation object. If Custom-methods above is set to false,
	 	this object is ignored and not used in the html/node files. */
	 let custommethods = {
	 	initializeGrid : initializeGrid,
	 	drawCanvas: drawCanvas
	 }
	sim = new CPM.Simulation( config, custommethods )

let pconstraint = new CPM.PersistenceConstraint( 
	{
		// PersistenceConstraint parameters
		LAMBDA_DIR: [0,100,100], 				// PersistenceConstraint importance per ck
		PERSIST: [0,.7,0.2]						// Weight of the persistent direction in the
		// computation of the new direction per cellkind
	} 
)
sim.C.add( pconstraint )

	meter = new FPSMeter({left:"auto", right:"5px"})
	step()
}


function step(){
	sim.step()
	meter.tick()
	if( sim.conf["RUNTIME_BROWSER"] == "Inf" | sim.time+1 < sim.conf["RUNTIME_BROWSER"] ){
		requestAnimationFrame( step )
	}
}



// This is the same as the basic initializeGrid() function, but now we
// also allow each cell to have a small burnin period just after seeding.
function initializeGrid(){
	
	// add the GridManipulator if not already there and if you need it
	if( !this.helpClasses["gm"] ){ this.addGridManipulator() }
	
	
	// CHANGE THE CODE BELOW TO FIT YOUR SIMULATION
	
	let nrcells = this.conf["NRCELLS"], cellkind, i
		
	// Seed the right number of cells for each cellkind
	for( cellkind = 0; cellkind < nrcells.length; cellkind ++ ){
			
		for( i = 0; i < nrcells[cellkind]; i++ ){
			// first cell always at the midpoint. Any other cells
			// randomly.				
			if( i == 0 ){
				this.gm.seedCellAt( cellkind+1, this.C.midpoint )
			} else {
				this.gm.seedCell( cellkind+1 )
			}
			// Burnin for each cell
			for( let b = 0; b < 5; b++ ){
				this.C.monteCarloStep()
			}
		}
	}
}

// Custom drawing function to draw the preferred directions.
function drawCanvas(){
	
	/* This part is the normal drawing function */
	
	// Add the canvas if required
	if( !this.helpClasses["canvas"] ){ this.addCanvas() }
	
	// Clear canvas and draw stroma border
	this.Cim.clear( this.conf["CANVASCOLOR"] )
		
	// Draw each cellkind appropriately
	let cellcolor=this.conf["CELLCOLOR"], 
		nrcells=this.conf["NRCELLS"], cellkind, cellborders = this.conf["SHOWBORDERS"]
	for( cellkind = 0; cellkind < nrcells.length; cellkind ++ ){
		
		// draw the cells of each kind in the right color
		if( cellcolor[ cellkind ] != -1 ){
			this.Cim.drawCells( cellkind+1, cellcolor[cellkind] )
		}
			
		// Draw borders if required
		if(  cellborders[ cellkind  ]  ){
			this.Cim.drawCellBorders( cellkind+1, "000000" )
		}
	}
		
	/* This part is for drawing the preferred directions */
    
	let pdc = this.C.getConstraint( "PersistenceConstraint" )
	let ctx = this.Cim.context(), zoom = this.conf["zoom"]
	let prefdir = ( pdc.conf["LAMBDA_DIR"][ cellkind+1 ] > 0  ) || false
	ctx.beginPath()
	ctx.lineWidth = 2*zoom

	for( let i of this.C.cellIDs() ){
		
		// Only draw for cells that have a preferred direction.
		//if( i == 0 ) continue
		prefdir = ( pdc.conf["LAMBDA_DIR"][ this.C.cellKind( i ) ] > 0  ) || false
		if( !prefdir ) continue
			
		ctx.moveTo( 
			pdc.cellcentroidlists[i][0][0]*zoom,
			pdc.cellcentroidlists[i][0][1]*zoom)
		ctx.lineTo( (pdc.cellcentroidlists[i][0][0]+.1*pdc.celldirections[i][0])*zoom,
			(pdc.cellcentroidlists[i][0][1]+.1*pdc.celldirections[i][1])*zoom)
	}
	ctx.stroke()		
}
	
// custom dividecell function
function divideCell( id ){
		let C = this.C
		let torus = C.conf.torus.indexOf(true) >= 0
		if( C.ndim != 2 || torus ){
			throw("The divideCell methods is only implemented for 2D non-torus lattices yet!")
		}
		let cp = C.getStat( PixelsByCell )[id], com = C.getStat( Centroids )[id]
		let bxx = 0, bxy = 0, byy=0, cx, cy, x2, y2, side, T, D, x0, y0, x1, y1, L2
 
		// Loop over the pixels belonging to this cell
		for( let j = 0 ; j < cp.length ; j ++ ){
			cx = cp[j][0] - com[0] // x position rel to centroid
			cy = cp[j][1] - com[1] // y position rel to centroid
 
			// sum of squared distances:
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
			T = bxx + byy
			D = bxx*byy - bxy*bxy
			//L1 = T/2 + Math.sqrt(T*T/4 - D)
			L2 = T/2 - Math.sqrt(T*T/4 - D)
			x0 = 0
			y0 = 0
			x1 = L2 - byy
			y1 = bxy
		}
		// console.log( id )
		// create a new ID for the second cell
		
		let nid = C.makeNewCellID( C.cellKind( id ))
		if (C.hasOwnProperty("cells")){
			C.birth( nid, id )
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





	/** Extension of the CPM class that uses Cell objects to track internal state of Cells
 * Cell objects can override conf parameters, and track their lineage. 
*/
class CPMEvol extends CPM {

	/** The constructor of class CA.
	 * @param {GridSize} field_size - the size of the grid of the model.
	 * @param {object} conf - configuration options; see CPM base class.
	 *  
	 * @param {object[]} [conf.CELLS=[empty, CPM.Cell, CPM.StochasticCorrector]] - Array of objects of (@link Cell) 
	 * subclasses attached to the CPM. These define the internal state of the cell objects that are tracked
	 * */
	constructor( field_size, conf ){
		super( field_size, conf )

		/** Store the {@Cell} of each cell on the grid. 
		@example
		this.cells[1] // cell object of cell with cellId 1
		@type {Cell}
		*/
		this.cells =[new Cell(conf, 0, -1, this)]

		/** Store the constructor of each cellKind on the grid, in order
		 * 0th index currently unused - but this is explicitly left open for 
		 * further extension (granting background variable parameters through Cell)
		@type {CellObject}
		*/
		this.cellclasses = conf["CELLS"]

		/* adds cellDeath listener to record this if pixels change. */
		this.post_setpix_listeners.push(this.cellDeath.bind(this))
	}

	/** Completely reset; remove all cells and set time back to zero. Only the
	 * constraints and empty cell remain. */
	reset(){
		super.reset()
		this.cells = [this.cells[0]] // keep empty declared
	}

	/** The postSetpixListener of CPMEvol registers cell death.
	 * @listens {CPM#setpixi}  as this records when cels no longer contain any pixels.
	 * Note: CPM class already logs most of death, so it registers deleted entries.
	 * @param {IndexCoordinate} i - the coordinate of the pixel that is changed.
	 * @param {CellId} t_old - the cellid of this pixel before the copy
	 * @param {CellId} t_new - the cellid of this pixel after the copy.
	*/
	/* eslint-disable no-unused-vars*/
	cellDeath( i, t_old, t_new){
		if (this.cellvolume[t_old] === undefined && t_old !== 0){
			this.cells[t_old].death()
			delete this.cells[t_old]
		} 
	}

	/** Get the {@link Cell} of the cell with {@link CellId} t. 
	@param {CellId} t - id of the cell to get kind of.
	@return {Cell} the cell object. */
	getCell ( t ){
		return this.cells[t]
	}

	/* ------------- MANIPULATING CELLS ON THE GRID --------------- */
	/** Initiate a new {@link CellId} for a cell of {@link CellKind} "kind", and create elements
	   for this cell in the relevant arrays. Overrides super to also add a new Cell object to track.
	   @param {CellKind} kind - cellkind of the cell that has to be made.
	   @return {CellId} newid of the new cell.*/
	makeNewCellID ( kind ){
		let newid = super.makeNewCellID(kind)
		this.cells[newid] =new this.cellclasses[kind](this.conf, kind, newid, this)
		return newid
	}

	/** Calls a birth event in a new daughter Cell object, and hands 
	 * the other daughter (as parent) on to the Cell.
	   @param {CellId} childId - id of the newly created Cell object
	   @param {CellId} parentId - id of the other daughter (that kept the parent id)*/
	birth (childId, parentId){
		this.cells[childId].birth(this.cells[parentId] )
	}
}

class Cell {
	
	/** The constructor of class Cell.
	 * @param {object} conf - configuration settings of the simulation, containing the
	 * relevant parameters. Note: this should include all constraint parameters.
	 * @param {CellKind} kind - the cellkind of this cell, the parameters of kind are used 
	 * when parameters are not explicitly overwritten
	 * @param {CPMEvol} C - the CPM - used among others to draw random numbers
	 * @param {CellId} id - the CellId of this cell (its key in the CPM.cells), unique identifier
	 * */
	constructor (conf, kind, id, C){
		this.conf = conf
		this.kind = kind
		this.C = C
		this.id = id

		/** The id of the parent cell, all seeded cells have parent -1, to overwrite this
		 * this.birth(parent) needs to be called 
		@type{number}*/
		this.parentId = -1
	}

	/** Adds parentId number, and can be overwritten to execute functionality on 
	 * birth events. 
	 @param {Cell} parent - the parent Cell object
	 */
	birth (parent){
		this.parentId = parent.id 
	}

	/**
	 * This is called upon death events. Can be redefined in subclasses
	 */
	death () {
	}

	/**
	 * Get the current volume of this cell
	 * @return {Number} volume of this cell
	 */
	get vol(){
		return this.C.getVolume(this.id)
	}

}


class Blastomeres extends CPM.Cell {

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

		/** encode cell-specific target volume for a simple growth algorithm such that the V can be halved after division
		 * @type{Number}
		*/
		this.V = this.conf["V"][kind]

		/** encode cell-specific cell division counter 
		 * @type{Number}
		*/
		this.nDiv = [][kind]
	}

	/**
	 *  Halves target volume as post-division volume pressure can lead to artefacts
	 * (with supercells specifically, the supercell can kill subcells through volume pressure if this is left out)
	 * @param {Cell} parent - the parent (or other daughter) cell
	 */ 
	birth(parent){
		super.birth(parent)
		this.V /= 2
		parent.V /=2
	}
}


		var parentId = []
		this.parentId = ++ parent.id 


// Nice to know:
// sim.C in the console for a complete overview of your CPM

// sim.C.cells[1].V to get the volume for blastomere cell [1] ~ first cell class
// sim.C.cells[Object.keys(sim.C.cells)[1]] also works

// console.log(CPM)
// gives current classes in CPM



// for loop based nDiv calculator
// see function zygoteDivision()
function zygoteDivision (){	
	// add the initializer if not already there
	if( !this.helpClasses["gm"] ){ this.addGridManipulator() }
	
	// Adding a counter for total number of cells to limit cell divisions
	let total_cells = 0, lastnewdiv
	for( let i of this.C.cellIDs() ){
		if( this.C.cellKind( i ) == 1 ){		// Check if the cell is a blastomere
			total_cells++
		}
	}

	// Loop over all the cells and let them proliferate with some probability, 
	// but only if their volume is at least 95% of their target volume - currently not implemented
	// and the max number of cells has not been reached
	let tbd_cell  = this.C.cells[Object.keys(this.C.cells)[1]] , cell_index

	for( let i of this.C.cellIDs() ){
        if (this.C.cellKind(i) == 1){

	// Loop to pick cells for cell division that have the lowest division counter	
	// Initial parameter to pick the first cell	
		let current_cell = this.C.cells[Object.keys(this.C.cells)[i]]
			if ( current_cell.nDiv <= tbd_cell.nDiv){
				tbd_cell = current_cell
				cell_index = tbd_cell.id
			}


// To do:
// Add random contraction start 8-16 cells

            if( 
			this.C.random() < 0.01 && total_cells < 16){
                lastnewdiv = this.gm.divideCell(cell_index)
				this.C.cells[cell_index].nDiv ++
						
				 
				// Console log for MSC, cellID, cellKind, Volum
				let vol = this.C.getVolume(lastnewdiv) 
				console.log(this.time + "\t" + lastnewdiv + "\t" + this.C.cellKind(lastnewdiv) + "\t" + vol) 

				/*
				parent  = birth(i)
				this.C.getVolume(i) > this.C.getConstraint("VolumeConstraint").conf["V"][1]*0.95 && 
				console.log(this.time + "\t" + lastnewdiv + "\t" + this.C.cellKind(lastnewdiv), "\t",  parent)
				vol = this.C.getConstraint("VolumeConstraint").conf["V"][lastnewdiv]  
*/				
            }
	    }
    }		
}	




//old function without nDiv addition

	for( let i of this.C.cellIDs() ){
        if (this.C.cellKind(i) == 1){


// To do:
// Add random contraction start 8-16 cells

            if( 
			this.C.random() < 0.01 && total_cells < 16){
                lastnewdiv = this.gm.divideCell(i)
				this.C.cells[i].nDiv ++
				this.C.cells[lastnewdiv].nDiv ++

						
				 
				// Console log for MSC, cellID, cellKind, Volum
				let vol = this.C.getVolume(lastnewdiv) 
				console.log(this.time + "\t" + lastnewdiv + "\t" + this.C.cellKind(lastnewdiv) + "\t" + vol) 

				/*
				parent  = birth(i)
				this.C.getVolume(i) > this.C.getConstraint("VolumeConstraint").conf["V"][1]*0.95 && 
				console.log(this.time + "\t" + lastnewdiv + "\t" + this.C.cellKind(lastnewdiv), "\t",  parent)
				vol = this.C.getConstraint("VolumeConstraint").conf["V"][lastnewdiv]  
*/				
            }
	    }
    }






// Function with nDiv = 4 in the Blastomeres class and subtraction
/* The following custom methods will be added to the simulation object*/
function postMCSListener(){
    this.zygoteDivision()
}	

function zygoteDivision (){	
	// add the initializer if not already there
	if( !this.helpClasses["gm"] ){ this.addGridManipulator() }
	
	// Adding a counter for total number of cells to limit cell divisions
	let total_cells = 0, lastnewdiv
	for( let i of this.C.cellIDs() ){
		if( this.C.cellKind( i ) == 1 ){		// Check if the cell is a blastomere
			total_cells++
		}
	}

	// Loop over all the cells and let them proliferate with some probability, 
	// but only if their volume is at least 95% of their target volume - currently not implemented
	// and the max number of cells has not been reached
	this.C.cells[Object.keys(this.C.cells)[1]].nDiv = 4

	for( let i of this.C.cellIDs() ){
        if (this.C.cellKind(i) == 1){


// To do:
// Add random contraction start 8-16 cells

            if( 
			this.C.random() < 0.01 && total_cells < 16 && this.C.cells[i].nDiv > 0){
                lastnewdiv = this.gm.divideCell(i)
				this.C.cells[Object.keys(this.C.cells)[i]].nDiv --
				this.C.cells[Object.keys(this.C.cells)[lastnewdiv]].nDiv --
						
				 
				// Console log for MSC, cellID, cellKind, Volum
				let vol = this.C.getVolume(lastnewdiv) 
				console.log(this.time + "\t" + lastnewdiv + "\t" + this.C.cellKind(lastnewdiv) + "\t" + vol) 

				/*
				parent  = birth(i)
				this.C.getVolume(i) > this.C.getConstraint("VolumeConstraint").conf["V"][1]*0.95 && 
				console.log(this.time + "\t" + lastnewdiv + "\t" + this.C.cellKind(lastnewdiv), "\t",  parent)
				vol = this.C.getConstraint("VolumeConstraint").conf["V"][lastnewdiv]  
*/				
            }
	    }
    }
}


/*	----------------------------------
	ZygoteDiv function which doesn't quite function as desired: 
	1) if largest_cells = largest_cells.splice(j, 1), the function only runs once for array [x,y,z], picks a cell and then the next array is calculated with largest volume cells.


	2) if largest_cells.splice(j, 1), when length largest_cells = i, the loop stops working, meaning that for largest_cells = [1,2,3,4], i = 1 -> lc = [1,2,3], 
	i = 2 -> lc = [1,2], and because i = length(largest_cells) the loop ends and zygotedivision is called again (see with counter function).
	Additionally, this results in the global random not working anymore, since the loop occurs inside the function and the global random requirement is only for calling the function itself.
	
	3) Changing for loop to while loop:
	(while(largest_cells.length > 0){
	results in infinite while loop after total_cells are reached. --> include the random nr generator in the if statement for largest_cells
	----------------------------------
 */ 

function postMCSListener(){
	if (this.C.random() < 0.01){
		    this.zygoteDivision()
	}
}	

	const divided_cells = []
	const counter = []
// add daughterId variable to the CPMEvol

function zygoteDivision (){	
	// add the initializer if not already there
	if( !this.helpClasses["gm"] ){ this.addGridManipulator() }
	
	let total_cells = 0
	let all_volumes = [] 

	// Adding a counter for total number of cells to limit cell divisions
	// and collecting all nDivs for all cellIDs present on the grid 
	for( let i of this.C.cellIDs() ){
		if( this.C.cellKind( i ) == 1 ){		
			total_cells++
			all_volumes.push(this.C.cells[i].V)

		}
	}

	// Loop over all the cells and let them proliferate with some probability, 
	// only if the max number of cells has not been reached

	let largest_V = all_volumes[0]

	// Select largest volume value present in all cells
	for(let i of all_volumes){
		if (i > largest_V){
			largest_V = i
		} 
	}

	let largest_cells = [] 

	// Construct an array with cellIDs containing the largest volume
	for( let i of this.C.cellIDs() ){
        if (this.C.cellKind(i) == 1){
			if (this.C.cells[i].V == largest_V){
				largest_cells.push(i)
			}

		}	
	}
	counter.push(1)
	console.log(counter.length + "\t" + "zygote function counter")

	let j, lastnewdiv, random_cell 
	
	// Dividing function for cells with the largest volume
	for( let i = 0; i < largest_cells.length; i++ ){

		// randomly generate integer j and then select element of largest_cells[j] 
		j = this.C.ran(0, largest_cells.length - 1)
		random_cell = largest_cells[j]
 
		// Divide up to a predefined total cell nr and increase nDiv for cells that have divided 
        if( total_cells < 16){
            lastnewdiv = this.gm.divideCell(random_cell)
			this.C.cells[random_cell].nDiv ++
			this.C.cells[lastnewdiv].nDiv ++
			
		//Visual check random number, chosen cell + what cell is divided, and how this changes the largest_cells array
		console.log(largest_cells + "\t" + "all the big cells")
		console.log(j)
		console.log(random_cell + "\t" + "save me")

			//contains parent cell ids that have divided
			divided_cells.push(random_cell)
				console.log(divided_cells)
				console.log(largest_cells + "\t" + "before splicing me")
			 largest_cells.splice(j, 1)
				console.log(largest_cells + "\t" + "after splicing me")

			// Console log for time, all divided cellIds, cellID parent cell + target volume parent, cellID daughter cell + target volume daughter cell
				console.log(sim.time + "\t" +  divided_cells + "\t" + random_cell + "\t" + sim.C.cells[random_cell].V + "\t" + lastnewdiv + "\t" + sim.C.cells[lastnewdiv].V )

        }
	}
}



// DaughterID addition (including indirect daughter cells)
// Direct: in the zygoteDivision function
this.C.cells[random_cell].daughterId.push(lastnewdiv) 

// Indirect: loop over parentID, add daughterID to all parents if not already present 
for (let i = 1; i < this.C.cells[lastnewdiv].parentId.length; i++){

	this.C.cells[parentId[i]].daughterId.push(lastnewdiv) 
}
// changing [parentId[i] to random_cell works?]




// ------------------------------------------------------------------------------------------------------------
// Perimetercounter function - output as {}, borderpixels for every unique cellId
// ------------------------------------------------------------------------------------------------------------

function perimeterCounter(){

	let cellborderpixels = { }
		
		// The this.C.cellBorderPixels() iterator returns coordinates and cellid for all 
		// non-background border pixels on the grid. This function creates an object with a key for each cell on the grid, and as
		//corresponding value an array with all the borderpixels of that 
		//cell. Each pixel is stored by its ArrayCoordinate.
	for( let [arraycoord,id] of this.C.cellBorderPixels() ){
		if( !cellborderpixels[id] ){
			cellborderpixels[id] = [arraycoord]
		} else {
			cellborderpixels[id].push( arraycoord )
		}
	}
	console.log( "borderpixels")

	console.log(cellborderpixels)

	/** The getNeighborsOfCell method of CellNeighborList computes a list of all pixels
		that border to "cell" and belong to a different cellid.
		@param {CellId} cellid the unique cell id of the cell to get neighbors from.
		@param {CellArrayObject} cellborderpixels object produced by {@link BorderPixelsByCell}, with keys for each cellid
		and as corresponding value the border pixel indices of their pixels.
		@returns {CellObject} a dictionairy with keys = neighbor cell ids, and 
		values = number of neighbor cellpixels at the border.
	*/
			
	let neigh_borderpixels = { }
	
	//loop over all cellIds' borderpixels to identify pixels with a neighbouring background pixels to calculate the perimeter of the cell cluster
	//this assumes that there are no interior borderpixels within the cleavage stage that neighbour with background pixels
	for (let cellid in cellborderpixels){
		if (cellborderpixels.hasOwnProperty(cellid)){
		
			let cbp = cellborderpixels[cellid]

			//loop over border pixels of cell
			for ( let cellpix = 0; cellpix < cbp.length; cellpix++ ) {

				//get neighbouring pixels of borderpixel of cell
				let neighbours_of_borderpixel_cell = this.C.neigh( cbp[cellpix] )

				//loop over neighbouring pixels and store the parent cell if it is different from
				//cell, add or increment the key corresponding to the neighbor in the dictionary
				for ( let neighborpix of neighbours_of_borderpixel_cell ) {
					
					// Identify cellId belonging to neighbour pixel (ArrayCoordinate)
					let neighbor_id = this.C.pixt( neighborpix )

					// Add all unique background pixels to an object with key: cellId and as corresponding value the indices of these pixels.
					if (neighbor_id == 0) {
						if( !neigh_borderpixels[cellid] ){
							neigh_borderpixels[cellid] = [neighborpix]
						} else {
							neigh_borderpixels[cellid].push( neighborpix )
						}

					}
				}
			}
		}
	}
	console.log( "neigh borderpixels")
	console.log( neigh_borderpixels )
}	
