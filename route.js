const prepare = (base, route) => {
  // prefix the base to always start with a '/' and remove trailing slash
  base = '/'+base.replace(/^[\/]+|[\/]+$/g, '');
  // strip multiple occurences of '/'
  route = (`${base}/${route}`).replace(/[\/]+/g, '/');
  // remove leading and trailing slashes
  route = route.replace(/^[\/]+|[\/]+$/g, '');
  // get if it's explicit or not. could be a factor when determining route based on it's size/weight 
  // in terms of what has presedent when two routes would've matched the same url
  const explicit = /\*$/.test(route);
  // if it's implicit or explicit
  const lazy = explicit ? (route = route.replace(/[\*]+$/g, ''), ''): '/?$';
  // store parameters
  const parameters = [];
  let index = 0;
  let regexpRoute = route.replace(/(:)?([^\\/]+)/g, (parameter, colonParameter, identifier) => {
    const [ param, boundValue ] = identifier.split('->');
    if(colonParameter){
      // check for duplicates
      const duplicates = parameters.filter(old => old.identifier == boundValue); 
      if(duplicates.length > 0){
        throw new Error(`Duplicated parameter. [${duplicates.map(_=>_.identifier)}]`);
      }
      // store parameter reference
      parameters.push({
        index: index++,
        parameter,
        identifier: param,
      });
      // bound parameter
      return boundValue ? `(${boundValue})` : `([^\/]+)`;
    }
    return `${parameter}`;
  });
  regexpRoute = `^/${regexpRoute}${lazy}`;
  return {
    base,
    route,
    regexpRoute,
    parameters,
  }
}

export default class Route{
  constructor(base, route, fn, middlewares = []){
    Object.assign(this, prepare(base, route));
    this.callback = fn;
    this.middlewares = middlewares;
  }
}