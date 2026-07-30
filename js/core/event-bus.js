"use strict";

var EventBus = (function () {
  var listeners = {};

  function on(eventName, handler) {
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(handler);
    return function unsubscribe() {
      off(eventName, handler);
    };
  }

  function off(eventName, handler) {
    if (!listeners[eventName]) return;
    listeners[eventName] = listeners[eventName].filter(function (fn) {
      return fn !== handler;
    });
  }

  function emit(eventName, payload) {
    if (!listeners[eventName]) return;
    listeners[eventName].slice().forEach(function (fn) {
      fn(payload);
    });
  }

  return {
    on: on,
    off: off,
    emit: emit
  };
})();

window.EventBus = EventBus;