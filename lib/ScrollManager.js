"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withManager = withManager;
exports.ScrollManager = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _timedMutationObserver = _interopRequireDefault(require("./timedMutationObserver"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var debug = require('debug')('ScrollManager');

var ManagerContext = _react.default.createContext();

var defaultTimeout = 3000;

var ScrollManager =
/*#__PURE__*/
function (_React$Component) {
  _inherits(ScrollManager, _React$Component);

  function ScrollManager(props) {
    var _this;

    _classCallCheck(this, ScrollManager);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ScrollManager).call(this, props));
    var history = props.history,
        _props$sessionKey = props.sessionKey,
        sessionKey = _props$sessionKey === void 0 ? 'ScrollManager' : _props$sessionKey,
        _props$timeout = props.timeout,
        timeout = _props$timeout === void 0 ? defaultTimeout : _props$timeout;

    if ('scrollRestoration' in window.history) {
      _this._originalScrollRestoration = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
    } // load positions and associated tracking data from session state


    try {
      var data = sessionStorage.getItem(sessionKey);
      _this._session = JSON.parse(data || '{}');
    } catch (e) {
      debug('Error reading session storage:', e.message);
      _this._session = {};
    }

    _this._positions = _this._session.positions || (_this._session.positions = {});
    _this._locations = _this._session.locations || (_this._session.locations = []);
    _this._historyStart = history.length - _this._locations.length;
    var initialKey = 'initial';
    _this._locationKey = _this._session.locationKey || initialKey; // initialize emphemeral state of scrollable nodes

    _this._scrollableNodes = {};
    _this._deferredNodes = {};
    window.addEventListener('beforeunload', function () {
      // write everything back to session state on unload
      _this._savePositions();

      _this._session.locationKey = _this._locationKey;

      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(_this._session));
      } catch (e) {// session state full or unavailable
      }
    });
    _this._unlisten = history.listen(function (location, action) {
      _this._savePositions(); // cancel any pending hash scroller


      if (_this._hashScroller) {
        _this._hashScroller.cancel();

        _this._hashScroller = null;
      } // clean up positions no longer in history to avoid leaking memory
      // (including last history element if action is PUSH or REPLACE)


      var locationCount = Math.max(0, history.length - _this._historyStart - (action !== 'POP' ? 1 : 0));

      while (_this._locations.length > locationCount) {
        var _key = _this._locations.pop();

        delete _this._positions[_key];
      }

      var key = location.key || initialKey;

      if (action !== 'POP') {
        // track the new location key in our array of locations
        _this._locations.push(key);

        _this._historyStart = history.length - _this._locations.length; // check for hash links that need deferral of scrolling into view

        if (typeof location.hash === 'string' && location.hash.length > 1) {
          var elementId = location.hash.substring(1);
          _this._hashScroller = (0, _timedMutationObserver.default)(function () {
            var element = document.getElementById(elementId);

            if (element) {
              debug("Scrolling element ".concat(elementId, " into view"));
              element.scrollIntoView();
              return true;
            }

            return false;
          }, timeout);

          _this._hashScroller.catch(function (e) {
            if (!e.cancelled) {
              debug("Timeout scrolling hash element ".concat(elementId, " into view"));
            }
          });
        }
      } // set current location key for saving position on next history change


      _this._locationKey = key;
    });
    return _this;
  }

  _createClass(ScrollManager, [{
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      if (this._unlisten) {
        this._unlisten();
      }

      if (this._originalScrollRestoration) {
        window.history.scrollRestoration = this._originalScrollRestoration;
      }
    }
  }, {
    key: "render",
    value: function render() {
      return _react.default.createElement(ManagerContext.Provider, {
        value: this
      }, this.props.children);
    }
  }, {
    key: "_registerElement",
    value: function _registerElement(scrollKey, node) {
      this._scrollableNodes[scrollKey] = node;

      this._restoreNode(scrollKey);
    }
  }, {
    key: "_unregisterElement",
    value: function _unregisterElement(scrollKey) {
      delete this._scrollableNodes[scrollKey];
    }
  }, {
    key: "_savePositions",
    value: function _savePositions() {
      // use pageXOffset instead of scrollX for IE compatibility
      // https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollX#Notes
      var _window = window,
          scrollX = _window.pageXOffset,
          scrollY = _window.pageYOffset;

      this._savePosition('window', {
        scrollX: scrollX,
        scrollY: scrollY
      });

      for (var scrollKey in this._scrollableNodes) {
        var node = this._scrollableNodes[scrollKey];
        var scrollLeft = node.scrollLeft,
            scrollTop = node.scrollTop;

        this._savePosition(scrollKey, {
          scrollLeft: scrollLeft,
          scrollTop: scrollTop
        });
      }
    }
  }, {
    key: "_savePosition",
    value: function _savePosition(scrollKey, position) {
      debug('save', this._locationKey, scrollKey, position);

      if (!(scrollKey in this._deferredNodes)) {
        var loc = this._positions[this._locationKey];

        if (!loc) {
          loc = this._positions[this._locationKey] = {};
        }

        loc[scrollKey] = position;
      } else {
        debug("Skipping save due to deferred scroll of ".concat(scrollKey));
      }
    }
  }, {
    key: "_loadPosition",
    value: function _loadPosition(scrollKey) {
      var loc = this._positions[this._locationKey];
      return loc ? loc[scrollKey] || null : null;
    }
  }, {
    key: "_restoreNode",
    value: function _restoreNode(scrollKey) {
      var _this2 = this;

      var position = this._loadPosition(scrollKey);

      var _ref = position || {},
          _ref$scrollLeft = _ref.scrollLeft,
          scrollLeft = _ref$scrollLeft === void 0 ? 0 : _ref$scrollLeft,
          _ref$scrollTop = _ref.scrollTop,
          scrollTop = _ref$scrollTop === void 0 ? 0 : _ref$scrollTop;

      debug('restore', this._locationKey, scrollKey, scrollLeft, scrollTop);

      this._cancelDeferred(scrollKey);

      var node = this._scrollableNodes[scrollKey];

      var attemptScroll = function attemptScroll() {
        node.scrollLeft = scrollLeft;
        node.scrollTop = scrollTop;
        return node.scrollLeft === scrollLeft && node.scrollTop === scrollTop;
      };

      if (!attemptScroll()) {
        var failedScroll = function failedScroll() {
          debug("Could not scroll ".concat(scrollKey, " to (").concat(scrollLeft, ", ").concat(scrollTop, ")") + "; scroll size is (".concat(node.scrollWidth, ", ").concat(node.scrollHeight, ")"));
        };

        var _this$props$timeout = this.props.timeout,
            timeout = _this$props$timeout === void 0 ? defaultTimeout : _this$props$timeout;

        if (timeout) {
          debug("Deferring scroll of ".concat(scrollKey, " for up to ").concat(timeout, " ms"));
          (this._deferredNodes[scrollKey] = (0, _timedMutationObserver.default)(attemptScroll, timeout, node)).then(function () {
            return delete _this2._deferredNodes[scrollKey];
          }).catch(function (e) {
            if (!e.cancelled) failedScroll();
          });
        } else {
          failedScroll();
        }
      }
    }
  }, {
    key: "_restoreWindow",
    value: function _restoreWindow() {
      var _this3 = this;

      var scrollKey = 'window';

      var position = this._loadPosition(scrollKey);

      var _ref2 = position || {},
          _ref2$scrollX = _ref2.scrollX,
          scrollX = _ref2$scrollX === void 0 ? 0 : _ref2$scrollX,
          _ref2$scrollY = _ref2.scrollY,
          scrollY = _ref2$scrollY === void 0 ? 0 : _ref2$scrollY;

      debug('restore', this._locationKey, scrollKey, scrollX, scrollY);

      this._cancelDeferred(scrollKey);

      var attemptScroll = function attemptScroll() {
        window.scrollTo(scrollX, scrollY);
        return window.pageXOffset === scrollX && window.pageYOffset === scrollY;
      };

      if (!attemptScroll()) {
        var failedScroll = function failedScroll() {
          debug("Could not scroll ".concat(scrollKey, " to (").concat(scrollX, ", ").concat(scrollY, ")") + "; scroll size is (".concat(document.body.scrollWidth, ", ").concat(document.body.scrollHeight, ")"));
        };

        var _this$props$timeout2 = this.props.timeout,
            timeout = _this$props$timeout2 === void 0 ? defaultTimeout : _this$props$timeout2;

        if (timeout) {
          debug("Deferring scroll of ".concat(scrollKey, " for up to ").concat(timeout, " ms"));
          (this._deferredNodes[scrollKey] = (0, _timedMutationObserver.default)(attemptScroll, timeout)).then(function () {
            return delete _this3._deferredNodes[scrollKey];
          }).catch(function (e) {
            if (!e.cancelled) failedScroll();
          });
        } else {
          failedScroll();
        }
      }
    }
  }, {
    key: "_restoreInitial",
    value: function _restoreInitial() {
      if (!location.hash) {
        this._restoreWindow();
      }
    }
  }, {
    key: "_cancelDeferred",
    value: function _cancelDeferred(scrollKey) {
      var deferred = this._deferredNodes[scrollKey];

      if (deferred) {
        debug("Cancelling deferred scroll of ".concat(scrollKey));
        delete this._deferredNodes[scrollKey];
        deferred.cancel();
      }
    }
  }]);

  return ScrollManager;
}(_react.default.Component);

exports.ScrollManager = ScrollManager;
ScrollManager.propTypes = {
  history: _propTypes.default.object.isRequired,
  sessionKey: _propTypes.default.string,
  timeout: _propTypes.default.number,
  children: _propTypes.default.node
};

function withManager(Component) {
  return function ManagedComponent(props) {
    return _react.default.createElement(ManagerContext.Consumer, null, function (manager) {
      return _react.default.createElement(Component, _extends({}, props, {
        manager: manager
      }));
    });
  };
}