import { isServer, actionToUrl } from '../../../utils'
import { createLocation } from '../../../history/utils'

const defaultCreateCacheKey = (action, name) => {
  const { type, location, basename } = action
  const { pathname, search } = location
  return `${name}|${type}|${basename}|${pathname}|${search}` // don't cache using URL hash, as in 99.999% of all apps its the same route
}

const callbacks = []

export default (api, name, config) => {
  if (config.prev) {
    throw new Error(`[rudy] call('${name}') middleware 'cache' option cannot be used with 'prev' option`)
  }

  callbacks.push(name)
  if (api.cache) return api.cache

  const { createCacheKey = defaultCreateCacheKey } = api.options
  let cache = {}

  const isCached = (name, route, req) => {
    if (isServer()) return false

    const { options, action } = req

    if (!route.path || route.cache === false) return false
    if (options.cache === false && route.cache === undefined) return false

    const key = createCacheKey(action, name)

    if (cache[key]) return true

    return false
  }

  const cacheAction = (name, action) => {
    const key = createCacheKey(action, name)
    cache[key] = true
  }

  const clear = (action, opts = {}) => {
    if (!action) {
      cache = {}
    }
    else if (typeof action === 'function') {      // allow user to customize cache clearing algo
      cache = action(cache, api, opts) || cache
    }
    else if (typeof action === 'string') {        // delete all cached items for TYPE or other string
      for (const k in cache) {
        if (k.indexOf(action) > -1) delete cache[k]
      }
    }
    else {                                        // delete all/some callbacks for precise item (default)
      const loc = createLocation(actionToUrl(action, api.routes, api.options))
      const act = { ...action, location: { ...action.location, ...loc } }

      const names = opts.name === undefined ? callbacks : [].concat(opts.name)

      names.forEach(name => {
        const key = createCacheKey(act, name)
        delete cache[key]
      })
    }
  }

  return { isCached, cacheAction, clear }
}