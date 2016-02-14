(function(){
	var messageCollection = null;
	var ObserverManager = {};
	var listeners = [];
	ObserverManager.setMessageCollection = function(collection) {
		messageCollection = collection;
	}
	ObserverManager.post = function(message, data, sender) {
		// console.log("post", message, data);
		if (messageCollection && messageCollection.indexOf(message) < 0) {
			console.warn("WARN:the message posted is invalid!");
			return;
		}
		for (var i = 0; i < listeners.length; i++) {
			if (listeners[i].OMListen) {
				if (sender != listeners[i])
					listeners[i].OMListen(message, data);
			}
		}
	}

	ObserverManager.addListener = function(listener) {
		listeners.push(listener);
	}
	ObserverManager.getListeners = function() {
		return listeners;
	}
	ObserverManager.setListeners = function(_listeners) {
		listeners = _listeners;
	}

	window["ObserverManager"] = ObserverManager;
})()