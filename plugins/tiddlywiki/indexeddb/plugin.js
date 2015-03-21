/*\
title: $:/plugins/tiddlywiki/indexeddb/plugin.js
type: application/javascript
module-type: syncadaptor

A sync adaptor module for synchronising IndexedDB

\*/
(function () {

	/*jslint node: true, browser: true */
	/*global $tw: false */
	"use strict";

	function SyncIndexedDb(options) {
		// this.logger = new $tw.utils.Logger("SyncIndexedDb");
		this.oname = "tw5" + hashCode(window.location.origin + window.location.pathname);
	}


	SyncIndexedDb.prototype.getStatus = function (callback) {
		var request = window.indexedDB.open("tw5");
		var self = this;

		request.onupgradeneeded = function (e) {
			console.log("DB tw5 created");
			e.target.result.createObjectStore(self.oname,{keyPath: "title"});
			e.target.result.close();

		};

		request.onsuccess = function (e) {
			var version = parseInt(e.target.result.version);

			console.log("DB tw5 exists, version " + version);

			if (e.target.result.objectStoreNames.contains(self.oname)) {
				console.log("Object store exists: " + self.oname);
				e.target.result.close();
				return callback(null,1,"");
			} else {
				e.target.result.close();
				version++;

				console.log("Upgrade DB tw5 to version " + version);
				var request2 = window.indexedDB.open("tw5",version);

				request2.onupgradeneeded = function (e) {
					console.log("Create object store " + self.oname);
					e.target.result.createObjectStore(self.oname,{keyPath: "title"});
					e.target.result.close();
				};

				request2.onsuccess = function (e) {
					e.target.result.close();
					return callback(null,1,"");
				};

				request2.onerror = function (e) {
					return callback("DB error upgrading");
				};

			}
		};

		request.onerror = function (e) {
			return callback("DB error opening");
		};
	};

	SyncIndexedDb.prototype.getSkinnyTiddlers = function (callback) {
		var request = window.indexedDB.open("tw5");
		request.onsuccess = function (e) {
			var tiddlers = [],
					objectStore = e.target.result.transaction([this.oname]).objectStore(this.oname);

			objectStore.openCursor().onsuccess = function (event) {
				var cursor = event.target.result,
						tiddler;
				if (cursor) {
					tiddler = JSON.parse(cursor.value.data);
					tiddler.revision = cursor.value.revision;
					tiddlers.push(tiddler);
					cursor.continue();
				} else {
					e.target.result.close();
					return callback(null,tiddlers);
				}
			};
		};
	};

	var saveTiddlerRevision = function (oname,tiddler,callback,revision) {
		var request = window.indexedDB.open("tw5");

		request.onsuccess = function (e) {
			var trans;
			var store;
			var request;
			var data;

			trans = e.target.result.transaction([oname],"readwrite"),
					store = trans.objectStore(oname),

					data = {
						'title': tiddler.fields.title,
						'data': $tw.wiki.getTiddlerAsJson(tiddler.fields.title),
						'revision': revision
					};
			request = store.put(data);

			trans.oncomplete = function (event) {
				e.target.result.close();
				return callback(null,'',this.revision);
			};

			request.onerror = function (event) {
				e.target.result.close();
				return callback("Error Adding: ",e);
			};
		};
	};


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


	SyncIndexedDb.prototype.getTiddlerInfo = function (tiddler) {
		return {};
	};


	/*
	 Save a tiddler and invoke the callback with (err,adaptorInfo,revision)
	 */
	SyncIndexedDb.prototype.saveTiddler = function (tiddler,callback) {
		var request = window.indexedDB.open("tw5");

		request.onsuccess = function (e) {
			var transaction = e.target.result.transaction([this.oname]);
			var objectStore = transaction.objectStore(this.oname);
			var request = objectStore.get(tiddler.fields.title);
			var self = this;

			request.onerror = function (event) {
				e.target.result.close();
				return callback("Error loading " + tiddler.fields.title);
			};

			transaction.oncomplete = function (event) {
				if (request.result !== undefined) {
					this.revision = request.result.revision;
					this.revision += 1;
				} else {
					this.revision = 1;
				}
				e.target.result.close();
				return saveTiddlerRevision(self.oname,tiddler,callback,this.revision);
			};
		};

	};

	/*
	 Load a tiddler and invoke the callback with (err,tiddlerFields)
	 */
	SyncIndexedDb.prototype.loadTiddler = function (title,callback) {
		var request = window.indexedDB.open("tw5");
		var self = this;

		request.onsuccess = function (e) {
			var tiddler;

			var objectStore = e.target.result.transaction([self.oname]).objectStore(self.oname);
			var request = objectStore.get(title);

			request.onerror = function (event) {
				e.target.result.close();
				return callback("Error loading " + title);
			};
			request.onsuccess = function (event) {
				tiddler = JSON.parse(request.result.data);
				tiddler.revision = request.result.revision;
				e.target.result.close();
				return callback(null,tiddler);
			};
		};
	};

	/*
	 Delete a tiddler and invoke the callback with (err)
	 */
	SyncIndexedDb.prototype.deleteTiddler = function (title,callback,options) {
		var request = window.indexedDB.open("tw5");
		var self = this;

		request.onsuccess = function (e) {

			var trans = e.target.result.db.transaction([self.oname],"readwrite");
			var store = trans.objectStore(self.oname);

			var request = store.delete(title);

			trans.oncomplete = function (e) {
				e.target.result.close();
				return callback(null);
			};

			request.onerror = function (e) {
				e.target.result.close();
				return callback("Error deleting: ",e);
			};

			return callback('');
		};
	};

	// check if we are running in browser
	if (typeof(process) === "undefined") {
		// when in browser check for indexedDb support
		if (window.indexedDB) {
			//exports.adaptorClass = SyncIndexedDb;
		}
	}

})();
