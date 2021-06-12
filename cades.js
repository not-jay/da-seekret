$(document).ready(function() {

var util = {
	str: {
		// orig - original string to edit
		// index - at what index do we put 'ins' in
		// ins - string to insert
		// rem - amount of chars to remove starting at index
		// returns new string
		splice: function(orig, index, ins, rem) {
			return orig.slice(0, index) + ins + orig.slice(index+Math.abs(rem));
		}
	}
};

var dialogue = {
	box: undefined,
	selectBox: undefined,
	isInit: false,
	hasNext: false,
	// dialogue - a div used to display dialogue text
	init: function(box) {
		dialogue.box = box;
		isInit = true;
	},
	// text - array holding the dialogue text
	//        1 element = 1 line = 1 <p></p> tag
	// function will append lines as it processes the text
	// lines can contain ^###### to indicate text color changes
	// color will default to #000000
	text: function(text) {
		var color = "#000000"; // default to black
		var a = "<span style='color:";
		var b = "'>";
		var c = "</span>";
		var spanOpenSize = a.length + color.length + b.length;
		var spanCloseSize = c.length;

		// process each line
		text.forEach(function(line) {
			var changes = [];
			var fl = line; // save a copy of line
			// initial scan of line
			for (var i = 0; i < line.length; i++) {
				// if there is ^
				if(line[i] == "^") changes.push(i);
			}
			// go through the changes
			if(changes.length > 0) {
				// edge case: if there was a color change previously
				//            and the line contains another color change
				//            the line wouldnt get spanned at the start
				//            but it would only span the 2nd color change
				//            ie. "the following materials.^000000"
				// this should hopefully fix that
				// if there is a color change, and the prev color isnt black
				if(changes[0] != 0 && color != "#000000") {
					// apply a span at the start of the line
					// up until the actual one
					// that is gonna be applied on the next bit
					// basically half and half of the next bit's operations
					fl = util.str.splice(fl, 0, a+color+b, 0);
					fl = util.str.splice(fl, spanOpenSize+changes[0], c, 0);
					// since we did a destructive edit at the start
					// we need to update these changes
					changes[0] = changes[0]+spanOpenSize+spanCloseSize;
					line = fl;
				}
				// go through it in reverse order
				// because our operation is destructive
				for (var i = changes.length - 1; i >= 0; i--) {
					// get the color
					color = `#${line.slice(changes[i]+1, changes[i]+7)}`;
					// do the edit
					// add the opening span
					fl = util.str.splice(fl, changes[i], a+color+b, 7);
					// add the closing span
					// since we're working backwards, use the last change marker
					// as the stopping point for the span tag
					// if this is the first change marker, use end of line
					if(i == changes.length - 1) {
						fl = util.str.splice(fl, fl.length, c, 0);
					} else {
						var curr = changes[i]+7; //7 for ^ + 6 color code
						var prev = changes[i+1];
						fl = util.str.splice(fl, spanOpenSize+prev-curr, c, 0);
					}
				}
			} else { // if there are no changes
				// check if there was a previous color change
				if(color != "#000000") {
					// if so, we still span the entire line
					fl = util.str.splice(fl, 0, a+color+b, 0);
					fl = util.str.splice(fl, fl.length, c, 0);
				}
			}

			// line should be fully processed
			var p = $("<p></p>");
			var pl = $.parseHTML(fl);
			p.append(pl);
			dialogue.box.append(p);
		});
	},
	next: function() {
		// append a next button
		var div = $("<div></div>");
		div.text("Next");
		dialogue.box.append(div);
		// set next flag
		dialogue.hasNext = true;
	},
	clear: function() {
		if(!isInit) return;
		dialogue.box.empty();
	}
}

var selectBox = {
	box: undefined,
	isInit: false,
	previous: -1,
	current: -1, // 0 is top-most, -1 nothing highlighted
	max: -1,
	blockInput: false,
	doLogic: undefined,
	// box - a div used to display the select options
	init: function(box) {
		selectBox.box = box;
		isInit = true;
	},
	update: function() {
		if(!isInit) return;
		var children = selectBox.box.children();
		if(selectBox.previous > -1) $(children[selectBox.previous]).removeClass("highlight");
		if(selectBox.current > -1) $(children[selectBox.current]).addClass("highlight");
	},
	// text - array holding the options
	// logic - operation handling each option
	select: function(text, logic) {
		if(!isInit) return;
		selectBox.max = text.length - 1;
		text.forEach(function(opt) {
			var p = $("<p></p>");
			p.text(opt);
			selectBox.box.append(p);
		});
		selectBox.doLogic = logic;
	},
	clear: function() {
		if(!isInit) return;
		selectBox.box.empty();
		selectBox.previous = -1;
		selectBox.current = -1;
		selectBox.max = -1;
		doLogic = undefined;
	},
	logic: {
		continue: function() {
			if(selectBox.current == -1) return;
			selectBox.clear();
			ro.step++;
			ro.logic();
		},
		repair: function() {
			if(selectBox.current == -1) return;

			ro.k[ro.rc][selectBox.current]();
			ro.logic();
		}
	}
};

// quiz
var ro = {
	of01: 0,
	of02: 0,
	rp_temp: 0,
	rc: -1,
	k: [
		[
			function() { ro.correct(); },
			function() { ro.step = 6; },
			function() { ro.step = 6; },
			function() { ro.step = 6; }
		],
		[
			function() { ro.proceed(); },
			function() { ro.step = 6; },
			function() { ro.step = 6; },
			function() { ro.correct(); }
		],
		[
			function() { ro.step = 6; },
			function() { ro.correct(); },
			function() { ro.step = 6; },
			function() { ro.step = 6; }
		],
		[
			function() { ro.step = 6; },
			function() { ro.step = 6; },
			function() { ro.correct(); },
			function() { ro.step = 6; }
		]
	],
	step: 0,
	correct: function() {
		ro.rp_temp++;
		ro.of02++;
	},
	proceed: function() {
		ro.of02++;
	},
	reset: function() {
		ro.of01 = 0;
		ro.of02 = 0;
		ro.rp_temp = 0;
		ro.rc = -1;
	},
	logic: function() {
		switch(ro.step) {
			case 0:
				dialogue.clear();
				dialogue.text(npcText.intro[0]);
				dialogue.next();
			break;
			case 1:
				dialogue.clear();
				dialogue.text(npcText.intro[1]);
				selectBox.clear();
				selectBox.select(npcText.continueOption, selectBox.logic.continue);
			break;
			case 2:
				selectBox.clear();
				dialogue.clear();
				dialogue.text(npcText.intro[2]);
				dialogue.next();
				ro.of01 = Math.floor((Math.random() * 6) + 10);
			break;
			case 3:
				console.log(ro.of02, "of", ro.of01, ro.rp_temp);
				if(ro.of02 == ro.of01) {
					// completed all questions
					console.log("done");
					ro.step++;
					ro.logic();
					break;
				}
				switch(Math.floor(Math.random() * 4)) {
					case 0:
						ro.rc = 0;
						dialogue.clear();
						dialogue.text(npcText.repair[0].text);
						selectBox.clear();
						selectBox.select(npcText.repairOption, selectBox.logic.repair);
					break;
					case 1:
						ro.rc = 1;
						dialogue.clear();
						dialogue.text(npcText.repair[1].text);
						selectBox.clear();
						selectBox.select(npcText.repairOption, selectBox.logic.repair);
					break;
					case 2:
						ro.rc = 2;
						dialogue.clear();
						dialogue.text(npcText.repair[2].text);
						selectBox.clear();
						selectBox.select(npcText.repairOption, selectBox.logic.repair);
					break;
					case 3:
						ro.rc = 3;
						dialogue.clear();
						dialogue.text(npcText.repair[3].text);
						selectBox.clear();
						selectBox.select(npcText.repairOption, selectBox.logic.repair);
					break;
				}
			break;
			case 4:
				// complete
				dialogue.clear();
				selectBox.clear();
				dialogue.text(npcText.finish[0]);
				dialogue.next();
			break;
			case 5:
				dialogue.clear();
				console.log(ro.rp_temp, ro.of01);
				if(ro.rp_temp == ro.of01) {
					dialogue.text(npcText.finish[1]);
					// reset
				} else {
					dialogue.text(npcText.finish[2]);
					// reset
				}
			break;
			case 6:
				// utter failure
				dialogue.clear();
				dialogue.text(npcText.repair[ro.rc].response[selectBox.current]);
				selectBox.clear();
				// reset
			break;
		}
	}
};

// Init variables
var npcText = {
	intro: [
		[
			"^3355FFDemolished Fortress",
			"Gates can be repaired,",
			"but you will need to gather",
			"the following materials.^000000"
		],
		[
			"^4D4DFF10 Steel^000000,",
			"^4D4DFF30 Trunks^000000,",
			"^4D4DFF5 Oridecon^000000, and",
			"^4D4DFF10 Emveretarcon^000000."
		],
		[
			"^3355FFYou will need Trunks to",
			"repair the support frame,",
			"Oridecon to enhance the",
			"gate's endurance, and",
			"Emveretarcon to basically",
			"hold everything together.^000000"
		]
	],
	continueOption: [
		"Continue"
	],
	repairOption: [
		"Trunk",
		"Steel",
		"Emveretarcon",
		"Oridecon"
	],
	repair: [
		{
			text: [
				"^3355FFThe support frame",
				"is badly damaged:",
				"fixing this part",
				"is a top priority.^000000"
			],
			response: [
				[
					"^3355FFThe frame has been",
					"reinforced with wood.^000000"
				],
				[
					"^3355FFYou tried using steel,",
					"but it's not working very",
				 	"well. You'll have to try",
					"something else.^000000"
				],
				[
					"^3355FFYou tried using emveretarcon",
					"to reinforce the gate, but it's",
					"not working well at all.",
					"You'll have to start over.^000000"
				],
				[
					"^3355FFYou tried using oridecon,",
					"but it's not working very",
					"well. You'll have to try",
					"something else.^000000"
				]
			]
		},
		{
			text: [
				"^3355FFIt looks like the gate's",
				"overall endurance needs to",
				"be reinforced with something.^000000"
			],
			response: [
				[
					"^3355FFYou tried using wood",
					"to reinforce the gate.^000000"
				],
				[
					"^3355FFYou tried using steel",
					"to reinforce the gate, but",
					"it's not working well at all.",
					"You'll have to start over.^000000"
				],
				[
					"^3355FFYou tried using emveretarcon",
					"to reinforce the gate, but it's",
					"not working well at all.",
					"You'll have to start over.^000000"
				],
				[
					"^3355FFYou hammered the",
					"oridecon: it looks",
					"like this will work.^000000"
				]
			]
		},
		{
			text: [
				"^3355FFThe damage to the gate",
				"has caused all these",
				"cracks. You'll have to",
				"weld them solid somehow.^000000"
			],
			response: [
				[
					"^3355FFYou tried using wood to fix",
					"this problem, but it seems",
					"to have made it worse.",
					"You'll have to start all over.^000000"
				],
				[
					"^3355FFYou used steel to weld",
					"all the cracks: the gate is",
					"is starting to look more solid.^000000"
				],
				[
					"^3355FFYou tried using emveretarcon",
					"to reinforce the gate, but it's",
					"not working well at all.",
					"You'll have to start over.^000000"
				],
				[
					"^3355FFYou tried using oridecon,",
					"but it's not working very",
					"well. You'll have to try",
					"something else.^000000"
				]
			]
		},
		{
			text: [
				"^3355FFNow you need to make",
				"sure that the gate is held",
				"together pretty solidly.^000000"
			],
			response:[
				[
					"^3355FFYou tried using wood to fix",
					"this problem, but it seems",
					"to have made it worse.",
					"You'll have to start all over.^000000"
				],
				[
					"^3355FFYou tried using steel,",
					"but it's not working very",
					"well. You'll have to try",
					"something else.^000000"
				],
				[
					"^3355FFYou successfully used",
					"the emveretarcon to repair",
					"much of the gate's damage.^000000"
				],
				[
					"^3355FFYou tried using oridecon,",
					"but it's not working very",
					"well. You'll have to try",
					"something else.^000000"
				]
			]
		}
	],
	finish: [
		[
			"^3355FFWell, it looks like",
			"you're just about done",
			"with repairing the gate.^000000"
		],
		[
			"^3355FFThe Fortress Gate has",
			"been successfully repaired!^000000"
		],
		[
			"^3355FFThe wall has been breached,",
			"and the attempt to repair the",
			"Fortress Gate has failed.",
			"You lost some of your",
			"repair resources...^000000"
		]
	]
};
dialogue.init($("#npctext"));
selectBox.init($("#answer"));

$(document).on("keydown", function(e) {
	if(selectBox.blockInput) return;

	switch(e.keyCode) {
		// enter
		case 13:
		// space
		case 32:
			// if there's stuff in selectbox (check max if not -1)
			if(selectBox.max != -1) {
				selectBox.doLogic();
				break;
			}
			// if next, do next logic
			if(dialogue.hasNext) {
				// check for step max
				dialogue.hasNext = false;
				ro.step++;
				ro.logic();
				break;
			}
		break;
		// up
		case 38:
			selectBox.previous = selectBox.current;
			if(selectBox.current > 0) selectBox.current--;
			selectBox.update();
		break;
		// down
		case 40:
			selectBox.previous = selectBox.current;
			if(selectBox.current < selectBox.max) selectBox.current++;
			selectBox.update();
		break;
	}
});

$("#mainmenu").hide();
ro.logic();
});