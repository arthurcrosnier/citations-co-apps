(function(window, _) {


	var app = {
		// Cache dom elements that we'll use a lot
		$ : {
			navLinks : Array.prototype.slice.call(document.querySelectorAll('.navigation li a'), 0),
			navItems : Array.prototype.slice.call(document.querySelectorAll('.navigation li'), 0),
			content : document.getElementById('content'),
			searchForm : document.getElementById('searchForm'),
			appContent : document.getElementById('app-content'),
			views : {
				'famous-quotes' : document.getElementById('famous-quotes'),
				'user-quotes' : document.getElementById('user-quotes'),
				'contrib-quotes' : document.getElementById('contrib-quotes'),
				'top-quotes' : document.getElementById('top-quotes'),
				'search-quotes' : document.getElementById('search-quotes')
			},
			body : document.body
		},
		supports : {},
		testHTML5Features : function() {
			var tests = {
				'localStorage' : function() {
					return !!window.localStorage;
				},
				'canvas' : 	function() {
					var elem = document.createElement('canvas');
					return !!(elem.getContext && elem.getContext('2d'));
				}
			};

			this.supports.canvas = tests.canvas();
			this.supports.localStorage = tests.localStorage();
		},
		// Precompile the templates
		templates : {
			itemsList : _.template(document.getElementById('itemsListTemplate').innerHTML)
		},
		views : {'famous-quotes' : function() {}, 'user-quotes' : function() {}, 'contrib-quotes' : function() {}, 'top-quotes' : function() {}, 'search-quotes' : function() {}},
		viewsCache : {}
	};

	var viewPrototype = function() {};

	viewPrototype.prototype.init = function() {
		app.$.appContent.classList.add('loading');
		this.preloadElements = {};
		if(app.supports.localStorage && window.localStorage.getItem(app.currentViewName)) {
			var cache = window.localStorage.getItem(app.currentViewName);
			this.items = window.items = JSON.parse(cache);
			this.isCached = true;
		} else {
			this.items = window.items = [];
		}
	};

	viewPrototype.prototype.render = function(response) {
		app.$.views[app.currentViewName].classList.remove('hidden');
		var items = response && response.items ? response.items : [],
			self = this;
		var newItems = 0;

		_.each(items, function(item) {
			item.src = self.imageUrlPrefix+item.imagename;
			var itemExists = _.findWhere(this.items, { id : item.id });
			if(itemExists) {
				itemExists = item;
			} else if(!this.refreshing) {
				self.items.push(item);
				newItems++;
			}
		});

		if(this.refreshing) {
			this.items = _.union(items, this.items);
		}

		if(response) {
			if(app.supports.localStorage && (!this.isCached || this.refreshing)) {
				window.localStorage.setItem(app.currentViewName, JSON.stringify(this.items));
			}
		}

		if(!this.isRendered) {
			var template = app.templates.itemsList({ viewName : app.currentViewName, items : this.items, imageUrlPrefix : this.imageUrlPrefix });

			app.$.views[app.currentViewName].innerHTML += template;
		} else if(this.refreshing && newItems) {
			var template = app.templates.itemsList({ viewName : app.currentViewName, items : items, imageUrlPrefix : this.imageUrlPrefix });

			app.$.views[app.currentViewName].insertAdjacentHTML('afterbegin', template);		
		}
		if(!this.isRendered || (this.refreshing && newItems)) {
			this.renderImages(this.imagesLoaded, this);
		}
		app.$.appContent.classList.remove('loading');
		this.isRendered = true;
		this.refreshing = false;
		app.$.appContent.classList.remove('refresh');	
	};

	viewPrototype.prototype.close = function() {
		var self = this;

		// Hide view element
		app.$.views[app.currentViewName].classList.add('hidden');

		// Remove all DOM event listeners
		_.each(this.preloadElements, function(imageEl) {
			imageEl.onload = imageEl.onerror = function() {};
			self.preloadElements = [];
		});

	};

	viewPrototype.prototype.start = 0;
	viewPrototype.prototype.end = 10;

	viewPrototype.prototype.votes = [];
	viewPrototype.prototype.voteEndpoint = 'http://www.citations.co/score/';

	viewPrototype.prototype.delegateEvents = function(evt) {
		if(evt.target.classList.contains('vote') || evt.target.parentNode.classList.contains('vote')) {
			evt.preventDefault();
			this.vote(evt.target.parentNode.classList.contains('vote') ? evt.target.parentNode : evt.target);
		}

		else if(evt.target.classList.contains('citation') && evt.target.parentNode.classList.contains('loaded')) {
			if(app.supports.canvas) {
				evt.preventDefault();
				this.saveImageDataToLibrary(evt.target);
			}
		}
	};

	viewPrototype.prototype.refresh = function() {
		if(!this.refreshing) {
			this.start = 0;
			this.end = 10;
			app.$.appContent.classList.add('refresh');
			this.refreshing = true;
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	// target must be the button element
	viewPrototype.prototype.vote = function(target) {
		if(target.classList.contains('active')) {
			return false;
		}
		var vote = parseInt(target.getAttribute('data-vote'));
		var citationId = parseInt(target.getAttribute('data-citation-id'));
		var voteUrl = this.voteEndpoint+citationId+'/'+vote;

		var scoreEl = target.parentNode.querySelector('.score');
		var currentScore = parseInt(scoreEl.innerHTML);

		var item = _.findWhere(this.items, { id : citationId });

		var hasVotedThisQuoteBefore = document.getElementById(app.currentViewName+'-'+item.id).querySelector('.vote.active');

		var newScore = currentScore+(vote || -1);

		scoreEl.innerHTML = newScore;

		if(hasVotedThisQuoteBefore) {
			hasVotedThisQuoteBefore.removeAttribute('disabled');
			hasVotedThisQuoteBefore.classList.remove('active');
		}

		target.classList.add('active');
		target.setAttribute('disabled', 'disabled');

		this.votes.push(citationId);

		var item = _.findWhere(this.items, { id : citationId });

		item.score = newScore;
		item.vote = vote;

		sendRequest(voteUrl);
	};

	viewPrototype.prototype.imagesLoaded = function() {
		var oldStart = this.start;
		this.start = this.end+1;
		this.end += (this.end - oldStart)+1;

		if(this.end > this.items.length) {
			this.end = this.items.length+1;
		}

		if(this.start == this.end) {
			// All images are loaded
			if(app.supports.localStorage) {
				window.localStorage.setItem(app.currentViewName, JSON.stringify(this.items));
			}
			// Base64 everything -> LocalStorage ?
		}

		this.renderImages(this.imagesLoaded, this);
	};

	viewPrototype.prototype.renderImages = function(callback, scope, items) {
		var self = this;
		var items = items || [];

		var length = parseInt(this.end - this.start)+1 || this.items.length;

		if(length) {
			for(var i = this.start; i < this.end+1; i++) {
				items.push(self.items[i]);
			}
		} else {
			items = this.items;
		}

		items.forEach(function(item, idx) {
			if(!item || item.loaded) {
				if(--i == self.start && callback && scope) {
					callback.call(scope);
				}
			} else {
				var preloadEl;
				self.preloadElements[item.id] = preloadEl = new Image();

				preloadEl.onload = function() {
					var wrapper = document.getElementById(app.currentViewName+'-'+item.id);

					wrapper.querySelector('.citation').src = this.src;
					wrapper.classList.add('loaded');
					item.loaded = true;
					item.error = false;

					if(--i == self.start && callback && scope) {
						callback.call(scope);
					}
				}

				preloadEl.onerror = function() {
					var wrapper = document.getElementById(app.currentViewName+'-'+item.id);

					wrapper.parentNode.removeChild(wrapper);
					item.error = true;
					item.loaded = false;

					if(--i == self.start && callback && scope) {
						callback.call(scope);
					}
				}
				preloadEl.src = item.src
			}
		});
	};

	viewPrototype.prototype.saveImageDataToLibrary = function(imageEl) {

		var canvas = document.createElement('canvas'),
			tmpCtx = canvas.getContext("2d");

		canvas.width = 450;
		canvas.height = 600;

		tmpCtx.drawImage(imageEl, 0, 0, canvas.width, canvas.height);

		var imageData = canvas.toDataURL().replace(/data:image\/png;base64,/,'');

		var cordova = window.cordova || null;

		if(!cordova) {
			return false;
		}

		return cordova.exec(this.saveImageSuccess, this.saveImageFailure, "Canvas2ImagePlugin","saveImageDataToLibrary",[imageData]);
	};

	viewPrototype.prototype.saveImageFailure = function() {
		alert("Failure");
	};

	viewPrototype.prototype.saveImageSuccess = function() {
		alert("Success");
	};

	_.each(app.views, function(view) {
		view.prototype = new viewPrototype();
	});

	app.views['famous-quotes'].prototype.init = function() {
		viewPrototype.prototype.init.call(this);
		this.endPoint = 'http://www.citations.co/apiCitation2/0/0';
		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		if(this.isCached) {
			this.render();
		}
		else {
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	app.views['famous-quotes'].prototype.displayErrorMessage = function() {
		console.log("Request Failed");
	};

	app.views['user-quotes'].prototype.init = function() {
		viewPrototype.prototype.init.call(this);
		this.endPoint = 'http://www.citations.co/apiCitation2/0/1';
		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		if(this.isCached) {
			this.render();
		}
		else {
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	app.views['user-quotes'].prototype.displayErrorMessage = function() {
		console.log("Request Failed");
	};

	app.views['contrib-quotes'].prototype.init = function() {
		viewPrototype.prototype.init.call(this);
		this.endPoint = 'http://www.citations.co/apiCitation2/0/2';
		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		if(this.isCached) {
			this.render();
		}
		else {
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	app.views['contrib-quotes'].prototype.displayErrorMessage = function() {
		console.log("Request Failed");
	};

	app.views['top-quotes'].prototype.init = function() {
		viewPrototype.prototype.init.call(this);
		this.endPoint = 'http://www.citations.co/apiCitation2/0/3';
		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		if(this.isCached) {
			this.render();
		}
		else {
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	app.views['top-quotes'].prototype.displayErrorMessage = function() {
		console.log("Request Failed");
	};

	app.views['search-quotes'].prototype.init = function(searchTerm) {
		viewPrototype.prototype.init.call(this);
		this.searchTerm = searchTerm;
		this.endPoint = function() { return 'http://www.citations.co/apisearch2/0/'+this.searchTerm+'/10'; };
	
		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		sendRequest(this.endPoint(), { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
	};

	app.views['search-quotes'].prototype.displayErrorMessage = function() {
		console.log("Request Failed");
	};



	// Listen to global page events

	app.listenToEvents = function() {
		var self = this;

		// Menus toggles

		_.each(document.querySelectorAll('.bar button'), function(item) {
			item.addEventListener('click', function(evt) {
				evt.currentTarget.classList.add('active');
			});
		});


		document.getElementById('toggle-menu-left').addEventListener('click', function(evt){
			evt.preventDefault();
			if(self.snapper.state().state === 'closed') {
				evt.stopPropagation();
				self.snapper.open("left");
				evt.currentTarget.classList.add('active');
			} else {
				self.snapper.close("left");
				evt.currentTarget.classList.remove('active');
			}
		});

		document.getElementById('toggle-menu-right').addEventListener('click', function(evt){
			evt.preventDefault();
			if(self.snapper.state().state === 'closed') {
				evt.stopPropagation();
				self.snapper.open("right");
				evt.currentTarget.classList.add('active');
			} else {
				self.snapper.close("right");
			}
		});

		this.snapper.on('close', function() {
			document.getElementById('toggle-menu-'+self.snapper.state().state).classList.remove('active');
		});

		document.getElementById('header').addEventListener('click', function(){
			if(self.snapper.state().state === 'closed') {
				var scrollTop = document.querySelector('.content').scrollTop;
				if(!scrollTop) {
					self.currentView.refresh();	
				} else {
					document.querySelector('.content').scrollTop = 0;	
				}
			}
		});


		this.$.searchForm.addEventListener('submit', _.bind(this.search, this));

		// Navigation Menu "links"

		this.$.navLinks.forEach(function(link) {
			link.addEventListener('click', _.bind(self.navigate, self));
		});

		this.$.appContent.addEventListener('click', _.bind(this.eventDelegator, this), false);

	};

	app.eventDelegator = function(evt) {
		if(!this.currentView || !this.currentView.delegateEvents) {
			return false;
		} else {
			this.currentView.delegateEvents(evt);
		}
	};

	app.search = function(evt) {
		evt.preventDefault();

		var self = this;
		var target = evt.currentTarget;

		var searchHash = {};

		var searchTerm = target.querySelector('input').value;

		var oldLink = this.$.navItems.forEach(function(link) {
			!link.classList.contains('active') || !link.classList.remove('active');
		});

		var oldViewName = this.currentViewName;

		this.currentView.close();
		this.viewsCache[this.currentViewName] = this.currentView;

		this.currentViewName = target.getAttribute('data-view');

		this.currentView = this.viewsCache[this.currentViewName] || new this.views[this.currentViewName]();

		this.snapper.close("right");

		this.currentView.init(searchTerm);
	};


	// The navigate function takes care of navigation
	// It sets the right nav item and initializes or render the new view
	app.navigate = function(evt) {
		evt.preventDefault();
		var self = this;
		var target = evt.currentTarget;

		if(target.parentNode.classList.contains('active')) {
			return false;
		}

		var oldLink = this.$.navItems.forEach(function(link) {
			!link.classList.contains('active') || !link.classList.remove('active');
		});

		var oldViewName = this.currentViewName;

		target.parentNode.classList.add('active');

		this.currentView.close();
		this.viewsCache[this.currentViewName] = this.currentView;

		this.currentViewName = target.getAttribute('data-view');

		this.currentView = this.viewsCache[this.currentViewName] || new this.views[this.currentViewName]();
		
		if(this.currentView.isCached) {
			// Use the cached version if available
			// If a view has been rendered once, it should be cached

			app.$.appContent.classList.add('loading');
			setTimeout(function() {
				self.currentView.render();
			}, 300);

		} else {
			this.currentView.init();
		}

		this.snapper.close("left");
	};

	app.init = function() {

		// Attach FastClick before all other DOM events handlers
		var FastClick = window.FastClick || { attach : function() {} };
		FastClick.attach(document.body);

		this.testHTML5Features();

		// Create the drawers menu
		this.snapper = new Snap({
			element: this.$.content,
            dragger: document.getElementById('header')
		});

		// Listen to fullpage events
		this.listenToEvents();

		// Start the app with the default view
		this.currentViewName = 'famous-quotes';
		this.currentView = new this.views[this.currentViewName]();
		this.currentView.init();

	};


	// Use this when testing in a browser

	window.DomReady.ready(app.init, app);

	// Use this when testing on a device in a cordova App or for production.

	// document.addEventListener("deviceready", function() {
	// 	app.init.call(app);
	// },false);

}(window, _));