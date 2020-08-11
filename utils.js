export class Middleware{
  constructor(...props){
    this.props = props;
  }
  use(fn){
    if(typeof fn != 'function'){
      throw new Error(`Invalid Middleware use argument. Expecting 'function' got : '${typeof fn}'`); 
    }
    const f = (stack) => next => stack(fn.bind(this, ...this.props, next));
    this.execute = f(this.execute);
    return this;
  }
  execute(fn){
    return fn.call(null);
  }
}

export class Request{
  constructor(props){
    Object.assign(this, {
      base: '',
      path: '',
      route: '',
      params: {}
    }, props);
  }
}

export class Response{
  constructor(fn){
    if(typeof fn != 'function'){
      throw new Error(`Invalid response callback. Expecting 'function'`);
    }
    this.send = fn;
  }
}
