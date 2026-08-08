#!/usr/bin/env bun
import{createRequire as __ccr}from'node:module';const require=__ccr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
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

// node_modules/pngjs/lib/chunkstream.js
var require_chunkstream = __commonJS({
  "node_modules/pngjs/lib/chunkstream.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var ChunkStream = module.exports = function() {
      Stream.call(this);
      this._buffers = [];
      this._buffered = 0;
      this._reads = [];
      this._paused = false;
      this._encoding = "utf8";
      this.writable = true;
    };
    util.inherits(ChunkStream, Stream);
    ChunkStream.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
      process.nextTick(
        function() {
          this._process();
          if (this._paused && this._reads && this._reads.length > 0) {
            this._paused = false;
            this.emit("drain");
          }
        }.bind(this)
      );
    };
    ChunkStream.prototype.write = function(data, encoding) {
      if (!this.writable) {
        this.emit("error", new Error("Stream not writable"));
        return false;
      }
      let dataBuffer;
      if (Buffer.isBuffer(data)) {
        dataBuffer = data;
      } else {
        dataBuffer = Buffer.from(data, encoding || this._encoding);
      }
      this._buffers.push(dataBuffer);
      this._buffered += dataBuffer.length;
      this._process();
      if (this._reads && this._reads.length === 0) {
        this._paused = true;
      }
      return this.writable && !this._paused;
    };
    ChunkStream.prototype.end = function(data, encoding) {
      if (data) {
        this.write(data, encoding);
      }
      this.writable = false;
      if (!this._buffers) {
        return;
      }
      if (this._buffers.length === 0) {
        this._end();
      } else {
        this._buffers.push(null);
        this._process();
      }
    };
    ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;
    ChunkStream.prototype._end = function() {
      if (this._reads.length > 0) {
        this.emit("error", new Error("Unexpected end of input"));
      }
      this.destroy();
    };
    ChunkStream.prototype.destroy = function() {
      if (!this._buffers) {
        return;
      }
      this.writable = false;
      this._reads = null;
      this._buffers = null;
      this.emit("close");
    };
    ChunkStream.prototype._processReadAllowingLess = function(read) {
      this._reads.shift();
      let smallerBuf = this._buffers[0];
      if (smallerBuf.length > read.length) {
        this._buffered -= read.length;
        this._buffers[0] = smallerBuf.slice(read.length);
        read.func.call(this, smallerBuf.slice(0, read.length));
      } else {
        this._buffered -= smallerBuf.length;
        this._buffers.shift();
        read.func.call(this, smallerBuf);
      }
    };
    ChunkStream.prototype._processRead = function(read) {
      this._reads.shift();
      let pos = 0;
      let count = 0;
      let data = Buffer.alloc(read.length);
      while (pos < read.length) {
        let buf = this._buffers[count++];
        let len = Math.min(buf.length, read.length - pos);
        buf.copy(data, pos, 0, len);
        pos += len;
        if (len !== buf.length) {
          this._buffers[--count] = buf.slice(len);
        }
      }
      if (count > 0) {
        this._buffers.splice(0, count);
      }
      this._buffered -= read.length;
      read.func.call(this, data);
    };
    ChunkStream.prototype._process = function() {
      try {
        while (this._buffered > 0 && this._reads && this._reads.length > 0) {
          let read = this._reads[0];
          if (read.allowLess) {
            this._processReadAllowingLess(read);
          } else if (this._buffered >= read.length) {
            this._processRead(read);
          } else {
            break;
          }
        }
        if (this._buffers && !this.writable) {
          this._end();
        }
      } catch (ex) {
        this.emit("error", ex);
      }
    };
  }
});

// node_modules/pngjs/lib/interlace.js
var require_interlace = __commonJS({
  "node_modules/pngjs/lib/interlace.js"(exports) {
    "use strict";
    var imagePasses = [
      {
        // pass 1 - 1px
        x: [0],
        y: [0]
      },
      {
        // pass 2 - 1px
        x: [4],
        y: [0]
      },
      {
        // pass 3 - 2px
        x: [0, 4],
        y: [4]
      },
      {
        // pass 4 - 4px
        x: [2, 6],
        y: [0, 4]
      },
      {
        // pass 5 - 8px
        x: [0, 2, 4, 6],
        y: [2, 6]
      },
      {
        // pass 6 - 16px
        x: [1, 3, 5, 7],
        y: [0, 2, 4, 6]
      },
      {
        // pass 7 - 32px
        x: [0, 1, 2, 3, 4, 5, 6, 7],
        y: [1, 3, 5, 7]
      }
    ];
    exports.getImagePasses = function(width, height) {
      let images = [];
      let xLeftOver = width % 8;
      let yLeftOver = height % 8;
      let xRepeats = (width - xLeftOver) / 8;
      let yRepeats = (height - yLeftOver) / 8;
      for (let i = 0; i < imagePasses.length; i++) {
        let pass = imagePasses[i];
        let passWidth = xRepeats * pass.x.length;
        let passHeight = yRepeats * pass.y.length;
        for (let j = 0; j < pass.x.length; j++) {
          if (pass.x[j] < xLeftOver) {
            passWidth++;
          } else {
            break;
          }
        }
        for (let j = 0; j < pass.y.length; j++) {
          if (pass.y[j] < yLeftOver) {
            passHeight++;
          } else {
            break;
          }
        }
        if (passWidth > 0 && passHeight > 0) {
          images.push({ width: passWidth, height: passHeight, index: i });
        }
      }
      return images;
    };
    exports.getInterlaceIterator = function(width) {
      return function(x, y, pass) {
        let outerXLeftOver = x % imagePasses[pass].x.length;
        let outerX = (x - outerXLeftOver) / imagePasses[pass].x.length * 8 + imagePasses[pass].x[outerXLeftOver];
        let outerYLeftOver = y % imagePasses[pass].y.length;
        let outerY = (y - outerYLeftOver) / imagePasses[pass].y.length * 8 + imagePasses[pass].y[outerYLeftOver];
        return outerX * 4 + outerY * width * 4;
      };
    };
  }
});

// node_modules/pngjs/lib/paeth-predictor.js
var require_paeth_predictor = __commonJS({
  "node_modules/pngjs/lib/paeth-predictor.js"(exports, module) {
    "use strict";
    module.exports = function paethPredictor(left, above, upLeft) {
      let paeth = left + above - upLeft;
      let pLeft = Math.abs(paeth - left);
      let pAbove = Math.abs(paeth - above);
      let pUpLeft = Math.abs(paeth - upLeft);
      if (pLeft <= pAbove && pLeft <= pUpLeft) {
        return left;
      }
      if (pAbove <= pUpLeft) {
        return above;
      }
      return upLeft;
    };
  }
});

// node_modules/pngjs/lib/filter-parse.js
var require_filter_parse = __commonJS({
  "node_modules/pngjs/lib/filter-parse.js"(exports, module) {
    "use strict";
    var interlaceUtils = require_interlace();
    var paethPredictor = require_paeth_predictor();
    function getByteWidth(width, bpp, depth) {
      let byteWidth = width * bpp;
      if (depth !== 8) {
        byteWidth = Math.ceil(byteWidth / (8 / depth));
      }
      return byteWidth;
    }
    var Filter = module.exports = function(bitmapInfo, dependencies) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let interlace = bitmapInfo.interlace;
      let bpp = bitmapInfo.bpp;
      let depth = bitmapInfo.depth;
      this.read = dependencies.read;
      this.write = dependencies.write;
      this.complete = dependencies.complete;
      this._imageIndex = 0;
      this._images = [];
      if (interlace) {
        let passes = interlaceUtils.getImagePasses(width, height);
        for (let i = 0; i < passes.length; i++) {
          this._images.push({
            byteWidth: getByteWidth(passes[i].width, bpp, depth),
            height: passes[i].height,
            lineIndex: 0
          });
        }
      } else {
        this._images.push({
          byteWidth: getByteWidth(width, bpp, depth),
          height,
          lineIndex: 0
        });
      }
      if (depth === 8) {
        this._xComparison = bpp;
      } else if (depth === 16) {
        this._xComparison = bpp * 2;
      } else {
        this._xComparison = 1;
      }
    };
    Filter.prototype.start = function() {
      this.read(
        this._images[this._imageIndex].byteWidth + 1,
        this._reverseFilterLine.bind(this)
      );
    };
    Filter.prototype._unFilterType1 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f1Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        unfilteredLine[x] = rawByte + f1Left;
      }
    };
    Filter.prototype._unFilterType2 = function(rawData, unfilteredLine, byteWidth) {
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f2Up = lastLine ? lastLine[x] : 0;
        unfilteredLine[x] = rawByte + f2Up;
      }
    };
    Filter.prototype._unFilterType3 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f3Up = lastLine ? lastLine[x] : 0;
        let f3Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f3Add = Math.floor((f3Left + f3Up) / 2);
        unfilteredLine[x] = rawByte + f3Add;
      }
    };
    Filter.prototype._unFilterType4 = function(rawData, unfilteredLine, byteWidth) {
      let xComparison = this._xComparison;
      let xBiggerThan = xComparison - 1;
      let lastLine = this._lastLine;
      for (let x = 0; x < byteWidth; x++) {
        let rawByte = rawData[1 + x];
        let f4Up = lastLine ? lastLine[x] : 0;
        let f4Left = x > xBiggerThan ? unfilteredLine[x - xComparison] : 0;
        let f4UpLeft = x > xBiggerThan && lastLine ? lastLine[x - xComparison] : 0;
        let f4Add = paethPredictor(f4Left, f4Up, f4UpLeft);
        unfilteredLine[x] = rawByte + f4Add;
      }
    };
    Filter.prototype._reverseFilterLine = function(rawData) {
      let filter = rawData[0];
      let unfilteredLine;
      let currentImage = this._images[this._imageIndex];
      let byteWidth = currentImage.byteWidth;
      if (filter === 0) {
        unfilteredLine = rawData.slice(1, byteWidth + 1);
      } else {
        unfilteredLine = Buffer.alloc(byteWidth);
        switch (filter) {
          case 1:
            this._unFilterType1(rawData, unfilteredLine, byteWidth);
            break;
          case 2:
            this._unFilterType2(rawData, unfilteredLine, byteWidth);
            break;
          case 3:
            this._unFilterType3(rawData, unfilteredLine, byteWidth);
            break;
          case 4:
            this._unFilterType4(rawData, unfilteredLine, byteWidth);
            break;
          default:
            throw new Error("Unrecognised filter type - " + filter);
        }
      }
      this.write(unfilteredLine);
      currentImage.lineIndex++;
      if (currentImage.lineIndex >= currentImage.height) {
        this._lastLine = null;
        this._imageIndex++;
        currentImage = this._images[this._imageIndex];
      } else {
        this._lastLine = unfilteredLine;
      }
      if (currentImage) {
        this.read(currentImage.byteWidth + 1, this._reverseFilterLine.bind(this));
      } else {
        this._lastLine = null;
        this.complete();
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-async.js
var require_filter_parse_async = __commonJS({
  "node_modules/pngjs/lib/filter-parse-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var ChunkStream = require_chunkstream();
    var Filter = require_filter_parse();
    var FilterAsync = module.exports = function(bitmapInfo) {
      ChunkStream.call(this);
      let buffers = [];
      let that = this;
      this._filter = new Filter(bitmapInfo, {
        read: this.read.bind(this),
        write: function(buffer) {
          buffers.push(buffer);
        },
        complete: function() {
          that.emit("complete", Buffer.concat(buffers));
        }
      });
      this._filter.start();
    };
    util.inherits(FilterAsync, ChunkStream);
  }
});

// node_modules/pngjs/lib/constants.js
var require_constants = __commonJS({
  "node_modules/pngjs/lib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      PNG_SIGNATURE: [137, 80, 78, 71, 13, 10, 26, 10],
      TYPE_IHDR: 1229472850,
      TYPE_IEND: 1229278788,
      TYPE_IDAT: 1229209940,
      TYPE_PLTE: 1347179589,
      TYPE_tRNS: 1951551059,
      // eslint-disable-line camelcase
      TYPE_gAMA: 1732332865,
      // eslint-disable-line camelcase
      // color-type bits
      COLORTYPE_GRAYSCALE: 0,
      COLORTYPE_PALETTE: 1,
      COLORTYPE_COLOR: 2,
      COLORTYPE_ALPHA: 4,
      // e.g. grayscale and alpha
      // color-type combinations
      COLORTYPE_PALETTE_COLOR: 3,
      COLORTYPE_COLOR_ALPHA: 6,
      COLORTYPE_TO_BPP_MAP: {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4
      },
      GAMMA_DIVISION: 1e5
    };
  }
});

// node_modules/pngjs/lib/crc.js
var require_crc = __commonJS({
  "node_modules/pngjs/lib/crc.js"(exports, module) {
    "use strict";
    var crcTable = [];
    (function() {
      for (let i = 0; i < 256; i++) {
        let currentCrc = i;
        for (let j = 0; j < 8; j++) {
          if (currentCrc & 1) {
            currentCrc = 3988292384 ^ currentCrc >>> 1;
          } else {
            currentCrc = currentCrc >>> 1;
          }
        }
        crcTable[i] = currentCrc;
      }
    })();
    var CrcCalculator = module.exports = function() {
      this._crc = -1;
    };
    CrcCalculator.prototype.write = function(data) {
      for (let i = 0; i < data.length; i++) {
        this._crc = crcTable[(this._crc ^ data[i]) & 255] ^ this._crc >>> 8;
      }
      return true;
    };
    CrcCalculator.prototype.crc32 = function() {
      return this._crc ^ -1;
    };
    CrcCalculator.crc32 = function(buf) {
      let crc = -1;
      for (let i = 0; i < buf.length; i++) {
        crc = crcTable[(crc ^ buf[i]) & 255] ^ crc >>> 8;
      }
      return crc ^ -1;
    };
  }
});

// node_modules/pngjs/lib/parser.js
var require_parser = __commonJS({
  "node_modules/pngjs/lib/parser.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcCalculator = require_crc();
    var Parser = module.exports = function(options, dependencies) {
      this._options = options;
      options.checkCRC = options.checkCRC !== false;
      this._hasIHDR = false;
      this._hasIEND = false;
      this._emittedHeadersFinished = false;
      this._palette = [];
      this._colorType = 0;
      this._chunks = {};
      this._chunks[constants.TYPE_IHDR] = this._handleIHDR.bind(this);
      this._chunks[constants.TYPE_IEND] = this._handleIEND.bind(this);
      this._chunks[constants.TYPE_IDAT] = this._handleIDAT.bind(this);
      this._chunks[constants.TYPE_PLTE] = this._handlePLTE.bind(this);
      this._chunks[constants.TYPE_tRNS] = this._handleTRNS.bind(this);
      this._chunks[constants.TYPE_gAMA] = this._handleGAMA.bind(this);
      this.read = dependencies.read;
      this.error = dependencies.error;
      this.metadata = dependencies.metadata;
      this.gamma = dependencies.gamma;
      this.transColor = dependencies.transColor;
      this.palette = dependencies.palette;
      this.parsed = dependencies.parsed;
      this.inflateData = dependencies.inflateData;
      this.finished = dependencies.finished;
      this.simpleTransparency = dependencies.simpleTransparency;
      this.headersFinished = dependencies.headersFinished || function() {
      };
    };
    Parser.prototype.start = function() {
      this.read(constants.PNG_SIGNATURE.length, this._parseSignature.bind(this));
    };
    Parser.prototype._parseSignature = function(data) {
      let signature = constants.PNG_SIGNATURE;
      for (let i = 0; i < signature.length; i++) {
        if (data[i] !== signature[i]) {
          this.error(new Error("Invalid file signature"));
          return;
        }
      }
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._parseChunkBegin = function(data) {
      let length = data.readUInt32BE(0);
      let type = data.readUInt32BE(4);
      let name = "";
      for (let i = 4; i < 8; i++) {
        name += String.fromCharCode(data[i]);
      }
      let ancillary = Boolean(data[4] & 32);
      if (!this._hasIHDR && type !== constants.TYPE_IHDR) {
        this.error(new Error("Expected IHDR on beggining"));
        return;
      }
      this._crc = new CrcCalculator();
      this._crc.write(Buffer.from(name));
      if (this._chunks[type]) {
        return this._chunks[type](length);
      }
      if (!ancillary) {
        this.error(new Error("Unsupported critical chunk type " + name));
        return;
      }
      this.read(length + 4, this._skipChunk.bind(this));
    };
    Parser.prototype._skipChunk = function() {
      this.read(8, this._parseChunkBegin.bind(this));
    };
    Parser.prototype._handleChunkEnd = function() {
      this.read(4, this._parseChunkEnd.bind(this));
    };
    Parser.prototype._parseChunkEnd = function(data) {
      let fileCrc = data.readInt32BE(0);
      let calcCrc = this._crc.crc32();
      if (this._options.checkCRC && calcCrc !== fileCrc) {
        this.error(new Error("Crc error - " + fileCrc + " - " + calcCrc));
        return;
      }
      if (!this._hasIEND) {
        this.read(8, this._parseChunkBegin.bind(this));
      }
    };
    Parser.prototype._handleIHDR = function(length) {
      this.read(length, this._parseIHDR.bind(this));
    };
    Parser.prototype._parseIHDR = function(data) {
      this._crc.write(data);
      let width = data.readUInt32BE(0);
      let height = data.readUInt32BE(4);
      let depth = data[8];
      let colorType = data[9];
      let compr = data[10];
      let filter = data[11];
      let interlace = data[12];
      if (depth !== 8 && depth !== 4 && depth !== 2 && depth !== 1 && depth !== 16) {
        this.error(new Error("Unsupported bit depth " + depth));
        return;
      }
      if (!(colorType in constants.COLORTYPE_TO_BPP_MAP)) {
        this.error(new Error("Unsupported color type"));
        return;
      }
      if (compr !== 0) {
        this.error(new Error("Unsupported compression method"));
        return;
      }
      if (filter !== 0) {
        this.error(new Error("Unsupported filter method"));
        return;
      }
      if (interlace !== 0 && interlace !== 1) {
        this.error(new Error("Unsupported interlace method"));
        return;
      }
      this._colorType = colorType;
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._colorType];
      this._hasIHDR = true;
      this.metadata({
        width,
        height,
        depth,
        interlace: Boolean(interlace),
        palette: Boolean(colorType & constants.COLORTYPE_PALETTE),
        color: Boolean(colorType & constants.COLORTYPE_COLOR),
        alpha: Boolean(colorType & constants.COLORTYPE_ALPHA),
        bpp,
        colorType
      });
      this._handleChunkEnd();
    };
    Parser.prototype._handlePLTE = function(length) {
      this.read(length, this._parsePLTE.bind(this));
    };
    Parser.prototype._parsePLTE = function(data) {
      this._crc.write(data);
      let entries = Math.floor(data.length / 3);
      for (let i = 0; i < entries; i++) {
        this._palette.push([data[i * 3], data[i * 3 + 1], data[i * 3 + 2], 255]);
      }
      this.palette(this._palette);
      this._handleChunkEnd();
    };
    Parser.prototype._handleTRNS = function(length) {
      this.simpleTransparency();
      this.read(length, this._parseTRNS.bind(this));
    };
    Parser.prototype._parseTRNS = function(data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR) {
        if (this._palette.length === 0) {
          this.error(new Error("Transparency chunk must be after palette"));
          return;
        }
        if (data.length > this._palette.length) {
          this.error(new Error("More transparent colors than palette size"));
          return;
        }
        for (let i = 0; i < data.length; i++) {
          this._palette[i][3] = data[i];
        }
        this.palette(this._palette);
      }
      if (this._colorType === constants.COLORTYPE_GRAYSCALE) {
        this.transColor([data.readUInt16BE(0)]);
      }
      if (this._colorType === constants.COLORTYPE_COLOR) {
        this.transColor([
          data.readUInt16BE(0),
          data.readUInt16BE(2),
          data.readUInt16BE(4)
        ]);
      }
      this._handleChunkEnd();
    };
    Parser.prototype._handleGAMA = function(length) {
      this.read(length, this._parseGAMA.bind(this));
    };
    Parser.prototype._parseGAMA = function(data) {
      this._crc.write(data);
      this.gamma(data.readUInt32BE(0) / constants.GAMMA_DIVISION);
      this._handleChunkEnd();
    };
    Parser.prototype._handleIDAT = function(length) {
      if (!this._emittedHeadersFinished) {
        this._emittedHeadersFinished = true;
        this.headersFinished();
      }
      this.read(-length, this._parseIDAT.bind(this, length));
    };
    Parser.prototype._parseIDAT = function(length, data) {
      this._crc.write(data);
      if (this._colorType === constants.COLORTYPE_PALETTE_COLOR && this._palette.length === 0) {
        throw new Error("Expected palette not found");
      }
      this.inflateData(data);
      let leftOverLength = length - data.length;
      if (leftOverLength > 0) {
        this._handleIDAT(leftOverLength);
      } else {
        this._handleChunkEnd();
      }
    };
    Parser.prototype._handleIEND = function(length) {
      this.read(length, this._parseIEND.bind(this));
    };
    Parser.prototype._parseIEND = function(data) {
      this._crc.write(data);
      this._hasIEND = true;
      this._handleChunkEnd();
      if (this.finished) {
        this.finished();
      }
    };
  }
});

// node_modules/pngjs/lib/bitmapper.js
var require_bitmapper = __commonJS({
  "node_modules/pngjs/lib/bitmapper.js"(exports) {
    "use strict";
    var interlaceUtils = require_interlace();
    var pixelBppMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos === data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = 255;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 1 >= data.length) {
          throw new Error("Ran out of data");
        }
        let pixel = data[rawPos];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = data[rawPos + 1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 2 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = 255;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, data, pxPos, rawPos) {
        if (rawPos + 3 >= data.length) {
          throw new Error("Ran out of data");
        }
        pxData[pxPos] = data[rawPos];
        pxData[pxPos + 1] = data[rawPos + 1];
        pxData[pxPos + 2] = data[rawPos + 2];
        pxData[pxPos + 3] = data[rawPos + 3];
      }
    ];
    var pixelBppCustomMapper = [
      // 0 - dummy entry
      function() {
      },
      // 1 - L
      // 0: 0, 1: 0, 2: 0, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = maxBit;
      },
      // 2 - LA
      // 0: 0, 1: 0, 2: 0, 3: 1
      function(pxData, pixelData, pxPos) {
        let pixel = pixelData[0];
        pxData[pxPos] = pixel;
        pxData[pxPos + 1] = pixel;
        pxData[pxPos + 2] = pixel;
        pxData[pxPos + 3] = pixelData[1];
      },
      // 3 - RGB
      // 0: 0, 1: 1, 2: 2, 3: 0xff
      function(pxData, pixelData, pxPos, maxBit) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = maxBit;
      },
      // 4 - RGBA
      // 0: 0, 1: 1, 2: 2, 3: 3
      function(pxData, pixelData, pxPos) {
        pxData[pxPos] = pixelData[0];
        pxData[pxPos + 1] = pixelData[1];
        pxData[pxPos + 2] = pixelData[2];
        pxData[pxPos + 3] = pixelData[3];
      }
    ];
    function bitRetriever(data, depth) {
      let leftOver = [];
      let i = 0;
      function split() {
        if (i === data.length) {
          throw new Error("Ran out of data");
        }
        let byte = data[i];
        i++;
        let byte8, byte7, byte6, byte5, byte4, byte3, byte2, byte1;
        switch (depth) {
          default:
            throw new Error("unrecognised depth");
          case 16:
            byte2 = data[i];
            i++;
            leftOver.push((byte << 8) + byte2);
            break;
          case 4:
            byte2 = byte & 15;
            byte1 = byte >> 4;
            leftOver.push(byte1, byte2);
            break;
          case 2:
            byte4 = byte & 3;
            byte3 = byte >> 2 & 3;
            byte2 = byte >> 4 & 3;
            byte1 = byte >> 6 & 3;
            leftOver.push(byte1, byte2, byte3, byte4);
            break;
          case 1:
            byte8 = byte & 1;
            byte7 = byte >> 1 & 1;
            byte6 = byte >> 2 & 1;
            byte5 = byte >> 3 & 1;
            byte4 = byte >> 4 & 1;
            byte3 = byte >> 5 & 1;
            byte2 = byte >> 6 & 1;
            byte1 = byte >> 7 & 1;
            leftOver.push(byte1, byte2, byte3, byte4, byte5, byte6, byte7, byte8);
            break;
        }
      }
      return {
        get: function(count) {
          while (leftOver.length < count) {
            split();
          }
          let returner = leftOver.slice(0, count);
          leftOver = leftOver.slice(count);
          return returner;
        },
        resetAfterLine: function() {
          leftOver.length = 0;
        },
        end: function() {
          if (i !== data.length) {
            throw new Error("extra data found");
          }
        }
      };
    }
    function mapImage8Bit(image, pxData, getPxPos, bpp, data, rawPos) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppMapper[bpp](pxData, data, pxPos, rawPos);
          rawPos += bpp;
        }
      }
      return rawPos;
    }
    function mapImageCustomBit(image, pxData, getPxPos, bpp, bits, maxBit) {
      let imageWidth = image.width;
      let imageHeight = image.height;
      let imagePass = image.index;
      for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
          let pixelData = bits.get(bpp);
          let pxPos = getPxPos(x, y, imagePass);
          pixelBppCustomMapper[bpp](pxData, pixelData, pxPos, maxBit);
        }
        bits.resetAfterLine();
      }
    }
    exports.dataToBitMap = function(data, bitmapInfo) {
      let width = bitmapInfo.width;
      let height = bitmapInfo.height;
      let depth = bitmapInfo.depth;
      let bpp = bitmapInfo.bpp;
      let interlace = bitmapInfo.interlace;
      let bits;
      if (depth !== 8) {
        bits = bitRetriever(data, depth);
      }
      let pxData;
      if (depth <= 8) {
        pxData = Buffer.alloc(width * height * 4);
      } else {
        pxData = new Uint16Array(width * height * 4);
      }
      let maxBit = Math.pow(2, depth) - 1;
      let rawPos = 0;
      let images;
      let getPxPos;
      if (interlace) {
        images = interlaceUtils.getImagePasses(width, height);
        getPxPos = interlaceUtils.getInterlaceIterator(width, height);
      } else {
        let nonInterlacedPxPos = 0;
        getPxPos = function() {
          let returner = nonInterlacedPxPos;
          nonInterlacedPxPos += 4;
          return returner;
        };
        images = [{ width, height }];
      }
      for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
        if (depth === 8) {
          rawPos = mapImage8Bit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            data,
            rawPos
          );
        } else {
          mapImageCustomBit(
            images[imageIndex],
            pxData,
            getPxPos,
            bpp,
            bits,
            maxBit
          );
        }
      }
      if (depth === 8) {
        if (rawPos !== data.length) {
          throw new Error("extra data found");
        }
      } else {
        bits.end();
      }
      return pxData;
    };
  }
});

// node_modules/pngjs/lib/format-normaliser.js
var require_format_normaliser = __commonJS({
  "node_modules/pngjs/lib/format-normaliser.js"(exports, module) {
    "use strict";
    function dePalette(indata, outdata, width, height, palette) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let color = palette[indata[pxPos]];
          if (!color) {
            throw new Error("index " + indata[pxPos] + " not in palette");
          }
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = color[i];
          }
          pxPos += 4;
        }
      }
    }
    function replaceTransparentColor(indata, outdata, width, height, transColor) {
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let makeTrans = false;
          if (transColor.length === 1) {
            if (transColor[0] === indata[pxPos]) {
              makeTrans = true;
            }
          } else if (transColor[0] === indata[pxPos] && transColor[1] === indata[pxPos + 1] && transColor[2] === indata[pxPos + 2]) {
            makeTrans = true;
          }
          if (makeTrans) {
            for (let i = 0; i < 4; i++) {
              outdata[pxPos + i] = 0;
            }
          }
          pxPos += 4;
        }
      }
    }
    function scaleDepth(indata, outdata, width, height, depth) {
      let maxOutSample = 255;
      let maxInSample = Math.pow(2, depth) - 1;
      let pxPos = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          for (let i = 0; i < 4; i++) {
            outdata[pxPos + i] = Math.floor(
              indata[pxPos + i] * maxOutSample / maxInSample + 0.5
            );
          }
          pxPos += 4;
        }
      }
    }
    module.exports = function(indata, imageData, skipRescale = false) {
      let depth = imageData.depth;
      let width = imageData.width;
      let height = imageData.height;
      let colorType = imageData.colorType;
      let transColor = imageData.transColor;
      let palette = imageData.palette;
      let outdata = indata;
      if (colorType === 3) {
        dePalette(indata, outdata, width, height, palette);
      } else {
        if (transColor) {
          replaceTransparentColor(indata, outdata, width, height, transColor);
        }
        if (depth !== 8 && !skipRescale) {
          if (depth === 16) {
            outdata = Buffer.alloc(width * height * 4);
          }
          scaleDepth(indata, outdata, width, height, depth);
        }
      }
      return outdata;
    };
  }
});

// node_modules/pngjs/lib/parser-async.js
var require_parser_async = __commonJS({
  "node_modules/pngjs/lib/parser-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var zlib = __require("zlib");
    var ChunkStream = require_chunkstream();
    var FilterAsync = require_filter_parse_async();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    var ParserAsync = module.exports = function(options) {
      ChunkStream.call(this);
      this._parser = new Parser(options, {
        read: this.read.bind(this),
        error: this._handleError.bind(this),
        metadata: this._handleMetaData.bind(this),
        gamma: this.emit.bind(this, "gamma"),
        palette: this._handlePalette.bind(this),
        transColor: this._handleTransColor.bind(this),
        finished: this._finished.bind(this),
        inflateData: this._inflateData.bind(this),
        simpleTransparency: this._simpleTransparency.bind(this),
        headersFinished: this._headersFinished.bind(this)
      });
      this._options = options;
      this.writable = true;
      this._parser.start();
    };
    util.inherits(ParserAsync, ChunkStream);
    ParserAsync.prototype._handleError = function(err) {
      this.emit("error", err);
      this.writable = false;
      this.destroy();
      if (this._inflate && this._inflate.destroy) {
        this._inflate.destroy();
      }
      if (this._filter) {
        this._filter.destroy();
        this._filter.on("error", function() {
        });
      }
      this.errord = true;
    };
    ParserAsync.prototype._inflateData = function(data) {
      if (!this._inflate) {
        if (this._bitmapInfo.interlace) {
          this._inflate = zlib.createInflate();
          this._inflate.on("error", this.emit.bind(this, "error"));
          this._filter.on("complete", this._complete.bind(this));
          this._inflate.pipe(this._filter);
        } else {
          let rowSize = (this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7 >> 3) + 1;
          let imageSize = rowSize * this._bitmapInfo.height;
          let chunkSize = Math.max(imageSize, zlib.Z_MIN_CHUNK);
          this._inflate = zlib.createInflate({ chunkSize });
          let leftToInflate = imageSize;
          let emitError = this.emit.bind(this, "error");
          this._inflate.on("error", function(err) {
            if (!leftToInflate) {
              return;
            }
            emitError(err);
          });
          this._filter.on("complete", this._complete.bind(this));
          let filterWrite = this._filter.write.bind(this._filter);
          this._inflate.on("data", function(chunk) {
            if (!leftToInflate) {
              return;
            }
            if (chunk.length > leftToInflate) {
              chunk = chunk.slice(0, leftToInflate);
            }
            leftToInflate -= chunk.length;
            filterWrite(chunk);
          });
          this._inflate.on("end", this._filter.end.bind(this._filter));
        }
      }
      this._inflate.write(data);
    };
    ParserAsync.prototype._handleMetaData = function(metaData) {
      this._metaData = metaData;
      this._bitmapInfo = Object.create(metaData);
      this._filter = new FilterAsync(this._bitmapInfo);
    };
    ParserAsync.prototype._handleTransColor = function(transColor) {
      this._bitmapInfo.transColor = transColor;
    };
    ParserAsync.prototype._handlePalette = function(palette) {
      this._bitmapInfo.palette = palette;
    };
    ParserAsync.prototype._simpleTransparency = function() {
      this._metaData.alpha = true;
    };
    ParserAsync.prototype._headersFinished = function() {
      this.emit("metadata", this._metaData);
    };
    ParserAsync.prototype._finished = function() {
      if (this.errord) {
        return;
      }
      if (!this._inflate) {
        this.emit("error", "No Inflate block");
      } else {
        this._inflate.end();
      }
    };
    ParserAsync.prototype._complete = function(filteredData) {
      if (this.errord) {
        return;
      }
      let normalisedBitmapData;
      try {
        let bitmapData = bitmapper.dataToBitMap(filteredData, this._bitmapInfo);
        normalisedBitmapData = formatNormaliser(
          bitmapData,
          this._bitmapInfo,
          this._options.skipRescale
        );
        bitmapData = null;
      } catch (ex) {
        this._handleError(ex);
        return;
      }
      this.emit("parsed", normalisedBitmapData);
    };
  }
});

// node_modules/pngjs/lib/bitpacker.js
var require_bitpacker = __commonJS({
  "node_modules/pngjs/lib/bitpacker.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    module.exports = function(dataIn, width, height, options) {
      let outHasAlpha = [constants.COLORTYPE_COLOR_ALPHA, constants.COLORTYPE_ALPHA].indexOf(
        options.colorType
      ) !== -1;
      if (options.colorType === options.inputColorType) {
        let bigEndian = (function() {
          let buffer = new ArrayBuffer(2);
          new DataView(buffer).setInt16(
            0,
            256,
            true
            /* littleEndian */
          );
          return new Int16Array(buffer)[0] !== 256;
        })();
        if (options.bitDepth === 8 || options.bitDepth === 16 && bigEndian) {
          return dataIn;
        }
      }
      let data = options.bitDepth !== 16 ? dataIn : new Uint16Array(dataIn.buffer);
      let maxValue = 255;
      let inBpp = constants.COLORTYPE_TO_BPP_MAP[options.inputColorType];
      if (inBpp === 4 && !options.inputHasAlpha) {
        inBpp = 3;
      }
      let outBpp = constants.COLORTYPE_TO_BPP_MAP[options.colorType];
      if (options.bitDepth === 16) {
        maxValue = 65535;
        outBpp *= 2;
      }
      let outData = Buffer.alloc(width * height * outBpp);
      let inIndex = 0;
      let outIndex = 0;
      let bgColor = options.bgColor || {};
      if (bgColor.red === void 0) {
        bgColor.red = maxValue;
      }
      if (bgColor.green === void 0) {
        bgColor.green = maxValue;
      }
      if (bgColor.blue === void 0) {
        bgColor.blue = maxValue;
      }
      function getRGBA() {
        let red;
        let green;
        let blue;
        let alpha = maxValue;
        switch (options.inputColorType) {
          case constants.COLORTYPE_COLOR_ALPHA:
            alpha = data[inIndex + 3];
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_COLOR:
            red = data[inIndex];
            green = data[inIndex + 1];
            blue = data[inIndex + 2];
            break;
          case constants.COLORTYPE_ALPHA:
            alpha = data[inIndex + 1];
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          case constants.COLORTYPE_GRAYSCALE:
            red = data[inIndex];
            green = red;
            blue = red;
            break;
          default:
            throw new Error(
              "input color type:" + options.inputColorType + " is not supported at present"
            );
        }
        if (options.inputHasAlpha) {
          if (!outHasAlpha) {
            alpha /= maxValue;
            red = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.red + alpha * red), 0),
              maxValue
            );
            green = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.green + alpha * green), 0),
              maxValue
            );
            blue = Math.min(
              Math.max(Math.round((1 - alpha) * bgColor.blue + alpha * blue), 0),
              maxValue
            );
          }
        }
        return { red, green, blue, alpha };
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let rgba = getRGBA(data, inIndex);
          switch (options.colorType) {
            case constants.COLORTYPE_COLOR_ALPHA:
            case constants.COLORTYPE_COLOR:
              if (options.bitDepth === 8) {
                outData[outIndex] = rgba.red;
                outData[outIndex + 1] = rgba.green;
                outData[outIndex + 2] = rgba.blue;
                if (outHasAlpha) {
                  outData[outIndex + 3] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(rgba.red, outIndex);
                outData.writeUInt16BE(rgba.green, outIndex + 2);
                outData.writeUInt16BE(rgba.blue, outIndex + 4);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 6);
                }
              }
              break;
            case constants.COLORTYPE_ALPHA:
            case constants.COLORTYPE_GRAYSCALE: {
              let grayscale = (rgba.red + rgba.green + rgba.blue) / 3;
              if (options.bitDepth === 8) {
                outData[outIndex] = grayscale;
                if (outHasAlpha) {
                  outData[outIndex + 1] = rgba.alpha;
                }
              } else {
                outData.writeUInt16BE(grayscale, outIndex);
                if (outHasAlpha) {
                  outData.writeUInt16BE(rgba.alpha, outIndex + 2);
                }
              }
              break;
            }
            default:
              throw new Error("unrecognised color Type " + options.colorType);
          }
          inIndex += inBpp;
          outIndex += outBpp;
        }
      }
      return outData;
    };
  }
});

// node_modules/pngjs/lib/filter-pack.js
var require_filter_pack = __commonJS({
  "node_modules/pngjs/lib/filter-pack.js"(exports, module) {
    "use strict";
    var paethPredictor = require_paeth_predictor();
    function filterNone(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        rawData[rawPos + x] = pxData[pxPos + x];
      }
    }
    function filterSumNone(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let i = pxPos; i < length; i++) {
        sum += Math.abs(pxData[i]);
      }
      return sum;
    }
    function filterSub(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumSub(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let val = pxData[pxPos + x] - left;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterUp(pxData, pxPos, byteWidth, rawData, rawPos) {
      for (let x = 0; x < byteWidth; x++) {
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - up;
        rawData[rawPos + x] = val;
      }
    }
    function filterSumUp(pxData, pxPos, byteWidth) {
      let sum = 0;
      let length = pxPos + byteWidth;
      for (let x = pxPos; x < length; x++) {
        let up = pxPos > 0 ? pxData[x - byteWidth] : 0;
        let val = pxData[x] - up;
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterAvg(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumAvg(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let val = pxData[pxPos + x] - (left + up >> 1);
        sum += Math.abs(val);
      }
      return sum;
    }
    function filterPaeth(pxData, pxPos, byteWidth, rawData, rawPos, bpp) {
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        rawData[rawPos + x] = val;
      }
    }
    function filterSumPaeth(pxData, pxPos, byteWidth, bpp) {
      let sum = 0;
      for (let x = 0; x < byteWidth; x++) {
        let left = x >= bpp ? pxData[pxPos + x - bpp] : 0;
        let up = pxPos > 0 ? pxData[pxPos + x - byteWidth] : 0;
        let upleft = pxPos > 0 && x >= bpp ? pxData[pxPos + x - (byteWidth + bpp)] : 0;
        let val = pxData[pxPos + x] - paethPredictor(left, up, upleft);
        sum += Math.abs(val);
      }
      return sum;
    }
    var filters = {
      0: filterNone,
      1: filterSub,
      2: filterUp,
      3: filterAvg,
      4: filterPaeth
    };
    var filterSums = {
      0: filterSumNone,
      1: filterSumSub,
      2: filterSumUp,
      3: filterSumAvg,
      4: filterSumPaeth
    };
    module.exports = function(pxData, width, height, options, bpp) {
      let filterTypes;
      if (!("filterType" in options) || options.filterType === -1) {
        filterTypes = [0, 1, 2, 3, 4];
      } else if (typeof options.filterType === "number") {
        filterTypes = [options.filterType];
      } else {
        throw new Error("unrecognised filter types");
      }
      if (options.bitDepth === 16) {
        bpp *= 2;
      }
      let byteWidth = width * bpp;
      let rawPos = 0;
      let pxPos = 0;
      let rawData = Buffer.alloc((byteWidth + 1) * height);
      let sel = filterTypes[0];
      for (let y = 0; y < height; y++) {
        if (filterTypes.length > 1) {
          let min = Infinity;
          for (let i = 0; i < filterTypes.length; i++) {
            let sum = filterSums[filterTypes[i]](pxData, pxPos, byteWidth, bpp);
            if (sum < min) {
              sel = filterTypes[i];
              min = sum;
            }
          }
        }
        rawData[rawPos] = sel;
        rawPos++;
        filters[sel](pxData, pxPos, byteWidth, rawData, rawPos, bpp);
        rawPos += byteWidth;
        pxPos += byteWidth;
      }
      return rawData;
    };
  }
});

// node_modules/pngjs/lib/packer.js
var require_packer = __commonJS({
  "node_modules/pngjs/lib/packer.js"(exports, module) {
    "use strict";
    var constants = require_constants();
    var CrcStream = require_crc();
    var bitPacker = require_bitpacker();
    var filter = require_filter_pack();
    var zlib = __require("zlib");
    var Packer = module.exports = function(options) {
      this._options = options;
      options.deflateChunkSize = options.deflateChunkSize || 32 * 1024;
      options.deflateLevel = options.deflateLevel != null ? options.deflateLevel : 9;
      options.deflateStrategy = options.deflateStrategy != null ? options.deflateStrategy : 3;
      options.inputHasAlpha = options.inputHasAlpha != null ? options.inputHasAlpha : true;
      options.deflateFactory = options.deflateFactory || zlib.createDeflate;
      options.bitDepth = options.bitDepth || 8;
      options.colorType = typeof options.colorType === "number" ? options.colorType : constants.COLORTYPE_COLOR_ALPHA;
      options.inputColorType = typeof options.inputColorType === "number" ? options.inputColorType : constants.COLORTYPE_COLOR_ALPHA;
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.colorType) === -1) {
        throw new Error(
          "option color type:" + options.colorType + " is not supported at present"
        );
      }
      if ([
        constants.COLORTYPE_GRAYSCALE,
        constants.COLORTYPE_COLOR,
        constants.COLORTYPE_COLOR_ALPHA,
        constants.COLORTYPE_ALPHA
      ].indexOf(options.inputColorType) === -1) {
        throw new Error(
          "option input color type:" + options.inputColorType + " is not supported at present"
        );
      }
      if (options.bitDepth !== 8 && options.bitDepth !== 16) {
        throw new Error(
          "option bit depth:" + options.bitDepth + " is not supported at present"
        );
      }
    };
    Packer.prototype.getDeflateOptions = function() {
      return {
        chunkSize: this._options.deflateChunkSize,
        level: this._options.deflateLevel,
        strategy: this._options.deflateStrategy
      };
    };
    Packer.prototype.createDeflate = function() {
      return this._options.deflateFactory(this.getDeflateOptions());
    };
    Packer.prototype.filterData = function(data, width, height) {
      let packedData = bitPacker(data, width, height, this._options);
      let bpp = constants.COLORTYPE_TO_BPP_MAP[this._options.colorType];
      let filteredData = filter(packedData, width, height, this._options, bpp);
      return filteredData;
    };
    Packer.prototype._packChunk = function(type, data) {
      let len = data ? data.length : 0;
      let buf = Buffer.alloc(len + 12);
      buf.writeUInt32BE(len, 0);
      buf.writeUInt32BE(type, 4);
      if (data) {
        data.copy(buf, 8);
      }
      buf.writeInt32BE(
        CrcStream.crc32(buf.slice(4, buf.length - 4)),
        buf.length - 4
      );
      return buf;
    };
    Packer.prototype.packGAMA = function(gamma) {
      let buf = Buffer.alloc(4);
      buf.writeUInt32BE(Math.floor(gamma * constants.GAMMA_DIVISION), 0);
      return this._packChunk(constants.TYPE_gAMA, buf);
    };
    Packer.prototype.packIHDR = function(width, height) {
      let buf = Buffer.alloc(13);
      buf.writeUInt32BE(width, 0);
      buf.writeUInt32BE(height, 4);
      buf[8] = this._options.bitDepth;
      buf[9] = this._options.colorType;
      buf[10] = 0;
      buf[11] = 0;
      buf[12] = 0;
      return this._packChunk(constants.TYPE_IHDR, buf);
    };
    Packer.prototype.packIDAT = function(data) {
      return this._packChunk(constants.TYPE_IDAT, data);
    };
    Packer.prototype.packIEND = function() {
      return this._packChunk(constants.TYPE_IEND, null);
    };
  }
});

// node_modules/pngjs/lib/packer-async.js
var require_packer_async = __commonJS({
  "node_modules/pngjs/lib/packer-async.js"(exports, module) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var constants = require_constants();
    var Packer = require_packer();
    var PackerAsync = module.exports = function(opt) {
      Stream.call(this);
      let options = opt || {};
      this._packer = new Packer(options);
      this._deflate = this._packer.createDeflate();
      this.readable = true;
    };
    util.inherits(PackerAsync, Stream);
    PackerAsync.prototype.pack = function(data, width, height, gamma) {
      this.emit("data", Buffer.from(constants.PNG_SIGNATURE));
      this.emit("data", this._packer.packIHDR(width, height));
      if (gamma) {
        this.emit("data", this._packer.packGAMA(gamma));
      }
      let filteredData = this._packer.filterData(data, width, height);
      this._deflate.on("error", this.emit.bind(this, "error"));
      this._deflate.on(
        "data",
        function(compressedData) {
          this.emit("data", this._packer.packIDAT(compressedData));
        }.bind(this)
      );
      this._deflate.on(
        "end",
        function() {
          this.emit("data", this._packer.packIEND());
          this.emit("end");
        }.bind(this)
      );
      this._deflate.end(filteredData);
    };
  }
});

// node_modules/pngjs/lib/sync-inflate.js
var require_sync_inflate = __commonJS({
  "node_modules/pngjs/lib/sync-inflate.js"(exports, module) {
    "use strict";
    var assert = __require("assert").ok;
    var zlib = __require("zlib");
    var util = __require("util");
    var kMaxLength = __require("buffer").kMaxLength;
    function Inflate(opts) {
      if (!(this instanceof Inflate)) {
        return new Inflate(opts);
      }
      if (opts && opts.chunkSize < zlib.Z_MIN_CHUNK) {
        opts.chunkSize = zlib.Z_MIN_CHUNK;
      }
      zlib.Inflate.call(this, opts);
      this._offset = this._offset === void 0 ? this._outOffset : this._offset;
      this._buffer = this._buffer || this._outBuffer;
      if (opts && opts.maxLength != null) {
        this._maxLength = opts.maxLength;
      }
    }
    function createInflate(opts) {
      return new Inflate(opts);
    }
    function _close(engine, callback) {
      if (callback) {
        process.nextTick(callback);
      }
      if (!engine._handle) {
        return;
      }
      engine._handle.close();
      engine._handle = null;
    }
    Inflate.prototype._processChunk = function(chunk, flushFlag, asyncCb) {
      if (typeof asyncCb === "function") {
        return zlib.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
      }
      let self = this;
      let availInBefore = chunk && chunk.length;
      let availOutBefore = this._chunkSize - this._offset;
      let leftToInflate = this._maxLength;
      let inOff = 0;
      let buffers = [];
      let nread = 0;
      let error;
      this.on("error", function(err) {
        error = err;
      });
      function handleChunk(availInAfter, availOutAfter) {
        if (self._hadError) {
          return;
        }
        let have = availOutBefore - availOutAfter;
        assert(have >= 0, "have should not go down");
        if (have > 0) {
          let out = self._buffer.slice(self._offset, self._offset + have);
          self._offset += have;
          if (out.length > leftToInflate) {
            out = out.slice(0, leftToInflate);
          }
          buffers.push(out);
          nread += out.length;
          leftToInflate -= out.length;
          if (leftToInflate === 0) {
            return false;
          }
        }
        if (availOutAfter === 0 || self._offset >= self._chunkSize) {
          availOutBefore = self._chunkSize;
          self._offset = 0;
          self._buffer = Buffer.allocUnsafe(self._chunkSize);
        }
        if (availOutAfter === 0) {
          inOff += availInBefore - availInAfter;
          availInBefore = availInAfter;
          return true;
        }
        return false;
      }
      assert(this._handle, "zlib binding closed");
      let res;
      do {
        res = this._handle.writeSync(
          flushFlag,
          chunk,
          // in
          inOff,
          // in_off
          availInBefore,
          // in_len
          this._buffer,
          // out
          this._offset,
          //out_off
          availOutBefore
        );
        res = res || this._writeState;
      } while (!this._hadError && handleChunk(res[0], res[1]));
      if (this._hadError) {
        throw error;
      }
      if (nread >= kMaxLength) {
        _close(this);
        throw new RangeError(
          "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes"
        );
      }
      let buf = Buffer.concat(buffers, nread);
      _close(this);
      return buf;
    };
    util.inherits(Inflate, zlib.Inflate);
    function zlibBufferSync(engine, buffer) {
      if (typeof buffer === "string") {
        buffer = Buffer.from(buffer);
      }
      if (!(buffer instanceof Buffer)) {
        throw new TypeError("Not a string or buffer");
      }
      let flushFlag = engine._finishFlushFlag;
      if (flushFlag == null) {
        flushFlag = zlib.Z_FINISH;
      }
      return engine._processChunk(buffer, flushFlag);
    }
    function inflateSync(buffer, opts) {
      return zlibBufferSync(new Inflate(opts), buffer);
    }
    module.exports = exports = inflateSync;
    exports.Inflate = Inflate;
    exports.createInflate = createInflate;
    exports.inflateSync = inflateSync;
  }
});

// node_modules/pngjs/lib/sync-reader.js
var require_sync_reader = __commonJS({
  "node_modules/pngjs/lib/sync-reader.js"(exports, module) {
    "use strict";
    var SyncReader = module.exports = function(buffer) {
      this._buffer = buffer;
      this._reads = [];
    };
    SyncReader.prototype.read = function(length, callback) {
      this._reads.push({
        length: Math.abs(length),
        // if length < 0 then at most this length
        allowLess: length < 0,
        func: callback
      });
    };
    SyncReader.prototype.process = function() {
      while (this._reads.length > 0 && this._buffer.length) {
        let read = this._reads[0];
        if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
          this._reads.shift();
          let buf = this._buffer;
          this._buffer = buf.slice(read.length);
          read.func.call(this, buf.slice(0, read.length));
        } else {
          break;
        }
      }
      if (this._reads.length > 0) {
        throw new Error("There are some read requests waitng on finished stream");
      }
      if (this._buffer.length > 0) {
        throw new Error("unrecognised content at end of stream");
      }
    };
  }
});

// node_modules/pngjs/lib/filter-parse-sync.js
var require_filter_parse_sync = __commonJS({
  "node_modules/pngjs/lib/filter-parse-sync.js"(exports) {
    "use strict";
    var SyncReader = require_sync_reader();
    var Filter = require_filter_parse();
    exports.process = function(inBuffer, bitmapInfo) {
      let outBuffers = [];
      let reader = new SyncReader(inBuffer);
      let filter = new Filter(bitmapInfo, {
        read: reader.read.bind(reader),
        write: function(bufferPart) {
          outBuffers.push(bufferPart);
        },
        complete: function() {
        }
      });
      filter.start();
      reader.process();
      return Buffer.concat(outBuffers);
    };
  }
});

// node_modules/pngjs/lib/parser-sync.js
var require_parser_sync = __commonJS({
  "node_modules/pngjs/lib/parser-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    var inflateSync = require_sync_inflate();
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var SyncReader = require_sync_reader();
    var FilterSync = require_filter_parse_sync();
    var Parser = require_parser();
    var bitmapper = require_bitmapper();
    var formatNormaliser = require_format_normaliser();
    module.exports = function(buffer, options) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let err;
      function handleError(_err_) {
        err = _err_;
      }
      let metaData;
      function handleMetaData(_metaData_) {
        metaData = _metaData_;
      }
      function handleTransColor(transColor) {
        metaData.transColor = transColor;
      }
      function handlePalette(palette) {
        metaData.palette = palette;
      }
      function handleSimpleTransparency() {
        metaData.alpha = true;
      }
      let gamma;
      function handleGamma(_gamma_) {
        gamma = _gamma_;
      }
      let inflateDataList = [];
      function handleInflateData(inflatedData2) {
        inflateDataList.push(inflatedData2);
      }
      let reader = new SyncReader(buffer);
      let parser = new Parser(options, {
        read: reader.read.bind(reader),
        error: handleError,
        metadata: handleMetaData,
        gamma: handleGamma,
        palette: handlePalette,
        transColor: handleTransColor,
        inflateData: handleInflateData,
        simpleTransparency: handleSimpleTransparency
      });
      parser.start();
      reader.process();
      if (err) {
        throw err;
      }
      let inflateData = Buffer.concat(inflateDataList);
      inflateDataList.length = 0;
      let inflatedData;
      if (metaData.interlace) {
        inflatedData = zlib.inflateSync(inflateData);
      } else {
        let rowSize = (metaData.width * metaData.bpp * metaData.depth + 7 >> 3) + 1;
        let imageSize = rowSize * metaData.height;
        inflatedData = inflateSync(inflateData, {
          chunkSize: imageSize,
          maxLength: imageSize
        });
      }
      inflateData = null;
      if (!inflatedData || !inflatedData.length) {
        throw new Error("bad png - invalid inflate data response");
      }
      let unfilteredData = FilterSync.process(inflatedData, metaData);
      inflateData = null;
      let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
      unfilteredData = null;
      let normalisedBitmapData = formatNormaliser(
        bitmapData,
        metaData,
        options.skipRescale
      );
      metaData.data = normalisedBitmapData;
      metaData.gamma = gamma || 0;
      return metaData;
    };
  }
});

// node_modules/pngjs/lib/packer-sync.js
var require_packer_sync = __commonJS({
  "node_modules/pngjs/lib/packer-sync.js"(exports, module) {
    "use strict";
    var hasSyncZlib = true;
    var zlib = __require("zlib");
    if (!zlib.deflateSync) {
      hasSyncZlib = false;
    }
    var constants = require_constants();
    var Packer = require_packer();
    module.exports = function(metaData, opt) {
      if (!hasSyncZlib) {
        throw new Error(
          "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0"
        );
      }
      let options = opt || {};
      let packer = new Packer(options);
      let chunks = [];
      chunks.push(Buffer.from(constants.PNG_SIGNATURE));
      chunks.push(packer.packIHDR(metaData.width, metaData.height));
      if (metaData.gamma) {
        chunks.push(packer.packGAMA(metaData.gamma));
      }
      let filteredData = packer.filterData(
        metaData.data,
        metaData.width,
        metaData.height
      );
      let compressedData = zlib.deflateSync(
        filteredData,
        packer.getDeflateOptions()
      );
      filteredData = null;
      if (!compressedData || !compressedData.length) {
        throw new Error("bad png - invalid compressed data response");
      }
      chunks.push(packer.packIDAT(compressedData));
      chunks.push(packer.packIEND());
      return Buffer.concat(chunks);
    };
  }
});

// node_modules/pngjs/lib/png-sync.js
var require_png_sync = __commonJS({
  "node_modules/pngjs/lib/png-sync.js"(exports) {
    "use strict";
    var parse = require_parser_sync();
    var pack = require_packer_sync();
    exports.read = function(buffer, options) {
      return parse(buffer, options || {});
    };
    exports.write = function(png, options) {
      return pack(png, options);
    };
  }
});

// node_modules/pngjs/lib/png.js
var require_png = __commonJS({
  "node_modules/pngjs/lib/png.js"(exports) {
    "use strict";
    var util = __require("util");
    var Stream = __require("stream");
    var Parser = require_parser_async();
    var Packer = require_packer_async();
    var PNGSync = require_png_sync();
    var PNG2 = exports.PNG = function(options) {
      Stream.call(this);
      options = options || {};
      this.width = options.width | 0;
      this.height = options.height | 0;
      this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
      if (options.fill && this.data) {
        this.data.fill(0);
      }
      this.gamma = 0;
      this.readable = this.writable = true;
      this._parser = new Parser(options);
      this._parser.on("error", this.emit.bind(this, "error"));
      this._parser.on("close", this._handleClose.bind(this));
      this._parser.on("metadata", this._metadata.bind(this));
      this._parser.on("gamma", this._gamma.bind(this));
      this._parser.on(
        "parsed",
        function(data) {
          this.data = data;
          this.emit("parsed", data);
        }.bind(this)
      );
      this._packer = new Packer(options);
      this._packer.on("data", this.emit.bind(this, "data"));
      this._packer.on("end", this.emit.bind(this, "end"));
      this._parser.on("close", this._handleClose.bind(this));
      this._packer.on("error", this.emit.bind(this, "error"));
    };
    util.inherits(PNG2, Stream);
    PNG2.sync = PNGSync;
    PNG2.prototype.pack = function() {
      if (!this.data || !this.data.length) {
        this.emit("error", "No data provided");
        return this;
      }
      process.nextTick(
        function() {
          this._packer.pack(this.data, this.width, this.height, this.gamma);
        }.bind(this)
      );
      return this;
    };
    PNG2.prototype.parse = function(data, callback) {
      if (callback) {
        let onParsed, onError;
        onParsed = function(parsedData) {
          this.removeListener("error", onError);
          this.data = parsedData;
          callback(null, this);
        }.bind(this);
        onError = function(err) {
          this.removeListener("parsed", onParsed);
          callback(err, null);
        }.bind(this);
        this.once("parsed", onParsed);
        this.once("error", onError);
      }
      this.end(data);
      return this;
    };
    PNG2.prototype.write = function(data) {
      this._parser.write(data);
      return true;
    };
    PNG2.prototype.end = function(data) {
      this._parser.end(data);
    };
    PNG2.prototype._metadata = function(metadata) {
      this.width = metadata.width;
      this.height = metadata.height;
      this.emit("metadata", metadata);
    };
    PNG2.prototype._gamma = function(gamma) {
      this.gamma = gamma;
    };
    PNG2.prototype._handleClose = function() {
      if (!this._parser.writable && !this._packer.readable) {
        this.emit("close");
      }
    };
    PNG2.bitblt = function(src, dst, srcX, srcY, width, height, deltaX, deltaY) {
      srcX |= 0;
      srcY |= 0;
      width |= 0;
      height |= 0;
      deltaX |= 0;
      deltaY |= 0;
      if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height) {
        throw new Error("bitblt reading outside image");
      }
      if (deltaX > dst.width || deltaY > dst.height || deltaX + width > dst.width || deltaY + height > dst.height) {
        throw new Error("bitblt writing outside image");
      }
      for (let y = 0; y < height; y++) {
        src.data.copy(
          dst.data,
          (deltaY + y) * dst.width + deltaX << 2,
          (srcY + y) * src.width + srcX << 2,
          (srcY + y) * src.width + srcX + width << 2
        );
      }
    };
    PNG2.prototype.bitblt = function(dst, srcX, srcY, width, height, deltaX, deltaY) {
      PNG2.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
      return this;
    };
    PNG2.adjustGamma = function(src) {
      if (src.gamma) {
        for (let y = 0; y < src.height; y++) {
          for (let x = 0; x < src.width; x++) {
            let idx = src.width * y + x << 2;
            for (let i = 0; i < 3; i++) {
              let sample = src.data[idx + i] / 255;
              sample = Math.pow(sample, 1 / 2.2 / src.gamma);
              src.data[idx + i] = Math.round(sample * 255);
            }
          }
        }
        src.gamma = 0;
      }
    };
    PNG2.prototype.adjustGamma = function() {
      PNG2.adjustGamma(this);
    };
  }
});

// node_modules/jpeg-js/lib/encoder.js
var require_encoder = __commonJS({
  "node_modules/jpeg-js/lib/encoder.js"(exports, module) {
    var btoa = btoa || function(buf) {
      return Buffer.from(buf).toString("base64");
    };
    function JPEGEncoder(quality) {
      var self = this;
      var fround = Math.round;
      var ffloor = Math.floor;
      var YTable = new Array(64);
      var UVTable = new Array(64);
      var fdtbl_Y = new Array(64);
      var fdtbl_UV = new Array(64);
      var YDC_HT;
      var UVDC_HT;
      var YAC_HT;
      var UVAC_HT;
      var bitcode = new Array(65535);
      var category = new Array(65535);
      var outputfDCTQuant = new Array(64);
      var DU = new Array(64);
      var byteout = [];
      var bytenew = 0;
      var bytepos = 7;
      var YDU = new Array(64);
      var UDU = new Array(64);
      var VDU = new Array(64);
      var clt = new Array(256);
      var RGB_YUV_TABLE = new Array(2048);
      var currentQuality;
      var ZigZag = [
        0,
        1,
        5,
        6,
        14,
        15,
        27,
        28,
        2,
        4,
        7,
        13,
        16,
        26,
        29,
        42,
        3,
        8,
        12,
        17,
        25,
        30,
        41,
        43,
        9,
        11,
        18,
        24,
        31,
        40,
        44,
        53,
        10,
        19,
        23,
        32,
        39,
        45,
        52,
        54,
        20,
        22,
        33,
        38,
        46,
        51,
        55,
        60,
        21,
        34,
        37,
        47,
        50,
        56,
        59,
        61,
        35,
        36,
        48,
        49,
        57,
        58,
        62,
        63
      ];
      var std_dc_luminance_nrcodes = [0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
      var std_dc_luminance_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      var std_ac_luminance_nrcodes = [0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125];
      var std_ac_luminance_values = [
        1,
        2,
        3,
        0,
        4,
        17,
        5,
        18,
        33,
        49,
        65,
        6,
        19,
        81,
        97,
        7,
        34,
        113,
        20,
        50,
        129,
        145,
        161,
        8,
        35,
        66,
        177,
        193,
        21,
        82,
        209,
        240,
        36,
        51,
        98,
        114,
        130,
        9,
        10,
        22,
        23,
        24,
        25,
        26,
        37,
        38,
        39,
        40,
        41,
        42,
        52,
        53,
        54,
        55,
        56,
        57,
        58,
        67,
        68,
        69,
        70,
        71,
        72,
        73,
        74,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        225,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        241,
        242,
        243,
        244,
        245,
        246,
        247,
        248,
        249,
        250
      ];
      var std_dc_chrominance_nrcodes = [0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
      var std_dc_chrominance_values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      var std_ac_chrominance_nrcodes = [0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119];
      var std_ac_chrominance_values = [
        0,
        1,
        2,
        3,
        17,
        4,
        5,
        33,
        49,
        6,
        18,
        65,
        81,
        7,
        97,
        113,
        19,
        34,
        50,
        129,
        8,
        20,
        66,
        145,
        161,
        177,
        193,
        9,
        35,
        51,
        82,
        240,
        21,
        98,
        114,
        209,
        10,
        22,
        36,
        52,
        225,
        37,
        241,
        23,
        24,
        25,
        26,
        38,
        39,
        40,
        41,
        42,
        53,
        54,
        55,
        56,
        57,
        58,
        67,
        68,
        69,
        70,
        71,
        72,
        73,
        74,
        83,
        84,
        85,
        86,
        87,
        88,
        89,
        90,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        115,
        116,
        117,
        118,
        119,
        120,
        121,
        122,
        130,
        131,
        132,
        133,
        134,
        135,
        136,
        137,
        138,
        146,
        147,
        148,
        149,
        150,
        151,
        152,
        153,
        154,
        162,
        163,
        164,
        165,
        166,
        167,
        168,
        169,
        170,
        178,
        179,
        180,
        181,
        182,
        183,
        184,
        185,
        186,
        194,
        195,
        196,
        197,
        198,
        199,
        200,
        201,
        202,
        210,
        211,
        212,
        213,
        214,
        215,
        216,
        217,
        218,
        226,
        227,
        228,
        229,
        230,
        231,
        232,
        233,
        234,
        242,
        243,
        244,
        245,
        246,
        247,
        248,
        249,
        250
      ];
      function initQuantTables(sf) {
        var YQT = [
          16,
          11,
          10,
          16,
          24,
          40,
          51,
          61,
          12,
          12,
          14,
          19,
          26,
          58,
          60,
          55,
          14,
          13,
          16,
          24,
          40,
          57,
          69,
          56,
          14,
          17,
          22,
          29,
          51,
          87,
          80,
          62,
          18,
          22,
          37,
          56,
          68,
          109,
          103,
          77,
          24,
          35,
          55,
          64,
          81,
          104,
          113,
          92,
          49,
          64,
          78,
          87,
          103,
          121,
          120,
          101,
          72,
          92,
          95,
          98,
          112,
          100,
          103,
          99
        ];
        for (var i = 0; i < 64; i++) {
          var t = ffloor((YQT[i] * sf + 50) / 100);
          if (t < 1) {
            t = 1;
          } else if (t > 255) {
            t = 255;
          }
          YTable[ZigZag[i]] = t;
        }
        var UVQT = [
          17,
          18,
          24,
          47,
          99,
          99,
          99,
          99,
          18,
          21,
          26,
          66,
          99,
          99,
          99,
          99,
          24,
          26,
          56,
          99,
          99,
          99,
          99,
          99,
          47,
          66,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99,
          99
        ];
        for (var j = 0; j < 64; j++) {
          var u = ffloor((UVQT[j] * sf + 50) / 100);
          if (u < 1) {
            u = 1;
          } else if (u > 255) {
            u = 255;
          }
          UVTable[ZigZag[j]] = u;
        }
        var aasf = [
          1,
          1.387039845,
          1.306562965,
          1.175875602,
          1,
          0.785694958,
          0.5411961,
          0.275899379
        ];
        var k = 0;
        for (var row = 0; row < 8; row++) {
          for (var col = 0; col < 8; col++) {
            fdtbl_Y[k] = 1 / (YTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            fdtbl_UV[k] = 1 / (UVTable[ZigZag[k]] * aasf[row] * aasf[col] * 8);
            k++;
          }
        }
      }
      function computeHuffmanTbl(nrcodes, std_table) {
        var codevalue = 0;
        var pos_in_table = 0;
        var HT = new Array();
        for (var k = 1; k <= 16; k++) {
          for (var j = 1; j <= nrcodes[k]; j++) {
            HT[std_table[pos_in_table]] = [];
            HT[std_table[pos_in_table]][0] = codevalue;
            HT[std_table[pos_in_table]][1] = k;
            pos_in_table++;
            codevalue++;
          }
          codevalue *= 2;
        }
        return HT;
      }
      function initHuffmanTbl() {
        YDC_HT = computeHuffmanTbl(std_dc_luminance_nrcodes, std_dc_luminance_values);
        UVDC_HT = computeHuffmanTbl(std_dc_chrominance_nrcodes, std_dc_chrominance_values);
        YAC_HT = computeHuffmanTbl(std_ac_luminance_nrcodes, std_ac_luminance_values);
        UVAC_HT = computeHuffmanTbl(std_ac_chrominance_nrcodes, std_ac_chrominance_values);
      }
      function initCategoryNumber() {
        var nrlower = 1;
        var nrupper = 2;
        for (var cat = 1; cat <= 15; cat++) {
          for (var nr = nrlower; nr < nrupper; nr++) {
            category[32767 + nr] = cat;
            bitcode[32767 + nr] = [];
            bitcode[32767 + nr][1] = cat;
            bitcode[32767 + nr][0] = nr;
          }
          for (var nrneg = -(nrupper - 1); nrneg <= -nrlower; nrneg++) {
            category[32767 + nrneg] = cat;
            bitcode[32767 + nrneg] = [];
            bitcode[32767 + nrneg][1] = cat;
            bitcode[32767 + nrneg][0] = nrupper - 1 + nrneg;
          }
          nrlower <<= 1;
          nrupper <<= 1;
        }
      }
      function initRGBYUVTable() {
        for (var i = 0; i < 256; i++) {
          RGB_YUV_TABLE[i] = 19595 * i;
          RGB_YUV_TABLE[i + 256 >> 0] = 38470 * i;
          RGB_YUV_TABLE[i + 512 >> 0] = 7471 * i + 32768;
          RGB_YUV_TABLE[i + 768 >> 0] = -11059 * i;
          RGB_YUV_TABLE[i + 1024 >> 0] = -21709 * i;
          RGB_YUV_TABLE[i + 1280 >> 0] = 32768 * i + 8421375;
          RGB_YUV_TABLE[i + 1536 >> 0] = -27439 * i;
          RGB_YUV_TABLE[i + 1792 >> 0] = -5329 * i;
        }
      }
      function writeBits(bs) {
        var value = bs[0];
        var posval = bs[1] - 1;
        while (posval >= 0) {
          if (value & 1 << posval) {
            bytenew |= 1 << bytepos;
          }
          posval--;
          bytepos--;
          if (bytepos < 0) {
            if (bytenew == 255) {
              writeByte(255);
              writeByte(0);
            } else {
              writeByte(bytenew);
            }
            bytepos = 7;
            bytenew = 0;
          }
        }
      }
      function writeByte(value) {
        byteout.push(value);
      }
      function writeWord(value) {
        writeByte(value >> 8 & 255);
        writeByte(value & 255);
      }
      function fDCTQuant(data, fdtbl) {
        var d0, d1, d2, d3, d4, d5, d6, d7;
        var dataOff = 0;
        var i;
        var I8 = 8;
        var I64 = 64;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 1];
          d2 = data[dataOff + 2];
          d3 = data[dataOff + 3];
          d4 = data[dataOff + 4];
          d5 = data[dataOff + 5];
          d6 = data[dataOff + 6];
          d7 = data[dataOff + 7];
          var tmp0 = d0 + d7;
          var tmp7 = d0 - d7;
          var tmp1 = d1 + d6;
          var tmp6 = d1 - d6;
          var tmp2 = d2 + d5;
          var tmp5 = d2 - d5;
          var tmp3 = d3 + d4;
          var tmp4 = d3 - d4;
          var tmp10 = tmp0 + tmp3;
          var tmp13 = tmp0 - tmp3;
          var tmp11 = tmp1 + tmp2;
          var tmp12 = tmp1 - tmp2;
          data[dataOff] = tmp10 + tmp11;
          data[dataOff + 4] = tmp10 - tmp11;
          var z1 = (tmp12 + tmp13) * 0.707106781;
          data[dataOff + 2] = tmp13 + z1;
          data[dataOff + 6] = tmp13 - z1;
          tmp10 = tmp4 + tmp5;
          tmp11 = tmp5 + tmp6;
          tmp12 = tmp6 + tmp7;
          var z5 = (tmp10 - tmp12) * 0.382683433;
          var z2 = 0.5411961 * tmp10 + z5;
          var z4 = 1.306562965 * tmp12 + z5;
          var z3 = tmp11 * 0.707106781;
          var z11 = tmp7 + z3;
          var z13 = tmp7 - z3;
          data[dataOff + 5] = z13 + z2;
          data[dataOff + 3] = z13 - z2;
          data[dataOff + 1] = z11 + z4;
          data[dataOff + 7] = z11 - z4;
          dataOff += 8;
        }
        dataOff = 0;
        for (i = 0; i < I8; ++i) {
          d0 = data[dataOff];
          d1 = data[dataOff + 8];
          d2 = data[dataOff + 16];
          d3 = data[dataOff + 24];
          d4 = data[dataOff + 32];
          d5 = data[dataOff + 40];
          d6 = data[dataOff + 48];
          d7 = data[dataOff + 56];
          var tmp0p2 = d0 + d7;
          var tmp7p2 = d0 - d7;
          var tmp1p2 = d1 + d6;
          var tmp6p2 = d1 - d6;
          var tmp2p2 = d2 + d5;
          var tmp5p2 = d2 - d5;
          var tmp3p2 = d3 + d4;
          var tmp4p2 = d3 - d4;
          var tmp10p2 = tmp0p2 + tmp3p2;
          var tmp13p2 = tmp0p2 - tmp3p2;
          var tmp11p2 = tmp1p2 + tmp2p2;
          var tmp12p2 = tmp1p2 - tmp2p2;
          data[dataOff] = tmp10p2 + tmp11p2;
          data[dataOff + 32] = tmp10p2 - tmp11p2;
          var z1p2 = (tmp12p2 + tmp13p2) * 0.707106781;
          data[dataOff + 16] = tmp13p2 + z1p2;
          data[dataOff + 48] = tmp13p2 - z1p2;
          tmp10p2 = tmp4p2 + tmp5p2;
          tmp11p2 = tmp5p2 + tmp6p2;
          tmp12p2 = tmp6p2 + tmp7p2;
          var z5p2 = (tmp10p2 - tmp12p2) * 0.382683433;
          var z2p2 = 0.5411961 * tmp10p2 + z5p2;
          var z4p2 = 1.306562965 * tmp12p2 + z5p2;
          var z3p2 = tmp11p2 * 0.707106781;
          var z11p2 = tmp7p2 + z3p2;
          var z13p2 = tmp7p2 - z3p2;
          data[dataOff + 40] = z13p2 + z2p2;
          data[dataOff + 24] = z13p2 - z2p2;
          data[dataOff + 8] = z11p2 + z4p2;
          data[dataOff + 56] = z11p2 - z4p2;
          dataOff++;
        }
        var fDCTQuant2;
        for (i = 0; i < I64; ++i) {
          fDCTQuant2 = data[i] * fdtbl[i];
          outputfDCTQuant[i] = fDCTQuant2 > 0 ? fDCTQuant2 + 0.5 | 0 : fDCTQuant2 - 0.5 | 0;
        }
        return outputfDCTQuant;
      }
      function writeAPP0() {
        writeWord(65504);
        writeWord(16);
        writeByte(74);
        writeByte(70);
        writeByte(73);
        writeByte(70);
        writeByte(0);
        writeByte(1);
        writeByte(1);
        writeByte(0);
        writeWord(1);
        writeWord(1);
        writeByte(0);
        writeByte(0);
      }
      function writeAPP1(exifBuffer) {
        if (!exifBuffer) return;
        writeWord(65505);
        if (exifBuffer[0] === 69 && exifBuffer[1] === 120 && exifBuffer[2] === 105 && exifBuffer[3] === 102) {
          writeWord(exifBuffer.length + 2);
        } else {
          writeWord(exifBuffer.length + 5 + 2);
          writeByte(69);
          writeByte(120);
          writeByte(105);
          writeByte(102);
          writeByte(0);
        }
        for (var i = 0; i < exifBuffer.length; i++) {
          writeByte(exifBuffer[i]);
        }
      }
      function writeSOF0(width, height) {
        writeWord(65472);
        writeWord(17);
        writeByte(8);
        writeWord(height);
        writeWord(width);
        writeByte(3);
        writeByte(1);
        writeByte(17);
        writeByte(0);
        writeByte(2);
        writeByte(17);
        writeByte(1);
        writeByte(3);
        writeByte(17);
        writeByte(1);
      }
      function writeDQT() {
        writeWord(65499);
        writeWord(132);
        writeByte(0);
        for (var i = 0; i < 64; i++) {
          writeByte(YTable[i]);
        }
        writeByte(1);
        for (var j = 0; j < 64; j++) {
          writeByte(UVTable[j]);
        }
      }
      function writeDHT() {
        writeWord(65476);
        writeWord(418);
        writeByte(0);
        for (var i = 0; i < 16; i++) {
          writeByte(std_dc_luminance_nrcodes[i + 1]);
        }
        for (var j = 0; j <= 11; j++) {
          writeByte(std_dc_luminance_values[j]);
        }
        writeByte(16);
        for (var k = 0; k < 16; k++) {
          writeByte(std_ac_luminance_nrcodes[k + 1]);
        }
        for (var l = 0; l <= 161; l++) {
          writeByte(std_ac_luminance_values[l]);
        }
        writeByte(1);
        for (var m = 0; m < 16; m++) {
          writeByte(std_dc_chrominance_nrcodes[m + 1]);
        }
        for (var n = 0; n <= 11; n++) {
          writeByte(std_dc_chrominance_values[n]);
        }
        writeByte(17);
        for (var o = 0; o < 16; o++) {
          writeByte(std_ac_chrominance_nrcodes[o + 1]);
        }
        for (var p = 0; p <= 161; p++) {
          writeByte(std_ac_chrominance_values[p]);
        }
      }
      function writeCOM(comments) {
        if (typeof comments === "undefined" || comments.constructor !== Array) return;
        comments.forEach((e) => {
          if (typeof e !== "string") return;
          writeWord(65534);
          var l = e.length;
          writeWord(l + 2);
          var i;
          for (i = 0; i < l; i++)
            writeByte(e.charCodeAt(i));
        });
      }
      function writeSOS() {
        writeWord(65498);
        writeWord(12);
        writeByte(3);
        writeByte(1);
        writeByte(0);
        writeByte(2);
        writeByte(17);
        writeByte(3);
        writeByte(17);
        writeByte(0);
        writeByte(63);
        writeByte(0);
      }
      function processDU(CDU, fdtbl, DC, HTDC, HTAC) {
        var EOB = HTAC[0];
        var M16zeroes = HTAC[240];
        var pos;
        var I16 = 16;
        var I63 = 63;
        var I64 = 64;
        var DU_DCT = fDCTQuant(CDU, fdtbl);
        for (var j = 0; j < I64; ++j) {
          DU[ZigZag[j]] = DU_DCT[j];
        }
        var Diff = DU[0] - DC;
        DC = DU[0];
        if (Diff == 0) {
          writeBits(HTDC[0]);
        } else {
          pos = 32767 + Diff;
          writeBits(HTDC[category[pos]]);
          writeBits(bitcode[pos]);
        }
        var end0pos = 63;
        for (; end0pos > 0 && DU[end0pos] == 0; end0pos--) {
        }
        ;
        if (end0pos == 0) {
          writeBits(EOB);
          return DC;
        }
        var i = 1;
        var lng;
        while (i <= end0pos) {
          var startpos = i;
          for (; DU[i] == 0 && i <= end0pos; ++i) {
          }
          var nrzeroes = i - startpos;
          if (nrzeroes >= I16) {
            lng = nrzeroes >> 4;
            for (var nrmarker = 1; nrmarker <= lng; ++nrmarker)
              writeBits(M16zeroes);
            nrzeroes = nrzeroes & 15;
          }
          pos = 32767 + DU[i];
          writeBits(HTAC[(nrzeroes << 4) + category[pos]]);
          writeBits(bitcode[pos]);
          i++;
        }
        if (end0pos != I63) {
          writeBits(EOB);
        }
        return DC;
      }
      function initCharLookupTable() {
        var sfcc = String.fromCharCode;
        for (var i = 0; i < 256; i++) {
          clt[i] = sfcc(i);
        }
      }
      this.encode = function(image, quality2) {
        var time_start = (/* @__PURE__ */ new Date()).getTime();
        if (quality2) setQuality(quality2);
        byteout = new Array();
        bytenew = 0;
        bytepos = 7;
        writeWord(65496);
        writeAPP0();
        writeCOM(image.comments);
        writeAPP1(image.exifBuffer);
        writeDQT();
        writeSOF0(image.width, image.height);
        writeDHT();
        writeSOS();
        var DCY = 0;
        var DCU = 0;
        var DCV = 0;
        bytenew = 0;
        bytepos = 7;
        this.encode.displayName = "_encode_";
        var imageData = image.data;
        var width = image.width;
        var height = image.height;
        var quadWidth = width * 4;
        var tripleWidth = width * 3;
        var x, y = 0;
        var r, g, b;
        var start, p, col, row, pos;
        while (y < height) {
          x = 0;
          while (x < quadWidth) {
            start = quadWidth * y + x;
            p = start;
            col = -1;
            row = 0;
            for (pos = 0; pos < 64; pos++) {
              row = pos >> 3;
              col = (pos & 7) * 4;
              p = start + row * quadWidth + col;
              if (y + row >= height) {
                p -= quadWidth * (y + 1 + row - height);
              }
              if (x + col >= quadWidth) {
                p -= x + col - quadWidth + 4;
              }
              r = imageData[p++];
              g = imageData[p++];
              b = imageData[p++];
              YDU[pos] = (RGB_YUV_TABLE[r] + RGB_YUV_TABLE[g + 256 >> 0] + RGB_YUV_TABLE[b + 512 >> 0] >> 16) - 128;
              UDU[pos] = (RGB_YUV_TABLE[r + 768 >> 0] + RGB_YUV_TABLE[g + 1024 >> 0] + RGB_YUV_TABLE[b + 1280 >> 0] >> 16) - 128;
              VDU[pos] = (RGB_YUV_TABLE[r + 1280 >> 0] + RGB_YUV_TABLE[g + 1536 >> 0] + RGB_YUV_TABLE[b + 1792 >> 0] >> 16) - 128;
            }
            DCY = processDU(YDU, fdtbl_Y, DCY, YDC_HT, YAC_HT);
            DCU = processDU(UDU, fdtbl_UV, DCU, UVDC_HT, UVAC_HT);
            DCV = processDU(VDU, fdtbl_UV, DCV, UVDC_HT, UVAC_HT);
            x += 32;
          }
          y += 8;
        }
        if (bytepos >= 0) {
          var fillbits = [];
          fillbits[1] = bytepos + 1;
          fillbits[0] = (1 << bytepos + 1) - 1;
          writeBits(fillbits);
        }
        writeWord(65497);
        if (typeof module === "undefined") return new Uint8Array(byteout);
        return Buffer.from(byteout);
        var jpegDataUri = "data:image/jpeg;base64," + btoa(byteout.join(""));
        byteout = [];
        var duration = (/* @__PURE__ */ new Date()).getTime() - time_start;
        return jpegDataUri;
      };
      function setQuality(quality2) {
        if (quality2 <= 0) {
          quality2 = 1;
        }
        if (quality2 > 100) {
          quality2 = 100;
        }
        if (currentQuality == quality2) return;
        var sf = 0;
        if (quality2 < 50) {
          sf = Math.floor(5e3 / quality2);
        } else {
          sf = Math.floor(200 - quality2 * 2);
        }
        initQuantTables(sf);
        currentQuality = quality2;
      }
      function init() {
        var time_start = (/* @__PURE__ */ new Date()).getTime();
        if (!quality) quality = 50;
        initCharLookupTable();
        initHuffmanTbl();
        initCategoryNumber();
        initRGBYUVTable();
        setQuality(quality);
        var duration = (/* @__PURE__ */ new Date()).getTime() - time_start;
      }
      init();
    }
    if (typeof module !== "undefined") {
      module.exports = encode;
    } else if (typeof window !== "undefined") {
      window["jpeg-js"] = window["jpeg-js"] || {};
      window["jpeg-js"].encode = encode;
    }
    function encode(imgData, qu) {
      if (typeof qu === "undefined") qu = 50;
      var encoder = new JPEGEncoder(qu);
      var data = encoder.encode(imgData, qu);
      return {
        data,
        width: imgData.width,
        height: imgData.height
      };
    }
  }
});

// node_modules/jpeg-js/lib/decoder.js
var require_decoder = __commonJS({
  "node_modules/jpeg-js/lib/decoder.js"(exports, module) {
    var JpegImage = (function jpegImage() {
      "use strict";
      var dctZigZag = new Int32Array([
        0,
        1,
        8,
        16,
        9,
        2,
        3,
        10,
        17,
        24,
        32,
        25,
        18,
        11,
        4,
        5,
        12,
        19,
        26,
        33,
        40,
        48,
        41,
        34,
        27,
        20,
        13,
        6,
        7,
        14,
        21,
        28,
        35,
        42,
        49,
        56,
        57,
        50,
        43,
        36,
        29,
        22,
        15,
        23,
        30,
        37,
        44,
        51,
        58,
        59,
        52,
        45,
        38,
        31,
        39,
        46,
        53,
        60,
        61,
        54,
        47,
        55,
        62,
        63
      ]);
      var dctCos1 = 4017;
      var dctSin1 = 799;
      var dctCos3 = 3406;
      var dctSin3 = 2276;
      var dctCos6 = 1567;
      var dctSin6 = 3784;
      var dctSqrt2 = 5793;
      var dctSqrt1d2 = 2896;
      function constructor() {
      }
      function buildHuffmanTable(codeLengths, values) {
        var k = 0, code = [], i, j, length = 16;
        while (length > 0 && !codeLengths[length - 1])
          length--;
        code.push({ children: [], index: 0 });
        var p = code[0], q;
        for (i = 0; i < length; i++) {
          for (j = 0; j < codeLengths[i]; j++) {
            p = code.pop();
            p.children[p.index] = values[k];
            while (p.index > 0) {
              if (code.length === 0)
                throw new Error("Could not recreate Huffman Table");
              p = code.pop();
            }
            p.index++;
            code.push(p);
            while (code.length <= i) {
              code.push(q = { children: [], index: 0 });
              p.children[p.index] = q.children;
              p = q;
            }
            k++;
          }
          if (i + 1 < length) {
            code.push(q = { children: [], index: 0 });
            p.children[p.index] = q.children;
            p = q;
          }
        }
        return code[0].children;
      }
      function decodeScan(data, offset, frame, components, resetInterval, spectralStart, spectralEnd, successivePrev, successive, opts) {
        var precision = frame.precision;
        var samplesPerLine = frame.samplesPerLine;
        var scanLines = frame.scanLines;
        var mcusPerLine = frame.mcusPerLine;
        var progressive = frame.progressive;
        var maxH = frame.maxH, maxV = frame.maxV;
        var startOffset = offset, bitsData = 0, bitsCount = 0;
        function readBit() {
          if (bitsCount > 0) {
            bitsCount--;
            return bitsData >> bitsCount & 1;
          }
          bitsData = data[offset++];
          if (bitsData == 255) {
            var nextByte = data[offset++];
            if (nextByte) {
              throw new Error("unexpected marker: " + (bitsData << 8 | nextByte).toString(16));
            }
          }
          bitsCount = 7;
          return bitsData >>> 7;
        }
        function decodeHuffman(tree) {
          var node = tree, bit;
          while ((bit = readBit()) !== null) {
            node = node[bit];
            if (typeof node === "number")
              return node;
            if (typeof node !== "object")
              throw new Error("invalid huffman sequence");
          }
          return null;
        }
        function receive(length) {
          var n2 = 0;
          while (length > 0) {
            var bit = readBit();
            if (bit === null) return;
            n2 = n2 << 1 | bit;
            length--;
          }
          return n2;
        }
        function receiveAndExtend(length) {
          var n2 = receive(length);
          if (n2 >= 1 << length - 1)
            return n2;
          return n2 + (-1 << length) + 1;
        }
        function decodeBaseline(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t);
          zz[0] = component2.pred += diff;
          var k2 = 1;
          while (k2 < 64) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15)
                break;
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s);
            k2++;
          }
        }
        function decodeDCFirst(component2, zz) {
          var t = decodeHuffman(component2.huffmanTableDC);
          var diff = t === 0 ? 0 : receiveAndExtend(t) << successive;
          zz[0] = component2.pred += diff;
        }
        function decodeDCSuccessive(component2, zz) {
          zz[0] |= readBit() << successive;
        }
        var eobrun = 0;
        function decodeACFirst(component2, zz) {
          if (eobrun > 0) {
            eobrun--;
            return;
          }
          var k2 = spectralStart, e = spectralEnd;
          while (k2 <= e) {
            var rs = decodeHuffman(component2.huffmanTableAC);
            var s = rs & 15, r = rs >> 4;
            if (s === 0) {
              if (r < 15) {
                eobrun = receive(r) + (1 << r) - 1;
                break;
              }
              k2 += 16;
              continue;
            }
            k2 += r;
            var z = dctZigZag[k2];
            zz[z] = receiveAndExtend(s) * (1 << successive);
            k2++;
          }
        }
        var successiveACState = 0, successiveACNextValue;
        function decodeACSuccessive(component2, zz) {
          var k2 = spectralStart, e = spectralEnd, r = 0;
          while (k2 <= e) {
            var z = dctZigZag[k2];
            var direction = zz[z] < 0 ? -1 : 1;
            switch (successiveACState) {
              case 0:
                var rs = decodeHuffman(component2.huffmanTableAC);
                var s = rs & 15, r = rs >> 4;
                if (s === 0) {
                  if (r < 15) {
                    eobrun = receive(r) + (1 << r);
                    successiveACState = 4;
                  } else {
                    r = 16;
                    successiveACState = 1;
                  }
                } else {
                  if (s !== 1)
                    throw new Error("invalid ACn encoding");
                  successiveACNextValue = receiveAndExtend(s);
                  successiveACState = r ? 2 : 3;
                }
                continue;
              case 1:
              // skipping r zero items
              case 2:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  r--;
                  if (r === 0)
                    successiveACState = successiveACState == 2 ? 3 : 0;
                }
                break;
              case 3:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                else {
                  zz[z] = successiveACNextValue << successive;
                  successiveACState = 0;
                }
                break;
              case 4:
                if (zz[z])
                  zz[z] += (readBit() << successive) * direction;
                break;
            }
            k2++;
          }
          if (successiveACState === 4) {
            eobrun--;
            if (eobrun === 0)
              successiveACState = 0;
          }
        }
        function decodeMcu(component2, decode2, mcu2, row, col) {
          var mcuRow = mcu2 / mcusPerLine | 0;
          var mcuCol = mcu2 % mcusPerLine;
          var blockRow = mcuRow * component2.v + row;
          var blockCol = mcuCol * component2.h + col;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode2(component2, component2.blocks[blockRow][blockCol]);
        }
        function decodeBlock(component2, decode2, mcu2) {
          var blockRow = mcu2 / component2.blocksPerLine | 0;
          var blockCol = mcu2 % component2.blocksPerLine;
          if (component2.blocks[blockRow] === void 0 && opts.tolerantDecoding)
            return;
          decode2(component2, component2.blocks[blockRow][blockCol]);
        }
        var componentsLength = components.length;
        var component, i, j, k, n;
        var decodeFn;
        if (progressive) {
          if (spectralStart === 0)
            decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
          else
            decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
        } else {
          decodeFn = decodeBaseline;
        }
        var mcu = 0, marker;
        var mcuExpected;
        if (componentsLength == 1) {
          mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
        } else {
          mcuExpected = mcusPerLine * frame.mcusPerColumn;
        }
        if (!resetInterval) resetInterval = mcuExpected;
        var h, v;
        while (mcu < mcuExpected) {
          for (i = 0; i < componentsLength; i++)
            components[i].pred = 0;
          eobrun = 0;
          if (componentsLength == 1) {
            component = components[0];
            for (n = 0; n < resetInterval; n++) {
              decodeBlock(component, decodeFn, mcu);
              mcu++;
            }
          } else {
            for (n = 0; n < resetInterval; n++) {
              for (i = 0; i < componentsLength; i++) {
                component = components[i];
                h = component.h;
                v = component.v;
                for (j = 0; j < v; j++) {
                  for (k = 0; k < h; k++) {
                    decodeMcu(component, decodeFn, mcu, j, k);
                  }
                }
              }
              mcu++;
              if (mcu === mcuExpected) break;
            }
          }
          if (mcu === mcuExpected) {
            do {
              if (data[offset] === 255) {
                if (data[offset + 1] !== 0) {
                  break;
                }
              }
              offset += 1;
            } while (offset < data.length - 2);
          }
          bitsCount = 0;
          marker = data[offset] << 8 | data[offset + 1];
          if (marker < 65280) {
            throw new Error("marker was not found");
          }
          if (marker >= 65488 && marker <= 65495) {
            offset += 2;
          } else
            break;
        }
        return offset - startOffset;
      }
      function buildComponentData(frame, component) {
        var lines = [];
        var blocksPerLine = component.blocksPerLine;
        var blocksPerColumn = component.blocksPerColumn;
        var samplesPerLine = blocksPerLine << 3;
        var R = new Int32Array(64), r = new Uint8Array(64);
        function quantizeAndInverse(zz, dataOut, dataIn) {
          var qt = component.quantizationTable;
          var v0, v1, v2, v3, v4, v5, v6, v7, t;
          var p = dataIn;
          var i2;
          for (i2 = 0; i2 < 64; i2++)
            p[i2] = zz[i2] * qt[i2];
          for (i2 = 0; i2 < 8; ++i2) {
            var row = 8 * i2;
            if (p[1 + row] == 0 && p[2 + row] == 0 && p[3 + row] == 0 && p[4 + row] == 0 && p[5 + row] == 0 && p[6 + row] == 0 && p[7 + row] == 0) {
              t = dctSqrt2 * p[0 + row] + 512 >> 10;
              p[0 + row] = t;
              p[1 + row] = t;
              p[2 + row] = t;
              p[3 + row] = t;
              p[4 + row] = t;
              p[5 + row] = t;
              p[6 + row] = t;
              p[7 + row] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 + row] + 128 >> 8;
            v1 = dctSqrt2 * p[4 + row] + 128 >> 8;
            v2 = p[2 + row];
            v3 = p[6 + row];
            v4 = dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128 >> 8;
            v7 = dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128 >> 8;
            v5 = p[3 + row] << 4;
            v6 = p[5 + row] << 4;
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 128 >> 8;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 128 >> 8;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 + row] = v0 + v7;
            p[7 + row] = v0 - v7;
            p[1 + row] = v1 + v6;
            p[6 + row] = v1 - v6;
            p[2 + row] = v2 + v5;
            p[5 + row] = v2 - v5;
            p[3 + row] = v3 + v4;
            p[4 + row] = v3 - v4;
          }
          for (i2 = 0; i2 < 8; ++i2) {
            var col = i2;
            if (p[1 * 8 + col] == 0 && p[2 * 8 + col] == 0 && p[3 * 8 + col] == 0 && p[4 * 8 + col] == 0 && p[5 * 8 + col] == 0 && p[6 * 8 + col] == 0 && p[7 * 8 + col] == 0) {
              t = dctSqrt2 * dataIn[i2 + 0] + 8192 >> 14;
              p[0 * 8 + col] = t;
              p[1 * 8 + col] = t;
              p[2 * 8 + col] = t;
              p[3 * 8 + col] = t;
              p[4 * 8 + col] = t;
              p[5 * 8 + col] = t;
              p[6 * 8 + col] = t;
              p[7 * 8 + col] = t;
              continue;
            }
            v0 = dctSqrt2 * p[0 * 8 + col] + 2048 >> 12;
            v1 = dctSqrt2 * p[4 * 8 + col] + 2048 >> 12;
            v2 = p[2 * 8 + col];
            v3 = p[6 * 8 + col];
            v4 = dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048 >> 12;
            v7 = dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048 >> 12;
            v5 = p[3 * 8 + col];
            v6 = p[5 * 8 + col];
            t = v0 - v1 + 1 >> 1;
            v0 = v0 + v1 + 1 >> 1;
            v1 = t;
            t = v2 * dctSin6 + v3 * dctCos6 + 2048 >> 12;
            v2 = v2 * dctCos6 - v3 * dctSin6 + 2048 >> 12;
            v3 = t;
            t = v4 - v6 + 1 >> 1;
            v4 = v4 + v6 + 1 >> 1;
            v6 = t;
            t = v7 + v5 + 1 >> 1;
            v5 = v7 - v5 + 1 >> 1;
            v7 = t;
            t = v0 - v3 + 1 >> 1;
            v0 = v0 + v3 + 1 >> 1;
            v3 = t;
            t = v1 - v2 + 1 >> 1;
            v1 = v1 + v2 + 1 >> 1;
            v2 = t;
            t = v4 * dctSin3 + v7 * dctCos3 + 2048 >> 12;
            v4 = v4 * dctCos3 - v7 * dctSin3 + 2048 >> 12;
            v7 = t;
            t = v5 * dctSin1 + v6 * dctCos1 + 2048 >> 12;
            v5 = v5 * dctCos1 - v6 * dctSin1 + 2048 >> 12;
            v6 = t;
            p[0 * 8 + col] = v0 + v7;
            p[7 * 8 + col] = v0 - v7;
            p[1 * 8 + col] = v1 + v6;
            p[6 * 8 + col] = v1 - v6;
            p[2 * 8 + col] = v2 + v5;
            p[5 * 8 + col] = v2 - v5;
            p[3 * 8 + col] = v3 + v4;
            p[4 * 8 + col] = v3 - v4;
          }
          for (i2 = 0; i2 < 64; ++i2) {
            var sample2 = 128 + (p[i2] + 8 >> 4);
            dataOut[i2] = sample2 < 0 ? 0 : sample2 > 255 ? 255 : sample2;
          }
        }
        requestMemoryAllocation(samplesPerLine * blocksPerColumn * 8);
        var i, j;
        for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
          var scanLine = blockRow << 3;
          for (i = 0; i < 8; i++)
            lines.push(new Uint8Array(samplesPerLine));
          for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
            quantizeAndInverse(component.blocks[blockRow][blockCol], r, R);
            var offset = 0, sample = blockCol << 3;
            for (j = 0; j < 8; j++) {
              var line = lines[scanLine + j];
              for (i = 0; i < 8; i++)
                line[sample + i] = r[offset++];
            }
          }
        }
        return lines;
      }
      function clampTo8bit(a) {
        return a < 0 ? 0 : a > 255 ? 255 : a;
      }
      constructor.prototype = {
        load: function load(path5) {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", path5, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = (function() {
            var data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
            this.parse(data);
            if (this.onload)
              this.onload();
          }).bind(this);
          xhr.send(null);
        },
        parse: function parse(data) {
          var maxResolutionInPixels = this.opts.maxResolutionInMP * 1e3 * 1e3;
          var offset = 0, length = data.length;
          function readUint16() {
            var value = data[offset] << 8 | data[offset + 1];
            offset += 2;
            return value;
          }
          function readDataBlock() {
            var length2 = readUint16();
            var array = data.subarray(offset, offset + length2 - 2);
            offset += array.length;
            return array;
          }
          function prepareComponents(frame2) {
            var maxH2 = 1, maxV2 = 1;
            var component2, componentId2;
            for (componentId2 in frame2.components) {
              if (frame2.components.hasOwnProperty(componentId2)) {
                component2 = frame2.components[componentId2];
                if (maxH2 < component2.h) maxH2 = component2.h;
                if (maxV2 < component2.v) maxV2 = component2.v;
              }
            }
            var mcusPerLine = Math.ceil(frame2.samplesPerLine / 8 / maxH2);
            var mcusPerColumn = Math.ceil(frame2.scanLines / 8 / maxV2);
            for (componentId2 in frame2.components) {
              if (frame2.components.hasOwnProperty(componentId2)) {
                component2 = frame2.components[componentId2];
                var blocksPerLine = Math.ceil(Math.ceil(frame2.samplesPerLine / 8) * component2.h / maxH2);
                var blocksPerColumn = Math.ceil(Math.ceil(frame2.scanLines / 8) * component2.v / maxV2);
                var blocksPerLineForMcu = mcusPerLine * component2.h;
                var blocksPerColumnForMcu = mcusPerColumn * component2.v;
                var blocksToAllocate = blocksPerColumnForMcu * blocksPerLineForMcu;
                var blocks = [];
                requestMemoryAllocation(blocksToAllocate * 256);
                for (var i2 = 0; i2 < blocksPerColumnForMcu; i2++) {
                  var row = [];
                  for (var j2 = 0; j2 < blocksPerLineForMcu; j2++)
                    row.push(new Int32Array(64));
                  blocks.push(row);
                }
                component2.blocksPerLine = blocksPerLine;
                component2.blocksPerColumn = blocksPerColumn;
                component2.blocks = blocks;
              }
            }
            frame2.maxH = maxH2;
            frame2.maxV = maxV2;
            frame2.mcusPerLine = mcusPerLine;
            frame2.mcusPerColumn = mcusPerColumn;
          }
          var jfif = null;
          var adobe = null;
          var pixels = null;
          var frame, resetInterval;
          var quantizationTables = [], frames = [];
          var huffmanTablesAC = [], huffmanTablesDC = [];
          var fileMarker = readUint16();
          var malformedDataOffset = -1;
          this.comments = [];
          if (fileMarker != 65496) {
            throw new Error("SOI not found");
          }
          fileMarker = readUint16();
          while (fileMarker != 65497) {
            var i, j, l;
            switch (fileMarker) {
              case 65280:
                break;
              case 65504:
              // APP0 (Application Specific)
              case 65505:
              // APP1
              case 65506:
              // APP2
              case 65507:
              // APP3
              case 65508:
              // APP4
              case 65509:
              // APP5
              case 65510:
              // APP6
              case 65511:
              // APP7
              case 65512:
              // APP8
              case 65513:
              // APP9
              case 65514:
              // APP10
              case 65515:
              // APP11
              case 65516:
              // APP12
              case 65517:
              // APP13
              case 65518:
              // APP14
              case 65519:
              // APP15
              case 65534:
                var appData = readDataBlock();
                if (fileMarker === 65534) {
                  var comment = String.fromCharCode.apply(null, appData);
                  this.comments.push(comment);
                }
                if (fileMarker === 65504) {
                  if (appData[0] === 74 && appData[1] === 70 && appData[2] === 73 && appData[3] === 70 && appData[4] === 0) {
                    jfif = {
                      version: { major: appData[5], minor: appData[6] },
                      densityUnits: appData[7],
                      xDensity: appData[8] << 8 | appData[9],
                      yDensity: appData[10] << 8 | appData[11],
                      thumbWidth: appData[12],
                      thumbHeight: appData[13],
                      thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                    };
                  }
                }
                if (fileMarker === 65505) {
                  if (appData[0] === 69 && appData[1] === 120 && appData[2] === 105 && appData[3] === 102 && appData[4] === 0) {
                    this.exifBuffer = appData.subarray(5, appData.length);
                  }
                }
                if (fileMarker === 65518) {
                  if (appData[0] === 65 && appData[1] === 100 && appData[2] === 111 && appData[3] === 98 && appData[4] === 101 && appData[5] === 0) {
                    adobe = {
                      version: appData[6],
                      flags0: appData[7] << 8 | appData[8],
                      flags1: appData[9] << 8 | appData[10],
                      transformCode: appData[11]
                    };
                  }
                }
                break;
              case 65499:
                var quantizationTablesLength = readUint16();
                var quantizationTablesEnd = quantizationTablesLength + offset - 2;
                while (offset < quantizationTablesEnd) {
                  var quantizationTableSpec = data[offset++];
                  requestMemoryAllocation(64 * 4);
                  var tableData = new Int32Array(64);
                  if (quantizationTableSpec >> 4 === 0) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = data[offset++];
                    }
                  } else if (quantizationTableSpec >> 4 === 1) {
                    for (j = 0; j < 64; j++) {
                      var z = dctZigZag[j];
                      tableData[z] = readUint16();
                    }
                  } else
                    throw new Error("DQT: invalid table spec");
                  quantizationTables[quantizationTableSpec & 15] = tableData;
                }
                break;
              case 65472:
              // SOF0 (Start of Frame, Baseline DCT)
              case 65473:
              // SOF1 (Start of Frame, Extended DCT)
              case 65474:
                readUint16();
                frame = {};
                frame.extended = fileMarker === 65473;
                frame.progressive = fileMarker === 65474;
                frame.precision = data[offset++];
                frame.scanLines = readUint16();
                frame.samplesPerLine = readUint16();
                frame.components = {};
                frame.componentsOrder = [];
                var pixelsInFrame = frame.scanLines * frame.samplesPerLine;
                if (pixelsInFrame > maxResolutionInPixels) {
                  var exceededAmount = Math.ceil((pixelsInFrame - maxResolutionInPixels) / 1e6);
                  throw new Error(`maxResolutionInMP limit exceeded by ${exceededAmount}MP`);
                }
                var componentsCount = data[offset++], componentId;
                var maxH = 0, maxV = 0;
                for (i = 0; i < componentsCount; i++) {
                  componentId = data[offset];
                  var h = data[offset + 1] >> 4;
                  var v = data[offset + 1] & 15;
                  var qId = data[offset + 2];
                  if (h <= 0 || v <= 0) {
                    throw new Error("Invalid sampling factor, expected values above 0");
                  }
                  frame.componentsOrder.push(componentId);
                  frame.components[componentId] = {
                    h,
                    v,
                    quantizationIdx: qId
                  };
                  offset += 3;
                }
                prepareComponents(frame);
                frames.push(frame);
                break;
              case 65476:
                var huffmanLength = readUint16();
                for (i = 2; i < huffmanLength; ) {
                  var huffmanTableSpec = data[offset++];
                  var codeLengths = new Uint8Array(16);
                  var codeLengthSum = 0;
                  for (j = 0; j < 16; j++, offset++) {
                    codeLengthSum += codeLengths[j] = data[offset];
                  }
                  requestMemoryAllocation(16 + codeLengthSum);
                  var huffmanValues = new Uint8Array(codeLengthSum);
                  for (j = 0; j < codeLengthSum; j++, offset++)
                    huffmanValues[j] = data[offset];
                  i += 17 + codeLengthSum;
                  (huffmanTableSpec >> 4 === 0 ? huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] = buildHuffmanTable(codeLengths, huffmanValues);
                }
                break;
              case 65501:
                readUint16();
                resetInterval = readUint16();
                break;
              case 65500:
                readUint16();
                readUint16();
                break;
              case 65498:
                var scanLength = readUint16();
                var selectorsCount = data[offset++];
                var components = [], component;
                for (i = 0; i < selectorsCount; i++) {
                  component = frame.components[data[offset++]];
                  var tableSpec = data[offset++];
                  component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
                  component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
                  components.push(component);
                }
                var spectralStart = data[offset++];
                var spectralEnd = data[offset++];
                var successiveApproximation = data[offset++];
                var processed = decodeScan(
                  data,
                  offset,
                  frame,
                  components,
                  resetInterval,
                  spectralStart,
                  spectralEnd,
                  successiveApproximation >> 4,
                  successiveApproximation & 15,
                  this.opts
                );
                offset += processed;
                break;
              case 65535:
                if (data[offset] !== 255) {
                  offset--;
                }
                break;
              default:
                if (data[offset - 3] == 255 && data[offset - 2] >= 192 && data[offset - 2] <= 254) {
                  offset -= 3;
                  break;
                } else if (fileMarker === 224 || fileMarker == 225) {
                  if (malformedDataOffset !== -1) {
                    throw new Error(`first unknown JPEG marker at offset ${malformedDataOffset.toString(16)}, second unknown JPEG marker ${fileMarker.toString(16)} at offset ${(offset - 1).toString(16)}`);
                  }
                  malformedDataOffset = offset - 1;
                  const nextOffset = readUint16();
                  if (data[offset + nextOffset - 2] === 255) {
                    offset += nextOffset - 2;
                    break;
                  }
                }
                throw new Error("unknown JPEG marker " + fileMarker.toString(16));
            }
            fileMarker = readUint16();
          }
          if (frames.length != 1)
            throw new Error("only single frame JPEGs supported");
          for (var i = 0; i < frames.length; i++) {
            var cp = frames[i].components;
            for (var j in cp) {
              cp[j].quantizationTable = quantizationTables[cp[j].quantizationIdx];
              delete cp[j].quantizationIdx;
            }
          }
          this.width = frame.samplesPerLine;
          this.height = frame.scanLines;
          this.jfif = jfif;
          this.adobe = adobe;
          this.components = [];
          for (var i = 0; i < frame.componentsOrder.length; i++) {
            var component = frame.components[frame.componentsOrder[i]];
            this.components.push({
              lines: buildComponentData(frame, component),
              scaleX: component.h / frame.maxH,
              scaleY: component.v / frame.maxV
            });
          }
        },
        getData: function getData(width, height) {
          var scaleX = this.width / width, scaleY = this.height / height;
          var component1, component2, component3, component4;
          var component1Line, component2Line, component3Line, component4Line;
          var x, y;
          var offset = 0;
          var Y, Cb, Cr, K, C, M, Ye, R, G, B;
          var colorTransform;
          var dataLength = width * height * this.components.length;
          requestMemoryAllocation(dataLength);
          var data = new Uint8Array(dataLength);
          switch (this.components.length) {
            case 1:
              component1 = this.components[0];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  Y = component1Line[0 | x * component1.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 2:
              component1 = this.components[0];
              component2 = this.components[1];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  Y = component1Line[0 | x * component1.scaleX * scaleX];
                  data[offset++] = Y;
                  Y = component2Line[0 | x * component2.scaleX * scaleX];
                  data[offset++] = Y;
                }
              }
              break;
            case 3:
              colorTransform = true;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  if (!colorTransform) {
                    R = component1Line[0 | x * component1.scaleX * scaleX];
                    G = component2Line[0 | x * component2.scaleX * scaleX];
                    B = component3Line[0 | x * component3.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x * component3.scaleX * scaleX];
                    R = clampTo8bit(Y + 1.402 * (Cr - 128));
                    G = clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    B = clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = R;
                  data[offset++] = G;
                  data[offset++] = B;
                }
              }
              break;
            case 4:
              if (!this.adobe)
                throw new Error("Unsupported color mode (4 components)");
              colorTransform = false;
              if (this.adobe && this.adobe.transformCode)
                colorTransform = true;
              else if (typeof this.opts.colorTransform !== "undefined")
                colorTransform = !!this.opts.colorTransform;
              component1 = this.components[0];
              component2 = this.components[1];
              component3 = this.components[2];
              component4 = this.components[3];
              for (y = 0; y < height; y++) {
                component1Line = component1.lines[0 | y * component1.scaleY * scaleY];
                component2Line = component2.lines[0 | y * component2.scaleY * scaleY];
                component3Line = component3.lines[0 | y * component3.scaleY * scaleY];
                component4Line = component4.lines[0 | y * component4.scaleY * scaleY];
                for (x = 0; x < width; x++) {
                  if (!colorTransform) {
                    C = component1Line[0 | x * component1.scaleX * scaleX];
                    M = component2Line[0 | x * component2.scaleX * scaleX];
                    Ye = component3Line[0 | x * component3.scaleX * scaleX];
                    K = component4Line[0 | x * component4.scaleX * scaleX];
                  } else {
                    Y = component1Line[0 | x * component1.scaleX * scaleX];
                    Cb = component2Line[0 | x * component2.scaleX * scaleX];
                    Cr = component3Line[0 | x * component3.scaleX * scaleX];
                    K = component4Line[0 | x * component4.scaleX * scaleX];
                    C = 255 - clampTo8bit(Y + 1.402 * (Cr - 128));
                    M = 255 - clampTo8bit(Y - 0.3441363 * (Cb - 128) - 0.71413636 * (Cr - 128));
                    Ye = 255 - clampTo8bit(Y + 1.772 * (Cb - 128));
                  }
                  data[offset++] = 255 - C;
                  data[offset++] = 255 - M;
                  data[offset++] = 255 - Ye;
                  data[offset++] = 255 - K;
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
          return data;
        },
        copyToImageData: function copyToImageData(imageData, formatAsRGBA) {
          var width = imageData.width, height = imageData.height;
          var imageDataArray = imageData.data;
          var data = this.getData(width, height);
          var i = 0, j = 0, x, y;
          var Y, K, C, M, R, G, B;
          switch (this.components.length) {
            case 1:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  Y = data[i++];
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  imageDataArray[j++] = Y;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 3:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  R = data[i++];
                  G = data[i++];
                  B = data[i++];
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            case 4:
              for (y = 0; y < height; y++) {
                for (x = 0; x < width; x++) {
                  C = data[i++];
                  M = data[i++];
                  Y = data[i++];
                  K = data[i++];
                  R = 255 - clampTo8bit(C * (1 - K / 255) + K);
                  G = 255 - clampTo8bit(M * (1 - K / 255) + K);
                  B = 255 - clampTo8bit(Y * (1 - K / 255) + K);
                  imageDataArray[j++] = R;
                  imageDataArray[j++] = G;
                  imageDataArray[j++] = B;
                  if (formatAsRGBA) {
                    imageDataArray[j++] = 255;
                  }
                }
              }
              break;
            default:
              throw new Error("Unsupported color mode");
          }
        }
      };
      var totalBytesAllocated = 0;
      var maxMemoryUsageBytes = 0;
      function requestMemoryAllocation(increaseAmount = 0) {
        var totalMemoryImpactBytes = totalBytesAllocated + increaseAmount;
        if (totalMemoryImpactBytes > maxMemoryUsageBytes) {
          var exceededAmount = Math.ceil((totalMemoryImpactBytes - maxMemoryUsageBytes) / 1024 / 1024);
          throw new Error(`maxMemoryUsageInMB limit exceeded by at least ${exceededAmount}MB`);
        }
        totalBytesAllocated = totalMemoryImpactBytes;
      }
      constructor.resetMaxMemoryUsage = function(maxMemoryUsageBytes_) {
        totalBytesAllocated = 0;
        maxMemoryUsageBytes = maxMemoryUsageBytes_;
      };
      constructor.getBytesAllocated = function() {
        return totalBytesAllocated;
      };
      constructor.requestMemoryAllocation = requestMemoryAllocation;
      return constructor;
    })();
    if (typeof module !== "undefined") {
      module.exports = decode;
    } else if (typeof window !== "undefined") {
      window["jpeg-js"] = window["jpeg-js"] || {};
      window["jpeg-js"].decode = decode;
    }
    function decode(jpegData, userOpts = {}) {
      var defaultOpts = {
        // "undefined" means "Choose whether to transform colors based on the image’s color model."
        colorTransform: void 0,
        useTArray: false,
        formatAsRGBA: true,
        tolerantDecoding: true,
        maxResolutionInMP: 100,
        // Don't decode more than 100 megapixels
        maxMemoryUsageInMB: 512
        // Don't decode if memory footprint is more than 512MB
      };
      var opts = { ...defaultOpts, ...userOpts };
      var arr = new Uint8Array(jpegData);
      var decoder = new JpegImage();
      decoder.opts = opts;
      JpegImage.resetMaxMemoryUsage(opts.maxMemoryUsageInMB * 1024 * 1024);
      decoder.parse(arr);
      var channels = opts.formatAsRGBA ? 4 : 3;
      var bytesNeeded = decoder.width * decoder.height * channels;
      try {
        JpegImage.requestMemoryAllocation(bytesNeeded);
        var image = {
          width: decoder.width,
          height: decoder.height,
          exifBuffer: decoder.exifBuffer,
          data: opts.useTArray ? new Uint8Array(bytesNeeded) : Buffer.alloc(bytesNeeded)
        };
        if (decoder.comments.length > 0) {
          image["comments"] = decoder.comments;
        }
      } catch (err) {
        if (err instanceof RangeError) {
          throw new Error("Could not allocate enough memory for the image. Required: " + bytesNeeded);
        }
        if (err instanceof ReferenceError) {
          if (err.message === "Buffer is not defined") {
            throw new Error("Buffer is not globally defined in this environment. Consider setting useTArray to true");
          }
        }
        throw err;
      }
      decoder.copyToImageData(image, opts.formatAsRGBA);
      return image;
    }
  }
});

// node_modules/jpeg-js/index.js
var require_jpeg_js = __commonJS({
  "node_modules/jpeg-js/index.js"(exports, module) {
    var encode = require_encoder();
    var decode = require_decoder();
    module.exports = {
      encode,
      decode
    };
  }
});

// node_modules/chalk/source/vendor/ansi-styles/index.js
var ANSI_BACKGROUND_OFFSET = 10;
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
var wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
var wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
var styles = {
  modifier: {
    reset: [0, 0],
    // 21 isn't widely supported and 22 does the same thing
    bold: [1, 22],
    dim: [2, 22],
    italic: [3, 23],
    underline: [4, 24],
    overline: [53, 55],
    inverse: [7, 27],
    hidden: [8, 28],
    strikethrough: [9, 29]
  },
  color: {
    black: [30, 39],
    red: [31, 39],
    green: [32, 39],
    yellow: [33, 39],
    blue: [34, 39],
    magenta: [35, 39],
    cyan: [36, 39],
    white: [37, 39],
    // Bright color
    blackBright: [90, 39],
    gray: [90, 39],
    // Alias of `blackBright`
    grey: [90, 39],
    // Alias of `blackBright`
    redBright: [91, 39],
    greenBright: [92, 39],
    yellowBright: [93, 39],
    blueBright: [94, 39],
    magentaBright: [95, 39],
    cyanBright: [96, 39],
    whiteBright: [97, 39]
  },
  bgColor: {
    bgBlack: [40, 49],
    bgRed: [41, 49],
    bgGreen: [42, 49],
    bgYellow: [43, 49],
    bgBlue: [44, 49],
    bgMagenta: [45, 49],
    bgCyan: [46, 49],
    bgWhite: [47, 49],
    // Bright color
    bgBlackBright: [100, 49],
    bgGray: [100, 49],
    // Alias of `bgBlackBright`
    bgGrey: [100, 49],
    // Alias of `bgBlackBright`
    bgRedBright: [101, 49],
    bgGreenBright: [102, 49],
    bgYellowBright: [103, 49],
    bgBlueBright: [104, 49],
    bgMagentaBright: [105, 49],
    bgCyanBright: [106, 49],
    bgWhiteBright: [107, 49]
  }
};
var modifierNames = Object.keys(styles.modifier);
var foregroundColorNames = Object.keys(styles.color);
var backgroundColorNames = Object.keys(styles.bgColor);
var colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches2 = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches2) {
          return [0, 0, 0];
        }
        let [colorString] = matches2;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ansiStyles = assembleStyles();
var ansi_styles_default = ansiStyles;

// node_modules/chalk/source/vendor/supports-color/index.js
import process2 from "node:process";
import os from "node:os";
import tty from "node:tty";
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
var { env } = process2;
var flagForceColor;
if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
  flagForceColor = 0;
} else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
  flagForceColor = 1;
}
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1;
    }
    if (env.FORCE_COLOR === "false") {
      return 0;
    }
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== void 0) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (haveStream && !streamIsTTY && forceColor === void 0) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => key in env)) {
      return 3;
    }
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if (env.TERM === "xterm-kitty") {
    return 3;
  }
  if (env.TERM === "xterm-ghostty") {
    return 3;
  }
  if (env.TERM === "wezterm") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app": {
        return version >= 3 ? 3 : 2;
      }
      case "Apple_Terminal": {
        return 2;
      }
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options
  });
  return translateLevel(level);
}
var supportsColor = {
  stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
  stderr: createSupportsColor({ isTTY: tty.isatty(2) })
};
var supports_color_default = supportsColor;

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
    endIndex = index + 1;
    index = string.indexOf("\n", endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}

// node_modules/chalk/source/index.js
var { stdout: stdoutColor, stderr: stderrColor } = supports_color_default;
var GENERATOR = /* @__PURE__ */ Symbol("GENERATOR");
var STYLER = /* @__PURE__ */ Symbol("STYLER");
var IS_EMPTY = /* @__PURE__ */ Symbol("IS_EMPTY");
var levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
var styles2 = /* @__PURE__ */ Object.create(null);
var applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === void 0 ? colorLevel : options.level;
};
var chalkFactory = (options) => {
  const chalk2 = (...strings) => strings.join(" ");
  applyOptions(chalk2, options);
  Object.setPrototypeOf(chalk2, createChalk.prototype);
  return chalk2;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansi_styles_default)) {
  styles2[styleName] = {
    get() {
      const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles2.visible = {
  get() {
    const builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
var getModelAnsi = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
};
var usedModels = ["rgb", "hex", "ansi256"];
for (const model of usedModels) {
  styles2[model] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles2[bgModel] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
var proto = Object.defineProperties(() => {
}, {
  ...styles2,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level) {
      this[GENERATOR].level = level;
    }
  }
});
var createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === void 0) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
var createBuilder = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY] ? "" : string;
  }
  let styler = self[STYLER];
  if (styler === void 0) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== void 0) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf("\n");
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles2);
var chalk = createChalk();
var chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
var source_default = chalk;

// src/registry/tool-registry.ts
var REGISTRY = [];
var GENERIC = null;
function defineTool(def) {
  REGISTRY.push(def);
}
function defineGenericTool(def) {
  GENERIC = { matches: () => true, ...def };
}
function matches(matcher, rawName) {
  if (typeof matcher === "function") return matcher(rawName);
  if (Array.isArray(matcher)) return matcher.includes(rawName);
  return matcher === rawName;
}
function getToolDefinition(rawName) {
  for (const def of REGISTRY) {
    if (matches(def.matches, rawName)) return def;
  }
  if (GENERIC) return GENERIC;
  throw new Error(`No tool strategy registered (and no generic fallback) for ${rawName}`);
}

// src/render/primitives.ts
import { readFileSync } from "node:fs";
source_default.level = 3;
var PERSISTED_RE = /<persisted-output>[\s\S]*?(?:saved to:|→)\s*(\S+)[\s\S]*?<\/persisted-output>/g;
function expandPersistedOutput(text2) {
  if (typeof text2 !== "string" || !text2.includes("<persisted-output>")) return text2;
  return text2.replace(PERSISTED_RE, (match, path5) => {
    try {
      return readFileSync(path5, "utf8");
    } catch {
      return match;
    }
  });
}
var DIVIDER_WIDTH = 60;
function renderRuler(line) {
  const plain = stripAnsi(line).trim();
  const m = plain.match(/^(-{3,}|={3,}|─{3,}|═{3,})(.*)$/);
  if (!m) return null;
  const ch = m[1][0] === "=" || m[1][0] === "\u2550" ? "\u2550" : "\u2500";
  const text2 = m[2].replace(/[-=─═]{3,}\s*$/, "").trim();
  if (!text2) return source_default.gray(ch.repeat(DIVIDER_WIDTH));
  const label = ` ${text2} `;
  const remaining = Math.max(6, DIVIDER_WIDTH - label.length);
  const left = Math.floor(remaining / 2);
  return source_default.gray(ch.repeat(left)) + source_default.bold(label) + source_default.gray(ch.repeat(remaining - left));
}
function renderMetaTag(label, value) {
  const labelChip = source_default.bgHex("#3a3a3a").black(` ${label} `);
  const corner = source_default.hex("#3a3a3a")("\u25E4");
  return labelChip + corner + ` ${value} ` + source_default.hex("#3a3a3a")("\u275A");
}
function stripAnsi(str) {
  return String(str).replace(/\x1b\[[0-9;]*m/g, "");
}
function visibleWidth(str) {
  return Array.from(stripAnsi(str)).length;
}
function truncateAnsi(text2, maxVisibleLen, ellipsis = "\u2026") {
  const csi = /\x1b\[[0-9;]*m/y;
  let out = "";
  let visible = 0;
  let i = 0;
  while (i < text2.length && visible < maxVisibleLen) {
    csi.lastIndex = i;
    const m = csi.exec(text2);
    if (m) {
      out += m[0];
      i += m[0].length;
      continue;
    }
    out += text2[i];
    visible += 1;
    i += 1;
  }
  return out + "\x1B[0m" + ellipsis;
}
var FALLBACK_CONTENT_WIDTH = 96;
var OUTER_INDENT_MARGIN = 6;
var H_PADDING = 2;
var MIN_CARD_HAIRLINE = 4;
function getMaxContentWidth() {
  const cols = process.stdout.columns || Number(process.env.COLUMNS) || 0;
  const usable = (cols > 0 ? cols : FALLBACK_CONTENT_WIDTH) - OUTER_INDENT_MARGIN - H_PADDING * 2;
  return Math.max(20, usable);
}
function renderDuration(durationMs) {
  return durationMs == null ? null : source_default.gray(`\u0394 ${durationMs}ms`);
}
function pushDurationLine(lines, durationMs) {
  const line = renderDuration(durationMs);
  if (line) lines.push(line);
}
function firstLine(value, maxLength) {
  const line = String(value ?? "").split("\n")[0] ?? "";
  return maxLength == null ? line : line.slice(0, maxLength);
}
function pickResultText(result, keys = ["text", "result", "output"]) {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return null;
  const record = result;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return null;
}
function prepareBox(content, minimumWidth = 0) {
  const maxWidth = getMaxContentWidth();
  const lines = String(content).replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, "").split("\n").map((l) => visibleWidth(l) > maxWidth ? truncateAnsi(l, maxWidth - 1) : l);
  const maxLen = Math.min(Math.max(...lines.map(visibleWidth), 0), maxWidth);
  const width = Math.max(maxLen + H_PADDING * 2, minimumWidth);
  const bg = source_default.bgHex("#252525");
  const pad = bg(" ".repeat(width));
  const body = lines.map(
    (l) => bg(" ".repeat(H_PADDING) + l + " ".repeat(Math.max(0, width - H_PADDING - visibleWidth(l))))
  );
  return { lines: [pad, ...body, pad], width };
}
function renderBox(content) {
  const box = prepareBox(content);
  return ["", ...box.lines, ""].join("\n");
}
function renderCard(badge, content) {
  const badgeWidth = visibleWidth(badge);
  const box = prepareBox(content, badgeWidth + MIN_CARD_HAIRLINE);
  const hairline = source_default.hex("#4a4a4a")("\u2500".repeat(Math.max(0, box.width - badgeWidth)));
  return ["", badge + hairline, ...box.lines, ""].join("\n");
}
function renderSection({ badge, lines = [] }) {
  let out = badge;
  const body = lines.filter((l) => Boolean(l));
  if (body.length) {
    out += "\n\n" + body.join("\n");
  }
  return out;
}
var SAFETY_MAX_LINES = 2e3;
function softCollapse(content, { maxLines = SAFETY_MAX_LINES, label = "lines" } = {}) {
  const text2 = String(content);
  const lines = text2.split("\n");
  if (lines.length <= maxLines) return text2;
  const head = lines.slice(0, maxLines).join("\n");
  return head + "\n" + source_default.gray.italic(`  \u2026 +${lines.length - maxLines} more ${label}`);
}
function extractResultText(toolResponse) {
  const raw = extractResultTextRaw(toolResponse);
  return raw === null ? null : expandPersistedOutput(raw);
}
function extractResultTextRaw(toolResponse) {
  if (typeof toolResponse === "string") return toolResponse;
  if (!toolResponse || typeof toolResponse !== "object") return null;
  if (Array.isArray(toolResponse)) {
    return toolResponse.filter((b) => b?.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n") || null;
  }
  const indexed = toolResponse;
  if (indexed["0"]?.type === "text") {
    return Object.values(indexed).filter((b) => b?.type === "text" && typeof b.text === "string").map((b) => b.text).join("\n") || null;
  }
  const o = toolResponse;
  const candidate = o.stdout ?? o.output ?? o.text ?? o.content;
  if (typeof candidate === "string") return candidate;
  if (candidate && typeof candidate === "object" && candidate !== toolResponse) {
    return extractResultTextRaw(candidate);
  }
  return null;
}

// src/render/theme.ts
source_default.level = 3;
var TOOL_ICONS = {
  Bash: "\u276F",
  Write: "\u2295",
  Edit: "\u0394",
  Read: "\u25A4",
  Glob: "\u2315",
  Grep: "\u2315",
  Task: "\u{F0495}",
  Agent: "\u{F0495}",
  WebFetch: "\u21CC",
  WebSearch: "\u2315",
  TaskCreate: "\u2713",
  TaskUpdate: "\u2713",
  TaskList: "\u2713",
  ToolSearch: "\u2315",
  ExitPlanMode: "\u23FB",
  mcp__wcgw__BashCommand: "\u276F",
  mcp__wcgw__FileWriteOrEdit: "\u2295",
  mcp__wcgw__FileEdit: "\u0394",
  mcp__wcgw__ReadFiles: "\u25A4",
  mcp__wcgw__ReadImage: "\u25A9",
  mcp__wcgw__Initialize: "\u23FB",
  mcp__wcgw__ContextSave: "\u29FA",
  "mcp__context7__query-docs": "\u21CC",
  "mcp__context7__resolve-library-id": "\u21CC",
  "mcp__claude-in-chrome__navigate": "\u21CC",
  "mcp__claude-in-chrome__read_page": "\u25A4",
  default: "\u{F0320}"
};
var TOOL_COLORS = {
  Bash: "magenta",
  Write: "green",
  Edit: "green",
  Read: "blue",
  Task: "cyan",
  Agent: "cyan",
  Glob: "red",
  Grep: "red",
  WebFetch: "cyan",
  WebSearch: "cyan",
  mcp__wcgw__BashCommand: "magenta",
  mcp__wcgw__FileWriteOrEdit: "green",
  mcp__wcgw__FileEdit: "green",
  mcp__wcgw__ReadFiles: "blue",
  mcp__wcgw__ReadImage: "blue",
  mcp__wcgw__Initialize: "cyan",
  mcp__wcgw__ContextSave: "cyan",
  default: "blue"
};
function parseToolName(rawName) {
  if (!rawName || typeof rawName !== "string") {
    return { server: null, tool: "Unknown", pretty: "Unknown" };
  }
  if (rawName.startsWith("mcp__")) {
    const rest = rawName.slice(5);
    const idx = rest.indexOf("__");
    if (idx > 0) {
      const server = rest.slice(0, idx);
      const tool = rest.slice(idx + 2);
      const prettyTool = tool.replace(/_/g, " ");
      return { server, tool, pretty: `${server} \u25B8 ${prettyTool}` };
    }
  }
  return { server: null, tool: rawName, pretty: rawName };
}
function getToolIcon(rawName) {
  if (TOOL_ICONS[rawName]) return TOOL_ICONS[rawName];
  const { tool } = parseToolName(rawName);
  if (TOOL_ICONS[tool]) return TOOL_ICONS[tool];
  if (/bash|command|exec|shell/i.test(tool)) return TOOL_ICONS.Bash;
  if (/write|edit|create/i.test(tool)) return TOOL_ICONS.Write;
  if (/read|get|fetch|load/i.test(tool)) return TOOL_ICONS.Read;
  if (/search|find|grep|query|glob/i.test(tool)) return TOOL_ICONS.Grep;
  return TOOL_ICONS.default;
}
function getToolColor(rawName) {
  if (TOOL_COLORS[rawName]) return TOOL_COLORS[rawName];
  const { tool } = parseToolName(rawName);
  if (TOOL_COLORS[tool]) return TOOL_COLORS[tool];
  if (/bash|command|exec|shell/i.test(tool)) return "magenta";
  if (/write|edit|create/i.test(tool)) return "green";
  if (/read|get|fetch|load/i.test(tool)) return "blue";
  if (/search|find|grep|query|glob/i.test(tool)) return "red";
  return TOOL_COLORS.default;
}
var COLOR_MAP = {
  blue: source_default.bgBlue,
  green: source_default.bgGreen,
  yellow: source_default.bgYellow,
  red: source_default.bgRed,
  magenta: source_default.bgMagenta,
  cyan: source_default.bgCyan,
  gray: source_default.bgGray,
  white: source_default.bgWhite,
  black: source_default.bgBlack,
  brightBlue: source_default.bgBlueBright,
  brightGreen: source_default.bgGreenBright,
  brightYellow: source_default.bgYellowBright,
  brightRed: source_default.bgRedBright,
  brightMagenta: source_default.bgMagentaBright,
  brightCyan: source_default.bgCyanBright,
  brightGray: source_default.bgGray,
  brightWhite: source_default.bgWhiteBright
};
function getBadgeColor(name) {
  return COLOR_MAP[name] ?? source_default.bgBlue;
}

// src/render/badge.ts
function renderBadge(props = {}) {
  const { toolName = null, label = null } = props;
  let pretty;
  let badgeColor = props.color ?? null;
  let badgeIcon = props.icon ?? null;
  if (toolName) {
    pretty = parseToolName(toolName).pretty;
    if (!badgeIcon) badgeIcon = getToolIcon(toolName);
    if (!badgeColor) badgeColor = getToolColor(toolName);
  } else {
    pretty = label ?? "";
    if (!badgeColor) badgeColor = "cyan";
  }
  const bg = getBadgeColor(badgeColor);
  return bg.black(` ${badgeIcon ? badgeIcon + " " : ""}${pretty} `);
}
var Badge = class {
  icon;
  color;
  label;
  toolName;
  constructor(props = {}) {
    this.icon = props.icon ?? null;
    this.color = props.color ?? null;
    this.label = props.label ?? null;
    this.toolName = props.toolName ?? null;
  }
  toString() {
    return renderBadge({
      toolName: this.toolName,
      label: this.label,
      color: this.color,
      icon: this.icon
    });
  }
};
function renderBadges(...badges) {
  return badges.filter((b) => Boolean(b)).map((b) => b instanceof Badge ? b.toString() : String(b)).join(" ");
}
var RUNNING_BADGE = new Badge({ label: "Running", color: "magenta", icon: "\u23CE " }).toString();
var OUTPUT_BADGE = new Badge({ label: "Output", color: "brightGreen", icon: "\u2258" }).toString();
var META_BADGE = new Badge({ label: "metadata", color: "gray", icon: "\u26C1" }).toString();

// src/render/highlight.ts
source_default.level = 3;
function isJSON(str) {
  if (typeof str !== "string") return false;
  const t = str.trim();
  if (!t || t[0] !== "{" && t[0] !== "[") return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}
function isCode(str) {
  if (typeof str !== "string") return false;
  const codePatterns = [
    /^(function|const|let|var|class|import|export|if|for|while|return)\s/m,
    /^(def|class|import|from|if|for|while|return)\s/m,
    /=>/,
    /\{\s*[\w\s:,\n]+\}/,
    /^\s*```/m
  ];
  return codePatterns.some((p) => p.test(str));
}
function formatJSON(content) {
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}
var EXT_TO_LANG = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  json5: "json",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  py: "python",
  pyi: "python",
  yaml: "yaml",
  yml: "yaml",
  diff: "diff",
  patch: "diff",
  html: "html",
  htm: "html",
  vue: "html",
  svelte: "html",
  xml: "xml",
  svg: "xml",
  plist: "xml",
  css: "css",
  scss: "css",
  less: "css",
  sql: "sql",
  toml: "yaml",
  ini: "yaml",
  env: "bash"
};
function langFromPath(filePath) {
  if (!filePath) return null;
  const m = String(filePath).match(/\.([^./\s]+)$/);
  return m ? EXT_TO_LANG[m[1].toLowerCase()] ?? null : null;
}
function detectContentLanguage(content) {
  if (isJSON(String(content))) return "json";
  if (/^diff --git /m.test(content) || /^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/m.test(content) || /^--- \S/m.test(content) && /^\+\+\+ \S/m.test(content)) return "diff";
  const shebang = content.match(/^#!\s*\S*?\/(?:env\s+)?([\w.-]+)/);
  if (shebang) {
    const interp = shebang[1];
    if (/^(ba|z|da|k|)sh$/.test(interp)) return "bash";
    if (/^python/.test(interp)) return "python";
    if (/^(node|bun|deno)/.test(interp)) return "javascript";
  }
  const t = content.trimStart();
  if (/^<!DOCTYPE html/i.test(t) || /^<(html|head|body)\b/i.test(t)) return "html";
  if (/^<\?xml/.test(t)) return "xml";
  if (/^\s*(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE (TABLE|INDEX|VIEW)|ALTER TABLE)\b/im.test(content)) return "sql";
  if (/^\s*(def|class)\s+\w+.*:\s*$/m.test(content) || /^(from \w[\w.]* import|import \w+)\s*$/m.test(content)) return "python";
  if (/^\s*(export\s+)?(interface|type|enum)\s+\w+/m.test(content) || /:\s*(string|number|boolean|void|unknown|never)\b/.test(content)) return "typescript";
  if (/^(import|export)\s.*from\s+['"]/m.test(content) || /^\s*(const|let|var|function)\s+\w/m.test(content) || /=>\s*[{(]/.test(content)) return "javascript";
  if (/^#{1,6}\s+\S/m.test(content) && (/^\s*[-*+]\s+\S/m.test(content) || /```/.test(content))) return "markdown";
  const yamlKeys = content.match(/^[\w."'-]+:(\s+\S|$)/gm);
  if (yamlKeys && yamlKeys.length >= 2 && !/[{};]/.test(content)) return "yaml";
  return null;
}
function detectOutputLanguage(text2) {
  return detectContentLanguage(text2) ?? "output";
}
function detectLanguage(content, toolName) {
  const { tool } = parseToolName(toolName);
  if (tool === "Read" || tool === "ReadFiles") {
    const extMatch = content.match(/\.([a-z0-9]+)$/m);
    const byExt = extMatch ? EXT_TO_LANG[extMatch[1].toLowerCase()] : null;
    if (byExt) return byExt;
  }
  if (tool === "Bash" || tool === "BashCommand") return "bash";
  return detectContentLanguage(content) ?? "text";
}
var HIGHLIGHTERS = {
  json: highlightJSON,
  javascript: highlightJS,
  typescript: highlightJS,
  bash: highlightBash,
  markdown: highlightMarkdown,
  python: highlightPython,
  yaml: highlightYaml,
  diff: highlightDiff,
  html: highlightXML,
  xml: highlightXML,
  css: highlightCSS,
  sql: highlightSQL,
  output: highlightOutput
};
function simpleHighlight(code, language) {
  const fn = language ? HIGHLIGHTERS[language] : void 0;
  return fn ? fn(code) : code;
}
var ANSI_SEQ = /\x1b\[[0-9;]*[a-zA-Z]/g;
function replaceOutsideAnsi(input, pattern, replacer) {
  if (!input.includes("\x1B")) return input.replace(pattern, replacer);
  let out = "";
  let last = 0;
  ANSI_SEQ.lastIndex = 0;
  let m;
  while (m = ANSI_SEQ.exec(input)) {
    out += input.slice(last, m.index).replace(pattern, replacer) + m[0];
    last = ANSI_SEQ.lastIndex;
  }
  return out + input.slice(last).replace(pattern, replacer);
}
function highlightJSON(code) {
  let result = code;
  result = result.replace(/"([^"]+)":/g, (_, p1) => source_default.cyan(`"${p1}"`) + source_default.gray(":"));
  result = result.replace(/: "([^"]*)"/g, (_, p1) => source_default.gray(": ") + source_default.green(`"${p1}"`));
  result = replaceOutsideAnsi(result, /: (-?\d+\.?\d*)/g, (_, p1) => source_default.gray(": ") + source_default.yellow(p1));
  result = result.replace(/: (true|false|null)/g, (_, p1) => source_default.gray(": ") + source_default.yellow(p1));
  return result;
}
function highlightJS(code) {
  let result = code;
  result = result.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (m) => source_default.gray(m));
  result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, (m) => source_default.green(m));
  result = replaceOutsideAnsi(result, /\b\d+\.?\d*\b/g, (m) => source_default.yellow(m));
  result = result.replace(
    /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|super|static|interface|type|enum|extends|implements|typeof|instanceof|in|of|yield|switch|case|default|break|continue|do|void|delete)\b/g,
    (m) => source_default.cyan(m)
  );
  result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, (m) => source_default.magenta(m));
  return result;
}
function highlightBash(code) {
  let result = code;
  result = result.replace(/(^|\n)(\s*#.*)/g, (_, p1, p2) => p1 + source_default.gray(p2));
  result = result.replace(/"([^"\\]|\\.)*"/g, (m) => source_default.green(m));
  result = result.replace(/'([^'\\]|\\.)*'/g, (m) => source_default.green(m));
  result = result.replace(/\$\{[^}]+\}|\$[A-Za-z_][A-Za-z0-9_]*|\$[0-9@#?*!\$]/g, (m) => source_default.yellow(m));
  result = result.replace(/(^|\s)(--?[\w][\w-]*)/g, (_, p1, p2) => p1 + source_default.hex("#e0af68")(p2));
  result = result.replace(
    /\b(if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|return|export|local|readonly|declare|set|unset|source|exit|break|continue)\b/g,
    (m) => source_default.cyan(m)
  );
  result = result.replace(
    /\b(echo|printf|cd|pwd|ls|cat|grep|rg|sed|awk|jq|curl|wget|git|gh|npm|npx|bun|bunx|node|deno|python|python3|pip|pip3|uv|docker|kubectl|make|cargo|go|rustc|tsc|find|xargs|tar|zip|unzip|chmod|chown|mkdir|rm|mv|cp|ln|touch|env|which|head|tail|sort|uniq|wc|tee|read|diff|patch|ssh|scp|rsync|kill|ps|open|brew|apt|yarn|pnpm)\b/g,
    (m) => source_default.magenta(m)
  );
  result = result.replace(/(\||>>?|<|2>&1|&&|\|\|)/g, (m) => source_default.gray(m));
  result = replaceOutsideAnsi(result, /\b\d+\b/g, (m) => source_default.yellow(m));
  return result;
}
function highlightPython(code) {
  let result = code;
  result = result.replace(/("""[\s\S]*?"""|'''[\s\S]*?''')/g, (m) => source_default.green(m));
  result = result.replace(/(^|\n)(\s*#.*)/g, (_, p1, p2) => p1 + source_default.gray(p2));
  result = result.replace(/(["'])(?:(?!\1)[^\\\n]|\\.)*\1/g, (m) => source_default.green(m));
  result = result.replace(/(^|\n)(\s*@[\w.]+)/g, (_, p1, p2) => p1 + source_default.magenta(p2));
  result = replaceOutsideAnsi(result, /\b\d+\.?\d*\b/g, (m) => source_default.yellow(m));
  result = result.replace(/\b(None|True|False)\b/g, (m) => source_default.yellow(m));
  result = result.replace(
    /\b(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|lambda|yield|async|await|pass|break|continue|raise|global|nonlocal|assert|del|in|not|and|or|is|match|case)\b/g,
    (m) => source_default.cyan(m)
  );
  result = result.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, (m) => source_default.magenta(m));
  return result;
}
function highlightYaml(code) {
  return code.split("\n").map((line) => {
    if (/^\s*#/.test(line)) return source_default.gray(line);
    let out = line;
    out = out.replace(
      /^(\s*-?\s*)([\w."'-]+)(:)(\s|$)/,
      (_m, sp, key, colon, tail) => sp + source_default.cyan(key) + source_default.gray(colon) + tail
    );
    out = out.replace(/^(\s*)(-)(\s)/, (_m, sp, marker, tail) => sp + source_default.yellow(marker) + tail);
    out = out.replace(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, (m) => source_default.green(m));
    out = out.replace(/\b(true|false|null|~)\b/g, (m) => source_default.yellow(m));
    out = out.replace(/(:\s+)(-?\d+\.?\d*)\s*$/, (_m, p1, p2) => p1 + source_default.yellow(p2));
    return out;
  }).join("\n");
}
function highlightDiff(code) {
  return code.split("\n").map((line) => {
    if (/^(diff --git|index |new file|deleted file|similarity|rename )/.test(line)) return source_default.gray.bold(line);
    if (/^(--- |\+\+\+ )/.test(line)) return source_default.bold(line);
    if (/^@@ /.test(line)) return source_default.cyan(line);
    if (line.startsWith("+")) return source_default.green(line);
    if (line.startsWith("-")) return source_default.red(line);
    return line;
  }).join("\n");
}
function highlightXML(code) {
  let result = code;
  result = result.replace(/<!--[\s\S]*?-->/g, (m) => source_default.gray(m));
  result = result.replace(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, (m) => source_default.green(m));
  result = result.replace(/(<\/?)([\w:-]+)/g, (_m, punct, tag) => source_default.gray(punct) + source_default.cyan(tag));
  result = result.replace(/([\w:-]+)(=)/g, (_m, attr, eq) => source_default.yellow(attr) + source_default.gray(eq));
  result = result.replace(/(\/?>)/g, (m) => source_default.gray(m));
  return result;
}
function highlightCSS(code) {
  let result = code;
  result = result.replace(/\/\*[\s\S]*?\*\//g, (m) => source_default.gray(m));
  result = result.replace(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, (m) => source_default.green(m));
  result = result.replace(/^([^{}\n]+)(?=\s*\{)/gm, (m) => source_default.magenta(m));
  result = result.replace(/([\w-]+)(\s*:)/g, (_m, prop, colon) => source_default.cyan(prop) + source_default.gray(colon));
  result = result.replace(/#[0-9a-fA-F]{3,8}\b/g, (m) => source_default.yellow(m));
  result = replaceOutsideAnsi(
    result,
    /\b(\d+\.?\d*)(px|em|rem|vh|vw|%|s|ms|deg|fr)?\b/g,
    (_m, n, unit) => source_default.yellow(n) + (unit ? source_default.gray(unit) : "")
  );
  return result;
}
function highlightSQL(code) {
  let result = code;
  result = result.replace(/(^|\n)(\s*--.*)/g, (_, p1, p2) => p1 + source_default.gray(p2));
  result = result.replace(/'(?:[^'\\]|\\.)*'/g, (m) => source_default.green(m));
  result = replaceOutsideAnsi(result, /\b\d+\.?\d*\b/g, (m) => source_default.yellow(m));
  result = result.replace(
    /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|VIEW|ALTER|DROP|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|AND|OR|NOT|NULL|IN|IS|LIKE|ORDER|GROUP|BY|HAVING|LIMIT|OFFSET|DISTINCT|COUNT|SUM|AVG|MIN|MAX|UNION|ALL|EXISTS|BETWEEN|CASE|WHEN|THEN|ELSE|END|PRIMARY|FOREIGN|KEY|REFERENCES|DEFAULT|UNIQUE|CONSTRAINT|IF)\b/gi,
    (m) => source_default.cyan(m)
  );
  return result;
}
var OUTPUT_URL_RE = /\bhttps?:\/\/[^\s)'"]+/g;
var OUTPUT_PATH_RE = /(^|[\s('"=])((?:~|\.{1,2})?\/[\w.@+-]+(?:\/[\w.@+-]+)+(?::\d+(?::\d+)?)?)/g;
var OUTPUT_METRIC_RE = /\b\d+(?:[.,]\d+)?\s?(?:ms|s|m|h|[KMGT]i?B|kb|mb|gb|%)\b/g;
function highlightOutput(code) {
  return code.split("\n").map((line) => {
    if (/\b(error|fatal|failed|failure|exception|traceback|panic|denied|refused)\b/i.test(line)) return source_default.red(line);
    if (/\b(warn|warning|deprecated)\b/i.test(line)) return source_default.yellow(line);
    if (/\b(success|succeeded|passed|completed?)\b/i.test(line) || /[✓✔]/.test(line)) return source_default.green(line);
    let out = line;
    out = out.replace(OUTPUT_METRIC_RE, (m) => source_default.yellow(m));
    out = out.replace(OUTPUT_URL_RE, (m) => source_default.cyan.underline(m));
    out = out.replace(OUTPUT_PATH_RE, (_m, pre, p) => pre + source_default.cyan(p));
    return out;
  }).join("\n");
}
function highlightMarkdown(code) {
  let result = code;
  result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, body) => {
    const inner = lang ? simpleHighlight(body, lang) : body;
    const fence = source_default.gray("```" + (lang ?? ""));
    return fence + "\n" + inner + source_default.gray("```");
  });
  result = result.replace(
    /^(#{1,6})\s+(.*)$/gm,
    (_m, h, t) => source_default.bold.cyan(h + " " + t)
  );
  result = result.replace(/^(>\s.*)$/gm, (m) => source_default.gray.italic(m));
  result = result.replace(
    /^(\s*)([-*+])(\s)/gm,
    (_m, sp, marker, tail) => sp + source_default.yellow(marker) + tail
  );
  result = result.replace(
    /^(\s*)(\d+\.)(\s)/gm,
    (_m, sp, marker, tail) => sp + source_default.yellow(marker) + tail
  );
  result = result.replace(/\*\*([^*]+)\*\*/g, (_m, t) => source_default.bold(t));
  result = result.replace(/__([^_]+)__/g, (_m, t) => source_default.bold(t));
  result = result.replace(/(?<![*_])\*([^*\n]+)\*(?!\*)/g, (_m, t) => source_default.italic(t));
  result = result.replace(/(?<![*_])_([^_\n]+)_(?!_)/g, (_m, t) => source_default.italic(t));
  result = result.replace(/`([^`\n]+)`/g, (_m, t) => source_default.bgHex("#1e1e1e").white(t));
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, text2, url) => source_default.cyan(text2) + source_default.gray(" (") + source_default.gray.underline(url) + source_default.gray(")")
  );
  return result;
}
var META_KEY = source_default.hex("#7aa2f7");
var META_STR = source_default.hex("#9ece6a");
var META_NUM = source_default.yellow;
var META_PUNCT = source_default.gray;
var META_STR_MAX = 200;
function flattenString(s) {
  const collapsed = s.replace(/\s+/g, " ").trim();
  return collapsed.length > META_STR_MAX ? collapsed.slice(0, META_STR_MAX - 1) + "\u2026" : collapsed;
}
function formatMetaValue(val, depth) {
  if (val === null) return META_NUM("null");
  if (val === void 0) return META_NUM("undefined");
  if (typeof val === "boolean") return META_NUM(String(val));
  if (typeof val === "number") return META_NUM(String(val));
  if (typeof val === "string") return META_STR(flattenString(val));
  const pad = "  ".repeat(depth + 1);
  const cpad = "  ".repeat(depth);
  if (Array.isArray(val)) {
    if (val.length === 0) return META_PUNCT("[ ]");
    const items = val.map((v) => formatMetaValue(v, depth + 1));
    const inline = META_PUNCT("[ ") + items.join(META_PUNCT(", ")) + META_PUNCT(" ]");
    if (stripAnsi(inline).length <= 50) return inline;
    return META_PUNCT("[\n") + items.map((i) => pad + i).join(META_PUNCT(",\n")) + "\n" + cpad + META_PUNCT("]");
  }
  if (typeof val === "object") {
    const entries = Object.entries(val);
    if (entries.length === 0) return META_PUNCT("{ }");
    const pairs = entries.map(([k, v]) => META_KEY(k) + META_PUNCT(": ") + formatMetaValue(v, depth + 1));
    const inline = META_PUNCT("{ ") + pairs.join(META_PUNCT(", ")) + META_PUNCT(" }");
    if (stripAnsi(inline).length <= 50) return inline;
    return META_PUNCT("{\n") + pairs.map((p) => pad + p).join(META_PUNCT(",\n")) + "\n" + cpad + META_PUNCT("}");
  }
  return String(val);
}
function formatMetadataCustom(obj) {
  if (!obj || typeof obj !== "object") return String(obj);
  const entries = Object.entries(obj);
  if (!entries.length) return "";
  const keyWidth = Math.max(...entries.map(([k]) => k.length));
  return entries.map(([k, v]) => {
    const gap = " ".repeat(keyWidth - k.length);
    return META_KEY(k) + META_PUNCT(":") + gap + "  " + formatMetaValue(v, 0);
  }).join("\n");
}

// src/parsers/wcgw-trailer.ts
var TRAILER_SEP = /\n---\s*\n/;
function parseWcgwTrailer(rawOutput) {
  if (typeof rawOutput !== "string") {
    return { stdout: String(rawOutput ?? ""), status: null, cwd: null, extra: {} };
  }
  const sepMatch = TRAILER_SEP.exec(rawOutput);
  if (!sepMatch) {
    return { stdout: rawOutput, status: null, cwd: null, extra: {} };
  }
  const stdout = rawOutput.slice(0, sepMatch.index);
  const trailerRaw = rawOutput.slice(sepMatch.index + sepMatch[0].length);
  const status = extractField(trailerRaw, "status");
  const cwd = extractField(trailerRaw, "cwd");
  const knownKeys = /* @__PURE__ */ new Set(["status", "cwd"]);
  const extra = {};
  for (const line of trailerRaw.split("\n")) {
    const m = /^([a-z_][a-z0-9_ ]*?)\s*=\s*(.*)$/.exec(line.trim());
    if (m && !knownKeys.has(m[1].trim())) {
      extra[m[1].trim()] = m[2].trim();
    }
  }
  return { stdout, status, cwd, extra };
}
function extractField(text2, key) {
  const re = new RegExp(`(?:^|\\n)${key}\\s*=\\s*([^\\n]*)`, "i");
  const m = re.exec(text2);
  return m ? m[1].trim() : null;
}
function shortenPath(p, home) {
  if (!p) return String(p ?? "");
  const h = home ?? process.env.HOME ?? process.env.USERPROFILE ?? "";
  if (h && p.startsWith(h)) return "~" + p.slice(h.length);
  return p;
}

// src/tools/browser-operations.ts
var VALUE_OPTIONS = /* @__PURE__ */ new Set([
  "--session",
  "--session-name",
  "--profile",
  "--state",
  "--headers",
  "--executable-path",
  "--extension",
  "--init-script",
  "--enable",
  "--args",
  "--user-agent",
  "--proxy",
  "--proxy-bypass",
  "--hide-scrollbars",
  "--provider",
  "--device",
  "--screenshot-dir",
  "--screenshot-quality",
  "--screenshot-format",
  "--cdp",
  "--color-scheme",
  "--download-path",
  "--max-output",
  "--allowed-domains",
  "--action-policy",
  "--confirm-actions",
  "--engine",
  "--model",
  "--config",
  "-p"
]);
function shellWords(command) {
  const words = [];
  let current = "";
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (quote === '"' && ch === "\\" && i + 1 < command.length) current += command[++i];
      else if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) words.push(current);
      current = "";
      continue;
    }
    if (ch === "\\" && i + 1 < command.length) current += command[++i];
    else current += ch;
  }
  if (current) words.push(current);
  return words;
}
function executableName(token) {
  return token.split("/").pop() ?? token;
}
function operationFromAgentBrowserSegment(segment) {
  const words = shellWords(segment);
  const executableIndex = words.findIndex((word) => executableName(word) === "agent-browser");
  if (executableIndex < 0) return null;
  for (let i = executableIndex + 1; i < words.length; i++) {
    const word = words[i];
    if (word === "--") return words[i + 1] ?? null;
    if (!word.startsWith("-")) return word;
    const option = word.includes("=") ? word.slice(0, word.indexOf("=")) : word;
    if (!word.includes("=") && VALUE_OPTIONS.has(option)) i++;
  }
  return null;
}
function agentBrowserOperations(segments) {
  const operations = [];
  for (const segment of segments) {
    const operation = operationFromAgentBrowserSegment(segment);
    if (operation && !operations.includes(operation)) operations.push(operation);
  }
  return operations;
}
function playwrightOperation(toolName) {
  const match = toolName.match(/playwright.*__browser_(.+)$/i);
  return match?.[1]?.replace(/_/g, " ") ?? null;
}
function operationBadges(operations) {
  return operations.map((operation) => new Badge({
    label: operation,
    color: "brightBlue",
    icon: "\u0192"
  }));
}

// src/tools/bash.ts
source_default.level = 3;
function splitCommandRows(cmd) {
  const rows = [];
  let current = "";
  let quote = null;
  let heredoc = null;
  const push = (sep) => {
    rows.push({ text: current.replace(/^\s+|\s+$/g, ""), sep });
    current = "";
  };
  const lines = cmd.split("\n");
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (heredoc !== null) {
      current += (current ? "\n" : "") + line;
      if (line.trim() === heredoc) heredoc = null;
      continue;
    }
    if (li > 0) current += "\n";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quote) {
        current += ch;
        if (quote === '"' && ch === "\\" && i + 1 < line.length) current += line[++i];
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        current += ch;
        continue;
      }
      const here = line.slice(i).match(/^<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/);
      if (here) {
        current += here[0];
        i += here[0].length - 1;
        heredoc = here[2];
        continue;
      }
      if (ch === ";") {
        push(";");
        continue;
      }
      if ((ch === "&" || ch === "|") && line[i + 1] === ch) {
        push(ch + ch);
        i++;
        continue;
      }
      current += ch;
    }
  }
  push("");
  return rows.filter((r) => r.text.length > 0);
}
function commandOf(input) {
  const raw = input.command ?? input.action_json;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
function renderCommand(cmd) {
  return splitCommandRows(cmd).map(({ text: text2, sep }, i) => {
    const body = simpleHighlight(text2, "bash") + (sep ? " " + source_default.gray(sep) : "");
    return i === 0 ? source_default.gray("$ ") + body : body;
  }).join("\n");
}
defineTool({
  matches: ["Bash", "mcp__wcgw__BashCommand"],
  pre(input) {
    const lines = [];
    const cmd = commandOf(input);
    if (cmd) lines.push(renderCard(RUNNING_BADGE, renderCommand(cmd)));
    const meta = [];
    const w = input.wait_for_seconds;
    const t = input.timeout;
    const c = input.chats_id;
    if (w != null) meta.push(source_default.gray(`wait: ${w}s`));
    if (t != null) meta.push(source_default.gray(`timeout: ${t}s`));
    if (c != null) meta.push(source_default.gray(`chat: ${c}`));
    if (meta.length) lines.push(meta.join("  "));
    const operations = cmd ? agentBrowserOperations(splitCommandRows(cmd).map((row) => row.text)) : [];
    return { lines, extraBadges: operationBadges(operations) };
  },
  post(_input, result, durationMs) {
    const raw = extractResultText(result) ?? "";
    const lines = [];
    pushDurationLine(lines, durationMs);
    const cmd = commandOf(_input);
    if (cmd) lines.push(renderCard(RUNNING_BADGE, renderCommand(cmd)));
    const { stdout, status, cwd, extra } = parseWcgwTrailer(raw);
    if (stdout.trim()) {
      const lang = detectOutputLanguage(stdout);
      const highlighted = simpleHighlight(lang === "json" ? formatJSON(stdout) : stdout, lang);
      const processedStdout = lang === "diff" ? highlighted : highlighted.split("\n").map((line) => renderRuler(line) ?? line).join("\n");
      lines.push(renderCard(OUTPUT_BADGE, softCollapse(processedStdout)));
    }
    const trailerParts = [];
    if (status !== null) {
      trailerParts.push(status === "0" ? source_default.green(`exit:${status}`) : source_default.red(`exit:${status}`));
    }
    if (cwd) trailerParts.push(source_default.gray("cwd:") + source_default.cyan(shortenPath(cwd)));
    for (const [k, v] of Object.entries(extra)) {
      trailerParts.push(source_default.gray(`${k}:`) + v);
    }
    if (trailerParts.length) lines.push("  " + trailerParts.join("  "));
    const operations = cmd ? agentBrowserOperations(splitCommandRows(cmd).map((row) => row.text)) : [];
    return { lines, extraBadges: operationBadges(operations) };
  }
});

// src/render/file-preview.ts
import fs2 from "node:fs";

// packages/image-to-ascii/src/index.ts
var import_pngjs = __toESM(require_png(), 1);
var import_jpeg_js = __toESM(require_jpeg_js(), 1);
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os2 from "node:os";
import path from "node:path";
var MAX_ROWS = 120;
var ALPHA_OPAQUE = 128;
var BYTE_BUDGET = 9200;
var ATTEMPTS = [
  { mask: 255 },
  { mask: 252 },
  { mask: 248 },
  { palette: true }
];
var MIN_COLS = 24;
var cubeIdx = (v) => v < 48 ? 0 : v < 115 ? 1 : Math.min(5, Math.round((v - 35) / 40));
function to256(r, g, b) {
  if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && Math.abs(r - b) < 12) {
    if (r < 8) return 16;
    if (r > 238) return 231;
    return 232 + Math.min(23, Math.round((r - 8) / 10));
  }
  return 16 + 36 * cubeIdx(r) + 6 * cubeIdx(g) + cubeIdx(b);
}
var FG_RESET = "\x1B[39m";
var BG_RESET = "\x1B[49m";
function decodeWebp(buffer) {
  const base = path.join(os2.tmpdir(), `claude-webp-${process.pid}-${Date.now()}`);
  const inPath = `${base}.webp`;
  const outPath = `${base}.png`;
  try {
    fs.writeFileSync(inPath, buffer);
    execFileSync("sips", ["-s", "format", "png", inPath, "--out", outPath], { stdio: "ignore" });
    return import_pngjs.PNG.sync.read(fs.readFileSync(outPath));
  } finally {
    try {
      fs.unlinkSync(inPath);
    } catch {
    }
    try {
      fs.unlinkSync(outPath);
    } catch {
    }
  }
}
var LEFT_HALF_MASK = 21;
var RIGHT_HALF_MASK = 42;
var LAST_SEPARATED_MASK = 54;
function regularSextant(mask) {
  if (mask <= 0) return " ";
  if (mask >= 63) return "\u2588";
  if (mask === LEFT_HALF_MASK) return "\u258C";
  if (mask === RIGHT_HALF_MASK) return "\u2590";
  const skippedLeft = mask > LEFT_HALF_MASK ? 1 : 0;
  const skippedRight = mask > RIGHT_HALF_MASK ? 1 : 0;
  return String.fromCodePoint(129792 + mask - 1 - skippedLeft - skippedRight);
}
function separatedSextant(mask) {
  return mask >= 1 && mask <= LAST_SEPARATED_MASK ? String.fromCodePoint(118352 + mask) : null;
}
function mean(samples, mask, selected) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < samples.length; i++) {
    if (Boolean(mask & 1 << i) !== selected) continue;
    r += samples[i].r;
    g += samples[i].g;
    b += samples[i].b;
    count++;
  }
  return count ? { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) } : { r: 0, g: 0, b: 0 };
}
function colorError(sample, color) {
  const dr = sample.r - color.r;
  const dg = sample.g - color.g;
  const db = sample.b - color.b;
  return dr * dr + dg * dg + db * db;
}
function opaqueCell(samples) {
  const flat = mean(samples, 0, false);
  let bestError = samples.reduce((sum, sample) => sum + colorError(sample, flat), 0);
  let best = { char: "\u2588", fg: flat, bg: null };
  for (let mask = 1; mask < 63; mask++) {
    const fg = mean(samples, mask, true);
    const bg = mean(samples, mask, false);
    let error = 0;
    for (let i = 0; i < samples.length; i++) {
      error += colorError(samples[i], mask & 1 << i ? fg : bg);
    }
    if (error < bestError) {
      bestError = error;
      best = { char: regularSextant(mask), fg, bg };
    }
  }
  return best;
}
function transparentCell(samples) {
  let mask = 0;
  const opaque = [];
  for (let i = 0; i < samples.length; i++) {
    if (!samples[i].opaque) continue;
    mask |= 1 << i;
    opaque.push(samples[i]);
  }
  if (!mask) return { char: " ", fg: null, bg: null };
  const fg = mean(opaque, (1 << opaque.length) - 1, true);
  return {
    // Separated cells keep the terminal background visible between isolated
    // transparent-edge samples. Masks beyond the requested cutoff use the
    // classic series rather than silently pulling in U+1CE87..U+1CE8F.
    char: separatedSextant(mask) ?? regularSextant(mask),
    fg,
    bg: null
  };
}
function fitGeometry(width, height, requestedCols) {
  let cols = Math.max(1, Math.min(requestedCols, Math.ceil(width / 2)));
  let rows = Math.max(1, Math.round(height * cols / (width * 2)));
  if (rows > MAX_ROWS) {
    cols = Math.max(1, Math.floor(cols * MAX_ROWS / rows));
    rows = Math.max(1, Math.min(MAX_ROWS, Math.round(height * cols / (width * 2))));
  }
  return { cols, rows };
}
function imageSample(img, sampleX, sampleY, sampleCols, sampleRows) {
  const x = Math.min(img.width - 1, Math.floor((sampleX + 0.5) * img.width / sampleCols));
  const y = Math.min(img.height - 1, Math.floor((sampleY + 0.5) * img.height / sampleRows));
  const idx = (y * img.width + x) * 4;
  return {
    r: img.data[idx] ?? 0,
    g: img.data[idx + 1] ?? 0,
    b: img.data[idx + 2] ?? 0,
    opaque: (img.data[idx + 3] ?? 255) >= ALPHA_OPAQUE
  };
}
function renderSextants(img, requestedCols, attempt) {
  const { cols, rows } = fitGeometry(img.width, img.height, requestedCols);
  const sampleCols = cols * 2;
  const sampleRows = rows * 3;
  const sgrTail = attempt.palette ? (color) => `5;${to256(color.r, color.g, color.b)}` : (color) => `2;${color.r & attempt.mask};${color.g & attempt.mask};${color.b & attempt.mask}`;
  const lines = [];
  for (let cellY = 0; cellY < rows; cellY++) {
    let line = "";
    let fg = null;
    let bg = null;
    const put = (cell) => {
      const wantFg = cell.fg ? sgrTail(cell.fg) : null;
      const wantBg = cell.bg ? sgrTail(cell.bg) : null;
      const parts = [];
      if (wantFg !== null && wantFg !== fg) {
        parts.push(`38;${wantFg}`);
        fg = wantFg;
      }
      if (wantBg !== bg) {
        parts.push(wantBg === null ? "49" : `48;${wantBg}`);
        bg = wantBg;
      }
      line += parts.length ? `\x1B[${parts.join(";")}m${cell.char}` : cell.char;
    };
    for (let cellX = 0; cellX < cols; cellX++) {
      const samples = [];
      for (let subY = 0; subY < 3; subY++) {
        for (let subX = 0; subX < 2; subX++) {
          samples.push(imageSample(
            img,
            cellX * 2 + subX,
            cellY * 3 + subY,
            sampleCols,
            sampleRows
          ));
        }
      }
      put(samples.every((sample) => sample.opaque) ? opaqueCell(samples) : transparentCell(samples));
    }
    if (fg !== null) line += FG_RESET;
    if (bg !== null) line += BG_RESET;
    lines.push(line);
  }
  return lines.join("\n");
}
function renderHalfBlocks(img, requestedCols, attempt) {
  const scale = Math.max(1, img.width / requestedCols, img.height / (MAX_ROWS * 2));
  const targetWidth = Math.max(1, Math.round(img.width / scale));
  const pxRows = Math.max(1, Math.round(img.height / scale));
  const tail = attempt.palette ? (sample) => `5;${to256(sample.r, sample.g, sample.b)}` : (sample) => `2;${sample.r & attempt.mask};${sample.g & attempt.mask};${sample.b & attempt.mask}`;
  const px = (col, row) => {
    const sample = imageSample(img, col, row, targetWidth, pxRows);
    return sample.opaque ? tail(sample) : null;
  };
  const lines = [];
  for (let y = 0; y < pxRows; y += 2) {
    let line = "";
    let fg = null;
    let bg = null;
    const put = (char, wantFg, wantBg) => {
      const parts = [];
      if (wantFg !== null && wantFg !== fg) {
        parts.push(`38;${wantFg}`);
        fg = wantFg;
      }
      if (wantBg !== bg) {
        parts.push(wantBg === null ? "49" : `48;${wantBg}`);
        bg = wantBg;
      }
      line += parts.length ? `\x1B[${parts.join(";")}m${char}` : char;
    };
    for (let x = 0; x < targetWidth; x++) {
      const top = px(x, y);
      const bottom = y + 1 < pxRows ? px(x, y + 1) : null;
      if (top === null && bottom === null) put(" ", null, null);
      else if (top !== null && bottom === null) put("\u2580", top, null);
      else if (top === null && bottom !== null) put("\u2584", bottom, null);
      else if (top === bottom) put("\u2588", top, bg);
      else put("\u2580", top, bottom);
    }
    if (fg !== null) line += FG_RESET;
    if (bg !== null) line += BG_RESET;
    lines.push(line);
  }
  return lines.join("\n");
}
function imageToAscii(buffer, ext, maxWidth = 80) {
  let img;
  const normalizedExt = ext.toLowerCase().replace(/^\./, "");
  try {
    if (normalizedExt === "png") img = import_pngjs.PNG.sync.read(buffer);
    else if (normalizedExt === "jpg" || normalizedExt === "jpeg") img = import_jpeg_js.default.decode(buffer, { useTArray: true });
    else if (normalizedExt === "webp") img = decodeWebp(buffer);
    else return null;
  } catch {
    return null;
  }
  if (!img.width || !img.height) return null;
  const requestedMax = Number.isFinite(maxWidth) ? Math.max(1, Math.floor(maxWidth)) : 80;
  const forceHalfBlocks = process.env.CLAUDE_HOOKS_IMAGE_MODE === "half" || process.env.TERM === "dumb";
  let out = "";
  const initialCols = forceHalfBlocks ? Math.min(img.width, requestedMax) : Math.min(Math.ceil(img.width / 2), requestedMax);
  for (let cols = Math.max(1, initialCols); ; ) {
    for (const attempt of ATTEMPTS) {
      out = forceHalfBlocks ? renderHalfBlocks(img, cols, attempt) : renderSextants(img, cols, attempt);
      if (out.length <= BYTE_BUDGET) return out;
    }
    if (cols <= MIN_COLS) break;
    cols = Math.max(MIN_COLS, Math.floor(cols * 0.85));
  }
  return out;
}

// src/render/file-preview.ts
source_default.level = 3;
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set(["png", "jpg", "jpeg", "webp"]);
function extensionFromPath(filePath) {
  const match = String(filePath ?? "").match(/\.([^./\\\s]+)$/);
  return match ? `.${match[1].toLowerCase()}` : "";
}
function isImageExtension(ext) {
  return IMAGE_EXTENSIONS.has(String(ext ?? "").toLowerCase().replace(/^\./, ""));
}
function renderTextPreview(content, filePath) {
  const lang = langFromPath(filePath) ?? detectContentLanguage(content);
  if (isJSON(content)) return simpleHighlight(formatJSON(content), "json");
  return lang ? simpleHighlight(content, lang) : content;
}
function renderFilePreview(filePath, options = {}) {
  const ext = extensionFromPath(filePath);
  const maxWidth = options.maxWidth ?? getMaxContentWidth();
  if (isImageExtension(ext)) {
    try {
      const ascii = imageToAscii(fs2.readFileSync(filePath), ext, maxWidth);
      if (ascii) return { content: ascii, kind: "image" };
    } catch {
    }
  }
  const shape = (raw) => renderTextPreview(options.transform ? options.transform(raw) : raw, filePath);
  if (options.fallbackText != null) {
    return { content: shape(options.fallbackText), kind: "text" };
  }
  if (options.readText === false) return null;
  try {
    return { content: shape(fs2.readFileSync(filePath, "utf8")), kind: "text" };
  } catch {
    return null;
  }
}
var LINE_RANGE_RE = /:(\d+)(?:-(\d+)?)?$/;
function stripLineRange(rawPath) {
  const text2 = String(rawPath);
  const match = LINE_RANGE_RE.exec(text2);
  if (!match) return { path: text2, range: null };
  return {
    path: text2.slice(0, match.index),
    range: { start: Number(match[1]), end: match[2] ? Number(match[2]) : null }
  };
}
function formatRange({ start, end }) {
  return end == null ? `line ${start}+` : `lines ${start}-${end}`;
}
function sliceToRange(content, { start, end }) {
  const lines = content.split("\n");
  return lines.slice(Math.max(0, start - 1), end ?? lines.length).join("\n");
}
function renderFileResult(rawPath, options = {}) {
  const { action, range: rangeOverride, ...previewOptions } = options;
  const { path: filePath, range: pathRange } = stripLineRange(rawPath);
  const range = rangeOverride ?? pathRange;
  const preview = renderFilePreview(filePath, previewOptions);
  if (!preview) return null;
  const body = range && preview.kind === "text" ? sliceToRange(preview.content, range) : preview.content;
  const parts = [collapsePreview(body)];
  parts.push(source_default.cyan("\u{F021A} ") + source_default.bold("Path: ") + filePath);
  const footer = [action, range ? formatRange(range) : null].filter(Boolean).join("  ");
  if (footer) parts.push(source_default.cyan("\u29D6 ") + source_default.bold("Action: ") + footer);
  return renderBox(parts.join("\n\n"));
}
function collapsePreview(content, options = {}) {
  return softCollapse(content, { label: "lines", ...options });
}
function prefixPreviewLines(content, prefix) {
  return content.split("\n").map((line) => prefix + line).join("\n");
}

// src/tools/read.ts
source_default.level = 3;
defineTool({
  matches: "Read",
  pre(input) {
    const path5 = input.file_path;
    return { lines: path5 ? [source_default.gray("  \u25A4 ") + String(path5).trim()] : [] };
  },
  post(input, result, durationMs) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const filePath = input.file_path;
    const filePreview = filePath ? renderFilePreview(filePath) : null;
    const fallbackText = filePreview ? null : extractResultText(result);
    const rendered = filePreview?.content ?? (fallbackText ? renderTextPreview(fallbackText, filePath) : null);
    if (rendered) {
      lines.push(collapsePreview(rendered));
    }
    return { lines };
  }
});

// src/tools/edit.ts
source_default.level = 3;
var CONTEXT_LINES = 3;
function countLines(s) {
  if (!s) return 0;
  return s.replace(/\n$/, "").split("\n").length;
}
function editedSpan(result) {
  const hunks = result?.structuredPatch;
  if (!Array.isArray(hunks) || !hunks.length) return null;
  let start = Infinity;
  let end = 0;
  for (const hunk of hunks) {
    const at = Number(hunk?.newStart);
    if (!Number.isFinite(at)) continue;
    const span = Number.isFinite(Number(hunk?.newLines)) ? Number(hunk.newLines) : 1;
    start = Math.min(start, at);
    end = Math.max(end, at + Math.max(span, 1) - 1);
  }
  if (!Number.isFinite(start) || end < start) return null;
  return { start: Math.max(1, start - CONTEXT_LINES), end: end + CONTEXT_LINES };
}
defineTool({
  matches: ["Edit", "MultiEdit"],
  pre(input) {
    const filePath = input.file_path;
    const lines = [];
    const multi = input;
    const single = input;
    const edits = multi.edits ?? (single.old_string !== void 0 ? [{ old_string: single.old_string, new_string: single.new_string ?? "" }] : []);
    let removed = 0;
    let added = 0;
    for (const e of edits) {
      removed += countLines(e.old_string);
      added += countLines(e.new_string);
    }
    if (filePath) lines.push(renderMetaTag("file", filePath));
    const removedBadge = new Badge({ label: `- ${removed}`, color: "red" }).toString();
    const addedBadge = new Badge({ label: `+ ${added}`, color: "green" }).toString();
    lines.push(removedBadge + addedBadge);
    if (edits.length > 1) lines.push(source_default.gray(`  ${edits.length} edits`));
    return { lines };
  },
  post(input, result, durationMs, ctx) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const filePath = input.file_path ?? result?.filePath;
    const box = filePath ? renderFileResult(filePath, {
      action: ctx.toolName === "MultiEdit" ? "multi-edit" : "edit",
      range: editedSpan(result)
    }) : null;
    if (box) lines.push(box);
    else {
      const text2 = pickResultText(result);
      if (text2) lines.push(source_default.green("\u2713 ") + firstLine(text2, 120));
    }
    return { lines };
  }
});

// src/parsers/search-replace.ts
source_default.level = 3;
function parseSearchReplaceBlocks(content) {
  if (typeof content !== "string") return [];
  const blocks = [];
  const re = /<<<<<<< SEARCH\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> REPLACE/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    blocks.push({ search: m[1] ?? "", replace: m[2] ?? "" });
  }
  return blocks;
}
function renderSearchReplace(blocks, filePath) {
  if (!blocks.length) return null;
  const lines = [];
  if (filePath) lines.push(source_default.bold.cyan("  " + filePath));
  blocks.forEach((block, i) => {
    if (blocks.length > 1) lines.push(source_default.gray(`  hunk ${i + 1}/${blocks.length}`));
    const searchLines = block.search.replace(/\n$/, "").split("\n");
    const replaceLines = block.replace.replace(/\n$/, "").split("\n");
    const diffLines = [
      ...searchLines.map((l) => source_default.red("  - ") + source_default.red(l)),
      ...replaceLines.map((l) => source_default.green("  + ") + source_default.green(l))
    ];
    lines.push(softCollapse(diffLines.join("\n"), { label: "diff lines" }));
  });
  return lines.join("\n");
}

// src/tools/wcgw-file.ts
source_default.level = 3;
var FAILURE_RE = /\b(error|failed|failure|denied|not permitted|cannot|no such file)\b/i;
defineTool({
  matches: ["mcp__wcgw__FileWriteOrEdit", "mcp__wcgw__FileEdit"],
  pre(input) {
    const lines = [];
    const filePath = input.file_path;
    if (filePath) lines.push(source_default.bold.cyan(filePath));
    const blocks = parseSearchReplaceBlocks(input.text_or_search_replace_blocks);
    if (blocks.length) {
      const rendered = renderSearchReplace(blocks, null);
      if (rendered) lines.push(rendered);
      lines.push(source_default.gray(`  ${blocks.length} hunk${blocks.length > 1 ? "s" : ""}`));
    } else if (input.text_or_search_replace_blocks) {
      const text2 = String(input.text_or_search_replace_blocks);
      const parts = text2.split("\n");
      const snippet = parts.slice(0, 6).join("\n");
      lines.push(renderCard(OUTPUT_BADGE, snippet + (parts.length > 6 ? "\n\u2026" : "")));
    }
    const meta = [];
    if (input.percentage_to_change != null) meta.push(source_default.gray(`\xB1${input.percentage_to_change}%`));
    if (input.thread_id != null) meta.push(source_default.gray(`thread:${input.thread_id}`));
    if (meta.length) lines.push(meta.join("  "));
    return { lines };
  },
  // wcgw answers with an MCP text block ("Success"), never the file itself, so
  // re-read the target from disk and render it the way Write's post hook does.
  post(input, result, durationMs) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const text2 = extractResultText(result);
    const status = text2 ? firstLine(text2, 200) : null;
    const failed = status ? FAILURE_RE.test(status) : false;
    if (status) lines.push((failed ? source_default.red("\u2A02 ") : source_default.green("\u2713 ")) + status);
    const action = parseSearchReplaceBlocks(input.text_or_search_replace_blocks).length ? "edit" : "write";
    const box = input.file_path ? renderFileResult(input.file_path, { action }) : null;
    if (box) lines.push(box);
    else if (!status && text2) lines.push(renderCard(OUTPUT_BADGE, text2));
    return { lines };
  }
});

// src/tools/wcgw-read.ts
source_default.level = 3;
function toPathList(input) {
  const raw = input.file_paths ?? input.file_path ?? [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((p) => String(p)).filter(Boolean);
}
function renderInlineContents(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  const res = result;
  const fileContents = res["file-contents-numbered"] ?? res["file_contets_numbered"] ?? res["file-contents"] ?? res["output"];
  const lines = [];
  if (fileContents && typeof fileContents === "object") {
    for (const [filePath, content] of Object.entries(fileContents)) {
      if (typeof content !== "string") continue;
      lines.push(source_default.cyan("  \u251C ") + source_default.bold(filePath));
      const preview = renderFilePreview(filePath, { fallbackText: content, readText: false });
      const rendered = preview?.content ?? content;
      lines.push(collapsePreview(prefixPreviewLines(rendered, source_default.gray("  \u2502 "))));
    }
  } else if (typeof fileContents === "string" && fileContents.length) {
    lines.push(collapsePreview(fileContents));
  }
  return lines;
}
defineTool({
  matches: ["mcp__wcgw__ReadFiles", "mcp__wcgw__ReadImage"],
  pre(input) {
    return { lines: toPathList(input).map((p) => source_default.gray("  \u25A4 ") + p) };
  },
  // Same deal as FileWriteOrEdit: the MCP payload is opaque, so each requested
  // path is rendered straight off disk in the Write post-hook's box layout —
  // which also gets images rendered as ascii for free.
  post(input, result, durationMs) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const paths = toPathList(input);
    let missed = 0;
    for (const rawPath of paths) {
      const box = renderFileResult(rawPath, { action: "read" });
      if (box) lines.push(box);
      else {
        missed += 1;
        lines.push(source_default.red("\u2A02 ") + source_default.bold("Path: ") + stripLineRange(rawPath).path);
      }
    }
    if (!paths.length || missed === paths.length) {
      const inline = renderInlineContents(result);
      if (inline.length) lines.push(...inline);
      else {
        const text2 = extractResultText(result);
        if (text2) lines.push(renderCard(OUTPUT_BADGE, collapsePreview(text2)));
      }
    }
    return { lines };
  }
});

// src/tools/wcgw-init.ts
source_default.level = 3;
defineTool({
  matches: "mcp__wcgw__Initialize",
  pre(input) {
    const lines = [];
    if (input.type) lines.push(source_default.gray("type: ") + input.type);
    if (input.any_workspace_path) lines.push(source_default.gray("workspace: ") + shortenPath(input.any_workspace_path));
    if (input.mode_name) lines.push(source_default.gray("mode: ") + input.mode_name);
    return { lines };
  },
  post(_input, result, durationMs) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const text2 = pickResultText(result, ["text", "output"]);
    if (text2) {
      const summary = String(text2).split("\n").slice(0, 3).join("\n");
      lines.push(source_default.green("\u23FB ") + summary);
    }
    return { lines };
  }
});

// src/tools/wcgw-ctx.ts
import path2 from "node:path";
source_default.level = 3;
var SAVED_PATH_RE = /(\/[^\s"']*\.txt)/;
function savedContextPath(input, resultText) {
  const fromResult = resultText ? SAVED_PATH_RE.exec(resultText)?.[1] : null;
  if (fromResult) return fromResult;
  if (!input.id) return null;
  const dataHome = process.env.XDG_DATA_HOME || path2.join(process.env.HOME ?? process.env.USERPROFILE ?? "", ".local", "share");
  return path2.join(dataHome, "wcgw", "memory", `${input.id}.txt`);
}
var RELEVANT_FILES_MARKER = "\n# Relevant Files:";
function dropInlinedFiles(raw) {
  const at = raw.indexOf(RELEVANT_FILES_MARKER);
  if (at === -1) return raw;
  const omitted = raw.slice(at + RELEVANT_FILES_MARKER.length).split("\n").length;
  return raw.slice(0, at) + `
# Relevant Files: ${omitted} lines of inlined file content`;
}
defineTool({
  matches: "mcp__wcgw__ContextSave",
  pre(input) {
    const lines = [];
    if (input.id) lines.push(source_default.gray("id: ") + input.id);
    if (input.project_root_path) lines.push(source_default.gray("root: ") + shortenPath(input.project_root_path));
    if (input.description) {
      lines.push(source_default.gray("desc: ") + String(input.description).split("\n")[0].slice(0, 120));
    }
    if (input.relevant_file_globs) {
      const globs = Array.isArray(input.relevant_file_globs) ? input.relevant_file_globs : [input.relevant_file_globs];
      const preview = globs.slice(0, 3).join(", ");
      const suffix = globs.length > 3 ? source_default.gray(` +${globs.length - 3} more`) : "";
      lines.push(source_default.gray("globs: ") + preview + suffix);
    }
    return { lines };
  },
  post(input, result, durationMs) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const text2 = extractResultText(result);
    const saved = savedContextPath(input, text2);
    const prose = text2?.trim() && text2.trim() !== saved ? firstLine(text2.trim(), 200) : null;
    if (prose) {
      const failed = /\b(error|warning|no files found)\b/i.test(prose);
      lines.push((failed ? source_default.yellow("\u26A0 ") : source_default.green("\u29FA ")) + prose);
    }
    const box = saved ? renderFileResult(saved, { action: "context save", transform: dropInlinedFiles }) : null;
    if (box) lines.push(box);
    else if (text2 && !prose) lines.push(source_default.green("\u29FA ") + firstLine(text2, 200));
    return { lines };
  }
});

// src/tools/agent.ts
source_default.level = 3;
defineTool({
  matches: ["Agent", "Task"],
  pre(input) {
    const lines = [];
    if (input.description) {
      lines.push(input.description);
    }
    return { lines };
  },
  post(input, result, durationMs) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const prompt = input.prompt || result && typeof result === "object" && result.prompt || "";
    if (prompt) {
      lines.push(simpleHighlight(prompt, "markdown"));
    }
    if (result && typeof result === "object") {
      const metadata = { ...result };
      delete metadata.prompt;
      delete metadata.description;
      if (Object.keys(metadata).length > 0) {
        lines.push(renderCard(META_BADGE, formatMetadataCustom(metadata)));
      }
    }
    return { lines };
  }
});

// packages/ansi-headings/src/primitives.ts
source_default.level = 3;

// packages/ansi-headings/src/phrase.ts
source_default.level = 3;

// packages/ansi-headings/src/glyphs.json
var glyphs_default = {
  " ": [
    "    ",
    "    ",
    "    "
  ],
  A: [
    " \u2584\u2580\u2584",
    " \u2588\u2580\u2588",
    " \u2580 \u2580"
  ],
  B: [
    " \u2588\u2580\u2584",
    " \u2588\u2580\u2584",
    " \u2580\u2580 "
  ],
  C: [
    " \u2584\u2580\u2580",
    " \u2588  ",
    " \u2580\u2580\u2580"
  ],
  D: [
    " \u2588\u2580\u2584",
    " \u2588 \u2588",
    " \u2580\u2580 "
  ],
  E: [
    " \u2588\u2580\u2580",
    " \u2588\u2580 ",
    " \u2580\u2580\u2580"
  ],
  F: [
    " \u2588\u2580\u2580",
    " \u2588\u2580 ",
    " \u2580  "
  ],
  G: [
    " \u2584\u2580\u2580",
    " \u2588 \u2584",
    " \u2580\u2580\u2580"
  ],
  H: [
    " \u2588 \u2588",
    " \u2588\u2580\u2588",
    " \u2580 \u2580"
  ],
  I: [
    " \u2588",
    " \u2588",
    " \u2580"
  ],
  J: [
    "   \u2588",
    " \u2584 \u2588",
    " \u2580\u2580 "
  ],
  K: [
    " \u2588 \u2588",
    " \u2588\u2580\u2584",
    " \u2580 \u2580"
  ],
  L: [
    " \u2588  ",
    " \u2588  ",
    " \u2580\u2580\u2580"
  ],
  M: [
    " \u2588\u2588\u2584\u2588\u2584",
    " \u2588 \u2588 \u2588",
    " \u2580 \u2580 \u2580"
  ],
  N: [
    " \u2588\u2584 \u2588",
    " \u2588 \u2580\u2588",
    " \u2580  \u2580"
  ],
  O: [
    " \u2588\u2580\u2588",
    " \u2588 \u2588",
    " \u2580\u2580\u2580"
  ],
  P: [
    " \u2588\u2580\u2584",
    " \u2588\u2580 ",
    " \u2580  "
  ],
  Q: [
    " \u2584\u2580\u2584",
    " \u2588 \u2588",
    " \u2580\u2580\u2584"
  ],
  R: [
    " \u2588\u2580\u2584",
    " \u2588\u2580\u2584",
    " \u2580 \u2580"
  ],
  S: [
    " \u2584\u2580\u2580",
    "  \u2580\u2584",
    " \u2580\u2580 "
  ],
  T: [
    " \u2580\u2588\u2580",
    "  \u2588 ",
    "  \u2580 "
  ],
  U: [
    " \u2588 \u2588",
    " \u2588 \u2588",
    " \u2580\u2580\u2580"
  ],
  V: [
    " \u2588 \u2588",
    " \u2588 \u2588",
    "  \u2580 "
  ],
  W: [
    " \u2588 \u2588 \u2588",
    " \u2588 \u2588 \u2588",
    "  \u2580 \u2580 "
  ],
  X: [
    " \u2588\u2584\u2588",
    " \u2584\u2588\u2584",
    " \u2580 \u2580"
  ],
  Y: [
    " \u2588 \u2588",
    "  \u2588 ",
    "  \u2580 "
  ],
  Z: [
    " \u2580\u2580\u2588",
    " \u2584\u2584 ",
    " \u2580\u2580\u2580"
  ],
  "0": [
    " \u2584\u2580\u2584",
    " \u2588 \u2588",
    " \u2580\u2584\u2580"
  ],
  "1": [
    " \u2588 ",
    " \u2588 ",
    " \u2580 "
  ],
  "2": [
    " \u2584\u2580\u2584",
    "  \u2584\u2580",
    " \u2580\u2580\u2580"
  ],
  "3": [
    " \u2580\u2580\u2584",
    "  \u2580\u2584",
    " \u2580\u2580 "
  ],
  "4": [
    " \u2588 \u2588",
    " \u2580\u2580\u2588",
    "   \u2580"
  ],
  "5": [
    " \u2588\u2580\u2580",
    " \u2580\u2580\u2584",
    " \u2580\u2580 "
  ],
  "6": [
    " \u2584\u2580\u2580",
    " \u2588\u2580\u2584",
    " \u2580\u2580 "
  ],
  "7": [
    " \u2580\u2580\u2588",
    "  \u2584\u2580",
    "  \u2588 "
  ],
  "8": [
    " \u2584\u2580\u2584",
    " \u2584\u2580\u2584",
    "  \u2580 "
  ],
  "9": [
    " \u2584\u2580\u2584",
    "  \u2580\u2588",
    "  \u2580 "
  ],
  "!": [
    " \u2588 ",
    " \u2580 ",
    " \u2580 "
  ],
  "?": [
    " \u2580\u2580\u2584",
    "  \u2584\u2580",
    "  \u2580 "
  ],
  ".": [
    "   ",
    "   ",
    " \u2580 "
  ],
  ",": [
    "    ",
    "    ",
    " \u2580\u2588 "
  ],
  ":": [
    " \u2584 ",
    "   ",
    " \u2580 "
  ],
  ";": [
    " \u2584\u2584 ",
    "    ",
    " \u2580\u2588 "
  ],
  "-": [
    "     ",
    " \u2584\u2584\u2584 ",
    "     "
  ],
  _: [
    "     ",
    "     ",
    " \u2580\u2580\u2580 "
  ],
  "/": [
    "   \u2588 ",
    "  \u2588  ",
    " \u2580   "
  ]
};

// packages/ansi-headings/src/headings.ts
source_default.level = 3;
var glyphs = glyphs_default;
function renderGlyphRows(text2, color) {
  const chars = text2.toUpperCase().split("");
  const rows = ["  ", "  ", "  "];
  for (const ch of chars) {
    const glyph = glyphs[ch] ?? glyphs[" "];
    rows[0] += glyph[0];
    rows[1] += glyph[1];
    rows[2] += glyph[2];
  }
  const colorize = source_default[color] ?? source_default.cyan;
  return [colorize(rows[0]), colorize(rows[1]), colorize(rows[2])];
}
function renderHeading({ word, color = "cyan", event, tone, width = 60, caption }) {
  const glyphRows = renderGlyphRows(word, color);
  const gutter = 2;
  const composed = glyphRows.map((g, i) => g + " ".repeat(gutter)).join("\n");
  return "\n" + composed;
}
var EMPTY_CHECKBOX_ROWS = [" \u2588\u2580\u2580\u2580\u2588", " \u2588   \u2588", " \u2588\u2584\u2584\u2584\u2588"];
var CHECKED_CHECKBOX_ROWS = [" \u2588\u2580\u2580\u2580\u2588", " \u2588\u2584 \u2588\u2588", " \u2588\u2584\u2588\u2584\u2588"];
function wrapDescription(description, width) {
  const lines = [];
  for (const sourceLine of description.trim().split(/\r?\n/)) {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (Array.from(next).length <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}
function renderCheckboxHeading(value, legacyColor = "green") {
  const args = typeof value === "string" ? { caption: value, checked: true, color: legacyColor } : value;
  const color = args.color ?? "green";
  const colorize = source_default[color] ?? source_default.green;
  const rows = (args.checked ? CHECKED_CHECKBOX_ROWS : EMPTY_CHECKBOX_ROWS).map((r) => colorize(r));
  const gutter = 2;
  const textIndent = Array.from(EMPTY_CHECKBOX_ROWS[0]).length + gutter;
  const descriptionWidth = Math.max(20, (args.width ?? 60) - textIndent);
  const description = args.description?.trim() ? wrapDescription(args.description, descriptionWidth) : [];
  const slots = [
    source_default.bold(colorize(args.caption)),
    description[0] ? source_default.gray(description[0]) : "",
    description[1] ? source_default.gray(description[1]) : ""
  ];
  const composed = rows.map((r, i) => r + " ".repeat(gutter) + slots[i]);
  for (const line of description.slice(2)) {
    composed.push(" ".repeat(textIndent) + source_default.gray(line));
  }
  return "\n" + composed.join("\n");
}

// src/tools/exit-plan.ts
source_default.level = 3;
defineTool({
  matches: "ExitPlanMode",
  pre(input) {
    const lines = [];
    if (input.plan) {
      lines.push(input.plan);
    }
    return { lines };
  },
  post(input, result, durationMs) {
    const heading = renderHeading({
      word: "YEET FAFO",
      color: "cyan",
      event: "stop"
    });
    return {
      lines: heading.split("\n")
    };
  }
});

// src/tools/task-shared.ts
source_default.level = 3;
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function text(record, ...keys) {
  if (!record) return void 0;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return void 0;
}
function normalizeStatus(value, fallback = "pending") {
  const normalized = String(value ?? fallback).trim().toLowerCase().replace(/-/g, "_");
  return normalized || fallback;
}
function normalizeTask(value, fallback = {}, fallbackStatus = "pending") {
  const task = asRecord(value);
  const subject = text(task, "subject", "title", "name") ?? text(fallback, "subject", "title", "name");
  if (!subject) return null;
  const id = task?.id ?? task?.taskId ?? fallback.id ?? fallback.task_id;
  const description = text(task, "description", "details") ?? text(fallback, "description", "details");
  const status = normalizeStatus(
    task?.status ?? fallback.status,
    fallbackStatus
  );
  return {
    ...typeof id === "string" || typeof id === "number" ? { id } : {},
    subject,
    ...description ? { description } : {},
    status
  };
}
function taskFromResult(input, result, fallbackStatus) {
  const record = asRecord(result);
  const nested = record?.task ?? record?.item ?? result;
  return normalizeTask(nested, input, fallbackStatus);
}
function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("[") && !trimmed.startsWith("{")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}
function tasksFromResult(result) {
  let candidate = parseMaybeJson(result);
  const record = asRecord(candidate);
  if (record) {
    candidate = parseMaybeJson(
      record.tasks ?? record.items ?? record.result ?? record.output ?? record.content
    );
  }
  if (!Array.isArray(candidate)) return [];
  return candidate.map((item) => normalizeTask(item)).filter((task) => task !== null);
}
function taskAppearance(status) {
  switch (normalizeStatus(status)) {
    case "completed":
      return { caption: "TASK COMPLETED", checked: true, color: "green" };
    case "in_progress":
      return { caption: "TASK STARTED", checked: false, color: "yellow" };
    case "blocked":
      return { caption: "TASK BLOCKED", checked: false, color: "red" };
    case "cancelled":
    case "canceled":
      return { caption: "TASK CANCELLED", checked: false, color: "gray" };
    case "pending":
    case "todo":
      return { caption: "TASK QUEUED", checked: false, color: "cyan" };
    default:
      return { caption: "TASK UPDATED", checked: false, color: "blue" };
  }
}
function renderTask(task, captionOverride) {
  const appearance = taskAppearance(task.status);
  const caption = captionOverride ?? appearance.caption;
  const heading = renderCheckboxHeading({
    caption,
    checked: appearance.checked,
    color: appearance.color,
    description: task.description
  });
  const subjectLabel = task.id == null ? task.subject : `#${task.id}  ${task.subject}`;
  return [
    ...heading.split("\n"),
    "",
    renderBadges(new Badge({ label: subjectLabel, color: appearance.color }))
  ];
}

// src/tools/task-create.ts
source_default.level = 3;
defineTool({
  matches: "TaskCreate",
  pre() {
    return { lines: [] };
  },
  post(input, result, durationMs) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const task = taskFromResult(input, result, "pending");
    if (task) lines.push(...renderTask(task, "ADDED TASK"));
    return { lines };
  }
});

// src/tools/task-update.ts
source_default.level = 3;
defineTool({
  matches: "TaskUpdate",
  pre(input) {
    return { lines: [] };
  },
  post(input, result, durationMs) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const statusChangeTo = result && typeof result === "object" && result.statusChange?.to;
    const status = statusChangeTo || result && typeof result === "object" && result.status || input && typeof input === "object" && input.status || "";
    const normalizedStatus = normalizeStatus(status, "updated");
    const task = taskFromResult(input, result, normalizedStatus);
    if (task) lines.push(...renderTask({ ...task, status: normalizedStatus }));
    else if (result && typeof result === "object") {
      lines.push(renderCard(META_BADGE, formatMetadataCustom(result)));
    }
    return { lines };
  }
});

// src/tools/task-list.ts
source_default.level = 3;
defineTool({
  matches: "TaskList",
  pre() {
    return { lines: [] };
  },
  post(_input, result, durationMs) {
    const lines = [];
    pushDurationLine(lines, durationMs);
    const tasks = tasksFromResult(result);
    for (const [index, task] of tasks.entries()) {
      if (index > 0) lines.push("");
      lines.push(...renderTask(task));
    }
    if (!tasks.length && result && typeof result === "object") {
      lines.push(renderCard(META_BADGE, formatMetadataCustom(result)));
    }
    return { lines, isJson: !tasks.length };
  }
});

// src/tools/browser.ts
source_default.level = 3;
var PRIMARY_KEYS = [
  "url",
  "element",
  "ref",
  "selector",
  "text",
  "key",
  "code",
  "function",
  "filename",
  "path"
];
function formatValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}
defineTool({
  matches: (rawName) => /^mcp__playwright__browser_/i.test(rawName),
  pre(input, ctx) {
    const operation = playwrightOperation(ctx.toolName);
    const lines = [];
    const primaryKey = PRIMARY_KEYS.find((key) => input[key] != null);
    if (primaryKey) lines.push(formatValue(input[primaryKey]));
    for (const [key, value] of Object.entries(input)) {
      if (key === primaryKey || value == null || value === "") continue;
      lines.push(source_default.gray(`${key}: `) + formatValue(value));
    }
    return { lines, extraBadges: operationBadges(operation ? [operation] : []) };
  },
  post(_input, result, durationMs, ctx) {
    const operation = playwrightOperation(ctx.toolName);
    const lines = [];
    pushDurationLine(lines, durationMs);
    const text2 = extractResultText(result);
    if (text2?.trim()) {
      const language = detectOutputLanguage(text2);
      const formatted = language === "json" ? formatJSON(text2) : text2;
      lines.push(renderCard(OUTPUT_BADGE, softCollapse(simpleHighlight(formatted, language))));
    } else if (result && typeof result === "object") {
      lines.push(renderCard(META_BADGE, formatMetadataCustom(result)));
    }
    return {
      lines,
      isJson: !text2?.trim(),
      extraBadges: operationBadges(operation ? [operation] : [])
    };
  }
});

// src/tools/generic.ts
source_default.level = 3;
var PRIMARY_INPUT_KEYS = {
  Bash: ["command"],
  Write: ["file_path", "filePath"],
  Edit: ["file_path", "filePath"],
  Read: ["file_path", "filePath", "file_paths"],
  Glob: ["pattern"],
  Grep: ["pattern"],
  WebFetch: ["url"],
  WebSearch: ["query"],
  Task: ["description", "prompt"],
  Agent: ["description", "prompt"],
  ExitPlanMode: ["plan"],
  TodoWrite: ["todos"],
  mcp__wcgw__BashCommand: ["command", "action_json"],
  mcp__wcgw__FileWriteOrEdit: ["file_path"],
  mcp__wcgw__ReadFiles: ["file_paths"]
};
var GENERIC_PRIMARY_KEYS = [
  "command",
  "file_path",
  "filePath",
  "file_paths",
  "url",
  "query",
  "pattern",
  "prompt",
  "description",
  "plan"
];
function pickPrimaryInput(rawToolName, input) {
  if (!input || typeof input !== "object") return { key: null, value: null };
  const { tool } = parseToolName(rawToolName);
  const candidates = [
    ...PRIMARY_INPUT_KEYS[rawToolName] ?? [],
    ...PRIMARY_INPUT_KEYS[tool] ?? [],
    ...GENERIC_PRIMARY_KEYS
  ];
  for (const key of candidates) {
    const v = input[key];
    if (v != null && v !== "") return { key, value: v };
  }
  return { key: null, value: null };
}
var TOOL_PRIMARY_OUTPUT_KEYS = {
  Read: ["content", "output", "text"],
  Edit: ["diff", "result", "output"],
  MultiEdit: ["diff", "result", "output"],
  Write: ["file_path", "result"],
  Bash: ["stdout", "output"],
  Glob: ["filenames", "result", "output"],
  Grep: ["filenames", "result", "output"],
  WebFetch: ["content", "output", "text"],
  WebSearch: ["results", "output", "text"],
  Task: ["description", "result", "output"],
  Agent: ["description", "result", "output"],
  TodoRead: ["todos", "result", "output"],
  TodoWrite: ["result", "output"],
  ToolSearch: ["results", "output", "text"],
  ExitPlanMode: ["plan", "result"],
  NotebookRead: ["output", "content"],
  NotebookEdit: ["result", "output"]
};
function deconstructToolResult(toolName, result) {
  if (!result || typeof result !== "object") {
    return { primary: typeof result === "string" ? result : null, metadata: null };
  }
  const res = JSON.parse(JSON.stringify(result));
  const { tool } = parseToolName(toolName);
  let primary = "";
  const isArrayLike = Array.isArray(res) || typeof res === "object" && res["0"]?.type;
  if (isArrayLike) {
    const blocks = Array.isArray(res) ? res : Object.values(res);
    const parts2 = [];
    for (const block of blocks) {
      const b = block;
      if (b.type === "text" && b.text) parts2.push(b.text);
      else if (b.type === "image" || b.type === "base64") parts2.push(source_default.yellow("[Image Data]"));
      else if (typeof block === "string") parts2.push(block);
      else if (b.output) parts2.push(b.output);
    }
    if (parts2.length) return { primary: parts2.join("\n\n"), metadata: null };
  }
  const toolKeys = TOOL_PRIMARY_OUTPUT_KEYS[tool] ?? [];
  for (const key of toolKeys) {
    const v = res[key];
    if (v != null) {
      primary = typeof v === "object" ? JSON.stringify(v, null, 2) : String(v);
      delete res[key];
      break;
    }
  }
  const contentKeys = [
    "stdout",
    "output",
    "content",
    "text",
    "message",
    "error",
    "stderr",
    "file-contents-numbered",
    "file_contets_numbered",
    "file-contents",
    "filePath",
    "type"
  ];
  const parts = primary ? [primary] : [];
  for (const key of contentKeys.filter((k) => res[k] != null)) {
    let val = res[key];
    if (primary && typeof val !== "undefined" && primary.includes(String(val).slice(0, 20))) continue;
    if (typeof val === "object" && val !== null) {
      const o = val;
      val = o.text ?? o.output ?? o.content ?? JSON.stringify(o, null, 2);
    }
    if (key === "stderr" || key === "error") {
      parts.push(source_default.red(`\u2A02 ${key.toUpperCase()}:`) + "\n" + val);
    } else if (key === "filePath") {
      parts.push(source_default.cyan("\u{F021A} ") + source_default.bold("Path: ") + val);
    } else if (key === "type") {
      parts.push(source_default.cyan("\u29D6 ") + source_default.bold("Action: ") + val);
    } else {
      parts.push(String(val));
    }
    delete res[key];
  }
  primary = parts.join("\n\n");
  const metadata = Object.keys(res).length ? res : null;
  return { primary: primary || null, metadata };
}
var FIELD_LABELS = {
  command: "Command",
  file_path: "File",
  filePath: "File",
  file_paths: "Files",
  pattern: "Pattern",
  query: "Query",
  url: "URL",
  description: "Description",
  prompt: "Prompt",
  plan: "Plan"
};
function formatValue2(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value);
}
defineGenericTool({
  pre(input, ctx) {
    const rawTool = ctx.toolName;
    const { key: primaryKey, value: primaryValue } = pickPrimaryInput(rawTool, input);
    const lines = [];
    if (primaryValue != null) {
      const formatted = formatValue2(primaryValue);
      const lang = primaryKey === "command" ? "bash" : detectLanguage(formatted, rawTool);
      lines.push(simpleHighlight(formatted, lang));
    }
    for (const [k, label] of Object.entries(FIELD_LABELS)) {
      if (k === primaryKey) continue;
      const v = input[k];
      if (v == null || v === "") continue;
      lines.push(source_default.gray(`${label}: `) + formatValue2(v));
    }
    const operation = playwrightOperation(rawTool);
    return { lines, extraBadges: operationBadges(operation ? [operation] : []) };
  },
  post(input, result, durationMs, ctx) {
    const rawTool = ctx.toolName;
    const { primary, metadata } = deconstructToolResult(rawTool, result);
    const lines = [];
    pushDurationLine(lines, durationMs);
    if (primary) {
      let formatted = primary;
      if (typeof primary === "string") {
        if (isJSON(primary)) formatted = simpleHighlight(formatJSON(primary), "json");
        else if (isCode(primary)) formatted = simpleHighlight(primary, detectLanguage(primary, rawTool));
      }
      lines.push(renderCard(OUTPUT_BADGE, softCollapse(formatted)));
      if (metadata && Object.keys(metadata).length) {
        lines.push(renderCard(META_BADGE, formatMetadataCustom(metadata)));
      }
    } else if (result && typeof result === "object") {
      lines.push(renderCard(META_BADGE, formatMetadataCustom(result)));
    }
    const operation = playwrightOperation(rawTool);
    return {
      lines,
      isJson: !primary,
      extraBadges: operationBadges(operation ? [operation] : [])
    };
  }
});

// src/hooks/index.ts
import fs4 from "node:fs";
import path4 from "node:path";

// src/runtime/debug.ts
import fs3 from "node:fs";
import path3 from "node:path";
var HOME = process.env.HOME || process.env.USERPROFILE || "";
var DEBUG_LOG = path3.join(HOME, ".claude", "debug.log");
function debugLog(scope, ...parts) {
  try {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    const line = parts.map(
      (p) => typeof p === "string" ? p : (() => {
        try {
          return JSON.stringify(p);
        } catch {
          return String(p);
        }
      })()
    ).join(" ");
    fs3.appendFileSync(DEBUG_LOG, `[${ts}] [${scope}] ${line}
`);
  } catch {
  }
}

// src/registry/hook-registry.ts
var REGISTRY2 = /* @__PURE__ */ new Map();
function defineHook(def) {
  REGISTRY2.set(def.event, def);
}
function dispatchHook(event, raw) {
  const def = REGISTRY2.get(event);
  if (!def) {
    debugLog("dispatchHook", "no-handler", event);
    return {};
  }
  const ctx = { event };
  try {
    const input = def.parse(raw);
    return def.handle(input, ctx);
  } catch (e) {
    const detail = e instanceof Error ? e.stack ?? e.message : String(e);
    debugLog("dispatchHook", "handler-error", event, detail);
    return {};
  }
}

// src/hooks/_normalize.ts
function asObject(raw) {
  return raw && typeof raw === "object" ? raw : {};
}
function pickString(o, ...keys) {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string") return v;
  }
  return void 0;
}
function pickNumber(o, ...keys) {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number") return v;
  }
  return null;
}
function pickBool(o, ...keys) {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "boolean") return v;
  }
  return false;
}
function pickAny(o, ...keys) {
  for (const k of keys) {
    if (o[k] !== void 0) return o[k];
  }
  return void 0;
}
function injectToolDiscriminator(toolName, input) {
  const obj = input && typeof input === "object" ? { ...input } : {};
  obj.__tool = toolName;
  return obj;
}

// src/render/render-tool.ts
function renderToolSection({
  phase,
  toolName,
  input,
  result,
  durationMs = null,
  extraTopBadges = []
}) {
  const def = getToolDefinition(toolName);
  const ctx = { toolName };
  let section = { lines: [] };
  if (phase === "pre" && def.pre) {
    section = def.pre(input, ctx);
  } else if (phase === "post" && def.post) {
    section = def.post(input, result, durationMs, ctx);
  }
  const main = new Badge({ toolName });
  const badges = [main, ...extraTopBadges];
  if (phase === "post") {
    badges.push(
      section.isJson ? new Badge({ label: "JSON", color: "green" }) : new Badge({ label: "OUTPUT", color: "brightGreen" })
    );
  }
  for (const b of section.extraBadges ?? []) badges.push(b);
  const badge = renderBadges(...badges);
  return renderSection({ badge, lines: section.lines });
}

// src/hooks/index.ts
source_default.level = 3;
var HOME2 = process.env.HOME ?? process.env.USERPROFILE ?? "";
var SYSTEM_PROMPT_PATH = path4.join(HOME2, "system-prompt.md");
var ASCII_DIR = path4.join(HOME2, "Documents", "Prompts", "anime-ascii");
function loadSystemPrompt() {
  try {
    if (fs4.existsSync(SYSTEM_PROMPT_PATH)) return fs4.readFileSync(SYSTEM_PROMPT_PATH, "utf8");
  } catch (e) {
    debugLog("SessionStart", "load-system-prompt", e.message);
  }
  return null;
}
function loadRandomAsciiArt() {
  try {
    if (!fs4.existsSync(ASCII_DIR)) return null;
    const files = fs4.readdirSync(ASCII_DIR).filter((f) => f.endsWith(".txt"));
    if (!files.length) return null;
    const pick = files[Math.floor(Math.random() * files.length)];
    return fs4.readFileSync(path4.join(ASCII_DIR, pick), "utf8");
  } catch (e) {
    debugLog("SessionStart", "load-ascii", e.message);
  }
  return null;
}
defineHook({
  event: "SessionStart",
  parse(raw) {
    const o = asObject(raw);
    const source = pickString(o, "source") ?? "startup";
    return {
      source,
      model: pickString(o, "model"),
      agentType: pickString(o, "agent_type", "agentType")
    };
  },
  handle(input) {
    const systemPrompt = loadSystemPrompt();
    const asciiArt = loadRandomAsciiArt();
    const main = new Badge({ label: `Session:${input.source}`, color: "green", icon: "\u23FB" });
    const badge = input.model ? renderBadges(main, new Badge({ label: input.model, color: "gray" })) : renderBadges(main);
    const lines = [source_default.green("Session started")];
    if (input.agentType) lines.push(source_default.gray("Agent: ") + input.agentType);
    if (systemPrompt) lines.push(source_default.cyan("\u2713 ") + "System prompt loaded from: " + SYSTEM_PROMPT_PATH);
    const isWake = input.source === "compact";
    const headingWord = isWake ? "WAKE UP" : "BEGIN AGAIN";
    const asciiBlock = asciiArt ? "\n" + asciiArt + "\n" : "";
    const heading = renderHeading({
      word: headingWord,
      color: "cyan",
      event: isWake ? "wakeup" : "start"
    });
    return {
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        ...systemPrompt ? { additionalContext: systemPrompt } : {}
      },
      systemMessage: asciiBlock + heading + renderSection({ badge, lines })
    };
  }
});
defineHook({
  event: "SessionEnd",
  parse() {
    return {};
  },
  handle() {
    const heading = renderHeading({ word: "BYE", color: "red", event: "bye" });
    const badge = renderBadges(new Badge({ label: "SessionEnd", color: "red", icon: "\u23FC" }));
    return { systemMessage: heading + renderSection({ badge, lines: [] }) };
  }
});
defineHook({
  event: "Stop",
  parse() {
    return {};
  },
  handle() {
    const heading = renderHeading({ word: "STOP", color: "red", event: "stop" });
    const badge = renderBadges(new Badge({ label: "Stop", color: "red", icon: "\u25A0" }));
    return { systemMessage: heading + renderSection({ badge, lines: [] }) };
  }
});
defineHook({
  event: "SubagentStart",
  parse(raw) {
    const o = asObject(raw);
    return {
      agentId: pickString(o, "agent_id", "agentId"),
      agentType: pickString(o, "agent_type", "agentType")
    };
  },
  handle(input) {
    const heading = renderHeading({ word: "BEGIN", color: "green", event: "agent" });
    const main = new Badge({ label: "SubagentStart", color: "green", icon: "\u2B21" });
    const extras = [];
    if (input.agentType) extras.push(new Badge({ label: input.agentType, color: "gray" }));
    const badge = renderBadges(main, ...extras);
    return { systemMessage: heading + renderSection({ badge, lines: [] }) };
  }
});
defineHook({
  event: "SubagentStop",
  parse(raw) {
    const o = asObject(raw);
    return { agentType: pickString(o, "agent_type", "agentType") };
  },
  handle(input) {
    const badges = [
      new Badge({ label: "SubagentStop", color: "green", icon: "\u231F" })
    ];
    if (input.agentType) {
      badges.push(new Badge({ label: input.agentType, color: "gray" }));
    } else {
      badges.push(new Badge({ label: "Main Process", color: "gray" }));
    }
    const badge = renderBadges(...badges);
    return {
      systemMessage: renderHeading({ word: "GOIN ASLEEP", color: "green", event: "agent" }) + renderSection({ badge, lines: [] })
    };
  }
});
defineHook({
  event: "PreCompact",
  parse(raw) {
    const o = asObject(raw);
    return {
      trigger: pickString(o, "trigger"),
      customInstructions: pickString(o, "custom_instructions", "customInstructions")
    };
  },
  handle(input) {
    const heading = renderHeading({ word: "COMPACT", color: "yellow", event: "compact" });
    const main = new Badge({ label: "PreCompact", color: "yellow", icon: "\u27F3" });
    const badge = input.trigger ? renderBadges(main, new Badge({ label: input.trigger, color: "gray" })) : renderBadges(main);
    const lines = input.customInstructions ? [source_default.gray(input.customInstructions.slice(0, 200))] : [];
    return { systemMessage: heading + renderSection({ badge, lines }) };
  }
});
defineHook({
  event: "PostCompact",
  parse(raw) {
    const o = asObject(raw);
    return { summary: pickString(o, "summary", "compact_summary") };
  },
  handle(input) {
    const heading = renderHeading({ word: "COMPACT", color: "yellow", event: "compact" });
    const badge = renderBadges(new Badge({ label: "PostCompact", color: "yellow", icon: "\u27F3" }));
    const lines = input.summary ? [source_default.gray(input.summary.slice(0, 200))] : [];
    return { systemMessage: heading + renderSection({ badge, lines }) };
  }
});
defineHook({
  event: "InstructionsLoaded",
  parse(raw) {
    const o = asObject(raw);
    return {
      filePath: pickString(o, "file_path", "filePath") ?? "",
      memoryType: pickString(o, "memory_type", "memoryType") ?? "Unknown",
      loadReason: pickString(o, "load_reason", "loadReason") ?? ""
    };
  },
  handle(input) {
    const main = new Badge({ label: `Instructions:${input.memoryType}`, color: "cyan", icon: "\u2713" });
    const badge = input.loadReason ? renderBadges(main, new Badge({ label: input.loadReason, color: "gray" })) : renderBadges(main);
    const lines = [];
    if (input.filePath) lines.push(source_default.gray("File: ") + input.filePath);
    return { systemMessage: renderSection({ badge, lines }) };
  }
});
defineHook({
  event: "UserPromptSubmit",
  parse(raw) {
    const o = asObject(raw);
    return { prompt: pickString(o, "prompt", "user_prompt", "userPrompt") ?? "" };
  },
  handle(input) {
    const badge = renderBadges(new Badge({ label: "UserPromptSubmit", color: "yellow", icon: "\u270E" }));
    const lines = [];
    if (input.prompt) {
      const shown = input.prompt.length > 200 ? input.prompt.slice(0, 200) + "..." : input.prompt;
      lines.push(source_default.gray(shown));
    }
    return { systemMessage: renderSection({ badge, lines }) };
  }
});
defineHook({
  event: "UserPromptExpansion",
  parse(raw) {
    const o = asObject(raw);
    const expanded = pickString(o, "expanded_prompt", "expandedPrompt", "expanded", "prompt") ?? "";
    if (!expanded) debugLog("UserPromptExpansion", "unknown-shape", Object.keys(o));
    return {
      expandedPrompt: expanded,
      originalPrompt: pickString(o, "original_prompt", "originalPrompt")
    };
  },
  handle(input) {
    const badge = renderBadges(new Badge({ label: "UserPromptExpansion", color: "magenta", icon: "\u2731" }));
    const lines = [];
    if (input.expandedPrompt) {
      const shown = input.expandedPrompt.length > 300 ? input.expandedPrompt.slice(0, 300) + "..." : input.expandedPrompt;
      lines.push(source_default.gray(shown));
    }
    return { systemMessage: renderSection({ badge, lines }) };
  }
});
defineHook({
  event: "PostToolBatch",
  parse(raw) {
    return asObject(raw);
  },
  handle() {
    return {};
  }
});
defineHook({
  event: "PostToolUseFailure",
  parse(raw) {
    const o = asObject(raw);
    const toolName = pickString(o, "tool_name", "toolName") ?? "Unknown";
    const rawInput = pickAny(o, "tool_input", "toolInput") ?? {};
    const errorRaw = pickAny(o, "error", "tool_result") ?? "Unknown error";
    const error = typeof errorRaw === "string" || errorRaw && typeof errorRaw === "object" ? errorRaw : "Unknown error";
    return {
      toolName,
      toolInput: injectToolDiscriminator(toolName, rawInput),
      error,
      isInterrupt: pickBool(o, "is_interrupt", "isInterrupt"),
      durationMs: pickNumber(o, "duration_ms", "durationMs")
    };
  },
  handle(input) {
    const main = new Badge({ toolName: input.toolName, color: "red", icon: "\u2A02" });
    const badge = input.isInterrupt ? renderBadges(main, new Badge({ label: "INTERRUPT", color: "yellow" })) : renderBadges(main);
    const lines = [source_default.red("\u2A02 ") + source_default.bold.red("Tool failed:")];
    const err = input.error;
    if (typeof err === "string") lines.push(err);
    else if (typeof err === "object" && err && typeof err.message === "string") lines.push(err.message);
    else lines.push(JSON.stringify(err, null, 2));
    pushDurationLine(lines, input.durationMs);
    return {
      hookSpecificOutput: {
        hookEventName: "PostToolUseFailure",
        additionalContext: typeof err === "string" ? err : JSON.stringify(err)
      },
      systemMessage: renderSection({ badge, lines, dividerColor: "red" })
    };
  }
});
defineHook({
  event: "PreToolUse",
  parse(raw) {
    const o = asObject(raw);
    const toolName = pickString(o, "tool_name", "toolName") ?? "Unknown";
    const rawInput = pickAny(o, "tool_input", "toolInput") ?? {};
    return {
      toolName,
      toolInput: injectToolDiscriminator(toolName, rawInput),
      sessionId: pickString(o, "session_id", "sessionId")
    };
  },
  handle(input) {
    const systemMessage = renderToolSection({
      phase: "pre",
      toolName: input.toolName,
      input: input.toolInput
    });
    return { systemMessage };
  }
});
defineHook({
  event: "PostToolUse",
  parse(raw) {
    const o = asObject(raw);
    const toolName = pickString(o, "tool_name", "toolName") ?? "Unknown";
    const rawInput = pickAny(o, "tool_input", "toolInput") ?? {};
    const toolResponse = pickAny(o, "tool_response", "tool_result", "toolResult") ?? null;
    return {
      toolResponse,
      toolName,
      toolInput: injectToolDiscriminator(toolName, rawInput),
      sessionId: pickString(o, "session_id", "sessionId"),
      durationMs: pickNumber(o, "duration_ms", "durationMs")
    };
  },
  handle(input) {
    const systemMessage = renderToolSection({
      phase: "post",
      toolName: input.toolName,
      input: input.toolInput,
      result: input.toolResponse,
      durationMs: input.durationMs
    });
    return { systemMessage };
  }
});

// src/runtime/io.ts
function readInput() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8")));
    process.stdin.on("end", () => {
      const raw = chunks.join("");
      if (!raw.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        debugLog("readInput", "parse-fail", e.message, raw.slice(0, 200));
        resolve(null);
      }
    });
  });
}
var MAX_SYSTEM_MESSAGE_CHARS = 9980;
var TRIM_MARKER = "\x1B[0m\n\x1B[90m\x1B[3m  \u2026 trimmed to fit the 10KB hook display limit\x1B[0m";
function fitSystemMessage(message) {
  if (message.length <= MAX_SYSTEM_MESSAGE_CHARS) return message;
  const budget = MAX_SYSTEM_MESSAGE_CHARS - TRIM_MARKER.length;
  const kept = [];
  let used = 0;
  for (const line of message.split("\n")) {
    if (used + line.length + 1 > budget) break;
    kept.push(line);
    used += line.length + 1;
  }
  return kept.join("\n") + TRIM_MARKER;
}
var CLEAR_LINE_PREFIX = "\x1B[1A\x1B[2K\r";
function writeOutput(data, { mirrorSystemMessageToStderr = true } = {}) {
  if (typeof data.systemMessage === "string" && data.systemMessage.length > 0) {
    data.systemMessage = CLEAR_LINE_PREFIX + fitSystemMessage(data.systemMessage);
    if (mirrorSystemMessageToStderr) process.stderr.write(data.systemMessage + "\n");
  }
  process.stdout.write(JSON.stringify(data, null, 2));
  process.exit(0);
}

// src/runtime/run-hook.ts
async function runHook(name, handler) {
  const mirrorSystemMessageToStderr = name !== "PreToolUse" && name !== "PostToolUse";
  try {
    const data = await readInput();
    const out = await handler(data ?? {}) ?? {};
    writeOutput({ ...out }, { mirrorSystemMessageToStderr });
  } catch (err) {
    const detail = err instanceof Error ? err.stack ?? err.message : String(err);
    debugLog(name, "CRASH", detail);
    writeOutput({}, { mirrorSystemMessageToStderr });
  }
  process.exit(0);
}

// src/types/hook-events.ts
var HOOK_EVENT_NAMES = [
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PostToolBatch",
  "SessionStart",
  "SessionEnd",
  "PreCompact",
  "PostCompact",
  "InstructionsLoaded",
  "UserPromptSubmit",
  "UserPromptExpansion",
  "SubagentStart",
  "SubagentStop",
  "Stop"
];
function isHookEventName(x) {
  return typeof x === "string" && HOOK_EVENT_NAMES.includes(x);
}

// hooks/bin/bind.ts
var argEvent = process.argv[2];
if (!isHookEventName(argEvent)) {
  debugLog("bind", "unknown-event", String(argEvent));
  process.stdout.write("{}");
  process.exit(0);
}
await runHook(argEvent, (raw) => dispatchHook(argEvent, raw));
