// Indexed by object set ID

// TANGRAM OBJECTS
var tangramA = {
	url: 'stimuli/tangram_A.png', name: "A_bird", width: 282.1, height: 275.1}
var tangramB = {
	url: 'stimuli/tangram_B.png', name: "B_helpbunny", width : 235.2, height: 224}
var tangramC = {
	url: 'stimuli/tangram_C.png', name: "C_ghost", width: 293.3, height: 228.9}
var tangramD = {
	url: 'stimuli/tangram_D.png', name: "D_monk", width: 189, height: 271.6}
var tangramE = {
	url: 'stimuli/tangram_E.png', name: 'E_bunny', width: 204.5, height: 250}
var tangramF = {
	url: 'stimuli/tangram_F.png', name: 'F_sadperson', width: 261.8, height: 219.8}
var tangramG = {
	url: 'stimuli/tangram_G.png', name: 'G_seal', width: 284.9, height: 237.3}
var tangramH = {
	url: 'stimuli/tangram_H.png', name: 'H_baby', width: 175, height: 273.7}
var tangramI = {
	url: 'stimuli/tangram_I.png', name: 'I_iceskater', width: 222.5, height: 247}
var tangramJ = {
	url: 'stimuli/tangram_J.png', name: 'J_compact', width: 151.8, height: 249.2}
var tangramK = {
	url: 'stimuli/tangram_K.png', name: 'K_waiter', width: 184.8, height: 280}
var tangramL = {
	url: 'stimuli/tangram_L.png', name: 'L_egypt', width: 182.7, height: 280.7}

var tangramList = [
	tangramA, tangramB, tangramC, tangramD, tangramE, tangramF, 
	tangramG, tangramH, tangramI, tangramJ, tangramK, tangramL
]

module.exports = tangramList;


// var tangramA = {
// 	url: 'stimuli/tangram_A.png', name: "tangram_A", width: 403, height: 393}
// var tangramB = {
// 	url: 'stimuli/tangram_B.png', name: "tangram_B", width : 336, height: 320}
// var tangramC = {
// 	url: 'stimuli/tangram_C.png', name: "tangram_C", width: 419, height: 327}
// var tangramD = {
// 	url: 'stimuli/tangram_D.png', name: "tangram_D", width: 270, height: 388}
// var tangramE = {
// 	url: 'stimuli/tangram_E.png', name: 'tangram_E', width: 335, height: 400}
// var tangramF = {
// 	url: 'stimuli/tangram_F.png', name: 'tangram_F', width: 347, height: 314}
// var tangramG = {
// 	url: 'stimuli/tangram_G.png', name: 'tangram_G', width: 407, height: 339}
// var tangramH = {
// 	url: 'stimuli/tangram_H.png', name: 'tangram_H', width: 250, height: 391}
// var tangramI = {
// 	url: 'stimuli/tangram_I.png', name: 'tangram_I', width: 374, height: 410}
// var tangramJ = {
// 	url: 'stimuli/tangram_J.png', name: 'tangram_J', width: 253, height: 356}
// var tangramK = {
// 	url: 'stimuli/tangram_K.png', name: 'tangram_K', width: 264, height: 400}
// var tangramL = {
// 	url: 'stimuli/tangram_L.png', name: 'tangram_L', width: 261, height: 401}




// var criticalItems = [
// 	{
// 		instructions: [airplane.instruction, sunGlasses.instruction, 
// 		               barrel.instruction, saxophone.instruction],
// 		criticalInstruction: "sunGlasses",
// 		objectSet: 1,
// 		target: sunGlasses,
// 		distractor: glassesCase,
// 		alt: soccerBall,
// 		otherObjects: [saxophone, airplane, barrel, watch]
// 	},{
// 		instructions: [binoculars.instruction, wrench.instruction, 
// 		               middleBlock.instruction, coffeeMug.instruction],
// 		criticalInstruction: "middleBlock",
// 		objectSet: 2,
// 		target: middleBlock,
// 		distractor: bottomBlock,
// 		alt: stapler,
// 		otherObjects: [binoculars, wrench, topBlock, coffeeMug]
// 	},{
// 		instructions: [scissors.instruction, knife.instruction,
// 		                barOfSoap.instruction, cassetteTape.instruction],
// 		criticalInstruction: "cassetteTape",
// 		objectSet: 3,
// 		target: cassetteTape,
// 		distractor: rollOfTape,
// 		alt: battery,
// 		otherObjects: [scissors, butterfly, barOfSoap, knife]
// 	},{
// 		instructions: [carrot.instruction, mediumMeasuringCup.instruction,
// 		               waterBottle.instruction, chair.instruction],
// 		criticalInstruction: "mediumMeasuringCup",
// 		objectSet: 4,
// 		target: mediumMeasuringCup,
// 		distractor: largeMeasuringCup,
// 		alt: umbrella,
// 		otherObjects: [chair, smallMeasuringCup, carrot, waterBottle]
// 	},{
// 		instructions: [basketball.instruction, roundBrush.instruction, headphones.instruction, 
// 		                book.instruction], 
// 		criticalInstruction: "roundBrush",
// 		target: roundBrush,
// 		objectSet: 5,
// 		distractor: hairBrush,
// 		alt: skate,
// 		otherObjects: [basketball, dalmatian, headphones, book, ring]
// 	},{
// 		instructions: [banana.instruction, dollar.instruction, 
// 		               boardEraser.instruction, feather.instruction], 		
// 		criticalInstruction: "boardEraser",
// 		objectSet: 6,
// 		target: boardEraser,
// 		distractor: pencilEraser,
// 		alt: brain,
// 		otherObjects: [dollar, feather, tennisBall, banana]
// 	},{
// 		instructions: [magnet.instruction, handcuffs.instruction, 
// 		               pandaToy.instruction, mediumCandle.instruction], 
// 		criticalInstruction: "mediumCandle",
// 		objectSet: 7,
// 		target: mediumCandle,
// 		distractor: smallCandle,
// 		alt: flower,
// 		otherObjects: [pandaToy, largeCandle, handcuffs, magnet]
// 	},{
// 		instructions: [comb.instruction, computerMouse.instruction, 
// 		               castIronPan.instruction, piano.instruction], 
// 		criticalInstruction: "computerMouse",
// 		objectSet: 8,
// 		target: computerMouse,
// 		distractor: toyMouse,
// 		alt: camera,
// 		otherObjects: [piano , comb, key, castIronPan]
// }]





