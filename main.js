import Route from './route.js';
import { Middleware, Request, Response } from './utils.js';

// router
class Router{
  constructor(props){
    // store properties and freeze them so not to be able to get modified
    Object.freeze(this.__properties = {
      initial: undefined,
      base: '',
      ...props
    });
    // are we subscribing?
    this.__subscribing = false;
    // store
    this.__get = new Map();
    this.__catch = new Map();
    this.__use = new Set();
  }
  _register(routes, fn, middlewares, list){
    routes.map(route => {
      const r = new Route(this.__properties.base, route, fn, middlewares);
      if(list.has(r.regexpRoute)){
        throw new Error(`Route with same endpoint already exist. [${route}, /${list.get(r.regexpRoute).route}](${r.regexpRoute})`);
      }
      list.set(r.regexpRoute, r);
    });
    return routes;
  }
  _props(...args){
    let routes, fn, middlewares = [];
    if(args.length == 1){
      [ fn ] = args;
      routes = '*';
    }else if(args.length == 2){
      [ routes, fn ] = args;
    }else if(args.length > 2){
      routes = args.shift();
      fn = args.pop();
      middlewares = args;      
    }else{
      throw new Error(`Invalid number prop arguments.`);
    }
    routes = Array.isArray(routes) ? routes : [routes];
    return { routes, fn, middlewares };
  }
  _storeInList(fnName, list, ...args){
    const { routes, fn, middlewares } = this._props(...args);
    const parentRoutes = this._register(routes, fn, middlewares, list);
    // enable chaining to group sub routes to a main route
    // not needed since the routes are store as unique strings in the end 
    // but might be a nicer way to organize the implementation
    const ret = {
      [fnName]: (...innerArgs) => {
        const { routes: innerRoutes, fn: innerFn, middlewares: innerMiddlewares } = this._props(...innerArgs);
        parentRoutes.map(route => innerRoutes.map(_ => route + _).map(_ => this[fnName](_, ...[...innerMiddlewares, innerFn])));
        return ret;
      }
    }
    return ret;
  }
  get(...args){
    return this._storeInList('get', this.__get, ...args);
  }
  use(...args){
    const { routes, fn } = this._props(args);
    routes.map(url => this.__use.add(new Route(this.__properties.base, url, ...fn)));
  }
  catch(...args){
    return this._storeInList('catch', this.__catch, ...args);
  }
  _findRoute(url, list, data){
    for(let [ regexpRoute, RouteInstance ] of list){
      const parameters = url.match(new RegExp(regexpRoute, 'i'));
      if(parameters){
        const uri = parameters.shift();
        // update Route with new parameters
        let params = {};
        if(parameters.length > 0){
          // create a parameters object
          params = RouteInstance.parameters.reduce((obj, value, index) => {
            obj[value.identifier] = parameters[index];
            return obj;
          }, params);
        }

        // update request object
        const returnObject = { 
          RouteInstance,
          Request: new Request({
            path: url,
            route: '/' + RouteInstance.route,
            base: RouteInstance.base,
            params: params,
            state: { ...data },
          })
        };
        return returnObject;
      }
    }
  }
  execute(url, data){
    if(typeof url != 'string'){
      throw new Error(`Invalid 'execute' argument. Expecting 'string'`);
    }
    if(!this.__subscribing){
      return;
    }
    const response = new Response({
      send: (...props) => this.__router_callback.call(null, ...props),
      error: (props) => {
        const errorsFound = this._findRoute(url, this.__catch, data);
        if(!errorsFound){
          console.warn(`No route or catch fallbacks found for [${url}]`);
          return;
        }
        errorsFound.RouteInstance.callback.call(null, errorsFound.Request, response, props);
      }
    });
    let matchFound = this._findRoute(url, this.__get, data);
    if(!matchFound){
      response.error();
      return;
    }
    let middlewares = [];
    const middleware = new Middleware(matchFound.Request, response);
    this.__use.forEach(middlewareRoute => {
      const RouteInstance = url.match(new RegExp(middlewareRoute.regexpRoute, 'i'));
      if(RouteInstance){
        middlewares.push(middlewareRoute.callback);
      }
    });
    middlewares = [...middlewares, ...matchFound.RouteInstance.middlewares, matchFound.RouteInstance.callback];
    middlewares.map(fn => middleware.use(fn));
    // execute middleware
    middleware.execute();
  }
  subscribe(fn){
    this.__subscribing = true;
    if(typeof fn == 'function'){
      this.__router_callback = fn;
    }
    if(this.__properties.initial){
      this.execute(this.__properties.initial);
    }
    return () => {
      this.__subscribing = false;
    }
  }
}

export default Router;