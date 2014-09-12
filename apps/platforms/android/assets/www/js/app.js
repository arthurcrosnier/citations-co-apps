(function(window, _) {


	var app = window.app = {
		// Cache dom elements that we'll use a lot
		$ : {
			navLinks : Array.prototype.slice.call(document.querySelectorAll('.navigation li a'), 0),
			navItems : Array.prototype.slice.call(document.querySelectorAll('.navigation li'), 0),
			navLangLinks : Array.prototype.slice.call(document.querySelectorAll('.navigation li.switch-lang a'), 0),
			content : document.getElementById('content'),
			scrollContent : document.querySelector('.content'),
			searchForm : document.getElementById('searchForm'),
			appContent : document.getElementById('app-content'),
			views : {
				'famous-quotes' : document.getElementById('famous-quotes'),
				'user-quotes' : document.getElementById('user-quotes'),
				'contrib-quotes' : document.getElementById('contrib-quotes'),
				'top-quotes' : document.getElementById('top-quotes'),
				'search-quotes' : document.getElementById('search-quotes'),
				'random-quotes' : document.getElementById('random-quotes'),

				'about' : document.getElementById('about')
			},
			body : document.body
		},
		switchUserLanguage : function(evt) {
			evt.preventDefault();

			var target = evt.currentTarget;
			var lang = target.getAttribute('data-lang');

			if(this.supports.localStorage) {
				window.localStorage.clear();
			}

			this.currentView.close();

			this.viewsCache = {};

			this.$.views['famous-quotes'].innerHTML = '';
			this.$.views['user-quotes'].innerHTML = '';
			this.$.views['contrib-quotes'].innerHTML = '';
			this.$.views['top-quotes'].innerHTML = '';
			this.$.views['search-quotes'].innerHTML = '';
			this.$.views['random-quotes'].innerHTML = '';

			this.setUserLanguage(lang);

			this.$.navItems.forEach(function(link) {
				!link.classList.contains('active') || link.classList.remove('active');
			});
			this.$.navLinks[0].parentNode.classList.add('active');

			this.currentViewName = 'famous-quotes';
			this.currentView = new this.views[this.currentViewName]();
			this.currentView.init();

			this.i18n();

			var self = this;
			setTimeout(function() {
				self.snapper.close('left');
			}, 300);
		},
		fetchUserLanguage : function() {

			if(this.supports.localStorage && window.localStorage.getItem('user-lang')) {
				var userLanguage = window.localStorage.getItem('user-lang');
			} else {
				var userLanguage = window.navigator.userLanguage || window.navigator.language || 'en-EN';
			}

			this.setUserLanguage(userLanguage);
		},
		setUserLanguage : function(i18nString) {
			var self = this;
			if(i18nString && this.translations[i18nString.slice(0, 2)]) {
				this.userLanguage = i18nString;
			} else {
				this.userLanguage = 'en-EN';
			}

			if(this.supports.localStorage) {
				window.localStorage.setItem('user-lang', this.userLanguage);
			}

			this.$.navLangLinks.forEach(function(navLangLink) {
				if(navLangLink.getAttribute('data-lang').slice(0, 2) === self.userLanguage.slice(0, 2)) {
					navLangLink.classList.add('active');
				} else {
					navLangLink.classList.remove('active');
				}
			});

		},
		translations : { 
			'en' : {
				'famous-quotes' : 'Famous Quotes',
				'random-quotes' : 'Random Quotes',
				'change-lang' : 'Switch Language',
				'top-quotes' : 'Top Quotes',

				'share-this-quote' : 'Share this quote',

				'rate-app' : 'Rate the app',
				'about' : 'About',
				'search' : 'Search',
				'network-error' : 'Network error',
				'oops-error' : 'Ooops ...',
				'save-image-success' : 'Image saved in library',
				'save-image-error' : 'Image not saved'
			},
			'fr' : {
				'famous-quotes' : 'Citations Célèbres',
				'user-quotes' : 'Citations des utilisateurs',
				'random-quotes' : 'Aléatoire',
				'change-lang' : 'Changer de langue',
				'contrib-quotes' : 'Contributions',
				'top-quotes' : 'Top',

				'share-this-quote' : 'Partager cette citation',

				'rate-app' : "Noter l'appli",
				'about' : 'À Propos',
				'search' : 'Rechercher',
				'network-error' : 'Pas de reseau',
				'oops-error' : 'Ooops ...',
				'save-image-success' : 'Image sauvegardee',
				'save-image-error' : 'Erreur'
			} 
		},
		i18n : function() {
			var self = this;
			// Navigation Links
			this.$.navLinks.forEach(function(navLink) {
				var i18nTextContainer = navLink.querySelector('span.i18n');
				if(i18nTextContainer) {
					var translationSource = self.translations[self.userLanguage.slice(0, 2)] || self.translations['en'];
					var i18nKey = i18nTextContainer.getAttribute('data-i18n');
					if(i18nKey && translationSource[i18nKey]) {
						navLink.classList.remove('hidden');
						i18nTextContainer.innerHTML = translationSource[i18nKey];
					} else {
						navLink.classList.add('hidden');
					}
				}
			});
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
		views : {
			'famous-quotes' : function() {},
			'user-quotes' : function() {},
			'contrib-quotes' : function() {},
			'top-quotes' : function() {},
			'search-quotes' : function() {},
			'random-quotes' : function() {},

			'about' : function() {}
		},
		viewsCache : {}
	};

	var viewPrototype = function() {};

	viewPrototype.prototype.isCachable = true;

	viewPrototype.prototype.init = function() {
		this.loading = true;
		app.$.appContent.classList.add('loading');
		this.preloadElements = {};
		if(app.supports.localStorage && window.localStorage.getItem(app.currentViewName) && window.localStorage.getItem('user-lang') === app.userLanguage) {
			if(this.isCachable) {
				var cache = window.localStorage.getItem(app.currentViewName);
				this.items = JSON.parse(cache);
				this.isCached = true;
			} else {
				window.localStorage.removeItem(app.currentViewName);
			}
		} else {
			this.items = [];
		}
	};

	viewPrototype.prototype.render = function(response) {
		app.$.views[app.currentViewName].classList.remove('hidden');

		var items = response && response.items ? response.items : [],
			self = this;
		var newItems = 0;

		items.forEach(function(item) {
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
			if(app.supports.localStorage && (!this.isCached || this.refreshing) && this.isCachable) {
				window.localStorage.setItem(app.currentViewName, JSON.stringify(this.items));
			}
		}

		if(!this.isRendered) {
			var template = app.templates.itemsList({ viewName : app.currentViewName, items : this.items, imageUrlPrefix : this.imageUrlPrefix });

			app.$.views[app.currentViewName].innerHTML = template;
		} else if(this.refreshing && newItems) {
			var template = app.templates.itemsList({ viewName : app.currentViewName, items : items, imageUrlPrefix : this.imageUrlPrefix });

			app.$.views[app.currentViewName].insertAdjacentHTML('afterbegin', template);		
		} else if(this.loadingmore && newItems) {
			var template = app.templates.itemsList({ viewName : app.currentViewName, items : items, imageUrlPrefix : this.imageUrlPrefix });

			app.$.views[app.currentViewName].insertAdjacentHTML('beforeend', template);	
		}

		if(!this.isRendered || (this.refreshing && newItems)|| (this.loadingmore && newItems)) {
			this.renderImages(this.imagesLoaded, this);
		}

		app.$.appContent.classList.remove('loading');
		app.$.appContent.classList.remove('loadmore');
		app.$.appContent.classList.remove('refresh');

		this.isRendered = true;
		this.refreshing = false;
		this.loading = false;
		this.loadingmore = false;
	};

	viewPrototype.prototype.close = function() {
		var self = this;

		// Hide view element
		app.$.views[app.currentViewName].classList.add('hidden');

		// Remove all DOM event listeners
		_.each(this.preloadElements, function(imageEl, idx) {
			imageEl.onerror = imageEl.onload = function() {};
			imageEl = null;
		});

		self.preloadElements = [];
	};

	viewPrototype.prototype.start = 0;
	viewPrototype.prototype.end = 2;

	viewPrototype.prototype.allImagesLoaded = false;

	viewPrototype.prototype.votes = [];
	viewPrototype.prototype.voteEndpoint = 'http://www.citations.co/score/';

	viewPrototype.prototype.delegateEvents = function(evt) {
		if(evt.target.classList.contains('vote') || evt.target.parentNode.classList.contains('vote')) {
			evt.preventDefault();

			var target = evt.target.parentNode.classList.contains('vote') ? evt.target.parentNode : evt.target;
			
			if(target.parentNode.parentNode.parentNode.classList.contains('loaded')) {
				this.vote(target);
			}
		} else if(evt.target.classList.contains('download') || evt.target.parentNode.classList.contains('download')) {
			var target = evt.target.parentNode.classList.contains('download') ? evt.target.parentNode : evt.target;

			var citationWrapper = target.parentNode.parentNode.parentNode;
			var citationImageEl = citationWrapper.querySelector('img.citation');

			if(citationWrapper.classList.contains('loaded')) { 
				if(app.supports.canvas) {
					evt.preventDefault();
					this.saveImageDataToLibrary(citationImageEl);
				} else {
					// Error message.
					// Update browser or update Android
				}
			}
		}
		else if(evt.target.classList.contains('share') || evt.target.parentNode.classList.contains('share'))
		{
			console.log("share0");
			var target = evt.target.parentNode.classList.contains('share') ? evt.target.parentNode : evt.target;
			var citationWrapper = target.parentNode.parentNode.parentNode;
			var citationImageEl = citationWrapper.querySelector('img.citation');

			if(citationWrapper.classList.contains('loaded'))
	        {
				if(app.supports.canvas)
	            {
					evt.preventDefault();
					console.log("share1");
					this.shareImageData(citationImageEl);
				}
	            else
	            {
	            	console.log("share3");
	            	this.displayErrorMessage();
				}
			}
		}
	};

	viewPrototype.prototype.refresh = function() {
		if(!this.refreshing || !this.loadingmore || !this.loading) {
			this.start = 0;
			this.end = 10;
			app.$.appContent.classList.add('refresh');
			this.refreshing = true;
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	viewPrototype.prototype.loadmore = function() {
		if(!this.loadingmore && this.items && this.items.length) {

			app.$.appContent.classList.add('loadmore');

			this.loadingmore = true;

			this.start = this.items.length;
			this.end = this.items.length+1;

			sendRequest(this.endPoint, { 
				json : true,
				done : this.render,
				fail : this.displayErrorMessage,
				scope : this
			});
		}
	};

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

		if(hasVotedThisQuoteBefore) {
			hasVotedThisQuoteBefore.removeAttribute('disabled');
			hasVotedThisQuoteBefore.classList.remove('active');
		}
		scoreEl.innerHTML = newScore;
		target.classList.add('active');
		target.setAttribute('disabled', 'disabled');

		this.votes.push(citationId);

		var item = _.findWhere(this.items, { id : citationId });

		item.score = newScore;
		item.vote = vote;

		sendRequest(voteUrl, { 
		    json: false,
		    done: function(data) {
		    	var realScore = parseInt(data);
				if(realScore !== newScore) { 
					item.score = realScore;
					scoreEl.innerHTML = realScore; 
				}
			},
		    fail: this.displayErrorMessage,
		    scope:this 
		});
	};

	viewPrototype.prototype.imagesLoaded = function() {

		console.log('Images loaded', this.start, this.end, this.items.length);
		var self = this;
		if(this.end == this.items.length-1) {
			// All images are loaded
			console.log('All loaded', this.end, this.items.length-1);
			console.log(this.preloadElements);

			if(this.preloadElements && !_.isEmpty(this.preloadElements)) {
				var notLoadedImages = document.querySelectorAll('.citation-wrapper:not(.loaded)');
				console.log('Not load Images', notLoadedImages);
				if(notLoadedImages && notLoadedImages.length) {
					this.start = 0;
					this.renderImages(this.imagesLoaded, this);
					return;
				}
			}
			this.allImagesLoaded = true;

			if(app.supports.localStorage && this.isCachable) {

				if(!_.isEmpty(this.preloadElements) && app.supports.localStorage) {
					_.each(this.items, function(item, idx) {
						var preloadEl = self.preloadElements[item.id];
						if(preloadEl && !item.base64src) {
							console.log('Extracting image data url');
							var canvas = document.createElement('canvas'),
								tmpCtx = canvas.getContext("2d");

							canvas.width = 450;
							canvas.height = 600;

							try {
								tmpCtx.drawImage(preloadEl, 0, 0, canvas.width, canvas.height);

								item.base64src = canvas.toDataURL('image/jpeg', 0.1);
							} catch(e) {}
						} else {
							console.log('No preloadEL');
						}
					});
				}

				try {
					console.log('updating Cache');
					window.localStorage.setItem(app.currentViewName, JSON.stringify(this.items));
				} catch(e) {
					console.log('Cleared Cache', e);
					window.localStorage.removeItem(app.currentViewName);
				}


			}
			// Base64 everything -> LocalStorage ?

			var oldStart = this.start;
			this.start = this.end+1;
			this.end += (this.end - oldStart)+1;

			if(this.end > this.items.length) {
				this.end = this.items.length-1;
			}

		} else {
			var oldStart = this.start;
			this.start = this.end+1;
			this.end += (this.end - oldStart)+1;

			if(this.end > this.items.length) {
				this.end = this.items.length-1;
			}
			this.renderImages(this.imagesLoaded, this);
		}
	};

	viewPrototype.prototype.renderImages = function(callback, scope, items) {
		var currentViewName = app.currentViewName;
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
			if(!item || (item.loaded && !item.base64src)) {
				if(--i == self.start && callback && scope) {
					callback.call(scope);
				}
			} else {
				var preloadEl;
				if(self.preloadElements[item.id]) {
					console.log(self.preloadElements[item.id]);
				} else {
					self.preloadElements[item.id] = preloadEl = new Image();

					preloadEl.onload = function() {
						var wrapper = document.getElementById(currentViewName+'-'+item.id);

						wrapper.querySelector('.citation').src = this.src;
						wrapper.classList.add('loaded');
						item.loaded = true;
						item.error = false;

						if(--i == self.start && callback && scope) {
							callback.call(scope);
						}
					}

					preloadEl.onerror = function() {
						if(!item.base64src) {
							var wrapper = document.getElementById(currentViewName+'-'+item.id);
							wrapper.parentNode.removeChild(wrapper);
						}
						item.error = true;
						item.loaded = false;

						if(--i == self.start && callback && scope) {
							callback.call(scope);
						}
					}
					preloadEl.src = item.src
				}
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

	viewPrototype.prototype.shareImageData = function(imageEl) {

		var canvas = document.createElement('canvas'),
			tmpCtx = canvas.getContext("2d");

		canvas.width = 450;
		canvas.height = 600;
		tmpCtx.drawImage(imageEl, 0, 0, canvas.width, canvas.height);
		var imageData = canvas.toDataURL().replace(/data:image\/png;base64,/,'');

		var cordova = window.cordova || null;
		if(!cordova)
			return false;

		var translationSource = app.translations[app.userLanguage.slice(0, 2)] || app.translations['en'];
		var shareTitle = translationSource['share-this-quote'];


		navigator.share(
			imageData,
			shareTitle,
			'image/png',
			function() { alert('oui'); },
			function(e) { alert('non', e); console.log([e]); }
		);
	};

	viewPrototype.prototype.saveImageFailure = function() {
		app.currentView.displayErrorMessage(null, 'save-image-error');
		app.currentView.hideErrorMessage(1300);
	};

	viewPrototype.prototype.saveImageSuccess = function() {
		app.currentView.displayErrorMessage(null, 'save-image-success');
		app.currentView.hideErrorMessage(1300);
	};

	viewPrototype.prototype.displayErrorMessage = function(xhr, messageI18nKey, message) {
		var errorBannerContent = document.querySelector('.error.i18n');
		var errorBanner = errorBannerContent.parentNode;

		if(errorBannerContent && errorBanner) {

			var translationSource = app.translations[app.userLanguage.slice(0, 2)] || app.translations['en'];
			var i18nKey = messageI18nKey || errorBannerContent.getAttribute('data-i18n');

			if(i18nKey && translationSource[i18nKey]) {
				errorBannerContent.innerHTML = translationSource[i18nKey];
			} else if(message) {
				errorBannerContent.innerHTML = message;
			} else {
				i18nKey = translationSource['oops-error'];
				errorBannerContent.innerHTML = translationSource[i18nKey];	
			}
		}

		errorBanner.classList.add('shown');
	};

	viewPrototype.prototype.hideErrorMessage = function(delay) {
		var delay = parseInt(delay);
		setTimeout(function() {
			var errorBannerContent = document.querySelector('.error.i18n');
			var errorBanner = errorBannerContent.parentNode;

			errorBanner.classList.remove('shown');
		}, delay);
	};

	_.each(app.views, function(view) {
		view.prototype = new viewPrototype();
	});

	app.views['famous-quotes'].prototype.init = function() {
		viewPrototype.prototype.init.call(this);

		if(!('endPoint' in this)) {
			Object.defineProperty(this, "endPoint", {
				get : function() {
					var endpoint = (app.userLanguage.slice(0, 2) === 'fr') ? ('http://www.citations.co/apiCitation2'+'/'+this.start+'/0') : ('http://www.citations.co/apiCitation3usa'+'/'+this.start+'/0/30');
					return endpoint;
				}
			});
		}

		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		if(this.isCached) {
			this.render();
		}
		else {
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	app.views['user-quotes'].prototype.init = function() {
		viewPrototype.prototype.init.call(this);

		if(!('endPoint' in this)) {
			Object.defineProperty(this, "endPoint", {
				get : function() {
					return 'http://www.citations.co/apiCitation2/'+this.start+'/1';
				}
			});
		}

		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		if(this.isCached) {
			this.render();
		}
		else {
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	app.views['contrib-quotes'].prototype.init = function() {
		viewPrototype.prototype.init.call(this);

		if(!('endPoint' in this)) {
			Object.defineProperty(this, "endPoint", {
				get : function() {
					return 'http://www.citations.co/apiCitation2/'+this.start+'/2';
				}
			});
		}

		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		if(this.isCached) {
			this.render();
		}
		else {
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	app.views['top-quotes'].prototype.init = function() {
		viewPrototype.prototype.init.call(this);


		if(!('endPoint' in this)) {
			Object.defineProperty(this, "endPoint", {
				get : function() {
					var endpoint = app.userLanguage.slice(0, 2) === 'fr' ? 'http://www.citations.co/apiCitation3'+'/'+this.start+'/3/30' : 'http://www.citations.co/apiCitation3usa'+'/'+this.start+'/3/30';
					return endpoint;
				}
			});
		}

		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		if(this.isCached) {
			this.render();
		}
		else {
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	app.views['random-quotes'].prototype.init = function() {
		viewPrototype.prototype.init.call(this);

		if(!('endPoint' in this)) {
			Object.defineProperty(this, "endPoint", {
				get : function() {
					var apiLoc = app.userLanguage.slice(0, 2) === 'fr' ? 'apiCitation3random/0' : 'apiCitation3random/1';
					return 'http://www.citations.co/' + apiLoc;
				}
			});
		}

		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		if(this.isCached) {
			this.render();
		}
		else {
			sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
		}
	};

	app.views['search-quotes'].prototype.isCachable = false;

	app.views['search-quotes'].prototype.init = function(searchTerm) {
		viewPrototype.prototype.init.call(this);
		this.searchTerm = searchTerm;


		Object.defineProperty(this, "endPoint", {
			get : function() {
				var apiLoc = app.userLanguage.slice(0, 2) === 'fr' ? 'apisearch2' : 'apisearch2usa';
				return 'http://www.citations.co/'+apiLoc+'/'+this.start+'/'+this.searchTerm+'/30';
			}
		});
	
		this.imageUrlPrefix = "http://www.citations.co/citations-mobile/";
		sendRequest(this.endPoint, { json : true, done : this.render, fail : this.displayErrorMessage, scope : this });
	};

	app.views['search-quotes'].prototype.close = function() {
		viewPrototype.prototype.close.call(this);

		document.getElementById('toggle-menu-right').classList.remove('active');
		app.$.views[app.currentViewName].innerHTML = '';
		var searchInput = app.$.searchForm.querySelector('input');	
		searchInput.value = '';
	};

	app.views['about'].prototype.init = function() {
		this.render();
	}

	app.views['about'].prototype.render = function() {
		app.$.views[app.currentViewName].classList.remove('hidden');
		this.isRendered = true;
	}

	app.views['about'].prototype.close = function() {
		// Hide view element
		app.$.views[app.currentViewName].classList.add('hidden');	
	}

	app.views['about'].prototype.isCachable = false;



	// Listen to global page events

	app.listenToEvents = function() {
		var self = this;

		document.getElementById('toggle-menu-left').addEventListener('click', function(evt){
			evt.preventDefault();
			if(self.snapper.state().state === 'closed') {
				evt.stopPropagation();
				self.snapper.open("left");
				evt.currentTarget.classList.add('active');
			}
		});

		document.getElementById('toggle-menu-right').addEventListener('click', function(evt){
			evt.preventDefault();
			if(self.snapper.state().state === 'closed') {
				evt.stopPropagation();
				self.snapper.open("right");
				evt.currentTarget.classList.add('active');

				self.$.searchForm.querySelector('input').focus();
			}
		});

		this.snapper.on('close', function(evt) {
			self.$.searchForm.querySelector('input').blur();
			if(self.snapper.state().state === 'left' || self.snapper.state().state === 'right') {
				document.getElementById('toggle-menu-'+self.snapper.state().state).classList.remove('active');
			}
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
			if(link.getAttribute('data-view')) {
				link.addEventListener('click', _.bind(self.navigate, self));
			} else if(link.getAttribute('data-lang')) {
				link.addEventListener('click', _.bind(self.switchUserLanguage, self));
			}
		});

		// Android back button event via cordova

	    document.addEventListener("backbutton", _.bind(this.backButton, this), false);

		this.$.appContent.addEventListener('click', _.bind(this.eventDelegator, this), false);


		// method 1

		// this.$.content.addEventListener('scroll', _.bind(this.infiniteScrollDelegate, this), false);
		// this.$.content.addEventListener('gesturechange', function() {});

		// method 2

		// this.$.appContent.addEventListener('scroll', _.bind(this.infiniteScrollDelegate, this), false);
		// this.$.appContent.addEventListener('gesturechange', function() {});

		// // // method 3
		// window.addEventListener('scroll', _.bind(this.infiniteScrollDelegate, this), false);
		// window.addEventListener('gesturechange', function() {});

		// // method 4
		// Fonctionne sur Chrome et Firefox
		this.$.scrollContent.addEventListener('scroll', _.bind(this.infiniteScrollDelegate, this), false);
		this.$.scrollContent.addEventListener('gesturechange', function() {});

		// + MAGIC
		// IL FAUT TESTER SUR MOBILE AVEC ET SANS

//		document.addEventListener('touchmove', function(e) {e.preventDefault();}, true);

	};

	app.backButton = function(e) {
		e.preventDefault();
		if(this.snapper.state().state !== 'closed') {
			this.snapper.close();
		}
	},

	app.documentHeight = function() {
		var D = document;
		return Math.max(
		    D.body.scrollHeight, D.documentElement.scrollHeight,
		    D.body.offsetHeight, D.documentElement.offsetHeight,
		    D.body.clientHeight, D.documentElement.clientHeight
		);
	},

	app.scrollableHeight = function() {
		return this.$.appContent.getBoundingClientRect().height - app.documentHeight();
	},

	app.infiniteScrollDelegate = function(evt) {
		var self = this;

		if(self.scrollTimeout) return;

		var scrollTop = this.$.scrollContent.scrollTop;

		if((scrollTop) >= this.scrollableHeight()) {
		 	self.loadMore();
		}

		self.scrollTimeout = setTimeout(function() {
			self.scrollTimeout = null;
		}, 300);
	},

	app.loadMore = function() {
		if(!this.currentView || this.currentView.loading) return;
		this.currentView.loadmore.call(this.currentView);
	},

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

		var searchInput = target.querySelector('input');

		var searchTerm = searchInput.value;

		this.$.navItems.forEach(function(link) {
			!link.classList.contains('active') || !link.classList.remove('active');
		});

		var oldViewName = this.currentViewName;

		this.currentView.close();

		this.currentViewName = target.getAttribute('data-view');

		this.currentView = new this.views[this.currentViewName]();

		document.getElementById('toggle-menu-right').classList.add('active');

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
			}, 600);

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

		this.fetchUserLanguage();
		this.i18n();

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


	window.DomReady.ready(function() {
		if(window.cordova) {
			document.addEventListener("deviceready", function() {
				app.init.call(app);
			},false);
		} else {
			app.init.call(app);
		}
	});	


}(window, _));