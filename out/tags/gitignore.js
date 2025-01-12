"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/ignore/index.js
var require_ignore = __commonJS({
  "node_modules/ignore/index.js"(exports, module2) {
    function makeArray(subject) {
      return Array.isArray(subject) ? subject : [subject];
    }
    var EMPTY = "";
    var SPACE = " ";
    var ESCAPE = "\\";
    var REGEX_TEST_BLANK_LINE = /^\s+$/;
    var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
    var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
    var REGEX_SPLITALL_CRLF = /\r?\n/g;
    var REGEX_TEST_INVALID_PATH = /^\.*\/|^\.+$/;
    var SLASH = "/";
    var KEY_IGNORE = typeof Symbol !== "undefined" ? Symbol.for("node-ignore") : "node-ignore";
    var define = (object, key, value) => Object.defineProperty(object, key, { value });
    var REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
    var RETURN_FALSE = () => false;
    var sanitizeRange = (range) => range.replace(
      REGEX_REGEXP_RANGE,
      (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY
    );
    var cleanRangeBackSlash = (slashes) => {
      const { length } = slashes;
      return slashes.slice(0, length - length % 2);
    };
    var REPLACERS = [
      // > Trailing spaces are ignored unless they are quoted with backslash ("\")
      [
        // (a\ ) -> (a )
        // (a  ) -> (a)
        // (a \ ) -> (a  )
        /\\?\s+$/,
        (match) => match.indexOf("\\") === 0 ? SPACE : EMPTY
      ],
      // replace (\ ) with ' '
      [
        /\\\s/g,
        () => SPACE
      ],
      // Escape metacharacters
      // which is written down by users but means special for regular expressions.
      // > There are 12 characters with special meanings:
      // > - the backslash \,
      // > - the caret ^,
      // > - the dollar sign $,
      // > - the period or dot .,
      // > - the vertical bar or pipe symbol |,
      // > - the question mark ?,
      // > - the asterisk or star *,
      // > - the plus sign +,
      // > - the opening parenthesis (,
      // > - the closing parenthesis ),
      // > - and the opening square bracket [,
      // > - the opening curly brace {,
      // > These special characters are often called "metacharacters".
      [
        /[\\$.|*+(){^]/g,
        (match) => `\\${match}`
      ],
      [
        // > a question mark (?) matches a single character
        /(?!\\)\?/g,
        () => "[^/]"
      ],
      // leading slash
      [
        // > A leading slash matches the beginning of the pathname.
        // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
        // A leading slash matches the beginning of the pathname
        /^\//,
        () => "^"
      ],
      // replace special metacharacter slash after the leading slash
      [
        /\//g,
        () => "\\/"
      ],
      [
        // > A leading "**" followed by a slash means match in all directories.
        // > For example, "**/foo" matches file or directory "foo" anywhere,
        // > the same as pattern "foo".
        // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
        // >   under directory "foo".
        // Notice that the '*'s have been replaced as '\\*'
        /^\^*\\\*\\\*\\\//,
        // '**/foo' <-> 'foo'
        () => "^(?:.*\\/)?"
      ],
      // starting
      [
        // there will be no leading '/'
        //   (which has been replaced by section "leading slash")
        // If starts with '**', adding a '^' to the regular expression also works
        /^(?=[^^])/,
        function startingReplacer() {
          return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
        }
      ],
      // two globstars
      [
        // Use lookahead assertions so that we could match more than one `'/**'`
        /\\\/\\\*\\\*(?=\\\/|$)/g,
        // Zero, one or several directories
        // should not use '*', or it will be replaced by the next replacer
        // Check if it is not the last `'/**'`
        (_, index, str) => index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
      ],
      // intermediate wildcards
      [
        // Never replace escaped '*'
        // ignore rule '\*' will match the path '*'
        // 'abc.*/' -> go
        // 'abc.*'  -> skip this rule
        /(^|[^\\]+)\\\*(?=.+)/g,
        // '*.js' matches '.js'
        // '*.js' doesn't match 'abc'
        (_, p1) => `${p1}[^\\/]*`
      ],
      [
        // unescape, revert step 3 except for back slash
        // For example, if a user escape a '\\*',
        // after step 3, the result will be '\\\\\\*'
        /\\\\\\(?=[$.|*+(){^])/g,
        () => ESCAPE
      ],
      [
        // '\\\\' -> '\\'
        /\\\\/g,
        () => ESCAPE
      ],
      [
        // > The range notation, e.g. [a-zA-Z],
        // > can be used to match one of the characters in a range.
        // `\` is escaped by step 3
        /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
        (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" ? endEscape.length % 2 === 0 ? `[${sanitizeRange(range)}${endEscape}]` : "[]" : "[]"
      ],
      // ending
      [
        // 'js' will not match 'js.'
        // 'ab' will not match 'abc'
        /(?:[^*])$/,
        // WTF!
        // https://git-scm.com/docs/gitignore
        // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
        // which re-fixes #24, #38
        // > If there is a separator at the end of the pattern then the pattern
        // > will only match directories, otherwise the pattern can match both
        // > files and directories.
        // 'js*' will not match 'a.js'
        // 'js/' will not match 'a.js'
        // 'js' will match 'a.js' and 'a.js/'
        (match) => /\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`
      ],
      // trailing wildcard
      [
        /(\^|\\\/)?\\\*$/,
        (_, p1) => {
          const prefix = p1 ? `${p1}[^/]+` : "[^/]*";
          return `${prefix}(?=$|\\/$)`;
        }
      ]
    ];
    var regexCache = /* @__PURE__ */ Object.create(null);
    var makeRegex = (pattern, ignoreCase) => {
      let source = regexCache[pattern];
      if (!source) {
        source = REPLACERS.reduce(
          (prev, current) => prev.replace(current[0], current[1].bind(pattern)),
          pattern
        );
        regexCache[pattern] = source;
      }
      return ignoreCase ? new RegExp(source, "i") : new RegExp(source);
    };
    var isString = (subject) => typeof subject === "string";
    var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && pattern.indexOf("#") !== 0;
    var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF);
    var IgnoreRule = class {
      constructor(origin, pattern, negative, regex) {
        this.origin = origin;
        this.pattern = pattern;
        this.negative = negative;
        this.regex = regex;
      }
    };
    var createRule = (pattern, ignoreCase) => {
      const origin = pattern;
      let negative = false;
      if (pattern.indexOf("!") === 0) {
        negative = true;
        pattern = pattern.substr(1);
      }
      pattern = pattern.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
      const regex = makeRegex(pattern, ignoreCase);
      return new IgnoreRule(
        origin,
        pattern,
        negative,
        regex
      );
    };
    var throwError = (message, Ctor) => {
      throw new Ctor(message);
    };
    var checkPath = (path2, originalPath, doThrow) => {
      if (!isString(path2)) {
        return doThrow(
          `path must be a string, but got \`${originalPath}\``,
          TypeError
        );
      }
      if (!path2) {
        return doThrow(`path must not be empty`, TypeError);
      }
      if (checkPath.isNotRelative(path2)) {
        const r = "`path.relative()`d";
        return doThrow(
          `path should be a ${r} string, but got "${originalPath}"`,
          RangeError
        );
      }
      return true;
    };
    var isNotRelative = (path2) => REGEX_TEST_INVALID_PATH.test(path2);
    checkPath.isNotRelative = isNotRelative;
    checkPath.convert = (p) => p;
    var Ignore2 = class {
      constructor({
        ignorecase = true,
        ignoreCase = ignorecase,
        allowRelativePaths = false
      } = {}) {
        define(this, KEY_IGNORE, true);
        this._rules = [];
        this._ignoreCase = ignoreCase;
        this._allowRelativePaths = allowRelativePaths;
        this._initCache();
      }
      _initCache() {
        this._ignoreCache = /* @__PURE__ */ Object.create(null);
        this._testCache = /* @__PURE__ */ Object.create(null);
      }
      _addPattern(pattern) {
        if (pattern && pattern[KEY_IGNORE]) {
          this._rules = this._rules.concat(pattern._rules);
          this._added = true;
          return;
        }
        if (checkPattern(pattern)) {
          const rule = createRule(pattern, this._ignoreCase);
          this._added = true;
          this._rules.push(rule);
        }
      }
      // @param {Array<string> | string | Ignore} pattern
      add(pattern) {
        this._added = false;
        makeArray(
          isString(pattern) ? splitPattern(pattern) : pattern
        ).forEach(this._addPattern, this);
        if (this._added) {
          this._initCache();
        }
        return this;
      }
      // legacy
      addPattern(pattern) {
        return this.add(pattern);
      }
      //          |           ignored : unignored
      // negative |   0:0   |   0:1   |   1:0   |   1:1
      // -------- | ------- | ------- | ------- | --------
      //     0    |  TEST   |  TEST   |  SKIP   |    X
      //     1    |  TESTIF |  SKIP   |  TEST   |    X
      // - SKIP: always skip
      // - TEST: always test
      // - TESTIF: only test if checkUnignored
      // - X: that never happen
      // @param {boolean} whether should check if the path is unignored,
      //   setting `checkUnignored` to `false` could reduce additional
      //   path matching.
      // @returns {TestResult} true if a file is ignored
      _testOne(path2, checkUnignored) {
        let ignored = false;
        let unignored = false;
        this._rules.forEach((rule) => {
          const { negative } = rule;
          if (unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored) {
            return;
          }
          const matched = rule.regex.test(path2);
          if (matched) {
            ignored = !negative;
            unignored = negative;
          }
        });
        return {
          ignored,
          unignored
        };
      }
      // @returns {TestResult}
      _test(originalPath, cache, checkUnignored, slices) {
        const path2 = originalPath && checkPath.convert(originalPath);
        checkPath(
          path2,
          originalPath,
          this._allowRelativePaths ? RETURN_FALSE : throwError
        );
        return this._t(path2, cache, checkUnignored, slices);
      }
      _t(path2, cache, checkUnignored, slices) {
        if (path2 in cache) {
          return cache[path2];
        }
        if (!slices) {
          slices = path2.split(SLASH);
        }
        slices.pop();
        if (!slices.length) {
          return cache[path2] = this._testOne(path2, checkUnignored);
        }
        const parent = this._t(
          slices.join(SLASH) + SLASH,
          cache,
          checkUnignored,
          slices
        );
        return cache[path2] = parent.ignored ? parent : this._testOne(path2, checkUnignored);
      }
      ignores(path2) {
        return this._test(path2, this._ignoreCache, false).ignored;
      }
      createFilter() {
        return (path2) => !this.ignores(path2);
      }
      filter(paths) {
        return makeArray(paths).filter(this.createFilter());
      }
      // @returns {TestResult}
      test(path2) {
        return this._test(path2, this._testCache, true);
      }
    };
    var factory = (options) => new Ignore2(options);
    var isPathValid = (path2) => checkPath(path2 && checkPath.convert(path2), path2, RETURN_FALSE);
    factory.isPathValid = isPathValid;
    factory.default = factory;
    module2.exports = factory;
    if (
      // Detect `process` so that it can run in browsers.
      typeof process !== "undefined" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")
    ) {
      const makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
      checkPath.convert = makePosix;
      const REGIX_IS_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
      checkPath.isNotRelative = (path2) => REGIX_IS_WINDOWS_PATH_ABSOLUTE.test(path2) || isNotRelative(path2);
    }
  }
});

// src/tags/gitignore.ts
var gitignore_exports = {};
__export(gitignore_exports, {
  GitIgnore: () => GitIgnore
});
module.exports = __toCommonJS(gitignore_exports);
var vscode = __toESM(require("vscode"));

// node_modules/vscode-uri/lib/esm/index.mjs
var LIB;
(() => {
  "use strict";
  var t = { 470: (t2) => {
    function e2(t3) {
      if ("string" != typeof t3)
        throw new TypeError("Path must be a string. Received " + JSON.stringify(t3));
    }
    function r2(t3, e3) {
      for (var r3, n3 = "", i = 0, o = -1, s = 0, h = 0; h <= t3.length; ++h) {
        if (h < t3.length)
          r3 = t3.charCodeAt(h);
        else {
          if (47 === r3)
            break;
          r3 = 47;
        }
        if (47 === r3) {
          if (o === h - 1 || 1 === s)
            ;
          else if (o !== h - 1 && 2 === s) {
            if (n3.length < 2 || 2 !== i || 46 !== n3.charCodeAt(n3.length - 1) || 46 !== n3.charCodeAt(n3.length - 2)) {
              if (n3.length > 2) {
                var a = n3.lastIndexOf("/");
                if (a !== n3.length - 1) {
                  -1 === a ? (n3 = "", i = 0) : i = (n3 = n3.slice(0, a)).length - 1 - n3.lastIndexOf("/"), o = h, s = 0;
                  continue;
                }
              } else if (2 === n3.length || 1 === n3.length) {
                n3 = "", i = 0, o = h, s = 0;
                continue;
              }
            }
            e3 && (n3.length > 0 ? n3 += "/.." : n3 = "..", i = 2);
          } else
            n3.length > 0 ? n3 += "/" + t3.slice(o + 1, h) : n3 = t3.slice(o + 1, h), i = h - o - 1;
          o = h, s = 0;
        } else
          46 === r3 && -1 !== s ? ++s : s = -1;
      }
      return n3;
    }
    var n2 = { resolve: function() {
      for (var t3, n3 = "", i = false, o = arguments.length - 1; o >= -1 && !i; o--) {
        var s;
        o >= 0 ? s = arguments[o] : (void 0 === t3 && (t3 = process.cwd()), s = t3), e2(s), 0 !== s.length && (n3 = s + "/" + n3, i = 47 === s.charCodeAt(0));
      }
      return n3 = r2(n3, !i), i ? n3.length > 0 ? "/" + n3 : "/" : n3.length > 0 ? n3 : ".";
    }, normalize: function(t3) {
      if (e2(t3), 0 === t3.length)
        return ".";
      var n3 = 47 === t3.charCodeAt(0), i = 47 === t3.charCodeAt(t3.length - 1);
      return 0 !== (t3 = r2(t3, !n3)).length || n3 || (t3 = "."), t3.length > 0 && i && (t3 += "/"), n3 ? "/" + t3 : t3;
    }, isAbsolute: function(t3) {
      return e2(t3), t3.length > 0 && 47 === t3.charCodeAt(0);
    }, join: function() {
      if (0 === arguments.length)
        return ".";
      for (var t3, r3 = 0; r3 < arguments.length; ++r3) {
        var i = arguments[r3];
        e2(i), i.length > 0 && (void 0 === t3 ? t3 = i : t3 += "/" + i);
      }
      return void 0 === t3 ? "." : n2.normalize(t3);
    }, relative: function(t3, r3) {
      if (e2(t3), e2(r3), t3 === r3)
        return "";
      if ((t3 = n2.resolve(t3)) === (r3 = n2.resolve(r3)))
        return "";
      for (var i = 1; i < t3.length && 47 === t3.charCodeAt(i); ++i)
        ;
      for (var o = t3.length, s = o - i, h = 1; h < r3.length && 47 === r3.charCodeAt(h); ++h)
        ;
      for (var a = r3.length - h, c = s < a ? s : a, f = -1, u = 0; u <= c; ++u) {
        if (u === c) {
          if (a > c) {
            if (47 === r3.charCodeAt(h + u))
              return r3.slice(h + u + 1);
            if (0 === u)
              return r3.slice(h + u);
          } else
            s > c && (47 === t3.charCodeAt(i + u) ? f = u : 0 === u && (f = 0));
          break;
        }
        var l = t3.charCodeAt(i + u);
        if (l !== r3.charCodeAt(h + u))
          break;
        47 === l && (f = u);
      }
      var g = "";
      for (u = i + f + 1; u <= o; ++u)
        u !== o && 47 !== t3.charCodeAt(u) || (0 === g.length ? g += ".." : g += "/..");
      return g.length > 0 ? g + r3.slice(h + f) : (h += f, 47 === r3.charCodeAt(h) && ++h, r3.slice(h));
    }, _makeLong: function(t3) {
      return t3;
    }, dirname: function(t3) {
      if (e2(t3), 0 === t3.length)
        return ".";
      for (var r3 = t3.charCodeAt(0), n3 = 47 === r3, i = -1, o = true, s = t3.length - 1; s >= 1; --s)
        if (47 === (r3 = t3.charCodeAt(s))) {
          if (!o) {
            i = s;
            break;
          }
        } else
          o = false;
      return -1 === i ? n3 ? "/" : "." : n3 && 1 === i ? "//" : t3.slice(0, i);
    }, basename: function(t3, r3) {
      if (void 0 !== r3 && "string" != typeof r3)
        throw new TypeError('"ext" argument must be a string');
      e2(t3);
      var n3, i = 0, o = -1, s = true;
      if (void 0 !== r3 && r3.length > 0 && r3.length <= t3.length) {
        if (r3.length === t3.length && r3 === t3)
          return "";
        var h = r3.length - 1, a = -1;
        for (n3 = t3.length - 1; n3 >= 0; --n3) {
          var c = t3.charCodeAt(n3);
          if (47 === c) {
            if (!s) {
              i = n3 + 1;
              break;
            }
          } else
            -1 === a && (s = false, a = n3 + 1), h >= 0 && (c === r3.charCodeAt(h) ? -1 == --h && (o = n3) : (h = -1, o = a));
        }
        return i === o ? o = a : -1 === o && (o = t3.length), t3.slice(i, o);
      }
      for (n3 = t3.length - 1; n3 >= 0; --n3)
        if (47 === t3.charCodeAt(n3)) {
          if (!s) {
            i = n3 + 1;
            break;
          }
        } else
          -1 === o && (s = false, o = n3 + 1);
      return -1 === o ? "" : t3.slice(i, o);
    }, extname: function(t3) {
      e2(t3);
      for (var r3 = -1, n3 = 0, i = -1, o = true, s = 0, h = t3.length - 1; h >= 0; --h) {
        var a = t3.charCodeAt(h);
        if (47 !== a)
          -1 === i && (o = false, i = h + 1), 46 === a ? -1 === r3 ? r3 = h : 1 !== s && (s = 1) : -1 !== r3 && (s = -1);
        else if (!o) {
          n3 = h + 1;
          break;
        }
      }
      return -1 === r3 || -1 === i || 0 === s || 1 === s && r3 === i - 1 && r3 === n3 + 1 ? "" : t3.slice(r3, i);
    }, format: function(t3) {
      if (null === t3 || "object" != typeof t3)
        throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof t3);
      return function(t4, e3) {
        var r3 = e3.dir || e3.root, n3 = e3.base || (e3.name || "") + (e3.ext || "");
        return r3 ? r3 === e3.root ? r3 + n3 : r3 + "/" + n3 : n3;
      }(0, t3);
    }, parse: function(t3) {
      e2(t3);
      var r3 = { root: "", dir: "", base: "", ext: "", name: "" };
      if (0 === t3.length)
        return r3;
      var n3, i = t3.charCodeAt(0), o = 47 === i;
      o ? (r3.root = "/", n3 = 1) : n3 = 0;
      for (var s = -1, h = 0, a = -1, c = true, f = t3.length - 1, u = 0; f >= n3; --f)
        if (47 !== (i = t3.charCodeAt(f)))
          -1 === a && (c = false, a = f + 1), 46 === i ? -1 === s ? s = f : 1 !== u && (u = 1) : -1 !== s && (u = -1);
        else if (!c) {
          h = f + 1;
          break;
        }
      return -1 === s || -1 === a || 0 === u || 1 === u && s === a - 1 && s === h + 1 ? -1 !== a && (r3.base = r3.name = 0 === h && o ? t3.slice(1, a) : t3.slice(h, a)) : (0 === h && o ? (r3.name = t3.slice(1, s), r3.base = t3.slice(1, a)) : (r3.name = t3.slice(h, s), r3.base = t3.slice(h, a)), r3.ext = t3.slice(s, a)), h > 0 ? r3.dir = t3.slice(0, h - 1) : o && (r3.dir = "/"), r3;
    }, sep: "/", delimiter: ":", win32: null, posix: null };
    n2.posix = n2, t2.exports = n2;
  } }, e = {};
  function r(n2) {
    var i = e[n2];
    if (void 0 !== i)
      return i.exports;
    var o = e[n2] = { exports: {} };
    return t[n2](o, o.exports, r), o.exports;
  }
  r.d = (t2, e2) => {
    for (var n2 in e2)
      r.o(e2, n2) && !r.o(t2, n2) && Object.defineProperty(t2, n2, { enumerable: true, get: e2[n2] });
  }, r.o = (t2, e2) => Object.prototype.hasOwnProperty.call(t2, e2), r.r = (t2) => {
    "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t2, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(t2, "__esModule", { value: true });
  };
  var n = {};
  (() => {
    let t2;
    if (r.r(n), r.d(n, { URI: () => f, Utils: () => P }), "object" == typeof process)
      t2 = "win32" === process.platform;
    else if ("object" == typeof navigator) {
      let e3 = navigator.userAgent;
      t2 = e3.indexOf("Windows") >= 0;
    }
    const e2 = /^\w[\w\d+.-]*$/, i = /^\//, o = /^\/\//;
    function s(t3, r2) {
      if (!t3.scheme && r2)
        throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${t3.authority}", path: "${t3.path}", query: "${t3.query}", fragment: "${t3.fragment}"}`);
      if (t3.scheme && !e2.test(t3.scheme))
        throw new Error("[UriError]: Scheme contains illegal characters.");
      if (t3.path) {
        if (t3.authority) {
          if (!i.test(t3.path))
            throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
        } else if (o.test(t3.path))
          throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
      }
    }
    const h = "", a = "/", c = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    class f {
      static isUri(t3) {
        return t3 instanceof f || !!t3 && "string" == typeof t3.authority && "string" == typeof t3.fragment && "string" == typeof t3.path && "string" == typeof t3.query && "string" == typeof t3.scheme && "string" == typeof t3.fsPath && "function" == typeof t3.with && "function" == typeof t3.toString;
      }
      scheme;
      authority;
      path;
      query;
      fragment;
      constructor(t3, e3, r2, n2, i2, o2 = false) {
        "object" == typeof t3 ? (this.scheme = t3.scheme || h, this.authority = t3.authority || h, this.path = t3.path || h, this.query = t3.query || h, this.fragment = t3.fragment || h) : (this.scheme = function(t4, e4) {
          return t4 || e4 ? t4 : "file";
        }(t3, o2), this.authority = e3 || h, this.path = function(t4, e4) {
          switch (t4) {
            case "https":
            case "http":
            case "file":
              e4 ? e4[0] !== a && (e4 = a + e4) : e4 = a;
          }
          return e4;
        }(this.scheme, r2 || h), this.query = n2 || h, this.fragment = i2 || h, s(this, o2));
      }
      get fsPath() {
        return m(this, false);
      }
      with(t3) {
        if (!t3)
          return this;
        let { scheme: e3, authority: r2, path: n2, query: i2, fragment: o2 } = t3;
        return void 0 === e3 ? e3 = this.scheme : null === e3 && (e3 = h), void 0 === r2 ? r2 = this.authority : null === r2 && (r2 = h), void 0 === n2 ? n2 = this.path : null === n2 && (n2 = h), void 0 === i2 ? i2 = this.query : null === i2 && (i2 = h), void 0 === o2 ? o2 = this.fragment : null === o2 && (o2 = h), e3 === this.scheme && r2 === this.authority && n2 === this.path && i2 === this.query && o2 === this.fragment ? this : new l(e3, r2, n2, i2, o2);
      }
      static parse(t3, e3 = false) {
        const r2 = c.exec(t3);
        return r2 ? new l(r2[2] || h, C(r2[4] || h), C(r2[5] || h), C(r2[7] || h), C(r2[9] || h), e3) : new l(h, h, h, h, h);
      }
      static file(e3) {
        let r2 = h;
        if (t2 && (e3 = e3.replace(/\\/g, a)), e3[0] === a && e3[1] === a) {
          const t3 = e3.indexOf(a, 2);
          -1 === t3 ? (r2 = e3.substring(2), e3 = a) : (r2 = e3.substring(2, t3), e3 = e3.substring(t3) || a);
        }
        return new l("file", r2, e3, h, h);
      }
      static from(t3) {
        const e3 = new l(t3.scheme, t3.authority, t3.path, t3.query, t3.fragment);
        return s(e3, true), e3;
      }
      toString(t3 = false) {
        return y(this, t3);
      }
      toJSON() {
        return this;
      }
      static revive(t3) {
        if (t3) {
          if (t3 instanceof f)
            return t3;
          {
            const e3 = new l(t3);
            return e3._formatted = t3.external, e3._fsPath = t3._sep === u ? t3.fsPath : null, e3;
          }
        }
        return t3;
      }
    }
    const u = t2 ? 1 : void 0;
    class l extends f {
      _formatted = null;
      _fsPath = null;
      get fsPath() {
        return this._fsPath || (this._fsPath = m(this, false)), this._fsPath;
      }
      toString(t3 = false) {
        return t3 ? y(this, true) : (this._formatted || (this._formatted = y(this, false)), this._formatted);
      }
      toJSON() {
        const t3 = { $mid: 1 };
        return this._fsPath && (t3.fsPath = this._fsPath, t3._sep = u), this._formatted && (t3.external = this._formatted), this.path && (t3.path = this.path), this.scheme && (t3.scheme = this.scheme), this.authority && (t3.authority = this.authority), this.query && (t3.query = this.query), this.fragment && (t3.fragment = this.fragment), t3;
      }
    }
    const g = { 58: "%3A", 47: "%2F", 63: "%3F", 35: "%23", 91: "%5B", 93: "%5D", 64: "%40", 33: "%21", 36: "%24", 38: "%26", 39: "%27", 40: "%28", 41: "%29", 42: "%2A", 43: "%2B", 44: "%2C", 59: "%3B", 61: "%3D", 32: "%20" };
    function d(t3, e3, r2) {
      let n2, i2 = -1;
      for (let o2 = 0; o2 < t3.length; o2++) {
        const s2 = t3.charCodeAt(o2);
        if (s2 >= 97 && s2 <= 122 || s2 >= 65 && s2 <= 90 || s2 >= 48 && s2 <= 57 || 45 === s2 || 46 === s2 || 95 === s2 || 126 === s2 || e3 && 47 === s2 || r2 && 91 === s2 || r2 && 93 === s2 || r2 && 58 === s2)
          -1 !== i2 && (n2 += encodeURIComponent(t3.substring(i2, o2)), i2 = -1), void 0 !== n2 && (n2 += t3.charAt(o2));
        else {
          void 0 === n2 && (n2 = t3.substr(0, o2));
          const e4 = g[s2];
          void 0 !== e4 ? (-1 !== i2 && (n2 += encodeURIComponent(t3.substring(i2, o2)), i2 = -1), n2 += e4) : -1 === i2 && (i2 = o2);
        }
      }
      return -1 !== i2 && (n2 += encodeURIComponent(t3.substring(i2))), void 0 !== n2 ? n2 : t3;
    }
    function p(t3) {
      let e3;
      for (let r2 = 0; r2 < t3.length; r2++) {
        const n2 = t3.charCodeAt(r2);
        35 === n2 || 63 === n2 ? (void 0 === e3 && (e3 = t3.substr(0, r2)), e3 += g[n2]) : void 0 !== e3 && (e3 += t3[r2]);
      }
      return void 0 !== e3 ? e3 : t3;
    }
    function m(e3, r2) {
      let n2;
      return n2 = e3.authority && e3.path.length > 1 && "file" === e3.scheme ? `//${e3.authority}${e3.path}` : 47 === e3.path.charCodeAt(0) && (e3.path.charCodeAt(1) >= 65 && e3.path.charCodeAt(1) <= 90 || e3.path.charCodeAt(1) >= 97 && e3.path.charCodeAt(1) <= 122) && 58 === e3.path.charCodeAt(2) ? r2 ? e3.path.substr(1) : e3.path[1].toLowerCase() + e3.path.substr(2) : e3.path, t2 && (n2 = n2.replace(/\//g, "\\")), n2;
    }
    function y(t3, e3) {
      const r2 = e3 ? p : d;
      let n2 = "", { scheme: i2, authority: o2, path: s2, query: h2, fragment: c2 } = t3;
      if (i2 && (n2 += i2, n2 += ":"), (o2 || "file" === i2) && (n2 += a, n2 += a), o2) {
        let t4 = o2.indexOf("@");
        if (-1 !== t4) {
          const e4 = o2.substr(0, t4);
          o2 = o2.substr(t4 + 1), t4 = e4.lastIndexOf(":"), -1 === t4 ? n2 += r2(e4, false, false) : (n2 += r2(e4.substr(0, t4), false, false), n2 += ":", n2 += r2(e4.substr(t4 + 1), false, true)), n2 += "@";
        }
        o2 = o2.toLowerCase(), t4 = o2.lastIndexOf(":"), -1 === t4 ? n2 += r2(o2, false, true) : (n2 += r2(o2.substr(0, t4), false, true), n2 += o2.substr(t4));
      }
      if (s2) {
        if (s2.length >= 3 && 47 === s2.charCodeAt(0) && 58 === s2.charCodeAt(2)) {
          const t4 = s2.charCodeAt(1);
          t4 >= 65 && t4 <= 90 && (s2 = `/${String.fromCharCode(t4 + 32)}:${s2.substr(3)}`);
        } else if (s2.length >= 2 && 58 === s2.charCodeAt(1)) {
          const t4 = s2.charCodeAt(0);
          t4 >= 65 && t4 <= 90 && (s2 = `${String.fromCharCode(t4 + 32)}:${s2.substr(2)}`);
        }
        n2 += r2(s2, true, false);
      }
      return h2 && (n2 += "?", n2 += r2(h2, false, false)), c2 && (n2 += "#", n2 += e3 ? c2 : d(c2, false, false)), n2;
    }
    function v(t3) {
      try {
        return decodeURIComponent(t3);
      } catch {
        return t3.length > 3 ? t3.substr(0, 3) + v(t3.substr(3)) : t3;
      }
    }
    const b = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
    function C(t3) {
      return t3.match(b) ? t3.replace(b, (t4) => v(t4)) : t3;
    }
    var A = r(470);
    const w = A.posix || A, x = "/";
    var P;
    !function(t3) {
      t3.joinPath = function(t4, ...e3) {
        return t4.with({ path: w.join(t4.path, ...e3) });
      }, t3.resolvePath = function(t4, ...e3) {
        let r2 = t4.path, n2 = false;
        r2[0] !== x && (r2 = x + r2, n2 = true);
        let i2 = w.resolve(r2, ...e3);
        return n2 && i2[0] === x && !t4.authority && (i2 = i2.substring(1)), t4.with({ path: i2 });
      }, t3.dirname = function(t4) {
        if (0 === t4.path.length || t4.path === x)
          return t4;
        let e3 = w.dirname(t4.path);
        return 1 === e3.length && 46 === e3.charCodeAt(0) && (e3 = ""), t4.with({ path: e3 });
      }, t3.basename = function(t4) {
        return w.basename(t4.path);
      }, t3.extname = function(t4) {
        return w.extname(t4.path);
      };
    }(P || (P = {}));
  })(), LIB = n;
})();
var { URI, Utils } = LIB;

// src/tags/gitignore.ts
var import_ignore = __toESM(require_ignore());
var path = __toESM(require("path"));
var GitIgnore = class {
  constructor() {
    this.gitIgnoreFile = {};
  }
  /**
   * Handles changes to a .gitignore file.
   * @param uri URI of the changed file.
   */
  onDidChange(uri) {
    vscode.workspace.fs.readFile(uri).then((data) => {
      this.gitIgnoreFile[Utils.dirname(uri).toString()] = {
        ignore: (0, import_ignore.default)().add(new TextDecoder().decode(data)),
        cache: {}
        // fullpath -> result
      };
    });
  }
  /**
   * Handles deletion of a .gitignore file.
   * @param uri URI of the deleted file.
   */
  onDidDelete(uri) {
    delete this.gitIgnoreFile[Utils.dirname(uri).toString()];
  }
  /**
   * Gets active ignore patterns for a given file.
   * @param uri URI of the target file.
   * @returns Array of sorted .gitignore locations.
   */
  getActiveIgnorePatternsForFile(uri) {
    function isSubdir(parent, target) {
      const relative2 = path.relative(parent, target);
      return relative2 !== "" && !relative2.startsWith("..") && !path.isAbsolute(relative2);
    }
    if (!Object.keys(this.gitIgnoreFile).length) {
      return [];
    }
    return Object.keys(this.gitIgnoreFile).filter(
      (gitIgnoreLocation) => isSubdir(vscode.Uri.parse(gitIgnoreLocation).fsPath, uri.fsPath)
    ).sort((a, b) => a.split("/").length - b.split("/").length);
  }
  /**
   * Determines if the given file should be ignored based on .gitignore rules.
   * @param uri URI of the target file.
   * @returns True if the file should be ignored, otherwise false.
   */
  ignores(uri) {
    const gitIgnoreFiles = this.getActiveIgnorePatternsForFile(uri);
    if (!gitIgnoreFiles) {
      return true;
    }
    const ignoreIt = gitIgnoreFiles.some((gitIgnoreLocation) => {
      const ig = this.gitIgnoreFile[gitIgnoreLocation];
      if (ig.cache[uri.fsPath] !== void 0) {
        return ig.cache[uri.fsPath];
      }
      const result = ig.ignore.ignores(
        path.relative(vscode.Uri.parse(gitIgnoreLocation).fsPath, uri.fsPath)
      );
      ig.cache[uri.fsPath] = result;
      return result;
    });
    return ignoreIt;
  }
  /**
   * Filters the given file based on .gitignore rules.
   * @param uri URI of the target file.
   * @returns True if the file passes the filter (not ignored), otherwise false.
   */
  filter(uri) {
    return !this.ignores(uri);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GitIgnore
});
//# sourceMappingURL=gitignore.js.map
