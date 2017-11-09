var util = require('util')
var fs = require('fs')
var urlParse = require('url').parse
var path = require('path')
var Promise = require('bluebird')
var OSS = require('ali-oss').Wrapper

const cwd = process.cwd()
let ghostRoot

if (fs.existsSync(path.join(cwd, 'core'))) {
  ghostRoot = cwd
} else if (fs.existsSync(path.join(cwd, 'current'))) {
  // installed via ghost cli
  ghostRoot = path.join(cwd, 'current')
}

if (!ghostRoot) {
  throw new Error('Can not get ghost root path!')
}
console.log('ghostRootPath is:' + ghostRoot)

const utils = require(path.join(ghostRoot, 'core/server/utils'))

var baseStore = require('ghost-storage-base')

class OssStore extends baseStore {
  constructor(config) {
    super(config)
    this.options = config || {}
    this.client = new OSS(this.options)
  }

  save(file, targetDir) {
    var client = this.client
    var origin = this.options.origin
    var protocol = this.options.protocol || 'http'
    var key = this.getFileKey(file)

    return new Promise(function(resolve, reject) {
      return client
        .put(key, fs.createReadStream(file.path))
        .then(function(result) {
          if (origin) {
            resolve(protocol + '://' + path.join(origin, result.name))
          } else {
            resolve(result.url)
          }
        })
        .catch(function(err) {
          // console.log(err)
          reject(false)
        })
    })
  }

  exists(filename) {
    // console.log('exists',filename)
    var client = this.client

    return new Promise(function(resolve, reject) {
      return client
        .head(filename)
        .then(function(result) {
          // console.log(result)
          resolve(true)
        })
        .catch(function(err) {
          // console.log(err)
          reject(false)
        })
    })
  }

  serve(options) {
    return function(req, res, next) {
      next()
    }
  }

  delete(filename) {
    var client = this.client

    // console.log('del',filename)
    return new Promise(function(resolve, reject) {
      return client
        .delete(filename)
        .then(function(result) {
          // console.log(result)
          resolve(true)
        })
        .catch(function(err) {
          // console.log(err)
          reject(false)
        })
    })
  }

  /**
   * Reads bytes from OSS for a target image
   *
   * @param options
   */
  read(options) {
  }

  getFileKey(file) {
    var keyOptions = this.options.fileKey

    if (keyOptions) {
      var getValue = function(obj) {
        return typeof obj === 'function' ? obj() : obj
      }
      var ext = path.extname(file.name)
      var name = path.basename(file.name, ext)

      if (keyOptions.safeString) {
        name = utils.safeString(name)
      }

      if (keyOptions.prefix) {
        name = path.join(keyOptions.prefix, name)
      }

      if (keyOptions.suffix) {
        name += getValue(keyOptions.suffix)
      }

      return name + ext.toLowerCase()
    }

    return null
  }
}

module.exports = OssStore
