/**
 * Shims built-in async functions and automatically wraps callbacks with "wrap"
 * @param {function} wrap The function to return the new callback
 */
module.exports = function hookit(wrap) {
	var HookId = 0
		, nextTick
		, fs
		, EventEmitter
		, once
		, on
		, removeListener
		, addListener

	if (alreadyRequired) throw new Error("This should only be required and used once")
	alreadyRequired = true

	// Wrap setTimeout and setInterval
	;['setTimeout', 'setInterval', 'setImmediate'].forEach(function (name) {
		var original = this[name]
		this[name] = function (callback) {
			arguments[0] = wrap(callback, name)
			return original.apply(this, arguments)
		}
	})

	// Wrap process.nextTick
	nextTick = process.nextTick
	process.nextTick = function wrappedNextTick(callback) {
		return nextTick.call(this, wrap(callback, 'process.nextTick'))
	}

	// Wrap fs module async functions
	fs = require('fs')
	Object.keys(fs).forEach(function (name) {
		// If it has a *Sync counterpart, it's probably async
		if (!fs.hasOwnProperty(name + "Sync")) return
		var original = fs[name]
		fs[name] = function () {
			var i = arguments.length - 1
			if (typeof arguments[i] === 'function') {
				arguments[i] = wrap(arguments[i], 'fs.'+name)
			}
			return original.apply(this, arguments)
		}
	})

	// Wrap EventEmitters
	EventEmitter = require('events').EventEmitter

	once = EventEmitter.prototype.once
	EventEmitter.prototype.once = function wrappedOnce(event, callback) {
		return once.call(this, event, wrap(callback, 'EventEmitter.once'))
	}

	on = EventEmitter.prototype.on
	addListener = EventEmitter.prototype.addListener
	EventEmitter.prototype.on = EventEmitter.prototype.addListener = function wrappedAddListener(type, listener) {
		var hookListener = wrap(listener, 'EventEmitter.addListener')
		hookListener.__original = listener
		return addListener.call(this, type, hookListener)
	}

	removeListener = EventEmitter.prototype.removeListener
	EventEmitter.prototype.removeListener = function wrappedRemoveListener(type, listener) {
		var listeners = this.listeners(type)
			, i = listeners.length
			, hookCallback = function() {}

		while(i--) {
			if (listeners[i].__original === listener) {
				hookCallback = listeners[i]
				break
			}
		}

		return removeListener.call(this, type, hookCallback)
	}
}

var alreadyRequired
