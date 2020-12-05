# Standalone Router
A standalone frontend router with fallbacks and middlewares.

---

**NOTE**

Because there is no scoring system in place for determining the most suitable route the order which each route are defined is what matters.

For middlewares this applies as well but with the one caveat that global middlewares executes before those applied to the route itself. 

---

## Install
```js
npm i standalone-router
```

# Usage
```js
// available options.
const options = {
  // initial: '/about'
  initial: window.location.pathname,
  // prefix all routes with this base
  base: '' // <- default. can be omitted
  // for electron applications where on windows all routes is prefix under 
  // a filepath you would do something like this (but dynamically of course) 
  // base: '/C:' 
}
```

````js
// create a new router
const app = new Router(options);
````
## Request and response object
```js
// request object
Request{
  base : String,
  path : String,
  route: String,
  params : Object,
  state: Object
}
```
```js
// response object
Response{
  send : Function,
  error: Function
}
```

## Registering routes
There are two different types of routes. Get routes and fallback routes. Defining a get route takes two arguments. A string|array of strings and a callback method.
```js
app.get('/', (req, res) => {
  // we found a match for the home route
  // lets use the 'response' object to 
  // send it to the listener 
  res.send('IndexComponent', { slug: 'index' });
});
// there is also the option to add multiple routes with the same callback
// by using an array instead of a string as a route argument 
app.get(['/', '/index', '/home'], callbackFunction);
```
While this is pretty straightforward for static routes, how about dynamic ones with parameters? The route string is built upon parts delimited by `'/'`. For each part you can create a parameter by prefixing it by a colon `':'`
```js
app.get('/:slug', (req, res) => {
  // here you have access to the params from the request object
  console.log(req.params.slug);
});
```
This solves most of the problems of dynamic routes. except where you might want static routes bound to a parameter? Well there is a simple interface for doing just that by using `'->'` 
```js
// here the route will be static like '/about' and a parameter on the request object for slug 'req.params.slug' would equal to 'about'
app.get('/:slug->about', callbackFunction);
```
There is one more thing about routes. So far all routes has been explicit, meaning the route string has to match from start to end. But sometimes we also want to catch everything that matches after the route, especially with fallbacks. To do that simply add a `'*'` at the end. Usually a `'*'` means a wildcard you can use wherever in the string which is NOT the case. Use a `'*'` at the end of the string to make the route implicit. 
```js
app.get('/:slug/*', callbackFunction);
```



For easier to manage sections one could also chain set of routes together. This will concatenate the main route with the current route. For instance `'/create'` will be stored as `'/admin/posts/create'` and so on.
```js
app.get('/admin/posts', (req, res) => res.send('component', req.params))
   .get('/create', functionCallback)
   .get('/read', functionCallback)
   .get('/update', functionCallback)
   .get('/delete', functionCallback)
```

## Fallbacks
Fallbacks works like get routes with the exception of not having any middlewares applied. If a route is not found it will look for a fallback.
```js
app.catch((req, res) => {
  // omitting the route argument will make the route '/*' which will catch 
  // all routes. Great for a general error catcher.
  res.send('ErrorComponent');
});
```
Since the order matters, and adding on to our general fallback we are adding more explicit routes before we lastly decide to catch everything.
```js
// since admin is static and here we want to handle it's fallbacks on it's own
// that has to come before catching everything with the ':section' parameter 
// because that would also catch 'admin' 
app.catch('/admin/:page', adminCallbackFunction);
app.catch('/:section/:page', sectionCallbackFunction);
// lastly catch everything else
app.catch(errorCallbackFunction);
```

### Triggering error
The reponse object exposes an error `Function` that will trigger an error for that route. The function takes an optonal argument of properties that will be exposed in the catch callback.
```js
app.get('/:slug', (req, res) => {
  // here you have access to the params from the request object
  if(conditions != true){
    return res.error({ custom: 'props' });
  }
  res.send('GeneralComponent', { ...req.params });
});

// catch all errors
app.catch((req, res, props) => {
  // handle the error
  res.send('ErrorComponent', props);
})
```

## Middlewares 
There are two ways to apply middleware. Like routes but with the 'use' method or you can add them directly to the route itself.
```js
// here we can handle all routes just like we do with the general fallback catcher
app.use((req, res, next) => {
  // for each route lets simply logg the url to the console
  console.log(req.path);
  // to be able to continue on with the next middleware we have to call next
  next();
});
```
and secondly attach it to the route itself. Note that even if the middleware defined with the use directive is defined after the route it would still be processed before the ones defined on the route.
```js
// verify the users authentication status
const hasAuth = (req, res, next) => {
  if(!userIsAuthenticated){
    redirect('/register');
  }else{
    next();
  }
}
app.get('/user', hasAuth, (req, res) => {
  res.send('UserComponent');
});
```

## Subscribing to the router
```js
// start listening
const unsubscribe = app.subscribe((component, props) => {
  console.log(component, props);
});

// stop listening
unsubscribe();
```

## Calling a new route 
Calling a route is as simple as calling the execute function on the router along with 
a string argument to the required path. Execute also takes a second otional argument of custom data
that will be injected in to the request object 
```js
app.execute('/about');
// /about with state parameters
app.execute('/about', { params: { custom: 'data' } });
```

## Implementation
In a frontend application you most likely would utilize the browsers popstate event and dispatch said events.
```js
// create custom functions to handle navigation ...
export const navigate = (url, state = {}, title = '') => {
  history.pushState(state, title, url); 
  // use a custom event and detail to pass data to the request.state object
  dispatchEvent(new CustomEvent('popstate', { detail: { params: { ...state } }}));
}
// ... and redirections
export const redirect = (url, state = {}, title = '') => {
  history.replaceState(state, title, url);
  // use a custom event and detail to pass data to the request.state object
  dispatchEvent(new CustomEvent('popstate', { detail: { params: { ...state } }}));
}
```

Then listen for the popstate event on the window object and from there execute the current url to find the matching route in the router.

```js
// implementation using the browsers popstate event. Use `e.detail` to access the detail data from the custom event
window.addEventListener('popstate', e => app.execute(window.location.pathname, e.detail));
```

Passing state parameters.
```js
app.get('/:subpage', (req, res) => {
  // access req.state object.
  console.log(req.state);
});
```

## Real world example
```js
// import 
import Router from 'standalone-router';

// new router instance
const app = new Router({
  initial: window.location.pathname
});

// middlewares
app.use((req, res, next) => {
  console.log('A logger middleware');
  next();
});

// catch all fallbacks
app.catch((req, res) => {
  res.send('errorComponent', { path: req.path });
});

// routes
app.get('/', (req, res) => {
  res.send('indexComponent', { slug: 'index' })
});

app.get('/:slug', (req, res) => {
  res.send(`${req.params.slug}Component`, { ...req.params });
});

const unsubscribe = app.subscribe((component, props) => {
  console.log(component, props);
});

// create custom navigate function to handle navigation
const navigate = (url, state = {}, title = '') => {
  history.pushState(state, title, url); 
  // use a custom event and detail to pass data to the request.state object
  dispatchEvent(new CustomEvent('popstate', { detail: { params: { ...state } }}));
}

// click handler on 'a' tags 
const clickHandler = (e) => {
  e.preventDefault();
  navigate(e.currentTarget.getAttribute('href'));
});

// listening to the browser popstate event
window.addEventListener('popstate', e => app.execute(window.location.pathname, e.detail));
```