/**
 * Shims built-in async functions and automatically wraps callbacks with "wrap"
 * @param {function} wrap The function to return the new callback
 */

module.exports = process.hookit = 'function' === typeof process.hookit ? process.hookit : hookit

function hookit(wrap) {
	var nextTick
		, fs
		, EventEmitter
		, on
		, removeListener
		, addListener

	if (alreadyRequired) return
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

		while(i--) {
			if (listeners[i].__original === listener) {
				listener = listeners[i]
				break
			}
		}

		return removeListener.call(this, type, listener)
	}
}

var alreadyRequired
