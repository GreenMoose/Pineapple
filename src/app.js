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
/*
var cyoaID   = currentID.cyoaID;
var threadID = currentID.threadID;
var postID   = currentID.postID;
*/
{ //                                    ===   GLBL   ===
	var UI = require('ui');
	var ajax = require('ajax');
	var Vector2 = require('vector2');
	var Settings = require('settings');

	var pineAPI = 'http://www.anonpone.com/api/'; //base url for the api
	
	var pinnedCYOAs = Settings.option('pinnedCYOAs');
	if (pinnedCYOAs === undefined) pinnedCYOAs = [];
	Settings.option('pinnedPosts', {
		112: [289596]
	}); //Form of : 'CyoaId': ['postId', 'postId',...]
	var pinnedPosts = Settings.option('pinnedPosts');
	if (pinnedPosts === undefined) pinnedPosts = {};
	//Settings!
	Settings.option('sortMethod', 0);
	var sortMethod = Settings.option('sortMethod'); //see sortMethodName
	
	
	var currentID = {
		'cyoaID': null,
		'threadID': null,
		'postID': null
	};
	var currentData;
	var currentPage;
	
	var sortMethodName = ['Newest CYOAs',
												'Latest Updates', 
												'Alphabetic', 
												'Length (Posts)', 
												'Length (Words)'
												];
	var sortReverse = false; // Reverse sort
	var repliesDisplayName = ['Show', 
														'Hide', 
														'Collapse'];
	
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
		'!roll 1d20'
	];
} //                                    ===  /GLBL/  ===
{ //                                    ===   INIT   ===
	var splashWindow = new UI.Window({
		fullscreen: true
	}); //tell people to calm their tits
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
		font: 'bitham-30-black',
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
		var randNum = randMinMaxInt(0, choosieSays.length);
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
	});
} //                                    ===  /INIT/  ===
{ //                                    ===   SORT   ===
	var sortNewest = function(cyoa) { //sort by ID (low to high)
		var items = [];

		for (var i in cyoa) {
			var id = cyoa[i].id;
			var title = cyoa[i].title;
			var subtitle = '[' +
				((cyoa[i].live === '1') ? 'L' :
					((cyoa[i].status === 'cancelled') ? 'X' :
						cyoa[i].status.capitalize().substring(0, 1))) +
				']' +
				' ' +
				cyoa[i].last.timestamp.substring(2, 19);

			items.unshift({ //add to start of array
				id: id,
				title: title,
				subtitle: subtitle
			});
		}
		if (sortReverse) {
			return items.reverse();
		} else {
			return items;
		}
	};
} //                                    ===  /SORT/  ===
{ //                                    ===   PRSE   ===
	var formatPosts      = function(posts) {
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
	};
	var formatThreads    = function(thread) {
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
	};
	var parseReplies     = function() {
		var cyoaID = currentID.cyoaID;
		var threadID = currentID.threadID;
		
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
	};
	var parsePinnedPosts = function() {
		var data = currentData;
		var items = [];

		for (var i = 0; i < pinnedCYOAs.length; ++i) {
			var id = data[pinnedCYOAs[i]].id;
			var title = data[pinnedCYOAs[i]].title;
			var subtitle = '[' +
				((data[pinnedCYOAs[i]].live === '1') ? 'L' :
					((data[pinnedCYOAs[i]].status === 'cancelled') ? 'X' :
						data[pinnedCYOAs[i]].status.capitalize().substring(0, 1))) +
				']' +
				' ' +
				data[pinnedCYOAs[i]].last.timestamp.substring(2, 16);

			items.push({
				id: id,
				title: title,
				subtitle: subtitle
			});
		}
		if (pinnedCYOAs.length <= 0) {
			items.push({
				id: -1,
				title: 'No Pinned Posts',
				subtitle: 'Click for Tutorial'
			});
		}
		return items;
	};
	var parsePinnedCYOAs = function() {
		var data = currentData;
		var items = [];

		for (var i = 0; i < pinnedCYOAs.length; ++i) {
			var id = data[pinnedCYOAs[i]].id;
			var title = data[pinnedCYOAs[i]].title;
			var subtitle = '[' +
				((data[pinnedCYOAs[i]].live === '1') ? 'L' :
					((data[pinnedCYOAs[i]].status === 'cancelled') ? 'X' :
						data[pinnedCYOAs[i]].status.capitalize().substring(0, 1))) +
				']' +
				' ' +
				data[pinnedCYOAs[i]].last.timestamp.substring(2, 16);

			items.push({
				id: id,
				title: title,
				subtitle: subtitle
			});
		}
		if (pinnedCYOAs.length <= 0) {
			items.push({
				id: -1,
				title: 'No Pinned CYOAs',
				subtitle: 'Click for Tutorial'
			});
		}
		return items;
	};
} //                                    ===  /PRSE/  === //get x from data
{ //                                    ===   MENU    ===
	var loadSettings     = function() {
		console.log('Settings Loading');
		loadSplash.show();

		var menu = new UI.Menu({
			fullscreen: false,
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
			}]
		});

		menu.on('select', function(e) {
			if (e.item.id === 0) {
				sortMethod++;
				if (sortMethod > sortMethodName.length - 1) sortMethod = 0;
				menu.item(e.sectionIndex, e.itemIndex, {
					title: e.item.title,
					subtitle: sortMethodName[sortMethod]
				});
			}
			
			if (e.item.id === 1) {
				sortReverse = !sortReverse;
				menu.item(e.sectionIndex, e.itemIndex, {
					subtitle: sortReverse ? 'True' : 'False'
				});
			}
			
			if (e.item.id === 2) {
				repliesDisplay++;
				if (repliesDisplay > repliesDisplayName.length - 1) repliesDisplay = 0;
				menu.item(e.sectionIndex, e.itemIndex, {
					subtitle: repliesDisplayName[repliesDisplay]
				});
			}
		});

		//Show menu
		menu.show();
		loadSplash.hide();
		console.log('Settings Loaded');
	}; //Pineapple Settings
	var loadPinTutorial  = function() {
		console.log('Pin tut Loading');
		loadSplash.show();

		var card = new UI.Card({
			title: 'How to Pin',
			subtitle: 'A Guide',
			scrollable: true,
			fullscreen: false,
			style: 'small'
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
	}; //lrn 2 pin
	var loadReplies      = function() {
		parseReplies();
	}; //Loads posts the QM replied to
	var loadPostMenu     = function() {
		var parsedPinnedPosts = pinnedPosts;	
		if (parsedPinnedPosts[currentID.cyoaID] === undefined) parsedPinnedPosts[currentID.cyoaID] = [];
		
		var menu = new UI.Menu({
			fullscreen: false,
			sections: [{
				title: 'Post Menu',
				items: [{
					id: -1,
					title: ((parsedPinnedPosts[currentID.cyoaID].contains(currentID.postID)) ? 'Unpin CYOA' : 'Pin CYOA')
				},{
					id: -2,
					title: 'View Replies'
				}]
			}]
		});
		
		menu.on('select', function(e){
			if (e.item.id === -1) {			
				if (parsedPinnedPosts[currentID.cyoaID].contains(currentID.postID)) {
					var index = parsedPinnedPosts[currentID.cyoaID].indexOf(currentID.postID);
					
					parsedPinnedPosts[currentID.cyoaID].splice(index, 1);
					
					console.log('removed ' + currentID.postID + ' from ' + currentID.cyoaID);
				} else {
					
					parsedPinnedPosts[currentID.cyoaID].push(currentID.postID);
					
					console.log('added ' + currentID.postID + ' to ' + currentID.cyoaID);
				}
				
				console.log(parsedPinnedPosts[currentID.cyoaID]);
				
				menu.item(e.sectionIndex, e.itemIndex, {
					title: ((parsedPinnedPosts[currentID.cyoaID].contains(currentID.postID)) ? 'Unpin CYOA' : 'Pin CYOA')
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
	};
	var loadCYOASettings = function() {
		var cyoaID = currentID.cyoaID;
		var data = currentData;
		console.log('Settings Loading. cyoaID: ' + cyoaID);
		loadSplash.show();
		console.log(pinnedCYOAs.contains(cyoaID));

		var menu = new UI.Menu({
			fullscreen: false,
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
	}; //load settings & stuff for a CYOA
	var loadDetails      = function() {
		var cyoaID = currentID.cyoaID;
		var data = currentData;
		console.log('Details Loading. cyoaID: ' + cyoaID);
		loadSplash.show();
		var card = new UI.Card({
			title: data[cyoaID].title,
			subtitle: data[cyoaID].tags,
			scrollable: true,
			fullscreen: false,
			style: 'small'
		});
		card.body(formatPost(data[cyoaID].description) + '\n' + //format because html tags
			'___________________' + '\n' +
			'Words: ' + data[cyoaID].stats.totalWordCount + '\n' +
			'Images: ' + data[cyoaID].stats.totalImages + '\n' +
			'Posts: ' + data[cyoaID].stats.totalPosts + '\n' +
			'Threads: ' + data[cyoaID].stats.totalThreads + '\n' +
			'___________________' + '\n' +
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
	}; //Detailed view for a CYOA
	var loadQMPost       = function() {
		var cyoaID = currentID.cyoaID;
		var postID = currentID.postID;
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
	}; //QM posts
	var loadPosts        = function() {
		var cyoaID = currentID.cyoaID;
		var threadID = currentID.threadID;
		console.log('Posts Loading. cyoaID: ' + cyoaID + '. threadID: ' + threadID);
		loadSplash.show();
		ajax({
				url: pineAPI + 'thread/' + cyoaID + '/' + threadID,
				type: 'json'
			},
			function(data) {
				//create array of menu things
				var menuItems = formatPosts(data);

				//make menu
				var menu = new UI.Menu({
					fullscreen: false,
					sections: [{
						title: 'Posts',
						items: menuItems,
					}]
				});

				//action on select
				menu.on('select', function(e) {
					currentID.postID = e.item.id;
					loadQMPost();
				});
				
				menu.on('longSelect', function(e) {
					currentID.postID = e.item.id;
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
	}; //All QM posts from a thread
	var loadThreads      = function() {
		var cyoaID = currentID.cyoaID;
		console.log('Threads Loading. cyoaID: ' + cyoaID);
		loadSplash.show();
		ajax({
				url: pineAPI + 'threads/' + cyoaID,
				type: 'json'
			},
			function(data) {
				var menuItems = formatThreads(data);

				//make menu
				var menu = new UI.Menu({
					fullscreen: false,
					sections: [{
						title: 'Threads',
						items: menuItems
					}]
				});

				menu.on('select', function(e) {
					currentID.threadID = e.item.id;
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
	}; //All CYOA thread
	var loadPinnedCYOAs  = function() {
		console.log('Getting ' + pinnedCYOAs.length + ' CYOAs');
		loadSplash.show();
		
		//make menu
		var menu = new UI.Menu({
			fullscreen: false,
			sections: [{
				title: 'Pinned CYOAs',
			}]
		});

		menu.on('select', function(e) {
			if (e.item.id === -1) {
				loadPinTutorial();
				return;
			}
			currentID.cyoaID = e.item.id;
			loadThreads();
		});
		
		menu.on('longSelect', function(e) {
			if (e.item.id === -1) return;
			currentID.cyoaID = e.item.id;
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
	}; //Menu for pinned CYOAs
	var loadPinnedPosts  = function() {
		var data = currentData;
		console.log('Getting pinned posts');
		loadSplash.show();
		var items = parsePinnedPosts(data);

		//make menu
		var menu = new UI.Menu({
			fullscreen: false,
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
			currentID.cyoaID = e.item.id;
			loadThreads();
		});

		menu.on('longSelect', function(e) {
			if (e.item.id <= -1) {
				return;
			}
			currentID.cyoaID = e.item.id;
			currentData = data;
			loadDetails();
		});

		menu.show();
		loadSplash.hide();
	}; //Menu for pinned posts
	var loadCYOA         = function() {
		console.log('CYOAs Loading');
		ajax({
				url: pineAPI + 'cyoa/',
				type: 'json'
			},
			function(data) {
				var sectionIndex = 0;
				var itemIndex = 0;

				//make menu
				var menu = new UI.Menu({
					fullscreen: false,
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
					currentID.cyoaID = e.item.id;
					loadThreads();
				});

				menu.on('longSelect', function(e) {
					sectionIndex = e.sectionIndex;
					itemIndex = e.itemIndex;
					if (e.item.id <= -1) {
						return;
					}
					currentID.cyoaID = e.item.id;
					currentData = data;
					loadDetails();
				});

				menu.on('show', function() {
					var menuItems = sortNewest(data);
					menu.section(3, {
						title: sortMethodName[sortMethod] + (sortReverse ? ' (Reversed)' : ''),
						items: menuItems
					});
					menu.selection(sectionIndex, itemIndex);
				});

				menu.show();
				loadSplash.hide();
				console.log('CYOAs loaded');
			},
			function(error) {
				loadSplash.error();
				console.log('CYOAs Load Fail');
			}
		);
	}; //CYOAs, sorted
} //                                    ===  /MENU/  ===
{ //                                    ===   MAIN    ===
	loadCYOA();
} //                                    ===  /MAIN/  ===
//                                   ===   FUNC   ===
//shh js I know what I'm doing
String.prototype.capitalize = function() { //shh cloudpebble I know what I'm doing
	return this.charAt(0).toUpperCase() + this.slice(1);
}; //js cant into capitalize
Array.prototype.contains = function(obj) {
	var i = this.length;
	//var parsedObj = JSON.parse(obj);
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
	str = str.replace(/&rdquo;/g, '”');
	str = str.replace(/&ldquo;/g, '“');
	str = str.replace(/&ndash;/g, '–');
	str = str.replace(/&mdash;/g, '—');
	str = str.replace(/&hellip;/g, '…');
	str = str.replace(/&amp;/g, '&');
	return str;
}

function createPostCard(choppedWord) {
	loadSplash.show();
	var img = ((currentPage === 1) ? ((currentData.image_link !== null) ? ('(' + currentData.image_link + ')') : '') : '');
	var str = formatPost(currentData.comment);
	
	var start = 950 * (currentPage - 1);
	var end = (((str.length - start) > 950) ? (start + 950) : str.length);

	var lastWordRegex = />*\w+$/;
	choppedWord = ((choppedWord === undefined) ? '' : choppedWord); //word that's removed if we trunicate the text
	var body = 'You should never see this';

	var pages = Math.ceil(str.length / 950);

	if (pages > 1) {
		console.log('Too Big: Trunicating...');
		var strBody = choppedWord + str.substring(start, end);
		console.log(strBody);
		if (currentPage !== pages) { //if not last page
			choppedWord = lastWordRegex.exec(strBody);
			if (choppedWord === null || choppedWord === undefined) {
				choppedWord = '';
			}
			strBody = strBody.replace(/\s\w+$/g, '');
			body = strBody + '=\>' + '\n' + '[Select to Continue]';
		} else {
			body = strBody;
		}
	} else {
		body = str;
	}
	
	console.log(body);
	
	var card = new UI.Card({
		title: ((currentData.name !== null) ? currentData.name : '') + ' ' + ((currentData.trip !== null) ? currentData.trip : ''),
		subtitle: 'No. ' + currentData.post_id + ((img !== '') ? '\n' + img : '') + ((pages == 1) ? '' : '\n' + 'Page ' + currentPage + '/' + pages),
		body: body,
		scrollable: true,
		fullscreen: false,
		style: 'small'
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
	});

  card.show();
	loadSplash.hide();
}
//                                    ===  /FUNC/  ===
//wake me up inside