/*\
title: $:/plugins/tiddlywiki/indexeddb/startup.js
type: application/javascript
module-type: startup

Clean indexeddb on startup

\*/

(function(){

	// Export name and synchronous status. Hook in before startup, because syncer-browser would be active
	// after startup
	exports.name = "indexeddb";
	exports.platforms = ["browser"];
	exports.after = ["load-modules"];
	exports.before = ["startup"];
	exports.synchronous = false;

	/*jslint node: true, browser: true */
	/*global $tw: false */
	"use strict";

	// determine the objectStore name
	var hashCode = function (str) {
		var hash = 0;
		var i;
		var char;

		if (str.length == 0) return hash;
		for (i = 0; i < str.length; i++) {
			char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	};

	// delete tiddlers from indexeddb, that are stored in the file already
	var checkTiddlers = function (callback) {
		var count=0;

		// Count tiddlers to invoke the callback after all tiddlers have been processed
		$tw.wiki.each(function (tiddler,title) {
			count++;
		});

		// for all tiddlers: request tiddler from indexeddb, compare modified field.
		// if modified matches, tiddler will be deleted
		$tw.wiki.each(function (tiddler,title)  {
			var request = exports.db.transaction([exports.oname]).objectStore(exports.oname).get(title);
			exports.title=title;

			// error when fetching tiddler from indexeddb
			request.onerror = function (event) {
				console.log("error loading title "+exports.title);
				count--;
				if (count === 0) {
					callback();
				}
			};

			// fetching tiddler from indexeddb successful
			request.onsuccess = function (event) {
				count--;

				if (! (event.target.result === undefined)) {
					var dbtiddler = JSON.parse(event.target.result.data);
					var tiddler = JSON.parse($tw.wiki.getTiddlerAsJson(title));

					// compare tiddler from indexeddb with tiddler from file
					if (dbtiddler.modified === tiddler.modified) {

						// tiddler can be deleted from IndexedDB because it is in the file
						count++;
						var request = exports.db.transaction([exports.oname], "readwrite")
								.objectStore(exports.oname)
								.delete(title);

						// tiddler deleted successfully
						request.onsuccess = function(event) {
							count--;
							if (count === 0) {
								callback();
							}
						};
					}
				}

				// continue startup when all tiddlers were processed
				if (count === 0) {
					callback();
				}
			};
		});
	};

	// called by startup process
	exports.startup = function (callback) {
		if (window.indexedDB) {
			this.oname="tw5"+hashCode(window.location.origin + window.location.pathname);

			var tiddler = $tw.wiki.getTiddler("$:/plugins/tiddlywiki/indexeddb/ControlPanel");

			var request = window.indexedDB.open("tw5");
			var self=this;

			request.onsuccess = function (e) {
				self.db = e.target.result;
				if (self.db.objectStoreNames.contains(self.oname)) {
					checkTiddlers(callback);
				} else {
					callback();
				}
			}
		} else {
			callback();
		}
	};


})();
