// debug
if (!window.console){
	window.console = {};
	window.console.log = function(){};
}

var Hub = {

	query: 'barcampkl',
	tag: '#barcampkl',
	tweetsListID: 'tweetsList',
	tweetTrendyID: 'tweetTrendy',
	tweetUpdateDelay: 15000,
	tweetTrendyDelay: 30000,
	tweetsLimit: 40,
	documentTitle: document.title,
	unreadTweets: 0,
	
	init: function(){
		Hub.tweetsList = $(Hub.tweetsListID);
		Hub.clearTitle();
		Hub.displayTweets();
		Hub.displayNewTweets.periodical(Hub.tweetUpdateDelay);
		Hub.displayTrend();
		Hub.displayTrend.periodical(Hub.tweetTrendyDelay);
	},
	
	displayTweets: function(){
		Hub.getTweets(function(data){
			Hub.refresh_url = data.refresh_url;
			var els = data.results.map(function(result){
				return Hub.formatTweet(result);
			});
			Hub.tweetsList.adopt(els);
		});
	},
	
	displayNewTweets: function(){
		Hub.getNewTweets(function(data){
			Hub.refresh_url = data.refresh_url;
			console.log(Hub.refresh_url);
			if (!data.results.length) return;
			var els = data.results.map(function(result){
				return Hub.formatTweet(result)
			}).reverse();
			els.each(function(el){
				el.setStyle('display', 'none').inject(Hub.tweetsList, 'top');
				var height = el.measure(function(){
					return this.getStyle('height');
				});
				Hub.removeOldTweets();
				el.set({
					styles: {
						'display': ''
					},
					tween: {
						onComplete: function(){
							Hub.updateAllTimeSince();
							el.setStyle('height', 'auto');
						}
					}
				}).tween('height', 0, height);
			});
			Hub.unreadTweets += data.results.length;
			if (Hub.unreadTweets > Hub.tweetsLimit) Hub.unreadTweets = Hub.tweetsLimit;
			document.title = Hub.documentTitle + ' (' + Hub.unreadTweets + ')';
		});
	},
	
	clearTitle: function(){
		var clear = function(){
			if (document.title == Hub.documentTitle) return;
			(function(){
				document.title = Hub.documentTitle;
			}).delay(1000);
		};
		Hub.tweetsList.addEvents({
			mouseover: clear,
			mouseout: clear,
			click: clear
		});
	},
	
	displayTrend: function(){
		Hub.getTrends(function(data){
			var trendy = 0;
			data.trends.each(function(trend, i){
				if (trend.name.toLowerCase() == Hub.tag){
					trendy = i+1;
					return;
				}
			});
			var html = '';
			if (trendy) html = '<strong>' + Hub.tag + '</strong> is currently the <strong>No. ' + trendy + '</strong> trending topic on Twitter!';
			$(Hub.tweetTrendyID).set('html', html).setStyle('display', (trendy) ? '': 'none');
		});
	},
	
	updateAllTimeSince: function(){
		Hub.tweetsList.getElements('.timesince a').each(function(el){
			var created_at = el.get('title');
			el.set('text', Hub.getRelativeTime(created_at));
		});
	},
	
	removeOldTweets: function(){
		var tweets = Hub.tweetsList.getChildren('li').slice(Hub.tweetsLimit);
		if (!tweets.length) return;
		tweets.each(function(li){
			li.set('tween', {
				onComplete: function(){
					li.destroy();
				}
			}).tween('height', 0);
		})
	},
	
	formatTweet: function(tweet){
		tweet.text = tweet.text
			.replace(/((https?|s?ftp|ssh)\:\/\/[^"\s\<\>]*[^.,;'">\:\s\<\>\)\]\!])/g, function(m){
				return'<a href="' + m + '">' + m + "</a>"})
			.replace(/\B@([_a-z0-9]+)/ig, function(m){
				return m.charAt(0) + '<a href="http://twitter.com/' + m.substring(1) + '" target="_blank">' + m.substring(1) + "</a>"});
		tweet.timesince = Hub.getRelativeTime(tweet.created_at);
		tweet.profile_image_url = tweet.profile_image_url.replace('normal', 'mini');
		
		return new Element('li', {
			id: tweet.from_user_id + '-' + tweet.id,
			html: '<div class="avatar"><a href="http://twitter.com/{from_user}" target="_blank"><img src="blank.gif" alt="" style="background-image: url({profile_image_url});"></a></div>\
				<div class="tweet"><a href="http://twitter.com/{from_user}" target="_blank"><strong>{from_user}</strong></a> {text}</div>\
				<div class="timesince"><a href="http://twitter.com/{from_user}/status/{id}" title="{created_at}" target="_blank">{timesince}</a></div>'.substitute(tweet)
		});
	},
	
	getTweets: function(fn){
		var url = 'http://search.twitter.com/search.json?q=' + encodeURIComponent(Hub.query) + '&rpp=' + Hub.tweetsLimit;
		new Request.JSONP({url: url, onComplete: fn }).send();
	},
	
	getNewTweets: function(fn){
		var url = 'http://search.twitter.com/search.json' + Hub.refresh_url;
		new Request.JSONP({url: url, onComplete: fn }).send();
	},
	
	getTrends: function(fn){
		var url = 'http://search.twitter.com/trends.json';
		new Request.JSONP({url: url, onComplete: fn }).send();
	},
	
	/*
	 * stolen from http://twitter.com/javascripts/blogger.js
	 * but slightly modified due to different datetime format
	 */
	getRelativeTime: function(str){
		var s = str.split(' ');
		// month day year time
		str = s[1] + ' ' + s[2] + ', ' + s[3] + ' ' + s[4];
		var date = Date.parse(str);
		var now = (arguments.length>1) ? arguments[1] : new Date();
		var timesince = parseInt((now.getTime()-date)/1000);
		timesince = timesince + (now.getTimezoneOffset()*60);
		if (timesince < 60) return 'less than a minute ago';
		if (timesince < 120) return 'about a minute ago';
		if (timesince < (60*60)) return (parseInt(timesince/60)).toString() + ' minutes ago';
		if (timesince < (120*60)) return 'about an hour ago';
		if (timesince < (24*60*60)) return 'about ' + (parseInt(timesince/3600)).toString() + ' hours ago';
		if (timesince < (48*60*60)) return '1 day ago';
		return (parseInt(timesince/86400)).toString() + ' days ago';
	}
	
}

window.addEvent('domready', Hub.init);
