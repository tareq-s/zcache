// Copyright 2014 The Obvious Corporation.

/**
 * @fileoverview A very simple cache instance for unit testing.
 */

var Q = require('kew')
var util = require('util')
var CacheInstance = require('./CacheInstance')

var CACHE_LATENCY_MS = 10

/**
 * @constructor
 * @extends CacheInstance
 * @param {Logger} logger A logger for logging debug information.
 */
function FakeCache(logger) {
  this.flush()
  this._logger = logger
  this._failureCount = 0
}
util.inherits(FakeCache, CacheInstance)

/** @inheritDoc */
FakeCache.prototype.mget = function (keys) {
  if (this._failureCount > 0) return this._fakeFail()

  var self = this
  // Add an artificial delay to mimic real world cache latency.
  return Q.delay(CACHE_LATENCY_MS)
    .then(function actualMget() {
      self._requestCounts.mget += 1
      self._requestCounts.mgetItemCount.push(keys.length)
      return Q.resolve(keys.map(function (key) {return self._getInternal(key)}))
    })
}

/** @inheritDoc */
FakeCache.prototype.get = function (key) {
  if (this._failureCount > 0) return this._fakeFail()

  var self = this
  // Add an artificial delay to mimic real world cache latency.
  return Q.delay(CACHE_LATENCY_MS)
    .then(function actualGet() {
      self._requestCounts.get += 1
      return Q.resolve(self._getInternal(key))
    })
}

/** @inheritDoc */
FakeCache.prototype.del = function (key) {
  if (this._failureCount > 0) return this._fakeFail()
  this._logger.fine('FakeCache - del', key)
  this._requestCounts.del += 1
  delete this._data[key]
  return Q.resolve()
}

/** @inheritDoc */
FakeCache.prototype.set = function (key, value) {
  if (this._failureCount > 0) return this._fakeFail()
  this._logger.fine('FakeCache - set', key, value)

  var self = this
  // Add an artificial delay to mimic real world cache latency.
  return Q.delay(CACHE_LATENCY_MS)
    .then(function actualSet() {
      self._requestCounts.set += 1
      self._data[key] = value
      return Q.resolve()
    })
}

/** @inheritDoc */
FakeCache.prototype.mset = function (items) {
  if (this._failureCount > 0) return this._fakeFail()

  var self = this
  // Add an artificial delay to mimic real world cache latency.
  return Q.delay(CACHE_LATENCY_MS)
    .then(function actualMset() {
      self._requestCounts.mset += 1
      for (var i = 0; i < items.length; i++) {
        var item = items[i]
        self._data[item.key] = item.value
      }
      return Q.resolve()
    })
}

FakeCache.prototype.isAvailable = function () {
  return true
}

FakeCache.prototype.connect = function () {}

FakeCache.prototype.disconnect = function () {}

FakeCache.prototype.destroy = function () {}

/**
 * Flush all cached data
 */
FakeCache.prototype.flush = function () {
  this._data = {}
  this.resetRequestCounts()
}

/**
 * Get stats data
 */
FakeCache.prototype.getRequestCounts = function () {
  return this._requestCounts
}

/**
 * Return all cached data
 */
FakeCache.prototype.getData = function () {
  return this._data
}

/**
 * Set failure count
 */
FakeCache.prototype.setFailureCount = function (count) {
  this._failureCount = count
}

FakeCache.prototype.resetRequestCounts = function () {
  this._requestCounts = {
    mget: 0,
    get: 0,
    set: 0,
    del: 0,
    mgetItemCount: [],
    hitCount: 0,
    missCount: 0,
  }
}

FakeCache.prototype._fakeFail = function () {
  this._failureCount -= 1
  return Q.reject(new Error('fake failure'))
}

FakeCache.prototype._getInternal = function (key) {
  this._logger.fine('FakeCache - get', key, (typeof this._data[key] !== 'undefined') ? '[HIT]' : '[MISS]')
  var val = this._data[key]
  if (typeof val === 'undefined') {
    this._requestCounts.missCount += 1
  } else {
    this._requestCounts.hitCount += 1
  }
  return val
}

module.exports = FakeCache