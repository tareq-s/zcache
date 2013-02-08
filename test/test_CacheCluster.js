var zcache = require('../index')
var Q = require('kew')

exports.testCacheCluster = function (test) {
  var cacheInstance = new zcache.CacheCluster({
    create: function (uri, opts, callback) {
      var parts = uri.split(':')

      var wrappedCacheInstance = new zcache.MemcacheConnection(parts[0], parseInt(parts[1], 10))
      var wrapperCacheInstance = new zcache.ConnectionWrapper(wrappedCacheInstance)
      wrapperCacheInstance.on('connect', function () {
        callback(null, wrapperCacheInstance)
      })

      wrapperCacheInstance.connect()
    }
  })
  cacheInstance.setCapacity('localhost:11212', 10, {memcache: true}, 0)
  cacheInstance.setCapacity('localhost:11213', 5, {memcache: true}, 0)

  test.equal(cacheInstance.isAvailable(), false, "Connection should not be available")

  cacheInstance.on('connect', function () {
    var defer = Q.defer()
    setTimeout(function () {
      defer.resolve(true)
    }, 100)

    defer
      .then(function () {
        test.equal(cacheInstance.isAvailable(), true, "Connection should be available")

        var promises = []
        promises.push(cacheInstance.set('abc', '123', 300000))
        promises.push(cacheInstance.set('def', '456', 300000))
        promises.push(cacheInstance.set('ghi', '789', 300000))
        promises.push(cacheInstance.set('jkl', '234', 300000))
        promises.push(cacheInstance.set('mno', '567', 300000))

        return Q.all(promises)
      })
      .then(function () {
        return cacheInstance.mget(['abc', 'def', 'ghi', 'jkl', 'mno'])
      })
      .then(function (vals) {
        test.equal(vals[0], '123')
        test.equal(vals[1], '456')
        test.equal(vals[2], '789')
        test.equal(vals[3], '234')
        test.equal(vals[4], '567')
        return cacheInstance.del('abc')
      })
      .then(function () {
        return cacheInstance.mget(['abc'])
      })
      .then(function (vals) {
        test.equal(vals[0], undefined)
        cacheInstance.destroy()
      })
      .fail(function (e) {
        console.error(e)
        test.fail(e.message, e.stack)
        test.done()
      })
  })

  cacheInstance.on('destroy', function () {
    test.equal(cacheInstance.isAvailable(), false, "Connection should not be available")
    test.done()
  })

  cacheInstance.connect()
}