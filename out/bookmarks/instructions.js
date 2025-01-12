"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

// node_modules/balanced-match/index.js
var require_balanced_match = __commonJS({
  "node_modules/balanced-match/index.js"(exports, module2) {
    "use strict";
    module2.exports = balanced;
    function balanced(a, b, str) {
      if (a instanceof RegExp)
        a = maybeMatch(a, str);
      if (b instanceof RegExp)
        b = maybeMatch(b, str);
      var r = range(a, b, str);
      return r && {
        start: r[0],
        end: r[1],
        pre: str.slice(0, r[0]),
        body: str.slice(r[0] + a.length, r[1]),
        post: str.slice(r[1] + b.length)
      };
    }
    function maybeMatch(reg, str) {
      var m = str.match(reg);
      return m ? m[0] : null;
    }
    balanced.range = range;
    function range(a, b, str) {
      var begs, beg, left, right, result;
      var ai = str.indexOf(a);
      var bi = str.indexOf(b, ai + 1);
      var i = ai;
      if (ai >= 0 && bi > 0) {
        if (a === b) {
          return [ai, bi];
        }
        begs = [];
        left = str.length;
        while (i >= 0 && !result) {
          if (i == ai) {
            begs.push(i);
            ai = str.indexOf(a, i + 1);
          } else if (begs.length == 1) {
            result = [begs.pop(), bi];
          } else {
            beg = begs.pop();
            if (beg < left) {
              left = beg;
              right = bi;
            }
            bi = str.indexOf(b, i + 1);
          }
          i = ai < bi && ai >= 0 ? ai : bi;
        }
        if (begs.length) {
          result = [left, right];
        }
      }
      return result;
    }
  }
});

// node_modules/brace-expansion/index.js
var require_brace_expansion = __commonJS({
  "node_modules/brace-expansion/index.js"(exports, module2) {
    var balanced = require_balanced_match();
    module2.exports = expandTop;
    var escSlash = "\0SLASH" + Math.random() + "\0";
    var escOpen = "\0OPEN" + Math.random() + "\0";
    var escClose = "\0CLOSE" + Math.random() + "\0";
    var escComma = "\0COMMA" + Math.random() + "\0";
    var escPeriod = "\0PERIOD" + Math.random() + "\0";
    function numeric(str) {
      return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
    }
    function escapeBraces(str) {
      return str.split("\\\\").join(escSlash).split("\\{").join(escOpen).split("\\}").join(escClose).split("\\,").join(escComma).split("\\.").join(escPeriod);
    }
    function unescapeBraces(str) {
      return str.split(escSlash).join("\\").split(escOpen).join("{").split(escClose).join("}").split(escComma).join(",").split(escPeriod).join(".");
    }
    function parseCommaParts(str) {
      if (!str)
        return [""];
      var parts = [];
      var m = balanced("{", "}", str);
      if (!m)
        return str.split(",");
      var pre = m.pre;
      var body = m.body;
      var post = m.post;
      var p = pre.split(",");
      p[p.length - 1] += "{" + body + "}";
      var postParts = parseCommaParts(post);
      if (post.length) {
        p[p.length - 1] += postParts.shift();
        p.push.apply(p, postParts);
      }
      parts.push.apply(parts, p);
      return parts;
    }
    function expandTop(str) {
      if (!str)
        return [];
      if (str.substr(0, 2) === "{}") {
        str = "\\{\\}" + str.substr(2);
      }
      return expand2(escapeBraces(str), true).map(unescapeBraces);
    }
    function embrace(str) {
      return "{" + str + "}";
    }
    function isPadded(el) {
      return /^-?0\d/.test(el);
    }
    function lte(i, y) {
      return i <= y;
    }
    function gte(i, y) {
      return i >= y;
    }
    function expand2(str, isTop) {
      var expansions = [];
      var m = balanced("{", "}", str);
      if (!m)
        return [str];
      var pre = m.pre;
      var post = m.post.length ? expand2(m.post, false) : [""];
      if (/\$$/.test(m.pre)) {
        for (var k = 0; k < post.length; k++) {
          var expansion = pre + "{" + m.body + "}" + post[k];
          expansions.push(expansion);
        }
      } else {
        var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
        var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
        var isSequence = isNumericSequence || isAlphaSequence;
        var isOptions = m.body.indexOf(",") >= 0;
        if (!isSequence && !isOptions) {
          if (m.post.match(/,.*\}/)) {
            str = m.pre + "{" + m.body + escClose + m.post;
            return expand2(str);
          }
          return [str];
        }
        var n;
        if (isSequence) {
          n = m.body.split(/\.\./);
        } else {
          n = parseCommaParts(m.body);
          if (n.length === 1) {
            n = expand2(n[0], false).map(embrace);
            if (n.length === 1) {
              return post.map(function(p) {
                return m.pre + n[0] + p;
              });
            }
          }
        }
        var N;
        if (isSequence) {
          var x = numeric(n[0]);
          var y = numeric(n[1]);
          var width = Math.max(n[0].length, n[1].length);
          var incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
          var test = lte;
          var reverse = y < x;
          if (reverse) {
            incr *= -1;
            test = gte;
          }
          var pad = n.some(isPadded);
          N = [];
          for (var i = x; test(i, y); i += incr) {
            var c;
            if (isAlphaSequence) {
              c = String.fromCharCode(i);
              if (c === "\\")
                c = "";
            } else {
              c = String(i);
              if (pad) {
                var need = width - c.length;
                if (need > 0) {
                  var z = new Array(need + 1).join("0");
                  if (i < 0)
                    c = "-" + z + c.slice(1);
                  else
                    c = z + c;
                }
              }
            }
            N.push(c);
          }
        } else {
          N = [];
          for (var j = 0; j < n.length; j++) {
            N.push.apply(N, expand2(n[j], false));
          }
        }
        for (var j = 0; j < N.length; j++) {
          for (var k = 0; k < post.length; k++) {
            var expansion = pre + N[j] + post[k];
            if (!isTop || isSequence || expansion)
              expansions.push(expansion);
          }
        }
      }
      return expansions;
    }
  }
});

// src/bookmarks/instructions.ts
var instructions_exports = {};
__export(instructions_exports, {
  InlineBookmarkTreeDataProvider: () => InlineBookmarkTreeDataProvider,
  InstructionsController: () => InstructionsController,
  NodeType: () => NodeType
});
module.exports = __toCommonJS(instructions_exports);
var vscode2 = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var crypto = __toESM(require("crypto"));
var os = __toESM(require("os"));

// node_modules/minimatch/dist/esm/index.js
var import_brace_expansion = __toESM(require_brace_expansion(), 1);

// node_modules/minimatch/dist/esm/assert-valid-pattern.js
var MAX_PATTERN_LENGTH = 1024 * 64;
var assertValidPattern = (pattern) => {
  if (typeof pattern !== "string") {
    throw new TypeError("invalid pattern");
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new TypeError("pattern is too long");
  }
};

// node_modules/minimatch/dist/esm/brace-expressions.js
var posixClasses = {
  "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", true],
  "[:alpha:]": ["\\p{L}\\p{Nl}", true],
  "[:ascii:]": ["\\x00-\\x7f", false],
  "[:blank:]": ["\\p{Zs}\\t", true],
  "[:cntrl:]": ["\\p{Cc}", true],
  "[:digit:]": ["\\p{Nd}", true],
  "[:graph:]": ["\\p{Z}\\p{C}", true, true],
  "[:lower:]": ["\\p{Ll}", true],
  "[:print:]": ["\\p{C}", true],
  "[:punct:]": ["\\p{P}", true],
  "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", true],
  "[:upper:]": ["\\p{Lu}", true],
  "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", true],
  "[:xdigit:]": ["A-Fa-f0-9", false]
};
var braceEscape = (s) => s.replace(/[[\]\\-]/g, "\\$&");
var regexpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var rangesToString = (ranges) => ranges.join("");
var parseClass = (glob, position) => {
  const pos = position;
  if (glob.charAt(pos) !== "[") {
    throw new Error("not in a brace expression");
  }
  const ranges = [];
  const negs = [];
  let i = pos + 1;
  let sawStart = false;
  let uflag = false;
  let escaping = false;
  let negate = false;
  let endPos = pos;
  let rangeStart = "";
  WHILE:
    while (i < glob.length) {
      const c = glob.charAt(i);
      if ((c === "!" || c === "^") && i === pos + 1) {
        negate = true;
        i++;
        continue;
      }
      if (c === "]" && sawStart && !escaping) {
        endPos = i + 1;
        break;
      }
      sawStart = true;
      if (c === "\\") {
        if (!escaping) {
          escaping = true;
          i++;
          continue;
        }
      }
      if (c === "[" && !escaping) {
        for (const [cls, [unip, u, neg]] of Object.entries(posixClasses)) {
          if (glob.startsWith(cls, i)) {
            if (rangeStart) {
              return ["$.", false, glob.length - pos, true];
            }
            i += cls.length;
            if (neg)
              negs.push(unip);
            else
              ranges.push(unip);
            uflag = uflag || u;
            continue WHILE;
          }
        }
      }
      escaping = false;
      if (rangeStart) {
        if (c > rangeStart) {
          ranges.push(braceEscape(rangeStart) + "-" + braceEscape(c));
        } else if (c === rangeStart) {
          ranges.push(braceEscape(c));
        }
        rangeStart = "";
        i++;
        continue;
      }
      if (glob.startsWith("-]", i + 1)) {
        ranges.push(braceEscape(c + "-"));
        i += 2;
        continue;
      }
      if (glob.startsWith("-", i + 1)) {
        rangeStart = c;
        i += 2;
        continue;
      }
      ranges.push(braceEscape(c));
      i++;
    }
  if (endPos < i) {
    return ["", false, 0, false];
  }
  if (!ranges.length && !negs.length) {
    return ["$.", false, glob.length - pos, true];
  }
  if (negs.length === 0 && ranges.length === 1 && /^\\?.$/.test(ranges[0]) && !negate) {
    const r = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
    return [regexpEscape(r), false, endPos - pos, false];
  }
  const sranges = "[" + (negate ? "^" : "") + rangesToString(ranges) + "]";
  const snegs = "[" + (negate ? "" : "^") + rangesToString(negs) + "]";
  const comb = ranges.length && negs.length ? "(" + sranges + "|" + snegs + ")" : ranges.length ? sranges : snegs;
  return [comb, uflag, endPos - pos, true];
};

// node_modules/minimatch/dist/esm/unescape.js
var unescape = (s, { windowsPathsNoEscape = false } = {}) => {
  return windowsPathsNoEscape ? s.replace(/\[([^\/\\])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2").replace(/\\([^\/])/g, "$1");
};

// node_modules/minimatch/dist/esm/ast.js
var types = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]);
var isExtglobType = (c) => types.has(c);
var startNoTraversal = "(?!(?:^|/)\\.\\.?(?:$|/))";
var startNoDot = "(?!\\.)";
var addPatternStart = /* @__PURE__ */ new Set(["[", "."]);
var justDots = /* @__PURE__ */ new Set(["..", "."]);
var reSpecials = new Set("().*{}+?[]^$\\!");
var regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var qmark = "[^/]";
var star = qmark + "*?";
var starNoEmpty = qmark + "+?";
var _root, _hasMagic, _uflag, _parts, _parent, _parentIndex, _negs, _filledNegs, _options, _toString, _emptyExt, _fillNegs, fillNegs_fn, _parseAST, parseAST_fn, _partsToRegExp, partsToRegExp_fn, _parseGlob, parseGlob_fn;
var _AST = class {
  constructor(type, parent, options = {}) {
    __privateAdd(this, _fillNegs);
    __privateAdd(this, _partsToRegExp);
    __publicField(this, "type");
    __privateAdd(this, _root, void 0);
    __privateAdd(this, _hasMagic, void 0);
    __privateAdd(this, _uflag, false);
    __privateAdd(this, _parts, []);
    __privateAdd(this, _parent, void 0);
    __privateAdd(this, _parentIndex, void 0);
    __privateAdd(this, _negs, void 0);
    __privateAdd(this, _filledNegs, false);
    __privateAdd(this, _options, void 0);
    __privateAdd(this, _toString, void 0);
    // set to true if it's an extglob with no children
    // (which really means one child of '')
    __privateAdd(this, _emptyExt, false);
    this.type = type;
    if (type)
      __privateSet(this, _hasMagic, true);
    __privateSet(this, _parent, parent);
    __privateSet(this, _root, __privateGet(this, _parent) ? __privateGet(__privateGet(this, _parent), _root) : this);
    __privateSet(this, _options, __privateGet(this, _root) === this ? options : __privateGet(__privateGet(this, _root), _options));
    __privateSet(this, _negs, __privateGet(this, _root) === this ? [] : __privateGet(__privateGet(this, _root), _negs));
    if (type === "!" && !__privateGet(__privateGet(this, _root), _filledNegs))
      __privateGet(this, _negs).push(this);
    __privateSet(this, _parentIndex, __privateGet(this, _parent) ? __privateGet(__privateGet(this, _parent), _parts).length : 0);
  }
  get hasMagic() {
    if (__privateGet(this, _hasMagic) !== void 0)
      return __privateGet(this, _hasMagic);
    for (const p of __privateGet(this, _parts)) {
      if (typeof p === "string")
        continue;
      if (p.type || p.hasMagic)
        return __privateSet(this, _hasMagic, true);
    }
    return __privateGet(this, _hasMagic);
  }
  // reconstructs the pattern
  toString() {
    if (__privateGet(this, _toString) !== void 0)
      return __privateGet(this, _toString);
    if (!this.type) {
      return __privateSet(this, _toString, __privateGet(this, _parts).map((p) => String(p)).join(""));
    } else {
      return __privateSet(this, _toString, this.type + "(" + __privateGet(this, _parts).map((p) => String(p)).join("|") + ")");
    }
  }
  push(...parts) {
    for (const p of parts) {
      if (p === "")
        continue;
      if (typeof p !== "string" && !(p instanceof _AST && __privateGet(p, _parent) === this)) {
        throw new Error("invalid part: " + p);
      }
      __privateGet(this, _parts).push(p);
    }
  }
  toJSON() {
    const ret = this.type === null ? __privateGet(this, _parts).slice().map((p) => typeof p === "string" ? p : p.toJSON()) : [this.type, ...__privateGet(this, _parts).map((p) => p.toJSON())];
    if (this.isStart() && !this.type)
      ret.unshift([]);
    if (this.isEnd() && (this === __privateGet(this, _root) || __privateGet(__privateGet(this, _root), _filledNegs) && __privateGet(this, _parent)?.type === "!")) {
      ret.push({});
    }
    return ret;
  }
  isStart() {
    if (__privateGet(this, _root) === this)
      return true;
    if (!__privateGet(this, _parent)?.isStart())
      return false;
    if (__privateGet(this, _parentIndex) === 0)
      return true;
    const p = __privateGet(this, _parent);
    for (let i = 0; i < __privateGet(this, _parentIndex); i++) {
      const pp = __privateGet(p, _parts)[i];
      if (!(pp instanceof _AST && pp.type === "!")) {
        return false;
      }
    }
    return true;
  }
  isEnd() {
    if (__privateGet(this, _root) === this)
      return true;
    if (__privateGet(this, _parent)?.type === "!")
      return true;
    if (!__privateGet(this, _parent)?.isEnd())
      return false;
    if (!this.type)
      return __privateGet(this, _parent)?.isEnd();
    const pl = __privateGet(this, _parent) ? __privateGet(__privateGet(this, _parent), _parts).length : 0;
    return __privateGet(this, _parentIndex) === pl - 1;
  }
  copyIn(part) {
    if (typeof part === "string")
      this.push(part);
    else
      this.push(part.clone(this));
  }
  clone(parent) {
    const c = new _AST(this.type, parent);
    for (const p of __privateGet(this, _parts)) {
      c.copyIn(p);
    }
    return c;
  }
  static fromGlob(pattern, options = {}) {
    var _a;
    const ast = new _AST(null, void 0, options);
    __privateMethod(_a = _AST, _parseAST, parseAST_fn).call(_a, pattern, ast, 0, options);
    return ast;
  }
  // returns the regular expression if there's magic, or the unescaped
  // string if not.
  toMMPattern() {
    if (this !== __privateGet(this, _root))
      return __privateGet(this, _root).toMMPattern();
    const glob = this.toString();
    const [re, body, hasMagic, uflag] = this.toRegExpSource();
    const anyMagic = hasMagic || __privateGet(this, _hasMagic) || __privateGet(this, _options).nocase && !__privateGet(this, _options).nocaseMagicOnly && glob.toUpperCase() !== glob.toLowerCase();
    if (!anyMagic) {
      return body;
    }
    const flags = (__privateGet(this, _options).nocase ? "i" : "") + (uflag ? "u" : "");
    return Object.assign(new RegExp(`^${re}$`, flags), {
      _src: re,
      _glob: glob
    });
  }
  get options() {
    return __privateGet(this, _options);
  }
  // returns the string match, the regexp source, whether there's magic
  // in the regexp (so a regular expression is required) and whether or
  // not the uflag is needed for the regular expression (for posix classes)
  // TODO: instead of injecting the start/end at this point, just return
  // the BODY of the regexp, along with the start/end portions suitable
  // for binding the start/end in either a joined full-path makeRe context
  // (where we bind to (^|/), or a standalone matchPart context (where
  // we bind to ^, and not /).  Otherwise slashes get duped!
  //
  // In part-matching mode, the start is:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: ^(?!\.\.?$)
  // - if dots allowed or not possible: ^
  // - if dots possible and not allowed: ^(?!\.)
  // end is:
  // - if not isEnd(): nothing
  // - else: $
  //
  // In full-path matching mode, we put the slash at the START of the
  // pattern, so start is:
  // - if first pattern: same as part-matching mode
  // - if not isStart(): nothing
  // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
  // - if dots allowed or not possible: /
  // - if dots possible and not allowed: /(?!\.)
  // end is:
  // - if last pattern, same as part-matching mode
  // - else nothing
  //
  // Always put the (?:$|/) on negated tails, though, because that has to be
  // there to bind the end of the negated pattern portion, and it's easier to
  // just stick it in now rather than try to inject it later in the middle of
  // the pattern.
  //
  // We can just always return the same end, and leave it up to the caller
  // to know whether it's going to be used joined or in parts.
  // And, if the start is adjusted slightly, can do the same there:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
  // - if dots allowed or not possible: (?:/|^)
  // - if dots possible and not allowed: (?:/|^)(?!\.)
  //
  // But it's better to have a simpler binding without a conditional, for
  // performance, so probably better to return both start options.
  //
  // Then the caller just ignores the end if it's not the first pattern,
  // and the start always gets applied.
  //
  // But that's always going to be $ if it's the ending pattern, or nothing,
  // so the caller can just attach $ at the end of the pattern when building.
  //
  // So the todo is:
  // - better detect what kind of start is needed
  // - return both flavors of starting pattern
  // - attach $ at the end of the pattern when creating the actual RegExp
  //
  // Ah, but wait, no, that all only applies to the root when the first pattern
  // is not an extglob. If the first pattern IS an extglob, then we need all
  // that dot prevention biz to live in the extglob portions, because eg
  // +(*|.x*) can match .xy but not .yx.
  //
  // So, return the two flavors if it's #root and the first child is not an
  // AST, otherwise leave it to the child AST to handle it, and there,
  // use the (?:^|/) style of start binding.
  //
  // Even simplified further:
  // - Since the start for a join is eg /(?!\.) and the start for a part
  // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
  // or start or whatever) and prepend ^ or / at the Regexp construction.
  toRegExpSource(allowDot) {
    const dot = allowDot ?? !!__privateGet(this, _options).dot;
    if (__privateGet(this, _root) === this)
      __privateMethod(this, _fillNegs, fillNegs_fn).call(this);
    if (!this.type) {
      const noEmpty = this.isStart() && this.isEnd();
      const src = __privateGet(this, _parts).map((p) => {
        var _a;
        const [re, _, hasMagic, uflag] = typeof p === "string" ? __privateMethod(_a = _AST, _parseGlob, parseGlob_fn).call(_a, p, __privateGet(this, _hasMagic), noEmpty) : p.toRegExpSource(allowDot);
        __privateSet(this, _hasMagic, __privateGet(this, _hasMagic) || hasMagic);
        __privateSet(this, _uflag, __privateGet(this, _uflag) || uflag);
        return re;
      }).join("");
      let start2 = "";
      if (this.isStart()) {
        if (typeof __privateGet(this, _parts)[0] === "string") {
          const dotTravAllowed = __privateGet(this, _parts).length === 1 && justDots.has(__privateGet(this, _parts)[0]);
          if (!dotTravAllowed) {
            const aps = addPatternStart;
            const needNoTrav = (
              // dots are allowed, and the pattern starts with [ or .
              dot && aps.has(src.charAt(0)) || // the pattern starts with \., and then [ or .
              src.startsWith("\\.") && aps.has(src.charAt(2)) || // the pattern starts with \.\., and then [ or .
              src.startsWith("\\.\\.") && aps.has(src.charAt(4))
            );
            const needNoDot = !dot && !allowDot && aps.has(src.charAt(0));
            start2 = needNoTrav ? startNoTraversal : needNoDot ? startNoDot : "";
          }
        }
      }
      let end = "";
      if (this.isEnd() && __privateGet(__privateGet(this, _root), _filledNegs) && __privateGet(this, _parent)?.type === "!") {
        end = "(?:$|\\/)";
      }
      const final2 = start2 + src + end;
      return [
        final2,
        unescape(src),
        __privateSet(this, _hasMagic, !!__privateGet(this, _hasMagic)),
        __privateGet(this, _uflag)
      ];
    }
    const repeated = this.type === "*" || this.type === "+";
    const start = this.type === "!" ? "(?:(?!(?:" : "(?:";
    let body = __privateMethod(this, _partsToRegExp, partsToRegExp_fn).call(this, dot);
    if (this.isStart() && this.isEnd() && !body && this.type !== "!") {
      const s = this.toString();
      __privateSet(this, _parts, [s]);
      this.type = null;
      __privateSet(this, _hasMagic, void 0);
      return [s, unescape(this.toString()), false, false];
    }
    let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot ? "" : __privateMethod(this, _partsToRegExp, partsToRegExp_fn).call(this, true);
    if (bodyDotAllowed === body) {
      bodyDotAllowed = "";
    }
    if (bodyDotAllowed) {
      body = `(?:${body})(?:${bodyDotAllowed})*?`;
    }
    let final = "";
    if (this.type === "!" && __privateGet(this, _emptyExt)) {
      final = (this.isStart() && !dot ? startNoDot : "") + starNoEmpty;
    } else {
      const close = this.type === "!" ? (
        // !() must match something,but !(x) can match ''
        "))" + (this.isStart() && !dot && !allowDot ? startNoDot : "") + star + ")"
      ) : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && bodyDotAllowed ? ")" : this.type === "*" && bodyDotAllowed ? `)?` : `)${this.type}`;
      final = start + body + close;
    }
    return [
      final,
      unescape(body),
      __privateSet(this, _hasMagic, !!__privateGet(this, _hasMagic)),
      __privateGet(this, _uflag)
    ];
  }
};
var AST = _AST;
_root = new WeakMap();
_hasMagic = new WeakMap();
_uflag = new WeakMap();
_parts = new WeakMap();
_parent = new WeakMap();
_parentIndex = new WeakMap();
_negs = new WeakMap();
_filledNegs = new WeakMap();
_options = new WeakMap();
_toString = new WeakMap();
_emptyExt = new WeakMap();
_fillNegs = new WeakSet();
fillNegs_fn = function() {
  if (this !== __privateGet(this, _root))
    throw new Error("should only call on root");
  if (__privateGet(this, _filledNegs))
    return this;
  this.toString();
  __privateSet(this, _filledNegs, true);
  let n;
  while (n = __privateGet(this, _negs).pop()) {
    if (n.type !== "!")
      continue;
    let p = n;
    let pp = __privateGet(p, _parent);
    while (pp) {
      for (let i = __privateGet(p, _parentIndex) + 1; !pp.type && i < __privateGet(pp, _parts).length; i++) {
        for (const part of __privateGet(n, _parts)) {
          if (typeof part === "string") {
            throw new Error("string part in extglob AST??");
          }
          part.copyIn(__privateGet(pp, _parts)[i]);
        }
      }
      p = pp;
      pp = __privateGet(p, _parent);
    }
  }
  return this;
};
_parseAST = new WeakSet();
parseAST_fn = function(str, ast, pos, opt) {
  var _a, _b;
  let escaping = false;
  let inBrace = false;
  let braceStart = -1;
  let braceNeg = false;
  if (ast.type === null) {
    let i2 = pos;
    let acc2 = "";
    while (i2 < str.length) {
      const c = str.charAt(i2++);
      if (escaping || c === "\\") {
        escaping = !escaping;
        acc2 += c;
        continue;
      }
      if (inBrace) {
        if (i2 === braceStart + 1) {
          if (c === "^" || c === "!") {
            braceNeg = true;
          }
        } else if (c === "]" && !(i2 === braceStart + 2 && braceNeg)) {
          inBrace = false;
        }
        acc2 += c;
        continue;
      } else if (c === "[") {
        inBrace = true;
        braceStart = i2;
        braceNeg = false;
        acc2 += c;
        continue;
      }
      if (!opt.noext && isExtglobType(c) && str.charAt(i2) === "(") {
        ast.push(acc2);
        acc2 = "";
        const ext2 = new _AST(c, ast);
        i2 = __privateMethod(_a = _AST, _parseAST, parseAST_fn).call(_a, str, ext2, i2, opt);
        ast.push(ext2);
        continue;
      }
      acc2 += c;
    }
    ast.push(acc2);
    return i2;
  }
  let i = pos + 1;
  let part = new _AST(null, ast);
  const parts = [];
  let acc = "";
  while (i < str.length) {
    const c = str.charAt(i++);
    if (escaping || c === "\\") {
      escaping = !escaping;
      acc += c;
      continue;
    }
    if (inBrace) {
      if (i === braceStart + 1) {
        if (c === "^" || c === "!") {
          braceNeg = true;
        }
      } else if (c === "]" && !(i === braceStart + 2 && braceNeg)) {
        inBrace = false;
      }
      acc += c;
      continue;
    } else if (c === "[") {
      inBrace = true;
      braceStart = i;
      braceNeg = false;
      acc += c;
      continue;
    }
    if (isExtglobType(c) && str.charAt(i) === "(") {
      part.push(acc);
      acc = "";
      const ext2 = new _AST(c, part);
      part.push(ext2);
      i = __privateMethod(_b = _AST, _parseAST, parseAST_fn).call(_b, str, ext2, i, opt);
      continue;
    }
    if (c === "|") {
      part.push(acc);
      acc = "";
      parts.push(part);
      part = new _AST(null, ast);
      continue;
    }
    if (c === ")") {
      if (acc === "" && __privateGet(ast, _parts).length === 0) {
        __privateSet(ast, _emptyExt, true);
      }
      part.push(acc);
      acc = "";
      ast.push(...parts, part);
      return i;
    }
    acc += c;
  }
  ast.type = null;
  __privateSet(ast, _hasMagic, void 0);
  __privateSet(ast, _parts, [str.substring(pos - 1)]);
  return i;
};
_partsToRegExp = new WeakSet();
partsToRegExp_fn = function(dot) {
  return __privateGet(this, _parts).map((p) => {
    if (typeof p === "string") {
      throw new Error("string type in extglob ast??");
    }
    const [re, _, _hasMagic2, uflag] = p.toRegExpSource(dot);
    __privateSet(this, _uflag, __privateGet(this, _uflag) || uflag);
    return re;
  }).filter((p) => !(this.isStart() && this.isEnd()) || !!p).join("|");
};
_parseGlob = new WeakSet();
parseGlob_fn = function(glob, hasMagic, noEmpty = false) {
  let escaping = false;
  let re = "";
  let uflag = false;
  for (let i = 0; i < glob.length; i++) {
    const c = glob.charAt(i);
    if (escaping) {
      escaping = false;
      re += (reSpecials.has(c) ? "\\" : "") + c;
      continue;
    }
    if (c === "\\") {
      if (i === glob.length - 1) {
        re += "\\\\";
      } else {
        escaping = true;
      }
      continue;
    }
    if (c === "[") {
      const [src, needUflag, consumed, magic] = parseClass(glob, i);
      if (consumed) {
        re += src;
        uflag = uflag || needUflag;
        i += consumed - 1;
        hasMagic = hasMagic || magic;
        continue;
      }
    }
    if (c === "*") {
      if (noEmpty && glob === "*")
        re += starNoEmpty;
      else
        re += star;
      hasMagic = true;
      continue;
    }
    if (c === "?") {
      re += qmark;
      hasMagic = true;
      continue;
    }
    re += regExpEscape(c);
  }
  return [re, unescape(glob), !!hasMagic, uflag];
};
__privateAdd(AST, _parseAST);
__privateAdd(AST, _parseGlob);

// node_modules/minimatch/dist/esm/escape.js
var escape = (s, { windowsPathsNoEscape = false } = {}) => {
  return windowsPathsNoEscape ? s.replace(/[?*()[\]]/g, "[$&]") : s.replace(/[?*()[\]\\]/g, "\\$&");
};

// node_modules/minimatch/dist/esm/index.js
var minimatch = (p, pattern, options = {}) => {
  assertValidPattern(pattern);
  if (!options.nocomment && pattern.charAt(0) === "#") {
    return false;
  }
  return new Minimatch(pattern, options).match(p);
};
var starDotExtRE = /^\*+([^+@!?\*\[\(]*)$/;
var starDotExtTest = (ext2) => (f) => !f.startsWith(".") && f.endsWith(ext2);
var starDotExtTestDot = (ext2) => (f) => f.endsWith(ext2);
var starDotExtTestNocase = (ext2) => {
  ext2 = ext2.toLowerCase();
  return (f) => !f.startsWith(".") && f.toLowerCase().endsWith(ext2);
};
var starDotExtTestNocaseDot = (ext2) => {
  ext2 = ext2.toLowerCase();
  return (f) => f.toLowerCase().endsWith(ext2);
};
var starDotStarRE = /^\*+\.\*+$/;
var starDotStarTest = (f) => !f.startsWith(".") && f.includes(".");
var starDotStarTestDot = (f) => f !== "." && f !== ".." && f.includes(".");
var dotStarRE = /^\.\*+$/;
var dotStarTest = (f) => f !== "." && f !== ".." && f.startsWith(".");
var starRE = /^\*+$/;
var starTest = (f) => f.length !== 0 && !f.startsWith(".");
var starTestDot = (f) => f.length !== 0 && f !== "." && f !== "..";
var qmarksRE = /^\?+([^+@!?\*\[\(]*)?$/;
var qmarksTestNocase = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  if (!ext2)
    return noext;
  ext2 = ext2.toLowerCase();
  return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
};
var qmarksTestNocaseDot = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  if (!ext2)
    return noext;
  ext2 = ext2.toLowerCase();
  return (f) => noext(f) && f.toLowerCase().endsWith(ext2);
};
var qmarksTestDot = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExtDot([$0]);
  return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
};
var qmarksTest = ([$0, ext2 = ""]) => {
  const noext = qmarksTestNoExt([$0]);
  return !ext2 ? noext : (f) => noext(f) && f.endsWith(ext2);
};
var qmarksTestNoExt = ([$0]) => {
  const len = $0.length;
  return (f) => f.length === len && !f.startsWith(".");
};
var qmarksTestNoExtDot = ([$0]) => {
  const len = $0.length;
  return (f) => f.length === len && f !== "." && f !== "..";
};
var defaultPlatform = typeof process === "object" && process ? typeof process.env === "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix";
var path = {
  win32: { sep: "\\" },
  posix: { sep: "/" }
};
var sep = defaultPlatform === "win32" ? path.win32.sep : path.posix.sep;
minimatch.sep = sep;
var GLOBSTAR = Symbol("globstar **");
minimatch.GLOBSTAR = GLOBSTAR;
var qmark2 = "[^/]";
var star2 = qmark2 + "*?";
var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
var filter = (pattern, options = {}) => (p) => minimatch(p, pattern, options);
minimatch.filter = filter;
var ext = (a, b = {}) => Object.assign({}, a, b);
var defaults = (def) => {
  if (!def || typeof def !== "object" || !Object.keys(def).length) {
    return minimatch;
  }
  const orig = minimatch;
  const m = (p, pattern, options = {}) => orig(p, pattern, ext(def, options));
  return Object.assign(m, {
    Minimatch: class Minimatch extends orig.Minimatch {
      constructor(pattern, options = {}) {
        super(pattern, ext(def, options));
      }
      static defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      }
    },
    AST: class AST extends orig.AST {
      /* c8 ignore start */
      constructor(type, parent, options = {}) {
        super(type, parent, ext(def, options));
      }
      /* c8 ignore stop */
      static fromGlob(pattern, options = {}) {
        return orig.AST.fromGlob(pattern, ext(def, options));
      }
    },
    unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
    escape: (s, options = {}) => orig.escape(s, ext(def, options)),
    filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
    defaults: (options) => orig.defaults(ext(def, options)),
    makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
    braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
    match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
    sep: orig.sep,
    GLOBSTAR
  });
};
minimatch.defaults = defaults;
var braceExpand = (pattern, options = {}) => {
  assertValidPattern(pattern);
  if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
    return [pattern];
  }
  return (0, import_brace_expansion.default)(pattern);
};
minimatch.braceExpand = braceExpand;
var makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
minimatch.makeRe = makeRe;
var match = (list, pattern, options = {}) => {
  const mm = new Minimatch(pattern, options);
  list = list.filter((f) => mm.match(f));
  if (mm.options.nonull && !list.length) {
    list.push(pattern);
  }
  return list;
};
minimatch.match = match;
var globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/;
var regExpEscape2 = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
var Minimatch = class {
  options;
  set;
  pattern;
  windowsPathsNoEscape;
  nonegate;
  negate;
  comment;
  empty;
  preserveMultipleSlashes;
  partial;
  globSet;
  globParts;
  nocase;
  isWindows;
  platform;
  windowsNoMagicRoot;
  regexp;
  constructor(pattern, options = {}) {
    assertValidPattern(pattern);
    options = options || {};
    this.options = options;
    this.pattern = pattern;
    this.platform = options.platform || defaultPlatform;
    this.isWindows = this.platform === "win32";
    this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options.allowWindowsEscape === false;
    if (this.windowsPathsNoEscape) {
      this.pattern = this.pattern.replace(/\\/g, "/");
    }
    this.preserveMultipleSlashes = !!options.preserveMultipleSlashes;
    this.regexp = null;
    this.negate = false;
    this.nonegate = !!options.nonegate;
    this.comment = false;
    this.empty = false;
    this.partial = !!options.partial;
    this.nocase = !!this.options.nocase;
    this.windowsNoMagicRoot = options.windowsNoMagicRoot !== void 0 ? options.windowsNoMagicRoot : !!(this.isWindows && this.nocase);
    this.globSet = [];
    this.globParts = [];
    this.set = [];
    this.make();
  }
  hasMagic() {
    if (this.options.magicalBraces && this.set.length > 1) {
      return true;
    }
    for (const pattern of this.set) {
      for (const part of pattern) {
        if (typeof part !== "string")
          return true;
      }
    }
    return false;
  }
  debug(..._) {
  }
  make() {
    const pattern = this.pattern;
    const options = this.options;
    if (!options.nocomment && pattern.charAt(0) === "#") {
      this.comment = true;
      return;
    }
    if (!pattern) {
      this.empty = true;
      return;
    }
    this.parseNegate();
    this.globSet = [...new Set(this.braceExpand())];
    if (options.debug) {
      this.debug = (...args) => console.error(...args);
    }
    this.debug(this.pattern, this.globSet);
    const rawGlobParts = this.globSet.map((s) => this.slashSplit(s));
    this.globParts = this.preprocess(rawGlobParts);
    this.debug(this.pattern, this.globParts);
    let set = this.globParts.map((s, _, __) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        const isUNC = s[0] === "" && s[1] === "" && (s[2] === "?" || !globMagic.test(s[2])) && !globMagic.test(s[3]);
        const isDrive = /^[a-z]:/i.test(s[0]);
        if (isUNC) {
          return [...s.slice(0, 4), ...s.slice(4).map((ss) => this.parse(ss))];
        } else if (isDrive) {
          return [s[0], ...s.slice(1).map((ss) => this.parse(ss))];
        }
      }
      return s.map((ss) => this.parse(ss));
    });
    this.debug(this.pattern, set);
    this.set = set.filter((s) => s.indexOf(false) === -1);
    if (this.isWindows) {
      for (let i = 0; i < this.set.length; i++) {
        const p = this.set[i];
        if (p[0] === "" && p[1] === "" && this.globParts[i][2] === "?" && typeof p[3] === "string" && /^[a-z]:$/i.test(p[3])) {
          p[2] = "?";
        }
      }
    }
    this.debug(this.pattern, this.set);
  }
  // various transforms to equivalent pattern sets that are
  // faster to process in a filesystem walk.  The goal is to
  // eliminate what we can, and push all ** patterns as far
  // to the right as possible, even if it increases the number
  // of patterns that we have to process.
  preprocess(globParts) {
    if (this.options.noglobstar) {
      for (let i = 0; i < globParts.length; i++) {
        for (let j = 0; j < globParts[i].length; j++) {
          if (globParts[i][j] === "**") {
            globParts[i][j] = "*";
          }
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      globParts = this.firstPhasePreProcess(globParts);
      globParts = this.secondPhasePreProcess(globParts);
    } else if (optimizationLevel >= 1) {
      globParts = this.levelOneOptimize(globParts);
    } else {
      globParts = this.adjascentGlobstarOptimize(globParts);
    }
    return globParts;
  }
  // just get rid of adjascent ** portions
  adjascentGlobstarOptimize(globParts) {
    return globParts.map((parts) => {
      let gs = -1;
      while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
        let i = gs;
        while (parts[i + 1] === "**") {
          i++;
        }
        if (i !== gs) {
          parts.splice(gs, i - gs);
        }
      }
      return parts;
    });
  }
  // get rid of adjascent ** and resolve .. portions
  levelOneOptimize(globParts) {
    return globParts.map((parts) => {
      parts = parts.reduce((set, part) => {
        const prev = set[set.length - 1];
        if (part === "**" && prev === "**") {
          return set;
        }
        if (part === "..") {
          if (prev && prev !== ".." && prev !== "." && prev !== "**") {
            set.pop();
            return set;
          }
        }
        set.push(part);
        return set;
      }, []);
      return parts.length === 0 ? [""] : parts;
    });
  }
  levelTwoFileOptimize(parts) {
    if (!Array.isArray(parts)) {
      parts = this.slashSplit(parts);
    }
    let didSomething = false;
    do {
      didSomething = false;
      if (!this.preserveMultipleSlashes) {
        for (let i = 1; i < parts.length - 1; i++) {
          const p = parts[i];
          if (i === 1 && p === "" && parts[0] === "")
            continue;
          if (p === "." || p === "") {
            didSomething = true;
            parts.splice(i, 1);
            i--;
          }
        }
        if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
          didSomething = true;
          parts.pop();
        }
      }
      let dd = 0;
      while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
        const p = parts[dd - 1];
        if (p && p !== "." && p !== ".." && p !== "**") {
          didSomething = true;
          parts.splice(dd - 1, 2);
          dd -= 2;
        }
      }
    } while (didSomething);
    return parts.length === 0 ? [""] : parts;
  }
  // First phase: single-pattern processing
  // <pre> is 1 or more portions
  // <rest> is 1 or more portions
  // <p> is any portion other than ., .., '', or **
  // <e> is . or ''
  //
  // **/.. is *brutal* for filesystem walking performance, because
  // it effectively resets the recursive walk each time it occurs,
  // and ** cannot be reduced out by a .. pattern part like a regexp
  // or most strings (other than .., ., and '') can be.
  //
  // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
  // <pre>/<e>/<rest> -> <pre>/<rest>
  // <pre>/<p>/../<rest> -> <pre>/<rest>
  // **/**/<rest> -> **/<rest>
  //
  // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
  // this WOULD be allowed if ** did follow symlinks, or * didn't
  firstPhasePreProcess(globParts) {
    let didSomething = false;
    do {
      didSomething = false;
      for (let parts of globParts) {
        let gs = -1;
        while (-1 !== (gs = parts.indexOf("**", gs + 1))) {
          let gss = gs;
          while (parts[gss + 1] === "**") {
            gss++;
          }
          if (gss > gs) {
            parts.splice(gs + 1, gss - gs);
          }
          let next = parts[gs + 1];
          const p = parts[gs + 2];
          const p2 = parts[gs + 3];
          if (next !== "..")
            continue;
          if (!p || p === "." || p === ".." || !p2 || p2 === "." || p2 === "..") {
            continue;
          }
          didSomething = true;
          parts.splice(gs, 1);
          const other = parts.slice(0);
          other[gs] = "**";
          globParts.push(other);
          gs--;
        }
        if (!this.preserveMultipleSlashes) {
          for (let i = 1; i < parts.length - 1; i++) {
            const p = parts[i];
            if (i === 1 && p === "" && parts[0] === "")
              continue;
            if (p === "." || p === "") {
              didSomething = true;
              parts.splice(i, 1);
              i--;
            }
          }
          if (parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "")) {
            didSomething = true;
            parts.pop();
          }
        }
        let dd = 0;
        while (-1 !== (dd = parts.indexOf("..", dd + 1))) {
          const p = parts[dd - 1];
          if (p && p !== "." && p !== ".." && p !== "**") {
            didSomething = true;
            const needDot = dd === 1 && parts[dd + 1] === "**";
            const splin = needDot ? ["."] : [];
            parts.splice(dd - 1, 2, ...splin);
            if (parts.length === 0)
              parts.push("");
            dd -= 2;
          }
        }
      }
    } while (didSomething);
    return globParts;
  }
  // second phase: multi-pattern dedupes
  // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
  // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
  // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
  //
  // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
  // ^-- not valid because ** doens't follow symlinks
  secondPhasePreProcess(globParts) {
    for (let i = 0; i < globParts.length - 1; i++) {
      for (let j = i + 1; j < globParts.length; j++) {
        const matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
        if (matched) {
          globParts[i] = [];
          globParts[j] = matched;
          break;
        }
      }
    }
    return globParts.filter((gs) => gs.length);
  }
  partsMatch(a, b, emptyGSMatch = false) {
    let ai = 0;
    let bi = 0;
    let result = [];
    let which = "";
    while (ai < a.length && bi < b.length) {
      if (a[ai] === b[bi]) {
        result.push(which === "b" ? b[bi] : a[ai]);
        ai++;
        bi++;
      } else if (emptyGSMatch && a[ai] === "**" && b[bi] === a[ai + 1]) {
        result.push(a[ai]);
        ai++;
      } else if (emptyGSMatch && b[bi] === "**" && a[ai] === b[bi + 1]) {
        result.push(b[bi]);
        bi++;
      } else if (a[ai] === "*" && b[bi] && (this.options.dot || !b[bi].startsWith(".")) && b[bi] !== "**") {
        if (which === "b")
          return false;
        which = "a";
        result.push(a[ai]);
        ai++;
        bi++;
      } else if (b[bi] === "*" && a[ai] && (this.options.dot || !a[ai].startsWith(".")) && a[ai] !== "**") {
        if (which === "a")
          return false;
        which = "b";
        result.push(b[bi]);
        ai++;
        bi++;
      } else {
        return false;
      }
    }
    return a.length === b.length && result;
  }
  parseNegate() {
    if (this.nonegate)
      return;
    const pattern = this.pattern;
    let negate = false;
    let negateOffset = 0;
    for (let i = 0; i < pattern.length && pattern.charAt(i) === "!"; i++) {
      negate = !negate;
      negateOffset++;
    }
    if (negateOffset)
      this.pattern = pattern.slice(negateOffset);
    this.negate = negate;
  }
  // set partial to true to test if, for example,
  // "/a/b" matches the start of "/*/b/*/d"
  // Partial means, if you run out of file before you run
  // out of pattern, then that's fine, as long as all
  // the parts match.
  matchOne(file, pattern, partial = false) {
    const options = this.options;
    if (this.isWindows) {
      const fileDrive = typeof file[0] === "string" && /^[a-z]:$/i.test(file[0]);
      const fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]);
      const patternDrive = typeof pattern[0] === "string" && /^[a-z]:$/i.test(pattern[0]);
      const patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] === "string" && /^[a-z]:$/i.test(pattern[3]);
      const fdi = fileUNC ? 3 : fileDrive ? 0 : void 0;
      const pdi = patternUNC ? 3 : patternDrive ? 0 : void 0;
      if (typeof fdi === "number" && typeof pdi === "number") {
        const [fd, pd] = [file[fdi], pattern[pdi]];
        if (fd.toLowerCase() === pd.toLowerCase()) {
          pattern[pdi] = fd;
          if (pdi > fdi) {
            pattern = pattern.slice(pdi);
          } else if (fdi > pdi) {
            file = file.slice(fdi);
          }
        }
      }
    }
    const { optimizationLevel = 1 } = this.options;
    if (optimizationLevel >= 2) {
      file = this.levelTwoFileOptimize(file);
    }
    this.debug("matchOne", this, { file, pattern });
    this.debug("matchOne", file.length, pattern.length);
    for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
      this.debug("matchOne loop");
      var p = pattern[pi];
      var f = file[fi];
      this.debug(pattern, p, f);
      if (p === false) {
        return false;
      }
      if (p === GLOBSTAR) {
        this.debug("GLOBSTAR", [pattern, p, f]);
        var fr = fi;
        var pr = pi + 1;
        if (pr === pl) {
          this.debug("** at the end");
          for (; fi < fl; fi++) {
            if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".")
              return false;
          }
          return true;
        }
        while (fr < fl) {
          var swallowee = file[fr];
          this.debug("\nglobstar while", file, fr, pattern, pr, swallowee);
          if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
            this.debug("globstar found match!", fr, fl, swallowee);
            return true;
          } else {
            if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
              this.debug("dot detected!", file, fr, pattern, pr);
              break;
            }
            this.debug("globstar swallow a segment, and continue");
            fr++;
          }
        }
        if (partial) {
          this.debug("\n>>> no match, partial?", file, fr, pattern, pr);
          if (fr === fl) {
            return true;
          }
        }
        return false;
      }
      let hit;
      if (typeof p === "string") {
        hit = f === p;
        this.debug("string match", p, f, hit);
      } else {
        hit = p.test(f);
        this.debug("pattern match", p, f, hit);
      }
      if (!hit)
        return false;
    }
    if (fi === fl && pi === pl) {
      return true;
    } else if (fi === fl) {
      return partial;
    } else if (pi === pl) {
      return fi === fl - 1 && file[fi] === "";
    } else {
      throw new Error("wtf?");
    }
  }
  braceExpand() {
    return braceExpand(this.pattern, this.options);
  }
  parse(pattern) {
    assertValidPattern(pattern);
    const options = this.options;
    if (pattern === "**")
      return GLOBSTAR;
    if (pattern === "")
      return "";
    let m;
    let fastTest = null;
    if (m = pattern.match(starRE)) {
      fastTest = options.dot ? starTestDot : starTest;
    } else if (m = pattern.match(starDotExtRE)) {
      fastTest = (options.nocase ? options.dot ? starDotExtTestNocaseDot : starDotExtTestNocase : options.dot ? starDotExtTestDot : starDotExtTest)(m[1]);
    } else if (m = pattern.match(qmarksRE)) {
      fastTest = (options.nocase ? options.dot ? qmarksTestNocaseDot : qmarksTestNocase : options.dot ? qmarksTestDot : qmarksTest)(m);
    } else if (m = pattern.match(starDotStarRE)) {
      fastTest = options.dot ? starDotStarTestDot : starDotStarTest;
    } else if (m = pattern.match(dotStarRE)) {
      fastTest = dotStarTest;
    }
    const re = AST.fromGlob(pattern, this.options).toMMPattern();
    if (fastTest && typeof re === "object") {
      Reflect.defineProperty(re, "test", { value: fastTest });
    }
    return re;
  }
  makeRe() {
    if (this.regexp || this.regexp === false)
      return this.regexp;
    const set = this.set;
    if (!set.length) {
      this.regexp = false;
      return this.regexp;
    }
    const options = this.options;
    const twoStar = options.noglobstar ? star2 : options.dot ? twoStarDot : twoStarNoDot;
    const flags = new Set(options.nocase ? ["i"] : []);
    let re = set.map((pattern) => {
      const pp = pattern.map((p) => {
        if (p instanceof RegExp) {
          for (const f of p.flags.split(""))
            flags.add(f);
        }
        return typeof p === "string" ? regExpEscape2(p) : p === GLOBSTAR ? GLOBSTAR : p._src;
      });
      pp.forEach((p, i) => {
        const next = pp[i + 1];
        const prev = pp[i - 1];
        if (p !== GLOBSTAR || prev === GLOBSTAR) {
          return;
        }
        if (prev === void 0) {
          if (next !== void 0 && next !== GLOBSTAR) {
            pp[i + 1] = "(?:\\/|" + twoStar + "\\/)?" + next;
          } else {
            pp[i] = twoStar;
          }
        } else if (next === void 0) {
          pp[i - 1] = prev + "(?:\\/|" + twoStar + ")?";
        } else if (next !== GLOBSTAR) {
          pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + "\\/)" + next;
          pp[i + 1] = GLOBSTAR;
        }
      });
      return pp.filter((p) => p !== GLOBSTAR).join("/");
    }).join("|");
    const [open, close] = set.length > 1 ? ["(?:", ")"] : ["", ""];
    re = "^" + open + re + close + "$";
    if (this.negate)
      re = "^(?!" + re + ").+$";
    try {
      this.regexp = new RegExp(re, [...flags].join(""));
    } catch (ex) {
      this.regexp = false;
    }
    return this.regexp;
  }
  slashSplit(p) {
    if (this.preserveMultipleSlashes) {
      return p.split("/");
    } else if (this.isWindows && /^\/\/[^\/]+/.test(p)) {
      return ["", ...p.split(/\/+/)];
    } else {
      return p.split(/\/+/);
    }
  }
  match(f, partial = this.partial) {
    this.debug("match", f, this.pattern);
    if (this.comment) {
      return false;
    }
    if (this.empty) {
      return f === "";
    }
    if (f === "/" && partial) {
      return true;
    }
    const options = this.options;
    if (this.isWindows) {
      f = f.split("\\").join("/");
    }
    const ff = this.slashSplit(f);
    this.debug(this.pattern, "split", ff);
    const set = this.set;
    this.debug(this.pattern, "set", set);
    let filename = ff[ff.length - 1];
    if (!filename) {
      for (let i = ff.length - 2; !filename && i >= 0; i--) {
        filename = ff[i];
      }
    }
    for (let i = 0; i < set.length; i++) {
      const pattern = set[i];
      let file = ff;
      if (options.matchBase && pattern.length === 1) {
        file = [filename];
      }
      const hit = this.matchOne(file, pattern, partial);
      if (hit) {
        if (options.flipNegate) {
          return true;
        }
        return !this.negate;
      }
    }
    if (options.flipNegate) {
      return false;
    }
    return this.negate;
  }
  static defaults(def) {
    return minimatch.defaults(def).Minimatch;
  }
};
minimatch.AST = AST;
minimatch.Minimatch = Minimatch;
minimatch.escape = escape;
minimatch.unescape = unescape;

// src/settings.ts
var vscode = __toESM(require("vscode"));
function extensionConfig() {
  return vscode.workspace.getConfiguration("instructions-manager");
}

// src/bookmarks/instructions.ts
var Commands = class {
  constructor(controller) {
    this.controller = controller;
  }
  refresh() {
    Object.keys(this.controller.bookmarks).forEach((uri) => {
      vscode2.workspace.openTextDocument(vscode2.Uri.parse(uri)).then((document) => {
        this.controller.updateBookmarks(document);
      });
    });
  }
  showSelectBookmark(filter2, placeHolder) {
    const entries = [];
    Object.keys(this.controller.bookmarks).forEach((uri) => {
      const resource = vscode2.Uri.parse(uri).fsPath;
      const fname = path2.parse(resource).base;
      if (filter2 && !filter2(resource)) {
        return;
      }
      Object.keys(this.controller.bookmarks[uri]).forEach((cat) => {
        this.controller.bookmarks[uri][cat].forEach((b) => {
          entries.push({
            label: b.text,
            description: fname,
            target: new vscode2.Location(vscode2.Uri.file(resource), b.range)
          });
        });
      });
    });
    vscode2.window.showQuickPick(entries, { placeHolder: placeHolder || "Select bookmarks" }).then((item) => {
      if (item && item.target) {
        vscode2.commands.executeCommand(
          "instructions.jumpToRange",
          item.target.uri,
          item.target.range
        );
      }
    });
  }
  showSelectVisibleBookmark() {
    const visibleEditorUris = vscode2.window.visibleTextEditors.map((te) => te.document.uri.fsPath);
    this.showSelectBookmark((resFsPath) => visibleEditorUris.includes(resFsPath), "Select visible bookmarks");
  }
  showListBookmarks(filter2) {
    if (!vscode2.window.createOutputChannel)
      return;
    const outputChannel = vscode2.window.createOutputChannel("instructions");
    outputChannel.clear();
    const entries = [];
    Object.keys(this.controller.bookmarks).forEach((uri) => {
      const resource = vscode2.Uri.parse(uri).fsPath;
      const fname = path2.parse(resource).base;
      if (filter2 && !filter2(resource)) {
        return;
      }
      Object.keys(this.controller.bookmarks[uri]).forEach((cat) => {
        this.controller.bookmarks[uri][cat].forEach((b) => {
          entries.push({
            label: b.text,
            description: fname,
            target: new vscode2.Location(vscode2.Uri.file(resource), b.range)
          });
        });
      });
    });
    if (entries.length === 0) {
      vscode2.window.showInformationMessage("No results");
      return;
    }
    entries.forEach((v, i) => {
      const patternA = `#${i + 1}	${v.target.uri}#${v.target.range.start.line + 1}`;
      const patternB = `#${i + 1}	${v.target.uri}:${v.target.range.start.line + 1}:${v.target.range.start.character + 1}`;
      const patternType = os.platform() === "linux" ? 1 : 0;
      outputChannel.appendLine([patternA, patternB][patternType]);
      outputChannel.appendLine(`	${v.label}
`);
    });
    outputChannel.show();
  }
  showListVisibleBookmarks() {
    const visibleEditorUris = vscode2.window.visibleTextEditors.map((te) => te.document.uri.fsPath);
    this.showListBookmarks((resFsPath) => visibleEditorUris.includes(resFsPath));
  }
  scanWorkspaceBookmarks() {
    vscode2.workspace.findFiles(this.controller.includePattern, this.controller.excludePattern, this.controller.maxFilesLimit).then(
      (files) => {
        if (!files || files.length === 0) {
          console.log("No files found");
          return;
        }
        function isTextFile(filePath) {
          const buffer = fs.readFileSync(filePath, { encoding: null, flag: "r" });
          const textChars = buffer.toString("utf8").split("").filter((char) => {
            const code = char.charCodeAt(0);
            return code >= 32 && code <= 126 || code === 9 || code === 10 || code === 13;
          });
          return textChars.length / buffer.length > 0.9;
        }
        files.forEach((file) => {
          if (isTextFile(file.fsPath)) {
            vscode2.workspace.openTextDocument(file).then(
              (document) => {
                this.controller.updateBookmarks(document);
              },
              (err) => console.error(err)
            );
          }
        });
      },
      (err) => console.error(err)
    );
  }
};
var InstructionsController = class {
  constructor(context) {
    this.context = context;
    this.styles = this._reLoadDecorations();
    this.words = this._reLoadWords();
    this.commands = new Commands(this);
    this.bookmarks = {};
    const arrayToSearchGlobPattern = (config) => {
      return Array.isArray(config) ? `{${config.join(",")}}` : typeof config === "string" ? config : "";
    };
    this.includePattern = arrayToSearchGlobPattern(extensionConfig().search.includes) || "{**/*}";
    this.excludePattern = arrayToSearchGlobPattern(extensionConfig().search.excludes);
    this.maxFilesLimit = extensionConfig().search.maxFiles;
    this.loadFromWorkspace();
  }
  /** -- public -- */
  hasBookmarks() {
    return !!Object.keys(this.bookmarks).length;
  }
  async decorate(editor) {
    if (!editor || !editor.document)
      return;
    if (minimatch(editor.document.fileName, this.excludePattern))
      return;
    this._clearBookmarksOfFile(editor.document);
    if (this._extensionIsBlacklisted(editor.document.fileName))
      return;
    for (const style in this.words) {
      if (!this.words.hasOwnProperty(style) || this.words[style].length === 0 || this._wordIsOnIgnoreList(this.words[style])) {
        continue;
      }
      await this._decorateWords(editor, this.words[style], style, editor.document.fileName.startsWith("extension-output-"));
    }
    this.saveToWorkspace();
  }
  async updateBookmarks(document) {
    if (!document || document.fileName.startsWith("extension-output-"))
      return;
    this._clearBookmarksOfFile(document);
    if (this._extensionIsBlacklisted(document.fileName))
      return;
    for (const style in this.words) {
      if (!this.words.hasOwnProperty(style) || this.words[style].length === 0 || this._wordIsOnIgnoreList(this.words[style])) {
        continue;
      }
      await this._updateBookmarksForWordAndStyle(document, this.words[style], style);
    }
    this.saveToWorkspace();
  }
  /** -- private -- */
  _extensionIsBlacklisted(fileName) {
    const ignoreList = extensionConfig().exceptions.file.extensions.ignore;
    if (!ignoreList || ignoreList.length === 0)
      return false;
    if (minimatch(fileName, this.excludePattern))
      return false;
    return this._commaSeparatedStringToUniqueList(ignoreList).some((ext2) => fileName.endsWith(ext2.trim()));
  }
  _wordIsOnIgnoreList(words) {
    const ignoreList = extensionConfig().exceptions.words.ignore;
    return this._commaSeparatedStringToUniqueList(ignoreList).some(
      (ignoreWord) => words.some((word) => word.startsWith(ignoreWord.trim()))
    );
  }
  _commaSeparatedStringToUniqueList(input) {
    if (!input)
      return [];
    return [...new Set(input.trim().split(",").map((e) => e.trim()).filter((e) => e.length))];
  }
  async _decorateWords(editor, words, style, noAdd) {
    const decoStyle = this.styles[style]?.type || this.styles["default"].type;
    const locations = this._findWords(editor.document, words);
    editor.setDecorations(decoStyle, locations);
    if (locations.length && !noAdd) {
      this._addBookmark(editor.document, style, locations);
    }
  }
  async _updateBookmarksForWordAndStyle(document, words, style) {
    const locations = this._findWords(document, words);
    if (locations.length) {
      this._addBookmark(document, style, locations);
    }
  }
  _findWords(document, words) {
    const text = document.getText();
    const locations = [];
    words.forEach((word) => {
      const regEx = new RegExp(word, "g");
      let match2;
      while (match2 = regEx.exec(text)) {
        const startPos = document.positionAt(match2.index);
        const endPos = document.positionAt(match2.index + match2[0].trim().length);
        const fullLine = document.getWordRangeAtPosition(startPos, /(.+)$/);
        if (fullLine) {
          locations.push({
            range: new vscode2.Range(startPos, endPos),
            text: document.getText(fullLine)
          });
        }
      }
    });
    return locations;
  }
  _clearBookmarksOfFile(document) {
    const filename = document.uri.toString();
    if (!this.bookmarks.hasOwnProperty(filename))
      return;
    delete this.bookmarks[filename];
  }
  _addBookmark(document, style, locations) {
    const filename = document.uri.toString();
    if (!this.bookmarks.hasOwnProperty(filename)) {
      this.bookmarks[filename] = {};
    }
    this.bookmarks[filename][style] = locations;
  }
  _reLoadWords() {
    const defaultWords = {
      blue: this._commaSeparatedStringToUniqueList(extensionConfig().default.words.blue),
      purple: this._commaSeparatedStringToUniqueList(extensionConfig().default.words.purple),
      brown: this._commaSeparatedStringToUniqueList(extensionConfig().default.words.brown),
      sky: this._commaSeparatedStringToUniqueList(extensionConfig().default.words.sky),
      lime: this._commaSeparatedStringToUniqueList(extensionConfig().default.words.lime),
      green: this._commaSeparatedStringToUniqueList(extensionConfig().default.words.green),
      red: this._commaSeparatedStringToUniqueList(extensionConfig().default.words.red),
      yellow: this._commaSeparatedStringToUniqueList(extensionConfig().default.words.yellow)
    };
    return { ...defaultWords, ...extensionConfig().expert.custom.words.mapping };
  }
  _getDecorationStyle(decoOptions) {
    return { type: vscode2.window.createTextEditorDecorationType(decoOptions), options: decoOptions };
  }
  _getBookmarkDataUri(color) {
    return vscode2.Uri.parse(
      "data:image/svg+xml," + encodeURIComponent(`<svg version="1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" enable-background="new 0 0 48 48"><path fill="${color}" d="M37,43l-13-6l-13,6V9c0-2.2,1.8-4,4-4h18c2.2,0,4,1.8,4,4V43z"/></svg>`)
    );
  }
  _getDecorationDefaultStyle(color) {
    return this._getDecorationStyle({
      "gutterIconPath": this._getBookmarkDataUri(color),
      "overviewRulerColor": color + "B0",
      // this is safe/suitable for the defaults only.  Custom ruler color is handled below.
      "light": {
        "fontWeight": "bold"
      },
      "dark": {
        "color": color
      }
    });
  }
  _reLoadDecorations() {
    const blue = "#1874e2";
    const green = "#10a37f";
    const purple = "#C679E0";
    const red = "#F44336";
    const brown = "#cc6d2e";
    const sky = "#03A9F4";
    const lime = "#CDDC39";
    const yellow = "#cdb116";
    let styles = {
      "default": this._getDecorationDefaultStyle(blue),
      "red": this._getDecorationDefaultStyle(red),
      "blue": this._getDecorationDefaultStyle(blue),
      "green": this._getDecorationDefaultStyle(green),
      "purple": this._getDecorationDefaultStyle(purple),
      "brown": this._getDecorationDefaultStyle(brown),
      "sky": this._getDecorationDefaultStyle(sky),
      "lime": this._getDecorationDefaultStyle(lime),
      "yellow": this._getDecorationDefaultStyle(yellow)
    };
    let customStyles = extensionConfig().expert.custom.styles;
    for (var decoId in customStyles) {
      if (!customStyles.hasOwnProperty(decoId)) {
        continue;
      }
      let decoOptions = { ...customStyles[decoId] };
      if (!decoOptions.gutterIconPath) {
        decoOptions.gutterIconColor = decoOptions.gutterIconColor || blue;
      }
      decoOptions.gutterIconPath = decoOptions.gutterIconColor ? this._getBookmarkDataUri(decoOptions.gutterIconColor) : this.context.asAbsolutePath(decoOptions.gutterIconPath);
      if (decoOptions.overviewRulerColor) {
        decoOptions.overviewRulerLane = vscode2.OverviewRulerLane.Full;
      }
      if (decoOptions.backgroundColor) {
        decoOptions.isWholeLine = true;
      }
      styles[decoId] = this._getDecorationStyle(decoOptions);
    }
    return styles;
  }
  resetWorkspace() {
    if (!this._isWorkspaceAvailable())
      return;
    this.context.workspaceState.update("bookmarks.object", "{}");
    let workspaceFolder = vscode2.workspace.workspaceFolders ? vscode2.workspace.workspaceFolders[0].uri.fsPath : void 0;
    fs.unlinkSync(workspaceFolder + "/.instructions/instructions.md");
    fs.unlinkSync(workspaceFolder + "/.instructions/bookmarks.json");
  }
  transformBookmarks(bookmarks) {
    let transformedData = {};
    let sortedEntries = Object.entries(bookmarks).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [filePath, tags] of sortedEntries) {
      let fileData = [];
      for (const [tag, entries] of Object.entries(tags)) {
        for (const entry of entries) {
          let tagTextSplit = entry.text.split(" ", 1);
          fileData.push({
            line: entry.range.start.line,
            startCharacter: entry.range.start.character,
            endCharacter: entry.range.end.character,
            tag: tagTextSplit[0].trim(),
            tagText: tagTextSplit.length > 1 ? tagTextSplit[1].substring(0, 50) : ""
          });
        }
      }
      fileData.sort((a, b) => a.line - b.line || a.startCharacter - b.startCharacter);
      transformedData[filePath] = fileData;
    }
    return transformedData;
  }
  async processTags(inputJson) {
    let output = [];
    for (const filePath of Object.keys(inputJson)) {
      const sortedTags = inputJson[filePath];
      try {
        const file = await vscode2.workspace.openTextDocument(vscode2.Uri.parse(filePath));
        let fileContents = file.getText();
        let firstTag = sortedTags[0];
        firstTag.tagStart = fileContents.indexOf(firstTag.tag);
        firstTag.tagLineStart = firstTag.tagStart - firstTag.startCharacter;
        for (let i = 0; i < sortedTags.length; i++) {
          const tag = sortedTags[i];
          let tagEnd;
          if (i + 1 < sortedTags.length) {
            const nextTag = sortedTags[i + 1];
            nextTag.tagStart = fileContents.indexOf(nextTag.tag, tag.tagStart + tag.tag.length);
            if (nextTag.startCharacter !== 0 && tag.line !== nextTag.line) {
              nextTag.tagLineStart = nextTag.tagStart - nextTag.startCharacter;
            } else {
              nextTag.tagLineStart = nextTag.tagStart;
            }
            tagEnd = nextTag.tagLineStart;
          } else {
            tagEnd = fileContents.length;
          }
          let textBeforeTag = fileContents.substring(tag.tagLineStart, tag.tagStart);
          let textAfterTag = fileContents.substring(tag.tagStart + tag.tag.length + 1, tagEnd);
          if (tag.tag.indexOf("@summarize(") == 0) {
            textAfterTag = fileContents.substring(tag.tagStart, tagEnd) + "@end-summarize\n";
          }
          if (textAfterTag !== "" && tag.tag == "@out-file") {
            break;
          }
          if (textAfterTag !== "" && tag.tag !== "@out") {
            output.push(textBeforeTag + textAfterTag);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
    return output;
  }
  async getInstructions() {
    return (await this.processTags(this.transformBookmarks(this.bookmarks))).join("\n");
  }
  async saveToWorkspace() {
    if (!this._isWorkspaceAvailable())
      return;
    this.context.workspaceState.update("bookmarks.object", JSON.stringify(this.bookmarks));
    let workspaceFolder = vscode2.workspace.workspaceFolders ? vscode2.workspace.workspaceFolders[0].uri.fsPath : void 0;
    if (workspaceFolder) {
      if (!fs.existsSync(workspaceFolder + "/.instructions")) {
        fs.mkdirSync(workspaceFolder + "/.instructions");
      }
      fs.writeFile(workspaceFolder + "/.instructions/bookmarks.json", JSON.stringify(this.bookmarks), (err) => {
        if (err) {
          console.error(err);
          return;
        }
        ;
      });
      let output = await this.processTags(this.transformBookmarks(this.bookmarks));
      fs.writeFile(workspaceFolder + "/.instructions/instructions.md", output.join("\n"), (err) => {
        if (err) {
          console.error(err);
          return;
        }
        ;
      });
    }
  }
  _isWorkspaceAvailable() {
    return vscode2.workspace.workspaceFolders && vscode2.workspace.workspaceFolders.length >= 1;
  }
  deserializeBookmark(serializedBookmark) {
    const start = new vscode2.Position(serializedBookmark.range[0].line, serializedBookmark.range[0].character);
    const end = new vscode2.Position(serializedBookmark.range[1].line, serializedBookmark.range[1].character);
    const range = new vscode2.Range(start, end);
    return {
      range,
      text: serializedBookmark.text
    };
  }
  loadFromWorkspace() {
    if (!this._isWorkspaceAvailable())
      return;
    this.bookmarks = JSON.parse(this.context.workspaceState.get("bookmarks.object", "{}"));
    Object.keys(this.bookmarks).forEach((filepath) => {
      const fsPath = vscode2.Uri.parse(filepath).fsPath;
      if (!fs.existsSync(fsPath) || minimatch(fsPath, this.excludePattern)) {
        delete this.bookmarks[filepath];
        return;
      }
      Object.keys(this.bookmarks[filepath]).forEach((cat) => {
        this.bookmarks[filepath][cat] = this.bookmarks[filepath][cat].map((serializedBookmark) => {
          return this.deserializeBookmark(serializedBookmark);
        });
      });
    });
  }
};
var NodeType = /* @__PURE__ */ ((NodeType2) => {
  NodeType2[NodeType2["FILE"] = 1] = "FILE";
  NodeType2[NodeType2["LOCATION"] = 2] = "LOCATION";
  return NodeType2;
})(NodeType || {});
var InstructionsDataModel = class {
  constructor(controller) {
    this.controller = controller;
  }
  getRoot() {
    let fileBookmarks = Object.keys(this.controller.bookmarks);
    if (extensionConfig().view.showVisibleFilesOnly) {
      let visibleEditorUris;
      if (extensionConfig().view.showVisibleFilesOnlyMode === "onlyActiveEditor") {
        const activeEditor = vscode2.window.activeTextEditor;
        visibleEditorUris = activeEditor ? [activeEditor.document.uri.path] : [];
      } else {
        visibleEditorUris = vscode2.window.visibleTextEditors.map((te) => te.document.uri.path);
      }
      fileBookmarks = fileBookmarks.filter(
        (v) => visibleEditorUris.includes(vscode2.Uri.parse(v).path)
      );
    }
    return fileBookmarks.sort().map((v) => ({
      resource: vscode2.Uri.parse(v),
      tooltip: v,
      name: v,
      type: 1 /* FILE */,
      parent: null,
      iconPath: vscode2.ThemeIcon.File,
      location: null,
      label: path2.basename(vscode2.Uri.parse(v).fsPath)
    }));
  }
  getChildren(element) {
    if (element.type === 1 /* FILE */) {
      const extractTextAfterLastAtWord = (inputString) => {
        const zeroedRegex = /^@summarize\([^)]*\)\s*/;
        const zeroedMatch = inputString.match(zeroedRegex);
        if (zeroedMatch) {
          return zeroedMatch[0].trim();
        }
        const firstRegex = /@[\w-]+[^@]*$/;
        const firstMatch = inputString.match(firstRegex);
        if (firstMatch) {
          let remainingText = firstMatch[0];
          let secondRegex;
          while (true) {
            if (remainingText.startsWith("@summarize(")) {
              secondRegex = /^@summarize\([^)]*\)\s*/;
            } else {
              secondRegex = /^@[\w-]+\s+/;
            }
            const secondMatch = remainingText.match(secondRegex);
            if (secondMatch) {
              remainingText = remainingText.substring(secondMatch[0].length);
            } else {
              break;
            }
          }
          return remainingText.trim();
        }
        return "";
      };
      const bookmarks = Object.keys(this.controller.bookmarks[element.name]).flatMap((cat) => {
        return this.controller.bookmarks[element.name][cat].map((v) => {
          const location = new vscode2.Location(element.resource, v.range);
          return {
            resource: element.resource,
            location,
            label: extractTextAfterLastAtWord(v.text),
            name: v.text.trim(),
            type: 2 /* LOCATION */,
            category: cat,
            parent: element,
            iconPath: this.controller.styles[cat]?.options?.gutterIconPath
          };
        });
      });
      return bookmarks.sort((a, b) => a.location.range.start.line - b.location.range.start.line);
    }
    return [];
  }
  getNeighbors(element) {
    const ret = { previous: null, next: null };
    let parent = element.parent;
    if (!parent) {
      parent = { ...element, type: 1 /* FILE */, name: element.resource.toString() };
    }
    const bookmarks = this.getChildren(parent);
    let gotElement = false;
    for (const b of bookmarks) {
      if (!gotElement && JSON.stringify(b.location) === JSON.stringify(element.location)) {
        gotElement = true;
        continue;
      }
      if (!gotElement) {
        ret.previous = b;
      } else {
        ret.next = b;
        break;
      }
    }
    return ret;
  }
};
var InlineBookmarkTreeDataProvider = class {
  constructor(instructionsController) {
    this._onDidChangeTreeData = new vscode2.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.controller = instructionsController;
    this.model = new InstructionsDataModel(instructionsController);
    this.filterTreeViewWords = [];
    this.gitIgnoreHandler = void 0;
  }
  /** TreeDataProvider Methods */
  getChildren(element) {
    const elements = element ? this.model.getChildren(element) : this.model.getRoot();
    return Promise.resolve(this._filterTreeView(elements));
  }
  getParent(element) {
    return element.parent || null;
  }
  getTreeItem(element) {
    let label = this._formatLabel(element.label);
    if (label == void 0) {
      label = "";
    }
    const item = new vscode2.TreeItem(
      label,
      // Pass a valid label
      element.type === 2 /* LOCATION */ ? vscode2.TreeItemCollapsibleState.None : extensionConfig().view.expanded ? vscode2.TreeItemCollapsibleState.Expanded : vscode2.TreeItemCollapsibleState.Collapsed
    );
    item.id = element.type === 2 /* LOCATION */ && element.location ? this._getId(element.location) : this._getId(element.resource);
    item.resourceUri = element.resource;
    item.iconPath = element.iconPath;
    item.command = element.type === 2 /* LOCATION */ && element.location ? {
      command: "instructions-manager.jumpToRange",
      arguments: [element.location.uri, element.location.range],
      title: "JumpTo"
    } : void 0;
    return item;
  }
  /** Utility Methods */
  _getId(o) {
    return crypto.createHash("sha1").update(JSON.stringify(o)).digest("hex");
  }
  _formatLabel(label) {
    if (!extensionConfig().view.words.hide || !label) {
      return label;
    }
    const words = Object.values(this.controller.words).flat();
    return words.reduce((prevs, word) => prevs.replace(new RegExp(word, "g"), ""), label);
  }
  _filterTreeView(elements) {
    if (this.gitIgnoreHandler?.filter) {
      elements = elements.filter((e) => this.gitIgnoreHandler.filter(e.resource));
    }
    if (this.filterTreeViewWords.length) {
      elements = elements.filter(
        (e) => this.filterTreeViewWords.some((rx) => new RegExp(rx, "g").test(e.label || ""))
      );
    }
    return elements;
  }
  /** Public Methods */
  setTreeViewFilterWords(words) {
    this.filterTreeViewWords = words;
  }
  setTreeViewGitIgnoreHandler(gi) {
    this.gitIgnoreHandler = gi;
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InlineBookmarkTreeDataProvider,
  InstructionsController,
  NodeType
});
//# sourceMappingURL=instructions.js.map
