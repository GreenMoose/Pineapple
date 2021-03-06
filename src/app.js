/*
 * Get ready for a wild ride
 *
 * Pineapple browser for Pebble
 * Display CYOAs and sorts them,
 * Displays Threads
 * Displays Posts
 * Displays Posts the QM replied to
 * Let's you pin CYOAs & posts
 * Some other stuff I forgot
 */
var currentVersion = 0.82; //guess, seriously guess
//                                    ===   GLBL   ===
var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Settings = require('settings');

var pineAPI = 'http://www.anonpone.com/api/'; //base url for the api

//Form of: [cyoaID, cyoaID, ...]
var pinnedCYOAs = Settings.option('pinnedCYOAs');
if (pinnedCYOAs === undefined) pinnedCYOAs = [];

//Form of: {cyoaID: [postID, postID, ...]}
var pinnedPosts = Settings.option('pinnedPosts');
if (pinnedPosts === undefined) pinnedPosts = [{}];

pinnedPosts = [{}]; //TODO ;^)

//Settings!
var sortMethod = Settings.option('sortMethod'); //see sortMethodName
if (sortMethod === undefined) sortMethod = 0;

var sortReverse = Settings.option('sortReverse'); // Reverse sort
if (sortReverse === undefined) sortReverse = false;

var fontSize = Settings.option('fontSize'); //guess
if (fontSize === undefined) fontSize = 0;

var dateDisplay = Settings.option('dateDisplay'); //display the update date as relative or absolute
if (dateDisplay === undefined) dateDisplay = 0;

var current = {
	'cyoaID': null,
	'threadID': null,
	'postID': null,
	'cyoaTitle': null,
	'threadTitle': null
};
var currentData;
var currentPage;

var sortMethodName  = ['Newest CYOAs', 'Latest Updates', 'Alphabetic', 'Length (Posts)', 'Length (Words)'];
var fontSizeName    = ['small', 'large', 'mono', 'classic-small', 'classic-large'];
var dateDisplayName = ['Absolute', 'Relative'];

var choosieSays = [
	'You found the stairs!',
	'Mango dindu nuffin',
	'Pinkie cares!',
	'Spitfire doesn\'t care',
	'>bats/humans\ndropped',
	'Railroads aren\'t just for trains',
	'>memes',
	'Bow down to your god',
	'Not every character will survive',
	'Nips is a lich',
	'Fear Inept\'s bloodlust',
	'Res is a normie',
	'Everyone is for sexual',
	'\'>tomorrow\' -nobby, 10 years ago',
	'/ss/ or bust',
	'bump',
	'Storyteller is kill',
	'Save the poners!',
	'NaN!',
	'Your waifu is mine',
	'They\'re not real',
	'You should follow ALL the quests',
	'ERF PONY STRENGTH',
	'Harvest a whore',
	'CYOA was a mistake',
	'Your meme is dead',
	'wew lad',
	'Naan-teen\neen-ches',
	'Not everyone is bound to succeed.',
	'>Hot opinions',
	'Why even try?',
	'You might as well be coltshan',
	'!roll 1d20',
	'Oh tubesand, only you understand me',
	'>>>/qst/',
	'Nice, meaty docks',
	'Quads Event: QM updates!',
	'Naaa',
	'SFB, lewds when?',
	'Pon, pone, poner, hoers'
];

var bugs = randMinMaxInt(1, Number.MAX_SAFE_INTEGER); //programs always have bugs
//For reference, MAX_SAFE_INTEGER is 9007199254740991. Which seems about right.
console.log('Bugs: ' + bugs);
//                                    ===  /GLBL/  ===

//                                    ===   INIT   ===
var splashWindow = new UI.Window({}); //tell people to calm their tits
var background = new UI.Text({
	position: new Vector2(0, 0),
	size: new Vector2(144, 168),
	text: '',
	font: 'GOTHIC_28_BOLD',
	color: 'white',
	textOverflow: 'wrap',
	textAlign: 'center',
	backgroundColor: 'white'
});
var load_time = new UI.TimeText({
	position: new Vector2(0, 0),
	size: new Vector2(144, 62),
	text: '%I:%M %p',
	font: 'GOTHIC_28_BOLD',
	color: 'black',
	textOverflow: 'fill',
	textAlign: 'center',
	backgroundColor: 'white'
});
var load_text = new UI.Text({
	position: new Vector2(0, 62),
	size: new Vector2(144, 44),
	text: 'Loading...',
	font: 'GOTHIC_28_BOLD',
	color: 'white',
	textOverflow: 'fill',
	textAlign: 'center',
	backgroundColor: 'black'
});
var load_error_desc = new UI.Text({
	position: new Vector2(0, 40),
	size: new Vector2(144, 22),
	text: 'Internet Connection',
	font: 'GOTHIC_18_BOLD',
	color: 'white',
	textOverflow: 'wrap',
	textAlign: 'center',
	backgroundColor: 'black'
});
var load_error = new UI.Text({
	position: new Vector2(0, 62),
	size: new Vector2(144, 44),
	text: 'Error!',
	font: 'GOTHIC_28_BOLD',
	color: 'white',
	textOverflow: 'wrap',
	textAlign: 'center',
	backgroundColor: 'black'
});
var load_error_comment = new UI.Text({
	position: new Vector2(0, 106),
	size: new Vector2(144, 62),
	text: 'Choosie Says: \n "You should never see this"',
	font: 'GOTHIC_18_BOLD',
	color: 'white',
	textOverflow: 'wrap',
	textAlign: 'center',
	backgroundColor: 'black'
});

function LoadSplash() {}
LoadSplash.prototype.show = function() {
	splashWindow.remove(load_error);
	splashWindow.remove(load_error_desc);
	splashWindow.remove(load_error_comment);
	splashWindow.show();
};
LoadSplash.prototype.hide = function() {
	splashWindow.hide();
};
LoadSplash.prototype.error = function() {
	splashWindow.add(load_error);
	splashWindow.add(load_error_desc);
	var randNum = randMinMaxInt(0, choosieSays.length - 1);
	load_error_comment.text('Choosie Says: \n"' + choosieSays[randNum] + '"');
	splashWindow.add(load_error_comment);
};

var loadSplash = new LoadSplash();

splashWindow.add(background);
splashWindow.add(load_text);
splashWindow.add(load_time);
loadSplash.show();

splashWindow.on('click', 'select', function(e) {
	loadSplash.error();
}); //No error checking so you can cause an error anytime!
//                                    ===  /INIT/  ===

//                                    ===   SORT   ===
function sortCYOAsBy(prop)  {
	var dataProps = extractProps(prop);
	console.log('Extracted Props');
	var sorted    = dataProps.sort(propSort(dataProps[1].prop));
	console.log('Sorted Props');
	var menuItems = sortedToMenu(sorted);
	console.log('Converted Sorted Props to Menu Items');
	
	return menuItems;
	
	//I think I COULD do:
	//return sortedToMenu(extractProps(prop).sort(propSort()));
	//But just look at that. It's horrifying. Even more than the rest of the code!
}
function extractProps(prop) {
	var props = [];
	var category = ''; //data.stats.prop or data.last.prop
	var data = currentData;
	
	switch (prop) {
		case 'totalPosts': //Length (Posts)
		case 'totalWordCount': //Length (Words)
			category = 'stats';
			break;
		case 'timestamp': //Latest Update
			category = 'last';
			break;
	}//the other ones are at the top (data.prop)
	
	console.log(category);
	
	for (var i in data) {
		var id = data[i].id;
		var value = ((category === '') ? (data[i][prop]) : (data[i][category][prop])); // I wrote !== instead of === kill me
		
		if (prop === 'timestamp') value = timestampToDate(value);
			
		props.push({
			id: id,
			prop: value
		});
	}
	
	return props; //fun fact: I forgot this line the first time
}
function propSort(testProp) {
	if (isNaN(testProp) || typeof testProp === "object"){
		console.log('String Sort');
    return function (a, b) {
			if (a.prop > b.prop) {
            return 1;
        } else if (a.prop < b.prop) {
            return -1;
        }
        return 0;
    };
		
	}else {
		console.log('Number Sort');
		return function (a, b) {
			return a.prop - b.prop; //I forgot .prop here
		};
		
	}
}
function sortedToMenu(sorted) { //Takes sorted items and puts em' into menu format
		var items = [];
		var cyoa = currentData;
		
		for (var i in sorted) {
			if (sorted[i].id === undefined) break; //tbh I don't know why js can't stop itself
			var j = sorted[i].id; //yes, I do hate everyone
			var id = cyoa[j].id;
			var title = cyoa[j].title;
			var subtitle = '[' +
				  ((cyoa[j].live === '1') ? 'L' :
					((cyoa[j].status === 'cancelled') ? 'X' :
						cyoa[j].status.substring(0, 1).capitalize())) +
				  ']' +
				  ' ' +
				    ((dateDisplay === 0) ? cyoa[j].last.timestamp.substring(2, 19) //absolute
			                           : time_ago(cyoa[j].last.timestamp));      //relative

			items.unshift({ //add to start of array
				id: id,
				title: title,
				subtitle: subtitle
			});
		}
	
		if (sortMethodName[sortMethod] === 'Alphabetic') items = items.reverse(); //Shitty fix for shitty code
	
		if (sortReverse) {
			return items.reverse();
		} else {
			return items;
		}
	}
//                                    ===  /SORT/  ===

//                                    ===   PRSE   ===
function formatPosts(posts) {
		var items = [];
		var currentPost = 1;
		var totalPosts = Object.keys(posts).length;

		for (var i in posts) {
			if (currentPost > totalPosts) {break;} //i don't know how to fix this help
			var id = posts[i].post_id;
			var title = currentPost + '/' + totalPosts + ' | ' + Math.round(currentPost / totalPosts * 100) + '%';
			var subtitle = posts[i].timestamp;

			currentPost++;
			
			items.push({
				id: id,
				title: title,
				subtitle: subtitle
			});
		}
		return items;
	}
function formatThreads(thread) {
		var items = [];
		var currentThread = 1;
		var totalThreads = Object.keys(thread).length;

		for (var i in thread) {
			if (currentThread > totalThreads) {break;}
			var id = thread[i].thread_id;
			var title = (((thread[i].subject !== null) && (thread[i].subject !== '')) ? thread[i].subject : 'No Subject');
			var subtitle =  thread[i].thread_id + ' | ' + currentThread + '/' + totalThreads + ' ' + Math.round(currentThread / totalThreads * 100) + '%';
			
			currentThread++;
			
			items.push({
				id: id,
				title: title,
				subtitle: subtitle
			});
		}
		return items;
	}
function parseReplies()     {
		var cyoaID = current.cyoaID;
		var threadID = current.threadID;
		
		var items = [];
		ajax({
				url: pineAPI + 'thread/' + cyoaID + '/' + threadID + '/false',
				type: 'json'
			},
			function(data) {
				for (var i in data) {
					if (data[i].replies != (threadID + ',')) {
						continue;
					} //',' because Amm f'ed up
					var id = data[i].post_id;
					var title = '>>' + data[i].post_id;
					var subtitle = data[i].timestamp;

					items.unshift({ //add to start of array
						id: id,
						title: title,
						subtitle: subtitle
					});
				}
				return items;
			},
			function(error) {
				loadSplash.error();
				console.log('Replies Load Fail');
			}
		);
	}
function parsePinnedPosts() {
		//i am so sorry for this
		var items = [];

		for (var i in pinnedPosts) {
			for (var j in pinnedPosts[i]) {
				for (var k in pinnedPosts[i][j]) {
					console.log(pinnedPosts[i][j][k]);
				}
				console.log(pinnedPosts[i][j]);
			}
			console.log(pinnedPosts[i]);
		}
			/*
			var id = '';
			var title = '';
			var subtitle = '';

			items.push({
				id: id,
				title: title,
				subtitle: subtitle
			});
		}
		if (pinnedPosts.length <= 0) {
			items.push({
				id: -1,
				title: 'No Pinned Posts',
				subtitle: 'Click for Tutorial'
			});
		}*/
		return items;
	}
function parsePinnedCYOAs() {
	var data = currentData;
	var CYOAData = {};
	var items = [];

	for (var i = 0; i < pinnedCYOAs.length; i++) {
		CYOAData[pinnedCYOAs[i]] = data[pinnedCYOAs[i]]; //fuck the other CYOAs
	}
	
	currentData = CYOAData;
	
	switch (sortMethodName[sortMethod]) {
		case 'Newest CYOAs':
			console.log('Sorting by: id');
			items = sortCYOAsBy('id');
			break;
		case 'Latest Updates':
			console.log('Sorting by: timestamp');
			items = sortCYOAsBy('timestamp');
			break;
		case 'Alphabetic':
			console.log('Sorting by: title');
			items = sortCYOAsBy('title');
			break;
		case 'Length (Posts)':
			console.log('Sorting by: totalPosts');
			items = sortCYOAsBy('totalPosts');
			break;
		case 'Length (Words)':
			console.log('Sorting by: totalWordCount');
			items = sortCYOAsBy('totalWordCount');
			break;
		default:
			console.log('Sorting by: id (Default)');
			items = sortCYOAsBy('id');
	}
	
	if (pinnedCYOAs.length <= 0) {
		items.push({
			id: -1,
			title: 'No Pinned CYOAs',
			subtitle: 'Click for Tutorial'
		});
	}
	
	currentData = data;
	return items;
}
//                                    ===  /PRSE/  === //get x from data

//                                    ===   MENU   ===
function loadSettings()     {
		console.log('Settings Loading');
		loadSplash.show();
		
		var clearConfirmCYOAs = false;
		var clearConfirmPosts = false;
		
		var menu = new UI.Menu({
			sections: [{
				title: 'Sort',
				items: [{
					id: 0,
					title: 'Sort by:',
					subtitle: sortMethodName[sortMethod],
				}, {
					id: 1,
					title: 'Reverse',
					subtitle: sortReverse ? 'True' : 'False'
				}]
			},{
				title: 'Display',
				items :[{
					id: 2,
					title: 'Font Size',
					subtitle: fontSizeName[fontSize].capitalize(),
				}, {
					id: 3,
					title: 'Date',
					subtitle: dateDisplayName[dateDisplay],
				}]
			}, {
				title: 'Clear Pins',
				items : [{
					id: -1,
					title: 'Clear CYOAs'
				}, {
					id: -2,
					title: 'Clear Posts'
				}]
			}, {
				title: 'Pineapple v' + currentVersion 
			}, {
				title: 'by GreenMoose'
			}]
		});

		menu.on('select', function(e) {
			if (e.item.id === 0) { //I know I should use switch but it's too late and I'm lazy
				sortMethod++;
				if (sortMethod > sortMethodName.length - 1) sortMethod = 0;
				Settings.option('sortMethod', sortMethod);
				menu.item(e.sectionIndex, e.itemIndex, {
					title: e.item.title,
					subtitle: sortMethodName[sortMethod]
				});
			}
			
			if (e.item.id === 1) {
				sortReverse = !sortReverse;
				Settings.option('sortReverse', sortReverse);
				menu.item(e.sectionIndex, e.itemIndex, {
					subtitle: sortReverse ? 'True' : 'False'
				});
			}
			
			if (e.item.id === 2) {
				fontSize++;
				if (fontSize > fontSizeName.length - 1) fontSize = 0;
				Settings.option('fontSize', fontSize);
				menu.item(e.sectionIndex, e.itemIndex, {
					subtitle: fontSizeName[fontSize].capitalize()
				});
			}
			
			if (e.item.id === 3) {
				dateDisplay++;
				if (dateDisplay > dateDisplayName.length - 1) dateDisplay = 0;
				Settings.option('dateDisplay', dateDisplay);
				menu.item(e.sectionIndex, e.itemIndex, {
					subtitle: dateDisplayName[dateDisplay]
				});
			}
			
			if (e.item.id === -1) {
				if (clearConfirmCYOAs === false) {
					menu.item(e.sectionIndex, e.itemIndex, {
						subtitle: 'Are you sure?'
					});
					clearConfirmCYOAs = true;
				} else {
					pinnedCYOAs = [];
					Settings.option('pinnedCYOAs', pinnedCYOAs);
					menu.item(e.sectionIndex, e.itemIndex, {
						subtitle: 'Pinned CYOAs Cleared.'
					});
				}
			}
			
			if (e.item.id === -2) {
				if (clearConfirmPosts === false) {
					menu.item(e.sectionIndex, e.itemIndex, {
						subtitle: 'Are you sure?'
					});
					clearConfirmPosts = true;
				} else {
					pinnedPosts = {};
					Settings.option('pinnedPosts', pinnedPosts);
					menu.item(e.sectionIndex, e.itemIndex, {
						subtitle: 'Pinned Posts Cleared.'
					});
				}
			}
		});

		//Show menu
		menu.show();
		loadSplash.hide();
		console.log('Settings Loaded');
	} //Pineapple Settings
function loadPinTutorial()  {
		console.log('Pin tut Loading');
		loadSplash.show();

		var card = new UI.Card({
			title: 'How to Pin',
			subtitle: 'A Guide',
			scrollable: true,
			style: fontSizeName[fontSize]
		});

		card.body('Pinning a CYOA:' + '\n' +
			'1: Highlight the CYOA' + '\n' +
			'2: Longpress Select for detailed view' + '\n' +
			'3: Press Select again for menu' + '\n' +
			'4: Select \'Pin CYOA\'' + '\n' +
			'Repeat the same steps to unpin a CYOA.' + '\n' +
			'___________________' + '\n' +
			'Pinning a Post:' + '\n' +
			'1: Go to a post' + '\n' +
			'3: Longpress Select for menu' + '\n' +
			'4: Select \'Pin Post\'' + '\n' +
			'Repeat the same steps to unpin a Post.');

		//Show menu
		card.show();
		loadSplash.hide();
		console.log('Pin tut Loaded');
	} //lrn 2 pin
function loadReplies()      {
		parseReplies();
	} //Loads posts the QM replied to
function loadPostMenu()     {
		var parsedPinnedPosts = pinnedPosts;	
		if (parsedPinnedPosts[current.cyoaID] === undefined) parsedPinnedPosts[current.cyoaID] = [];
		
		var menu = new UI.Menu({
			sections: [{
				title: 'Post Menu',
				items: [{
					id: -1,
					title: ((parsedPinnedPosts[current.cyoaID].contains(current.postID)) ? 'Unpin Post' : 'Pin Post')
				},{
					id: -2,
					title: 'View Replies'
				}]
			}]
		});
		
		menu.on('select', function(e){
			if (e.item.id === -1) {			
				if (parsedPinnedPosts[current.cyoaID].contains(current.postID)) {
					var index = parsedPinnedPosts[current.cyoaID].indexOf(current.postID);
					
					parsedPinnedPosts[current.cyoaID].splice(index, 1);
					
					console.log('removed ' + current.postID + ' from ' + current.cyoaID);
				} else {
					
					parsedPinnedPosts[current.cyoaID].push(current.postID);
					
					console.log('added ' + current.postID + ' to ' + current.cyoaID);
				}
				
				console.log(parsedPinnedPosts[current.cyoaID]);
				
				menu.item(e.sectionIndex, e.itemIndex, {
					title: ((parsedPinnedPosts[current.cyoaID].contains(current.postID)) ? 'Unpin Post' : 'Pin Post')
				});
				
				Settings.option('pinnedPosts', parsedPinnedPosts);
				pinnedPosts = Settings.option('pinnedPosts');
				return;
			}
			if (e.item.id === -2) {
				loadReplies();
				return;
			}
		});
		menu.show();
	}
function loadCYOASettings() {
		var cyoaID = current.cyoaID;
		var data = currentData;
		console.log('Settings Loading. cyoaID: ' + cyoaID);
		loadSplash.show();
		console.log(pinnedCYOAs.contains(cyoaID));

		var menu = new UI.Menu({
			sections: [{
				title: 'Sort',
				items: [{
					id: 0,
					title: ((pinnedCYOAs.contains(cyoaID)) ? 'Unpin CYOA' : 'Pin CYOA'),
				}, {
					id: 1,
					title: 'First Post',
					subtitle: data[cyoaID].first.timestamp
				}, {
					id: 2,
					title: 'Last Post',
					subtitle: data[cyoaID].last.timestamp
				}]
			}]
		});

		menu.on('select', function(e) {
			if (e.item.id === 0) {
				var parsedPinnedCYOAs = pinnedCYOAs;
				console.log(Array.isArray(parsedPinnedCYOAs));
				if (parsedPinnedCYOAs.contains(cyoaID)) {
					var index = parsedPinnedCYOAs.indexOf(cyoaID);
					parsedPinnedCYOAs.splice(index, 1);
					Settings.option('pinnedCYOAs', parsedPinnedCYOAs);
					pinnedCYOAs = Settings.option('pinnedCYOAs');
					console.log('removed ' + cyoaID);
				} else {
					parsedPinnedCYOAs.push(cyoaID);
					Settings.option('pinnedCYOAs', parsedPinnedCYOAs);
					pinnedCYOAs = Settings.option('pinnedCYOAs');
					console.log(pinnedCYOAs);
					console.log('added ' + cyoaID);
				}
				console.log(parsedPinnedCYOAs);
				menu.item(e.sectionIndex, e.itemIndex, {
					title: ((parsedPinnedCYOAs.contains(cyoaID)) ? 'Unpin CYOA' : 'Pin CYOA')
				});
				Settings.option('pinnedCYOAs', parsedPinnedCYOAs);
				pinnedCYOAs = Settings.option('pinnedCYOAs');
			}
			if (e.item.id === 1) {
				/// TO BE DONE!
			}
		});

		//Show menu
		menu.show();
		loadSplash.hide();
		console.log('Settings Loaded');
	} //load settings & stuff for a CYOA
function loadDetails()      {
		var cyoaID = current.cyoaID;
		var data = currentData;
		console.log('Details Loading. cyoaID: ' + cyoaID);
		loadSplash.show();
		var card = new UI.Card({
			title: data[cyoaID].title,
			subtitle: data[cyoaID].tags,
			scrollable: true,
			style: fontSizeName[fontSize]
		});
		card.body(formatPost(data[cyoaID].description) + '\n' + //format because html tags
							((fontSizeName[fontSize] === 'small') ? '___________________' : '_____________') + '\n' +
							'Words: ' + data[cyoaID].stats.totalWordCount + '\n' +
							'Images: ' + data[cyoaID].stats.totalImages + '\n' +
							'Posts: ' + data[cyoaID].stats.totalPosts + '\n' +
							'Threads: ' + data[cyoaID].stats.totalThreads + '\n' +
							((fontSizeName[fontSize] === 'small') ? '___________________' : '_____________') + '\n' +
							'Updates/Session: ' + data[cyoaID].stats.updatesPerSession + '\n' +
							'Time/Update: ' + data[cyoaID].stats.updateTime + 'm'
		);

		card.on('click', 'select', function() {
			loadCYOASettings();
		});

		//Show menu
		card.show();
		loadSplash.hide();
		console.log('Details Loaded');
	} //Detailed view for a CYOA
function loadQMPost()       {
		var cyoaID = current.cyoaID;
		var postID = current.postID;
		console.log('Comment Loading. cyoaID: ' + cyoaID + '. postID: ' + postID);
		loadSplash.show();
		ajax({
				url: pineAPI + 'post/' + cyoaID + '/' + postID,
				type: 'json'
			},
			function(data) {
				loadSplash.hide();
				currentData = data;
				currentPage = 1;
				createPostCard();
				
				console.log('Comment Loaded');
			},
			function(error) {
				loadSplash.error();
				console.log('Comment Load fail');
			}
		);
	} //QM posts
function loadPosts()        {
		console.log('Posts Loading. cyoaID: ' + current.cyoaID + '. threadID: ' + current.threadID);
		loadSplash.show();
		ajax({
				url: pineAPI + 'thread/' + current.cyoaID + '/' + current.threadID,
				type: 'json'
			},
			function(data) {
				//create array of menu things
				var menuItems = formatPosts(data);

				//make menu
				var menu = new UI.Menu({
					sections: [{
						title: current.threadTitle,
						items: menuItems,
					}]
				});

				//action on select
				menu.on('select', function(e) {
					current.postID = e.item.id;
					loadQMPost();
				});
				
				menu.on('longSelect', function(e) {
					current.postID = e.item.id;
					loadPostMenu();
				});

				//Show menu
				menu.show();
				loadSplash.hide();
				console.log('Posts Loaded');
			},
			function(error) {
				loadSplash.error();
				console.log('Posts Load Fail');
			}
		);
	} //All QM posts from a thread
function loadThreads()      {
		console.log('Threads Loading. cyoaID: ' + current.cyoaID);
		loadSplash.show();
		ajax({
				url: pineAPI + 'threads/' + current.cyoaID,
				type: 'json'
			},
			function(data) {
				currentData = data;
				var menuItems = formatThreads(currentData);

				//make menu
				var menu = new UI.Menu({
					sections: [{
						title: current.cyoaTitle,
						items: menuItems
					}]
				});

				menu.on('select', function(e) {
					current.threadID = e.item.id;
					current.threadTitle = e.item.title;
					loadPosts();
				});

				menu.show();
				splashWindow.hide();
				console.log('Threads Loaded');
			},
			function(error) {
				loadSplash.error();
				console.log('Threads Load Fail');
			}
		);
	} //All CYOA thread
function loadPinnedCYOAs()  {
		console.log('Getting ' + pinnedCYOAs.length + ' CYOAs');
		loadSplash.show();
		
		//make menu
		var menu = new UI.Menu({
			sections: [{
				title: 'Pinned CYOAs',
			}]
		});

		menu.on('select', function(e) {
			if (e.item.id === -1) {
				loadPinTutorial();
				return;
			}
			current.cyoaID = e.item.id;
			current.cyoaTitle = e.item.title;
			loadThreads();
		});
		
		menu.on('longSelect', function(e) {
			if (e.item.id === -1) return;
			current.cyoaID = e.item.id;
			loadDetails();
		});
		
		menu.on('show', function(e) {
			var items = parsePinnedCYOAs();
		
			menu.section(1, {
				items: items
			});
		});
		
		menu.show();
		loadSplash.hide();
	} //Menu for pinned CYOAs
function loadPinnedPosts()  {
		var data = currentData;
		console.log('Getting pinned posts');
		loadSplash.show();
		var items = parsePinnedPosts(data);

		//make menu
		var menu = new UI.Menu({
			sections: [{
				title: 'Pinned Posts',
				items: items
			}]
		});

		menu.on('select', function(e) {
			if (e.item.id === -1) {
				loadPinTutorial();
				return;
			}
			
		});

		menu.on('longSelect', function(e) {
			if (e.item.id <= -1) {
				return;
			}
			
		});

		menu.show();
		loadSplash.hide();
	} //Menu for pinned posts
function loadCYOA()         {
		console.log('CYOAs Loading');
		ajax({
				url: pineAPI + 'cyoa/',
				type: 'json'
			},
			function(data) {
				var sectionIndex = 0;
				var itemIndex = 0;
				currentData = data;

				//make menu
				var menu = new UI.Menu({
					sections: [{
						items: [{
							id: -1,
							title: 'Settings'
						}]
					}, {
						title: 'Pinned CYOAs',
						items: [{
							id: -2,
							title: 'View Pinned CYOAs',
						}]
					}, {
						title: 'Pinned Posts',
						items: [{
							id: -3,
							title: 'View Pinned Posts',
						}]
					}]
				});

				menu.on('select', function(e) {
					sectionIndex = e.sectionIndex;
					itemIndex = e.itemIndex;
					currentData = data;
					if (e.item.id === -1) {
						loadSettings();
						return;
					}
					if (e.item.id === -2) {
						loadPinnedCYOAs();
						return;
					}
					if (e.item.id === -3) {
						loadPinnedPosts();
						return;
					}
					current.cyoaID = e.item.id;
					current.cyoaTitle = e.item.title;
					loadThreads();
				});

				menu.on('longSelect', function(e) {
					sectionIndex = e.sectionIndex;
					itemIndex = e.itemIndex;
					if (e.item.id <= -1) {
						return;
					}
					current.cyoaID = e.item.id;
					currentData = data;
					loadDetails();
				});

				menu.on('show', function() {
					//var menuItems = sortNewest(data);
					var menuItems = [];
					
					switch (sortMethodName[sortMethod]) {
						case 'Newest CYOAs':
							console.log('Sorting by: id');
							menuItems = sortCYOAsBy('id');
							break;
						case 'Latest Updates':
							console.log('Sorting by: timestamp');
							menuItems = sortCYOAsBy('timestamp');
							break;
						case 'Alphabetic':
							console.log('Sorting by: title');
							menuItems = sortCYOAsBy('title');
							break;
						case 'Length (Posts)':
							console.log('Sorting by: totalPosts');
							menuItems = sortCYOAsBy('totalPosts');
							break;
						case 'Length (Words)':
							console.log('Sorting by: totalWordCount');
							menuItems = sortCYOAsBy('totalWordCount');
							break;
						default:
							console.log('Sorting by: id (Default)');
							menuItems = sortCYOAsBy('id');
					}
					
					menu.section(3, {
						title: sortMethodName[sortMethod] + (sortReverse ? ' (Reversed)' : ''),
						items: menuItems
					});
					menu.selection(sectionIndex, itemIndex);
				});
			
				menu.show();
				loadSplash.hide();
				console.log('CYOAs loaded');
				
				//var sorted = sortAlphabetic(data, 'title', 'string');
				//console.log(sorted);
			},
			function(error) {
				loadSplash.error();
				console.log('CYOAs Load Fail');
			}
		);
	} //CYOAs, sorted
//                                    ===  /MENU/  ===

//                                    ===   MAIN    ===
loadCYOA();
//                                    ===  /MAIN/  ===

//                                   ===   FUNC   ===
//shh js I know what I'm doing
String.prototype.capitalize = function() { //shh cloudpebble I know what I'm doing
	return this.charAt(0).toUpperCase() + this.slice(1);
}; //js cant into capitalize
Array.prototype.contains = function(obj) {
	var i = this.length;
	while (i--) {
		if (this[i] === obj) {
			return true;
		}
	}
	return false;
};

function randMinMaxInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatPost(str) {
	str = str.replace(/<br>/g, '\n'); //replace so text shows up correctly
	str = str.replace(/<span class=['"]spoiler['"]>(.*)<\/span>/g, '[s]$1[/s]');
	str = str.replace(/<s>(.*)<\/s>/g, '[s]$1[/s]');
	str = str.replace(/<(?:.)*?>/g, '');
	str = str.replace(/&gt;/g, '>');
	str = str.replace(/&lt;/g, '<');
	str = str.replace(/&#039;/g, '\'');
	str = str.replace(/&quot;/g, '\"');
	str = str.replace(/&rsquo;/g, '’');
	str = str.replace(/&lsquo;/g, '‘');
	str = str.replace(/&rdquo;/g, '”');
	str = str.replace(/&ldquo;/g, '“');
	str = str.replace(/&ndash;/g, '–');
	str = str.replace(/&mdash;/g, '—');
	str = str.replace(/&hellip;/g, '…');
	str = str.replace(/&amp;/g, '&');
	return str;
}

function createPostCard(choppedWord) {
	console.log('creating card');
	var pageSize = 350; //where to chop off the text and create a new page
	var img = ((currentPage === 1) ? ((currentData.image_link !== null && currentData.image_link !== '') ? ('(' + currentData.image_link + ')') : '') : '');
	var str = formatPost(currentData.comment);
	
	var start = pageSize * (currentPage - 1);
	var end = (((str.length - start) > pageSize) ? (start + pageSize) : str.length);

	var lastWordRegex = /(?:>\s*)?[>"']*\w{1,10}$/;
	choppedWord = ((choppedWord === undefined) ? '' : choppedWord); //word that's removed if we trunicate the text
	var body = 'You should never see this';

	var pages = Math.ceil(str.length / pageSize);
	if (pages === 0) pages = 1; //fix for image-only posts

	if (pages > 1) {
		console.log('Too Big: Trunicating...');
		var strBody = choppedWord + str.substring(start, end);
		console.log(strBody);
		
		if (currentPage !== pages) { //if not last page
			choppedWord = lastWordRegex.exec(strBody);
			
			if (choppedWord === null || choppedWord === undefined) choppedWord = '';
			
			strBody = strBody.replace(lastWordRegex, '');
			body = strBody + '=\>' + '\n' + '[Select to Continue]';
		} else {
			body = strBody;
		}
		
	} else {
		body = str;
	}
	
	console.log(body);
	
	var card = new UI.Card({
		title: ((currentData.name !== null) ? currentData.name : '') + ' ' +
					 (((currentData.trip !== null && currentPage === 1) || (currentData.name === null)) ? currentData.trip : ''),
		subtitle: ((currentPage === 1) ? ('No. ' + currentData.post_id + ((img !== '') ? '\n' + img : '')) + '\n' : '') + 
							((pages == 1) ? '' : 'Page ' + currentPage + '/' + pages),
		body: body,
		scrollable: true,
		style: fontSizeName[fontSize]
	});
	
	card.on('click', 'select', function() {
		if (currentPage === pages) {
			console.log('last page!');
			return;
		}
		currentPage++;
		createPostCard(choppedWord);
	});
	
	card.on('click', 'back', function() {
		currentPage = ((currentPage > 1) ? currentPage - 1 : 1);
		card.hide();
		return;
	});

  card.show();
}

function timestampToDate(time) {
		var date = new Date(time.substring( 0, 4),     //year
											 (time.substring( 5, 7) - 1),//month (0-indexed because why not?)
												time.substring( 8,10),     //day
												time.substring(11,13),     //hour
												time.substring(14,16),     //minute
												time.substring(17,19)      //seconds
											 ); //I need to do this so that this function works.
	
	return date;
}

function time_ago(time){ //function I stole from StackOverflow (Thanks TheBrain!)
	
	time = timestampToDate(time);
	
	switch (typeof time) {
			case 'number': break;
			case 'string': time = +new Date(time); break;
			case 'object': if (time.constructor === Date) time = time.getTime(); break;
			default: time = +new Date();
	}
	
	var time_formats = [
			[60, 'seconds', 1], // 60
			[120, '1 minute ago', '1 minute from now'], // 60*2
			[3600, 'minutes', 60], // 60*60, 60
			[7200, '1 hour ago', '1 hour from now'], // 60*60*2
			[86400, 'hours', 3600], // 60*60*24, 60*60
			[172800, 'Yesterday', 'Tomorrow'], // 60*60*24*2
			[604800, 'days', 86400], // 60*60*24*7, 60*60*24
			[1209600, 'Last week', 'Next week'], // 60*60*24*7*4*2
			[2419200, 'weeks', 604800], // 60*60*24*7*4, 60*60*24*7
			[4838400, 'Last month', 'Next month'], // 60*60*24*7*4*2
			[29030400, 'months', 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
			[58060800, 'Last year', 'Next year'], // 60*60*24*7*4*12*2
			[2903040000, 'years', 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
			[5806080000, 'Last century', 'Next century'], // 60*60*24*7*4*12*100*2
			[58060800000, 'centuries', 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
	];
	var seconds = (+new Date() - time) / 1000,
			token = 'ago', list_choice = 1;

	if (seconds === 0) {
			return 'Just now';
	}
	if (seconds < 0) {
			seconds = Math.abs(seconds);
			token = 'from now';
			list_choice = 2;
	}
	var i = 0, format;
	while (format = time_formats[i++])
			if (seconds < format[0]) {
					if (typeof format[2] == 'string')
							return format[list_choice];
					else
							return Math.floor(seconds / format[2]) + ' ' + format[1] + ' ' + token;
			}
	return time;
}
//                                    ===  /FUNC/  ===
//wake me up inside
/* I remember when this was less than 1000 lines long.
 * Those were the times.
 * A lot less shit to worry about breaking.
 */