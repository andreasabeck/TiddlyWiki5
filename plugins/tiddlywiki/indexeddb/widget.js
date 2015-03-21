/*\
title: $:/plugins/tiddlywiki/indexeddb/widget.js
type: application/javascript
module-type: widget

indexeddb widget

\*/
(function () {

	/*jslint node: true, browser: true */
	/*global $tw: false */
	"use strict";

	var Widget = require("$:/core/modules/widgets/widget.js").widget;

	var IndexeddbWidget = function (parseTreeNode,options) {
		console.log("widget constructor");
		this.initialise(parseTreeNode,options);
		IndexeddbWidget.oname="tw5"+hashCode(window.location.origin + window.location.pathname);
		this.addEventListeners([
			{type: "tm-indexeddb-refresh-objectstore",handler: "handleRefreshObjectStoreEvent"},
			{type: "tm-indexeddb-delete-objectstore", handler: "handleDeleteObjectStoreEvent"}
		]);
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


	/*
	Inherit from the base widget class
	*/
	IndexeddbWidget.prototype = new Widget();

	/*
	Render this widget into the DOM
	*/
	IndexeddbWidget.prototype.render = function (parent,nextSibling) {
		console.log("widget render");
		this.parentDomNode = parent;
		this.computeAttributes();
		this.execute();
		this.renderChildren(parent,nextSibling);
	};

	/*
	Compute the internal state of the widget
	*/
	IndexeddbWidget.prototype.execute = function () {
		// Get our parameters
		console.log("widget execute");
		this.mangleTitle = this.getAttribute("tiddler",this.getVariable("currentTiddler"));
		// Construct the child widgets
		this.makeChildWidgets();
	};

	/*
	Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
	*/
	IndexeddbWidget.prototype.refresh = function (changedTiddlers) {
		console.log("widget refresh");
		var changedAttributes = this.computeAttributes();
		if (changedAttributes.tiddler) {
			this.refreshSelf();
			return true;
		} else {
			return this.refreshChildren(changedTiddlers);
		}
	};

	IndexeddbWidget.prototype.fillstore = function (e) {
		console.log("reply"+IndexeddbWidget.oname);
		var oname = "";
		var out = "<$indexeddbwidget>\n\n";
		for (var i = 0; i < e.target.result.objectStoreNames.length; i++) {
			oname = e.target.result.objectStoreNames[i];
			if (oname === IndexeddbWidget.oname) {
				out += "|''" + oname + "'' |";
			} else {
				out += "|" + oname + " |";
			}
			out += "<$button message='tm-indexeddb-delete-objectstore' param='" + oname + "'>Delete</$button>|";
			out += "\n";
		}
		out += "\n</$indexeddbwidget>\n";
		e.target.result.close();
		$tw.wiki.setText('$:/plugins/tiddlywiki/indexeddb/ObjectStores',null,null,out);
	};


	IndexeddbWidget.prototype.handleRefreshObjectStoreEvent = function (event) {
		if (window.indexedDB) {
			var request = window.indexedDB.open("tw5");
			request.onsuccess = function (e) {
				IndexeddbWidget.prototype.fillstore(e);
			};
		}
		return true;
	};


	IndexeddbWidget.prototype.handleDeleteObjectStoreEvent = function (event) {
		console.log("widget message delete object store");
		if (window.indexedDB) {
			console.log("open db");
			var request = window.indexedDB.open("tw5", 17);
			request.onsuccess = function (e) {
				var db = e.target.result;
				var version = parseInt(db.version);
				db.close();

				version++;
				console.log("Open version " + version);

				var request2 = window.indexedDB.open("tw5",version);

				request2.onerror = function(e) {
					console.log("ERROR: "+JSON.stringify(e));
				};

				request2.onsuccess = function(e) {
					console.log("SUCCESS: "+JSON.stringify(e));
				};

				request2.onblocked = function(e) {
					console.log("BLOCKED");
				};


				request2.onupgradeneeded = function (e) {
					console.log("UPGRADE: Delete object store " + event.param);
					e.target.result.deleteObjectStore(event.param);
				};
			};

		}

		return true;
	};


	exports.indexeddbwidget = IndexeddbWidget;

})();
