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
    ChunkStream.prototype._processReadAllowingLess = function(read2) {
      this._reads.shift();
      let smallerBuf = this._buffers[0];
      if (smallerBuf.length > read2.length) {
        this._buffered -= read2.length;
        this._buffers[0] = smallerBuf.slice(read2.length);
        read2.func.call(this, smallerBuf.slice(0, read2.length));
      } else {
        this._buffered -= smallerBuf.length;
        this._buffers.shift();
        read2.func.call(this, smallerBuf);
      }
    };
    ChunkStream.prototype._processRead = function(read2) {
      this._reads.shift();
      let pos = 0;
      let count = 0;
      let data = Buffer.alloc(read2.length);
      while (pos < read2.length) {
        let buf = this._buffers[count++];
        let len = Math.min(buf.length, read2.length - pos);
        buf.copy(data, pos, 0, len);
        pos += len;
        if (len !== buf.length) {
          this._buffers[--count] = buf.slice(len);
        }
      }
      if (count > 0) {
        this._buffers.splice(0, count);
      }
      this._buffered -= read2.length;
      read2.func.call(this, data);
    };
    ChunkStream.prototype._process = function() {
      try {
        while (this._buffered > 0 && this._reads && this._reads.length > 0) {
          let read2 = this._reads[0];
          if (read2.allowLess) {
            this._processReadAllowingLess(read2);
          } else if (this._buffered >= read2.length) {
            this._processRead(read2);
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
        let read2 = this._reads[0];
        if (this._buffer.length && (this._buffer.length >= read2.length || read2.allowLess)) {
          this._reads.shift();
          let buf = this._buffer;
          this._buffer = buf.slice(read2.length);
          read2.func.call(this, buf.slice(0, read2.length));
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
        load: function load(path9) {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", path9, true);
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

// src/hooks.ts
import fs8 from "node:fs";
import path8 from "node:path";

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
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
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

// src/ansi/chalk.ts
source_default.level = 3;
var GRAY_SPREAD = 12;
function ansi256(hex) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [value >> 16 & 255, value >> 8 & 255, value & 255];
  if (Math.max(r, g, b) - Math.min(r, g, b) < GRAY_SPREAD) {
    const gray = Math.round((r + g + b) / 3);
    if (gray < 8)
      return 16;
    if (gray > 238)
      return 231;
    return 232 + Math.min(23, Math.round((gray - 8) / 10));
  }
  const cube = (channel) => channel < 48 ? 0 : channel < 115 ? 1 : Math.min(5, Math.round((channel - 35) / 40));
  return 16 + 36 * cube(r) + 6 * cube(g) + cube(b);
}
var paint256 = {
  fg: (hex) => source_default.ansi256(ansi256(hex)),
  bg: (hex) => source_default.bgAnsi256(ansi256(hex))
};
var ink = {
  dim: source_default.gray,
  note: source_default.gray.italic,
  ok: source_default.green,
  warn: source_default.yellow,
  err: source_default.red,
  key: source_default.cyan,
  str: source_default.green,
  num: source_default.yellow,
  punct: source_default.gray,
  accent: source_default.cyan,
  strong: source_default.bold
};

// src/lib/data.ts
import fs from "node:fs";
import path from "node:path";
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function pickString(source, ...keys) {
  const record = asRecord(source);
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim())
      return value;
  }
  return null;
}
function pickNumber(source, ...keys) {
  const record = asRecord(source);
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value))
      return value;
  }
  return null;
}
function pickBool(source, ...keys) {
  const record = asRecord(source);
  return keys.some((key) => record?.[key] === true);
}
function pickAny(source, ...keys) {
  const record = asRecord(source);
  for (const key of keys)
    if (record?.[key] !== void 0 && record[key] !== null)
      return record[key];
  return void 0;
}
function pickId(source, ...keys) {
  const value = pickAny(source, ...keys);
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}
function parseJsonish(value) {
  if (typeof value !== "string")
    return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("["))
    return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}
var PERSISTED_RE = /<persisted-output>[\s\S]*?(?:saved to:|→)\s*(\S+)[\s\S]*?<\/persisted-output>/g;
function expandPersistedOutput(text) {
  if (!text.includes("<persisted-output>"))
    return text;
  return text.replace(PERSISTED_RE, (match, file) => {
    try {
      return fs.readFileSync(file, "utf8");
    } catch {
      return match;
    }
  });
}
function textOfBlocks(blocks) {
  const text = blocks.map((block) => typeof block === "string" ? block : pickString(block, "text", "output")).filter((part) => part !== null).join("\n");
  return text || null;
}
function rawResultText(result) {
  if (typeof result === "string")
    return result;
  if (Array.isArray(result))
    return textOfBlocks(result);
  const record = asRecord(result);
  if (!record)
    return null;
  if (asRecord(record["0"])?.type === "text")
    return textOfBlocks(Object.values(record));
  const candidate = pickAny(record, "stdout", "output", "text", "content");
  if (typeof candidate === "string")
    return candidate;
  return candidate && typeof candidate === "object" ? rawResultText(candidate) : null;
}
function resultText(result) {
  const text = rawResultText(result);
  return text === null ? null : expandPersistedOutput(text);
}
function resultRecord(result) {
  return asRecord(result) ?? asRecord(parseJsonish(resultText(result)));
}
function displayPath(filePath, cwd = process.cwd(), home = process.env.HOME ?? process.env.USERPROFILE ?? "") {
  const text = String(filePath);
  const candidates = [text];
  if (cwd && text.startsWith(cwd + path.sep))
    candidates.push(text.slice(cwd.length + 1));
  if (home && (text === home || text.startsWith(home + path.sep)))
    candidates.push("~" + text.slice(home.length));
  return candidates.reduce((best, candidate) => candidate.length < best.length ? candidate : best);
}

// src/render/file-card.ts
import fs4 from "node:fs";
import path3 from "node:path";

// packages/image-to-ascii/src/decode.ts
var import_pngjs = __toESM(require_png(), 1);
var import_jpeg_js = __toESM(require_jpeg_js(), 1);
import { execFileSync } from "node:child_process";
import fs2 from "node:fs";
import os2 from "node:os";
import path2 from "node:path";
function decodeWebp(buffer) {
  const base = path2.join(os2.tmpdir(), `claude-webp-${process.pid}-${Date.now()}`);
  const inPath = `${base}.webp`;
  const outPath = `${base}.png`;
  try {
    fs2.writeFileSync(inPath, buffer);
    execFileSync("sips", ["-s", "format", "png", inPath, "--out", outPath], { stdio: "ignore" });
    return import_pngjs.PNG.sync.read(fs2.readFileSync(outPath));
  } finally {
    try {
      fs2.unlinkSync(inPath);
    } catch {
    }
    try {
      fs2.unlinkSync(outPath);
    } catch {
    }
  }
}
function decodeImage(buffer, ext) {
  const normalizedExt = ext.toLowerCase().replace(/^\./, "");
  let img;
  try {
    if (normalizedExt === "png")
      img = import_pngjs.PNG.sync.read(buffer);
    else if (normalizedExt === "jpg" || normalizedExt === "jpeg")
      img = import_jpeg_js.default.decode(buffer, { useTArray: true });
    else if (normalizedExt === "webp")
      img = decodeWebp(buffer);
    else
      return null;
  } catch {
    return null;
  }
  return img.width && img.height ? img : null;
}

// packages/image-to-ascii/src/budget.ts
var BG_RESET = "\x1B[49m";
var ESC = "\x1B";
function countOccurrences(haystack, needle) {
  let count = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    count++;
    at = haystack.indexOf(needle, at + needle.length);
  }
  return count;
}
function costOf(lines, spec) {
  const perRow = spec.perRow ?? 0;
  const bgSurcharge = spec.bgResetSurcharge ?? 0;
  const escSurcharge = spec.escapeSurcharge ?? 0;
  let total = spec.overhead ?? 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    total += (spec.bytes ? Buffer.byteLength(line, "utf8") : line.length) + perRow;
    if (i > 0) total += 1;
    if (bgSurcharge) total += countOccurrences(line, BG_RESET) * bgSurcharge;
    if (escSurcharge) total += countOccurrences(line, ESC) * escSurcharge;
  }
  return total;
}

// packages/image-to-ascii/src/glyphs/types.ts
function basis(id, cols, rows) {
  return { id, cols, rows, size: cols * rows };
}
var BASES = {
  "1x1": basis("1x1", 1, 1),
  "1x2": basis("1x2", 1, 2),
  "2x2": basis("2x2", 2, 2),
  "2x3": basis("2x3", 2, 3),
  "2x4": basis("2x4", 2, 4),
  "1x8": basis("1x8", 1, 8),
  "8x1": basis("8x1", 8, 1),
  "4x6": basis("4x6", 4, 6)
};

// packages/image-to-ascii/src/imageToTerm.ts
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
    if (r < 8)
      return 16;
    if (r > 238)
      return 231;
    return 232 + Math.min(23, Math.round((r - 8) / 10));
  }
  return 16 + 36 * cubeIdx(r) + 6 * cubeIdx(g) + cubeIdx(b);
}
var FG_RESET = "\x1B[39m";
var BG_RESET2 = "\x1B[49m";
function imageToAsciiSimple(buffer, ext, maxWidth = 80) {
  const img = decodeImage(buffer, ext);
  if (!img)
    return null;
  const { width, height, data } = img;
  if (!width || !height)
    return null;
  const render = (cols, attempt) => {
    const scale = Math.max(1, width / cols, height / (MAX_ROWS * 2));
    const targetWidth = Math.max(1, Math.round(width / scale));
    const pxRows = Math.max(1, Math.round(height / scale));
    const sgrTail = attempt.palette ? (r, g, b) => `5;${to256(r, g, b)}` : (r, g, b) => `2;${r & attempt.mask};${g & attempt.mask};${b & attempt.mask}`;
    const px = (col, row) => {
      const idx = (Math.min(height - 1, Math.floor(row * scale)) * width + Math.min(width - 1, Math.floor(col * scale))) * 4;
      if ((data[idx + 3] ?? 255) < ALPHA_OPAQUE)
        return null;
      return sgrTail(data[idx] ?? 0, data[idx + 1] ?? 0, data[idx + 2] ?? 0);
    };
    const lines = [];
    for (let y = 0; y < pxRows; y += 2) {
      let line = "";
      let fg2 = null;
      let bg2 = null;
      const put = (char, wantFg, wantBg) => {
        const parts = [];
        if (wantFg !== null && wantFg !== fg2) {
          parts.push(`38;${wantFg}`);
          fg2 = wantFg;
        }
        if (wantBg !== bg2) {
          parts.push(wantBg === null ? "49" : `48;${wantBg}`);
          bg2 = wantBg;
        }
        line += parts.length ? `\x1B[${parts.join(";")}m${char}` : char;
      };
      for (let x = 0; x < targetWidth; x++) {
        const top = px(x, y);
        const bottom = y + 1 < pxRows ? px(x, y + 1) : null;
        if (top === null && bottom === null)
          put(" ", null, null);
        else if (top !== null && bottom === null)
          put("\u2580", top, null);
        else if (top === null && bottom !== null)
          put("\u2584", bottom, null);
        else if (top === bottom)
          put("\u2588", top, null);
        else
          put("\u2580", top, bottom);
      }
      if (fg2 !== null)
        line += FG_RESET;
      if (bg2 !== null)
        line += BG_RESET2;
      lines.push(line);
    }
    return lines.join("\n");
  };
  let out = "";
  const requestedMax = Number.isFinite(maxWidth) ? Math.max(1, Math.floor(maxWidth)) : 80;
  for (let cols = Math.min(width, requestedMax); ; ) {
    for (const attempt of ATTEMPTS) {
      out = render(cols, attempt);
      if (out.length <= BYTE_BUDGET)
        return out;
    }
    if (cols <= MIN_COLS)
      break;
    cols = Math.max(MIN_COLS, Math.floor(cols * 0.85));
  }
  return out;
}

// packages/image-to-ascii/src/index.ts
var PALETTE_256 = (() => {
  const levels = [0, 95, 135, 175, 215, 255];
  const out = [];
  for (let i = 0; i < 16; i++) {
    const v = i & 8 ? 255 : 128;
    out.push({ r: i & 1 ? v : 0, g: i & 2 ? v : 0, b: i & 4 ? v : 0 });
  }
  for (let i = 16; i < 232; i++) {
    const j = i - 16;
    out.push({ r: levels[j / 36 | 0], g: levels[(j / 6 | 0) % 6], b: levels[j % 6] });
  }
  for (let i = 232; i < 256; i++) {
    const v = 8 + (i - 232) * 10;
    out.push({ r: v, g: v, b: v });
  }
  return out;
})();

// src/ansi/text.ts
var OSC_SEQUENCE = /\x1b\][^\x07]*(?:\x07|\x1b\\)/g;
var CSI_SEQUENCE = /(?:\x1b\[|\x9b)[0-?]*[ -/]*[@-~]/g;
var SGR_SEQUENCE = /\x1b\[([0-9;]*)m/g;
function stripAnsi(value) {
  return String(value).replace(OSC_SEQUENCE, "").replace(CSI_SEQUENCE, "");
}
function sgrAttributes(raw) {
  const values = (raw || "0").split(";");
  const attributes = [];
  for (let index = 0; index < values.length; index++) {
    const code = values[index];
    const extended = code === "38" || code === "48";
    const length = !extended ? 1 : values[index + 1] === "2" ? 5 : values[index + 1] === "5" ? 3 : 1;
    attributes.push(values.slice(index, index + length));
    index += length - 1;
  }
  return attributes;
}
var isBackground = ([code]) => {
  const number = Number(code);
  return number === 48 || number === 49 || number >= 40 && number <= 47 || number >= 100 && number <= 107;
};
function stripBackground(value) {
  return String(value).replace(SGR_SEQUENCE, (_sequence, raw) => {
    const kept = sgrAttributes(raw).filter((attribute) => !isBackground(attribute));
    return kept.length ? `\x1B[${kept.flat().join(";")}m` : "";
  });
}
function reseatBackground(line, background) {
  return String(line).replace(SGR_SEQUENCE, (_sequence, raw) => {
    const kept = sgrAttributes(raw).flatMap((attribute) => attribute[0] === "49" ? [[background]] : Number(attribute[0]) === 0 ? [attribute, [background]] : [attribute]);
    return `\x1B[${kept.flat().join(";")}m`;
  });
}
function* tokens(input) {
  for (let index = 0; index < input.length; ) {
    CSI_SEQUENCE.lastIndex = index;
    const sequence = CSI_SEQUENCE.exec(input);
    if (sequence?.index === index) {
      yield { text: sequence[0], visible: false };
      index += sequence[0].length;
      continue;
    }
    const codePoint = input.codePointAt(index);
    const text = String.fromCodePoint(codePoint);
    yield { text, visible: true };
    index += text.length;
  }
}
function expandTabs(text, tabSize = 4) {
  let column = 0;
  let output = "";
  for (const token of tokens(String(text))) {
    if (!token.visible) {
      output += token.text;
      continue;
    }
    if (token.text === "	") {
      const count = tabSize - column % tabSize;
      output += " ".repeat(count);
      column += count;
    } else {
      output += token.text;
      column += 1;
    }
  }
  return output;
}
function normalizeCardLine(line, keepBackground = false) {
  const styledOnly = String(line).replace(OSC_SEQUENCE, "").replace(CSI_SEQUENCE, (sequence) => sequence.endsWith("m") ? sequence : "");
  const seated = keepBackground ? styledOnly : stripBackground(styledOnly);
  return expandTabs(seated.replace(/[\x00-\x08\x0b-\x1a\x1c-\x1f\x7f\r]/g, ""));
}
function visibleWidth(value) {
  return Array.from(expandTabs(stripAnsi(value))).length;
}
function wrapAnsi(text, width) {
  if (width <= 0)
    return [String(text)];
  const lines = [];
  let line = "";
  let visible = 0;
  for (const token of tokens(String(text))) {
    if (token.visible && visible === width) {
      lines.push(line);
      line = "";
      visible = 0;
    }
    line += token.text;
    if (token.visible)
      visible += 1;
  }
  lines.push(line);
  return lines;
}
function truncateAnsi(text, maxVisible, ellipsis = "\u2026") {
  let out = "";
  let visible = 0;
  for (const token of tokens(String(text))) {
    if (token.visible && visible >= maxVisible)
      break;
    out += token.text;
    if (token.visible)
      visible += 1;
  }
  return out + "\x1B[0m" + ellipsis;
}
function truncateChars(text, maxChars, ellipsis = "\u2026") {
  const reset = "\x1B[0m";
  const room = maxChars - reset.length - ellipsis.length;
  if (text.length <= maxChars)
    return text;
  let out = "";
  for (const token of tokens(text)) {
    if (out.length + token.text.length > room)
      break;
    out += token.text;
  }
  return out + reset + ellipsis;
}
function wrapText(text, width) {
  if (width <= 0)
    return text;
  return String(text).split("\n").map((line) => {
    const out = [];
    let current = "";
    for (const word of line.split(/ +/))
      if (!current)
        current = word;
      else if (current.length + 1 + word.length <= width)
        current += " " + word;
      else {
        out.push(current);
        current = word;
      }
    out.push(current);
    return out.join("\n");
  }).join("\n");
}
function firstLine(value, maxLength) {
  const line = String(value ?? "").split("\n")[0] ?? "";
  return maxLength == null ? line : line.slice(0, maxLength);
}
function trimBlankEdges(text) {
  return String(text).replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, "");
}
function clampLines(text, maxLines) {
  const lines = String(text).split("\n");
  const keep = Math.max(0, Math.floor(maxLines));
  return lines.length <= keep ? { text: String(text), omitted: 0 } : { text: lines.slice(0, keep).join("\n"), omitted: lines.length - keep };
}
var omittedNote = (omitted, label = "lines") => ink.note(`  \u2026 ${omitted.toLocaleString("en-US")} more ${label} omitted \u2026`);
function collapse(text, maxLines, { label = "lines", paint = (head) => head } = {}) {
  const { text: head, omitted } = clampLines(text, maxLines);
  if (!omitted)
    return paint(head);
  return head ? paint(head) + "\n" + omittedNote(omitted, label) : omittedNote(omitted, label);
}
var FLAG_OPEN = {
  bold: "1",
  dim: "2",
  italic: "3",
  underline: "4",
  blink: "5",
  inverse: "7",
  hidden: "8",
  strike: "9",
  overline: "53"
};
var FLAG_CLOSE = {
  bold: "22",
  dim: "22",
  italic: "23",
  underline: "24",
  blink: "25",
  inverse: "27",
  hidden: "28",
  strike: "29",
  overline: "55"
};
var FLAGS = Object.keys(FLAG_OPEN);
var OPEN_FLAG = new Map([...FLAGS.map((flag) => [FLAG_OPEN[flag], flag]), ["6", "blink"]]);
var CLOSE_FLAGS = /* @__PURE__ */ new Map();
for (const flag of FLAGS)
  CLOSE_FLAGS.set(FLAG_CLOSE[flag], [...CLOSE_FLAGS.get(FLAG_CLOSE[flag]) ?? [], flag]);
var BLANK_FLAGS = /* @__PURE__ */ new Set(["underline", "inverse", "strike", "overline"]);
var PLAIN = { fg: null, bg: null, on: /* @__PURE__ */ new Set() };
var isColor = (code, base) => code >= base && code <= base + 7 || code >= base + 60 && code <= base + 67;
function applyCode(draft, code) {
  const number = Number(code);
  if (number === 0) {
    draft.fg = null;
    draft.bg = null;
    draft.on.clear();
  } else if (number === 39)
    draft.fg = null;
  else if (number === 49)
    draft.bg = null;
  else if (isColor(number, 30))
    draft.fg = code;
  else if (isColor(number, 40))
    draft.bg = code;
  else if (OPEN_FLAG.has(code))
    draft.on.add(OPEN_FLAG.get(code));
  else
    for (const flag of CLOSE_FLAGS.get(code) ?? [])
      draft.on.delete(flag);
}
function applySgr(style, params) {
  const draft = { fg: style.fg, bg: style.bg, on: new Set(style.on) };
  for (const attribute of sgrAttributes(params))
    if (attribute.length === 1)
      applyCode(draft, String(Number(attribute[0])));
    else if (attribute[0] === "38")
      draft.fg = attribute.join(";");
    else
      draft.bg = attribute.join(";");
  return draft;
}
function flagChanges(from, to, counts) {
  const closes = FLAGS.filter((flag) => counts(flag) && from.on.has(flag) && !to.on.has(flag)).map((flag) => FLAG_CLOSE[flag]);
  const params = [...new Set(closes)];
  const reopen = (flag) => !from.on.has(flag) || params.includes(FLAG_CLOSE[flag]);
  for (const flag of FLAGS)
    if (counts(flag) && to.on.has(flag) && reopen(flag))
      params.push(FLAG_OPEN[flag]);
  return params;
}
function colorChanges(from, to, blank) {
  const params = [];
  if (!blank && from.fg !== to.fg)
    params.push(to.fg ?? "39");
  if (from.bg !== to.bg)
    params.push(to.bg ?? "49");
  return params;
}
function transition(from, to, blank) {
  const counts = (flag) => !blank || BLANK_FLAGS.has(flag);
  const params = [...flagChanges(from, to, counts), ...colorChanges(from, to, blank)];
  if (!params.length)
    return "";
  const reset = !blank && to.fg === null && to.bg === null && to.on.size === 0 && params.length > 1;
  return reset ? "\x1B[0m" : `\x1B[${params.join(";")}m`;
}
function settle(from, to, blank) {
  if (!blank)
    return to;
  const on = /* @__PURE__ */ new Set();
  for (const flag of FLAGS)
    if ((BLANK_FLAGS.has(flag) ? to : from).on.has(flag))
      on.add(flag);
  return { fg: from.fg, bg: to.bg, on };
}
var STREAM_TOKEN = /\x1b\[([0-9;]*)m|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|(?:\x1b\[|\x9b)[0-?]*[ -/]*[@-~]|\n|( +)|[^\x1b\x9b\n ]+|[\s\S]/g;
function compactAnsi(text) {
  let out = "";
  let current = PLAIN;
  let desired = PLAIN;
  for (const [token, sgr, spaces] of String(text).matchAll(STREAM_TOKEN))
    if (sgr !== void 0)
      desired = applySgr(desired, sgr);
    else if (token === "\n") {
      out += transition(current, PLAIN, false) + token;
      current = PLAIN;
    } else if (token.charCodeAt(0) === 27 || token.charCodeAt(0) === 155)
      out += token;
    else {
      const blank = spaces !== void 0 && !current.on.has("inverse") && !desired.on.has("inverse");
      out += transition(current, desired, blank) + token;
      current = settle(current, desired, blank);
    }
  return out + transition(current, PLAIN, false);
}

// src/ansi/highlight.ts
function isJSON(value) {
  if (typeof value !== "string")
    return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed[0] !== "{" && trimmed[0] !== "[")
    return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}
function formatJSON(content) {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
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
  env: "bash",
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  py: "python",
  pyi: "python",
  yaml: "yaml",
  yml: "yaml",
  toml: "yaml",
  ini: "yaml",
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
  sql: "sql"
};
function langFromPath(filePath) {
  const match = String(filePath ?? "").match(/\.([^./\s]+)$/);
  return match ? EXT_TO_LANG[match[1].toLowerCase()] ?? null : null;
}
function shebangLanguage(content) {
  const interpreter = content.match(/^#!\s*\S*?\/(?:env\s+)?([\w.-]+)/)?.[1];
  if (!interpreter)
    return null;
  if (/^(ba|z|da|k|)sh$/.test(interpreter))
    return "bash";
  if (/^python/.test(interpreter))
    return "python";
  return /^(node|bun|deno)/.test(interpreter) ? "javascript" : null;
}
var CONTENT_CHECKS = [
  ["diff", (c) => /^diff --git /m.test(c) || /^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/m.test(c) || /^--- \S/m.test(c) && /^\+\+\+ \S/m.test(c)],
  ["html", (_, head) => /^<!DOCTYPE html/i.test(head) || /^<(html|head|body)\b/i.test(head)],
  ["xml", (_, head) => /^<\?xml/.test(head)],
  ["sql", (c) => /^\s*(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE (TABLE|INDEX|VIEW)|ALTER TABLE)\b/im.test(c)],
  ["python", (c) => /^\s*(def|class)\s+\w+.*:\s*$/m.test(c) || /^(from \w[\w.]* import|import \w+)\s*$/m.test(c)],
  ["typescript", (c) => /^\s*(export\s+)?(interface|type|enum)\s+\w+/m.test(c) || /:\s*(string|number|boolean|void|unknown|never)\b/.test(c)],
  ["javascript", (c) => /^(import|export)\s.*from\s+['"]/m.test(c) || /^\s*(const|let|var|function)\s+\w/m.test(c) || /=>\s*[{(]/.test(c)],
  ["markdown", (c) => /^#{1,6}\s+\S/m.test(c) && (/^\s*[-*+]\s+\S/m.test(c) || /```/.test(c))]
];
function detectContentLanguage(content) {
  if (isJSON(content))
    return "json";
  const shebang = shebangLanguage(content);
  if (shebang)
    return shebang;
  const head = content.trimStart();
  const match = CONTENT_CHECKS.find(([, test]) => test(content, head));
  if (match)
    return match[0];
  const yamlKeys = content.match(/^[\w."'-]+:(\s+\S|$)/gm);
  return yamlKeys && yamlKeys.length >= 2 && !/[{};]/.test(content) ? "yaml" : null;
}
function detectOutputLanguage(text) {
  return detectContentLanguage(text) ?? "output";
}
var WORD = /[\p{L}\p{N}_$]/u;
var lineBefore = ({ src, at }) => src.slice(src.lastIndexOf("\n", at - 1) + 1, at);
var atLineStart = (cursor) => cursor.at === 0 || cursor.src[cursor.at - 1] === "\n";
var atLineHead = (cursor) => /^\s*$/.test(lineBefore(cursor));
var afterSpace = (cursor) => cursor.at === 0 || /\s/.test(cursor.src[cursor.at - 1]);
var wordBoundaryBefore = (cursor) => cursor.at === 0 || !WORD.test(cursor.src[cursor.at - 1]);
function matchLength(rule2, cursor) {
  if (typeof rule2.match === "function")
    return rule2.match(cursor);
  rule2.match.lastIndex = cursor.at;
  return rule2.match.exec(cursor.src)?.[0].length ?? 0;
}
function scan(src, grammar, palette) {
  const cursor = { src, at: 0, state: {}, prev: null };
  let out = "";
  let plain = "";
  while (cursor.at < src.length) {
    const rule2 = grammar.find((candidate) => (!candidate.when || candidate.when(cursor)) && matchLength(candidate, cursor) > 0);
    if (!rule2) {
      const character = src[cursor.at];
      plain += character;
      if (!/\s/.test(character))
        cursor.prev = { type: "plain", text: character };
      cursor.at += 1;
      continue;
    }
    const length = matchLength(rule2, cursor);
    const text = src.slice(cursor.at, cursor.at + length);
    const type = typeof rule2.type === "function" ? rule2.type(text, cursor) : rule2.type;
    out += plain;
    plain = "";
    out += rule2.paint ? rule2.paint(text, cursor) : palette[type]?.(text) ?? text;
    cursor.prev = { type, text };
    cursor.at += length;
  }
  return out + plain;
}
var PALETTE = {
  comment: ink.dim,
  string: ink.str,
  regex: source_default.red,
  number: ink.num,
  literal: ink.num,
  keyword: ink.key,
  key: ink.key,
  call: source_default.magenta,
  command: source_default.magenta,
  decorator: source_default.magenta,
  selector: source_default.magenta,
  variable: ink.num,
  flag: ink.num,
  attr: ink.num,
  operator: ink.dim,
  punct: ink.punct,
  marker: ink.num,
  tag: ink.key,
  heading: source_default.cyanBright,
  quote: ink.note,
  bold: source_default.bold,
  italic: source_default.italic,
  code: source_default.inverse
};
var classify = (sets, fallback, fold = false) => (text) => sets.find(([, words]) => words.has(fold ? text.toLowerCase() : text))?.[0] ?? fallback;
var followedByCall = ({ src, at }, length) => /^\s*\(/.test(src.slice(at + length, at + length + 8));
var JS_KEYWORDS = /* @__PURE__ */ new Set(["const", "let", "var", "function", "return", "if", "else", "for", "while", "class", "import", "export", "from", "async", "await", "try", "catch", "finally", "throw", "new", "this", "super", "static", "interface", "type", "enum", "extends", "implements", "typeof", "instanceof", "in", "of", "yield", "switch", "case", "default", "break", "continue", "do", "void", "delete", "as", "declare", "namespace", "readonly", "keyof", "infer", "satisfies", "abstract", "public", "private", "protected", "override", "get", "set"]);
var JS_LITERALS = /* @__PURE__ */ new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);
var REGEX_AFTER_KEYWORD = /* @__PURE__ */ new Set(["return", "typeof", "case", "do", "else", "in", "of", "instanceof", "new", "delete", "void", "throw", "yield", "await"]);
function regexAllowed({ prev }) {
  if (!prev)
    return true;
  if (prev.type === "keyword")
    return REGEX_AFTER_KEYWORD.has(prev.text);
  return prev.type === "plain" && /[(,=:[!&|?{};+\-*%<>~^]/.test(prev.text) || prev.type === "operator";
}
function templateLength(src, start) {
  let index = start + 1;
  while (index < src.length) {
    const character = src[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "`")
      return index + 1 - start;
    if (character === "$" && src[index + 1] === "{") {
      index = interpolationEnd(src, index + 2);
      continue;
    }
    index += 1;
  }
  return src.length - start;
}
function interpolationEnd(src, start) {
  let depth = 1;
  let index = start;
  while (index < src.length && depth > 0) {
    const character = src[index];
    if (character === "`") {
      index += templateLength(src, index);
      continue;
    }
    if (character === '"' || character === "'") {
      const quote = character;
      index += 1;
      while (index < src.length && src[index] !== quote && src[index] !== "\n")
        index += src[index] === "\\" ? 2 : 1;
    } else if (character === "{")
      depth += 1;
    else if (character === "}")
      depth -= 1;
    index += 1;
  }
  return index;
}
function paintTemplate(text) {
  let out = "";
  let index = 0;
  let from = 0;
  while (index < text.length) {
    if (text[index] === "\\") {
      index += 2;
      continue;
    }
    if (text[index] === "$" && text[index + 1] === "{") {
      const end = interpolationEnd(text, index + 2);
      out += ink.str(text.slice(from, index)) + ink.punct("${") + highlight(text.slice(index + 2, end - 1), "javascript") + ink.punct(text.slice(end - 1, end));
      index = from = end;
      continue;
    }
    index += 1;
  }
  return out + ink.str(text.slice(from));
}
var JS_GRAMMAR = [
  { type: "comment", match: /\/\*[\s\S]*?(?:\*\/|$)/y },
  { type: "comment", match: /\/\/[^\n]*/y },
  { type: "string", match: (cursor) => cursor.src[cursor.at] === "`" ? templateLength(cursor.src, cursor.at) : 0, paint: paintTemplate },
  { type: "string", match: /"(?:[^"\\\n]|\\[\s\S])*"?|'(?:[^'\\\n]|\\[\s\S])*'?/y },
  { type: "regex", match: /\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[dgimsuvy]*/y, when: regexAllowed },
  { type: "number", match: /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d+)?)n?/y, when: wordBoundaryBefore },
  {
    type: (text, cursor) => JS_KEYWORDS.has(text) ? "keyword" : JS_LITERALS.has(text) ? "literal" : followedByCall(cursor, text.length) ? "call" : "plain",
    match: /[\p{L}_$][\p{L}\p{N}_$]*/uy,
    when: wordBoundaryBefore
  }
];
var BASH_KEYWORDS = /* @__PURE__ */ new Set(["if", "then", "else", "elif", "fi", "for", "while", "until", "do", "done", "case", "esac", "in", "function", "select", "time", "return", "export", "local", "readonly", "declare", "typeset", "set", "unset", "shift", "source", "exit", "break", "continue", "trap", "eval", "exec"]);
var COMMAND_AFTER = /* @__PURE__ */ new Set(["then", "else", "do", "if", "elif", "while", "until", "time", "exec", "eval"]);
var COMMAND_AFTER_OPERATOR = /* @__PURE__ */ new Set(["&&", "||", "|", "|&", ";", "&", "$("]);
function commandPosition(cursor) {
  const { prev } = cursor;
  if (!prev || atLineStart(cursor) || prev.type === "heredoc")
    return true;
  if (prev.type === "operator")
    return COMMAND_AFTER_OPERATOR.has(prev.text);
  if (prev.type === "keyword")
    return COMMAND_AFTER.has(prev.text);
  return prev.type === "plain" && /^[({`!]$/.test(prev.text);
}
var HEREDOC_OPEN = /<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/y;
function heredocBodyLength(cursor) {
  const pending = cursor.state.heredocs;
  const delimiter = pending?.[0];
  if (!delimiter || !atLineStart(cursor))
    return 0;
  const { src, at } = cursor;
  let lineStart = at;
  while (lineStart <= src.length) {
    const lineEnd = src.indexOf("\n", lineStart);
    const line = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd);
    if (line.trim() === delimiter) {
      pending.shift();
      return lineStart + line.length - at;
    }
    if (lineEnd === -1)
      break;
    lineStart = lineEnd + 1;
  }
  pending.shift();
  return src.length - at;
}
function paintHeredoc(text, cursor) {
  const delimiterAt = text.lastIndexOf("\n") + 1;
  const body = text.slice(0, delimiterAt);
  const delimiter = text.slice(delimiterAt);
  const closed = delimiter.trim() === cursor.state.lastDelimiter;
  return closed ? highlight(body, detectContentLanguage(body)) + ink.dim(delimiter) : highlight(text, detectContentLanguage(text));
}
var BASH_GRAMMAR = [
  { type: "heredoc", match: heredocBodyLength, paint: paintHeredoc },
  { type: "comment", match: /#[^\n]*/y, when: afterSpace },
  {
    type: "operator",
    match: (cursor) => {
      HEREDOC_OPEN.lastIndex = cursor.at;
      const match = HEREDOC_OPEN.exec(cursor.src);
      if (!match)
        return 0;
      const pending = cursor.state.heredocs ?? (cursor.state.heredocs = []);
      pending.push(match[2]);
      cursor.state.lastDelimiter = match[2];
      return match[0].length;
    },
    paint: (text) => ink.dim(text.slice(0, text.search(/[^<\-\s]/))) + ink.str(text.slice(text.search(/[^<\-\s]/)))
  },
  { type: "string", match: /\$?"(?:[^"\\]|\\[\s\S])*"?/y },
  { type: "string", match: /\$'(?:[^'\\]|\\[\s\S])*'?|'[^']*'?/y },
  { type: "variable", match: /\$\{[^}]*\}|\$[A-Za-z_][A-Za-z0-9_]*|\$[0-9@#?*!$-]/y },
  { type: "operator", match: /2>&1|&>|&&|\|\||>>|\|&|[|<>;&]|\$\(|\(\(|\)\)/y },
  { type: "flag", match: /--?[A-Za-z][\w-]*(?==|\s|$)/y, when: (cursor) => cursor.at === 0 || /[\s=]/.test(cursor.src[cursor.at - 1]) },
  { type: "number", match: /\d+(?![\w./-])/y, when: wordBoundaryBefore },
  {
    type: (text, cursor) => BASH_KEYWORDS.has(text) ? "keyword" : commandPosition(cursor) ? "command" : "plain",
    match: /[A-Za-z_][\w.+-]*/y,
    when: wordBoundaryBefore
  }
];
var PY_KEYWORDS = /* @__PURE__ */ new Set(["def", "class", "import", "from", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "lambda", "yield", "async", "await", "pass", "break", "continue", "raise", "global", "nonlocal", "assert", "del", "in", "not", "and", "or", "is", "match", "case"]);
var PY_LITERALS = /* @__PURE__ */ new Set(["None", "True", "False"]);
var PY_GRAMMAR = [
  { type: "comment", match: /#[^\n]*/y },
  { type: "string", match: /[rRbBuUfF]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/y, when: wordBoundaryBefore },
  { type: "string", match: /[rRbBuUfF]{0,2}(?:"(?:[^"\\\n]|\\[\s\S])*"?|'(?:[^'\\\n]|\\[\s\S])*'?)/y, when: wordBoundaryBefore },
  { type: "decorator", match: /@[\w.]+/y, when: atLineHead },
  { type: "number", match: /(?:0[xXoObB][\da-fA-F_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?\d+)?[jJ]?)/y, when: wordBoundaryBefore },
  {
    type: (text, cursor) => PY_KEYWORDS.has(text) ? "keyword" : PY_LITERALS.has(text) ? "literal" : followedByCall(cursor, text.length) ? "call" : "plain",
    match: /[\p{L}_][\p{L}\p{N}_]*/uy,
    when: wordBoundaryBefore
  }
];
var JSON_GRAMMAR = [
  { type: "key", match: /"(?:[^"\\]|\\.)*"(?=\s*:)/y },
  { type: "string", match: /"(?:[^"\\]|\\.)*"?/y },
  { type: "number", match: /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y, when: wordBoundaryBefore },
  { type: "literal", match: /true|false|null/y, when: wordBoundaryBefore },
  { type: "punct", match: /[{}[\]:,]/y }
];
var YAML_GRAMMAR = [
  { type: "comment", match: /#[^\n]*/y, when: afterSpace },
  { type: "marker", match: /-(?=\s)/y, when: atLineHead },
  { type: "key", match: /[\w."'/-][\w ."'/-]*(?=:(?:\s|$))/y, when: (cursor) => /^\s*(?:-\s+)?$/.test(lineBefore(cursor)) },
  { type: "string", match: /"(?:[^"\\]|\\.)*"?|'[^']*'?/y },
  { type: "literal", match: /(?:true|false|null|yes|no|~)(?=\s|$)/y, when: wordBoundaryBefore },
  { type: "number", match: /-?\d+(?:\.\d+)?(?=\s|$)/y, when: wordBoundaryBefore }
];
var CSS_GRAMMAR = [
  { type: "comment", match: /\/\*[\s\S]*?(?:\*\/|$)/y },
  { type: "string", match: /"(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?/y },
  { type: "selector", match: /[^{};\n]+(?=\s*\{)/y, when: atLineHead },
  { type: "key", match: /[\w-]+(?=\s*:)/y, when: (cursor) => atLineHead(cursor) || cursor.prev?.type === "punct" && /^[{;]$/.test(cursor.prev.text) },
  { type: "number", match: /#[0-9a-fA-F]{3,8}(?![\w-])/y },
  {
    type: "number",
    match: /\d*\.?\d+(?:px|em|rem|vh|vw|vmin|vmax|ch|ex|%|s|ms|deg|rad|turn|fr)?/y,
    when: wordBoundaryBefore,
    paint: (text) => {
      const unit = text.match(/[a-z%]+$/i)?.[0] ?? "";
      return ink.num(text.slice(0, text.length - unit.length)) + ink.punct(unit);
    }
  },
  { type: "punct", match: /[{}:;,]/y }
];
var SQL_KEYWORDS = new Set("select from where insert into values update set delete create table index view alter drop join left right inner outer on as and or not null in is like order group by having limit offset distinct count sum avg min max union all exists between case when then else end primary foreign key references default unique constraint if returning with recursive".split(" "));
var SQL_GRAMMAR = [
  { type: "comment", match: /--[^\n]*/y },
  { type: "comment", match: /\/\*[\s\S]*?(?:\*\/|$)/y },
  { type: "string", match: /'(?:[^'\\]|\\.|'')*'?/y },
  { type: "number", match: /\d+(?:\.\d+)?/y, when: wordBoundaryBefore },
  { type: classify([["keyword", SQL_KEYWORDS]], "plain", true), match: /[A-Za-z_]\w*/y, when: wordBoundaryBefore }
];
var inTag = (cursor) => cursor.state.inTag === true;
var XML_GRAMMAR = [
  { type: "comment", match: /<!--[\s\S]*?(?:-->|$)/y },
  { type: "comment", match: /<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/y },
  {
    type: "tag",
    match: (cursor) => {
      const match = /<[/?!]?[\w:.-]+/y.exec(cursor.src.slice(cursor.at));
      if (!match)
        return 0;
      cursor.state.inTag = true;
      return match[0].length;
    },
    paint: (text) => {
      const name = text.match(/[\w:.-]+$/)[0];
      return ink.punct(text.slice(0, text.length - name.length)) + ink.key(name);
    }
  },
  {
    type: "punct",
    match: (cursor) => {
      const match = /[/?]?>/y.exec(cursor.src.slice(cursor.at));
      if (!match)
        return 0;
      cursor.state.inTag = false;
      return match[0].length;
    },
    when: inTag
  },
  { type: "string", match: /"[^"]*"?|'[^']*'?/y, when: inTag },
  { type: "attr", match: /[\w:.-]+(?=\s*=)/y, when: inTag },
  { type: "punct", match: /=/y, when: inTag }
];
function paintFence(text) {
  const [, info = "", body = ""] = /^(```[^\n]*\n)([\s\S]*?)(?:\n?```)?$/.exec(text) ?? [];
  const language = info.slice(3).trim().split(/\s+/)[0] || null;
  const closed = text.endsWith("```") && text.length > info.length + 2;
  const inner = language ? highlight(body, EXT_TO_LANG[language] ?? language) : body;
  const fence = info.trimEnd();
  return ink.dim(fence) + info.slice(fence.length) + inner + (closed ? ink.dim(text.slice(info.length + body.length)) : "");
}
var MD_GRAMMAR = [
  { type: "code", match: /```[^\n]*\n[\s\S]*?(?:\n```|$)/y, when: atLineStart, paint: paintFence },
  { type: "heading", match: /#{1,6} [^\n]*/y, when: atLineStart },
  { type: "quote", match: />[^\n]*/y, when: atLineStart },
  { type: "marker", match: /(?:[-*+]|\d+\.)(?=\s)/y, when: atLineHead },
  { type: "code", match: /`[^`\n]+`/y },
  { type: "bold", match: /\*\*[^*\n]+\*\*|__[^_\n]+__/y, when: wordBoundaryBefore },
  { type: "italic", match: /\*[^*\n]+\*|_[^_\n]+_/y, when: wordBoundaryBefore },
  {
    type: "link",
    match: /\[[^\]\n]+\]\([^)\n]+\)/y,
    paint: (text) => {
      const [, label, url] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(text);
      return ink.punct("[") + ink.accent(label) + ink.punct("](") + source_default.gray.underline(url) + ink.punct(")");
    }
  }
];
function highlightDiff(code) {
  return code.split("\n").map((line) => {
    if (/^(diff --git|index |new file|deleted file|similarity|rename )/.test(line))
      return source_default.gray.bold(line);
    if (/^(--- |\+\+\+ )/.test(line))
      return source_default.bold(line);
    if (/^@@ /.test(line))
      return ink.key(line);
    if (line.startsWith("+"))
      return ink.ok(line);
    return line.startsWith("-") ? ink.err(line) : line;
  }).join("\n");
}
var SEVERITY = [
  ["error", /\b(error|fatal|failed|failure|exception|traceback|panic|denied|refused|not permitted|no such file|cannot)\b/i],
  ["warning", /\b(warn|warning|deprecated|no files found)\b/i],
  ["success", /\b(success|succeeded|passed|completed?)\b|[✓✔]/i]
];
function severity(text) {
  return SEVERITY.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}
var SEVERITY_INK = { error: ink.err, warning: ink.warn, success: ink.ok };
var ANSI_SEQ = /\x1b\[[0-9;]*[a-zA-Z]/g;
function replaceOutsideAnsi(input, pattern, replacer) {
  if (!input.includes("\x1B"))
    return input.replace(pattern, replacer);
  let out = "";
  let last = 0;
  ANSI_SEQ.lastIndex = 0;
  let match;
  while (match = ANSI_SEQ.exec(input)) {
    out += input.slice(last, match.index).replace(pattern, replacer) + match[0];
    last = ANSI_SEQ.lastIndex;
  }
  return out + input.slice(last).replace(pattern, replacer);
}
var OUTPUT_URL_RE = /\bhttps?:\/\/[^\s)'"]+/g;
var OUTPUT_PATH_RE = /(^|[\s('"=])((?:~|\.{1,2})?\/[\w.@+-]+(?:\/[\w.@+-]+)+(?::\d+(?::\d+)?)?)/g;
var OUTPUT_METRIC_RE = /\b\d+(?:[.,]\d+)?\s?(?:ms|s|m|h|[KMGT]i?B|kb|mb|gb|%)\b/g;
function highlightOutput(code) {
  return code.split("\n").map((line) => {
    const level = line.includes("\x1B") ? null : severity(line);
    if (level)
      return SEVERITY_INK[level](line);
    let out = line;
    out = replaceOutsideAnsi(out, OUTPUT_METRIC_RE, (match) => ink.num(match));
    out = replaceOutsideAnsi(out, OUTPUT_URL_RE, (match) => ink.accent(match));
    return replaceOutsideAnsi(out, OUTPUT_PATH_RE, (_m, lead, file) => lead + ink.accent(file));
  }).join("\n");
}
var GRAMMARS = {
  javascript: JS_GRAMMAR,
  typescript: JS_GRAMMAR,
  bash: BASH_GRAMMAR,
  python: PY_GRAMMAR,
  json: JSON_GRAMMAR,
  yaml: YAML_GRAMMAR,
  css: CSS_GRAMMAR,
  sql: SQL_GRAMMAR,
  html: XML_GRAMMAR,
  xml: XML_GRAMMAR,
  markdown: MD_GRAMMAR
};
var LINE_HIGHLIGHTERS = { diff: highlightDiff, output: highlightOutput };
var HIGHLIGHT_LANGUAGES = [...Object.keys(GRAMMARS), ...Object.keys(LINE_HIGHLIGHTERS)];
function highlight(code, language) {
  if (!language)
    return code;
  const grammar = GRAMMARS[language];
  if (grammar)
    return scan(code, grammar, PALETTE);
  return LINE_HIGHLIGHTERS[language]?.(code) ?? code;
}
function renderText(text, filePath, fallback = "output") {
  const language = langFromPath(filePath) ?? detectContentLanguage(text) ?? fallback;
  return highlight(language === "json" ? formatJSON(text) : text, language);
}
var META_STR_MAX = 200;
function flattenString(value) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > META_STR_MAX ? collapsed.slice(0, META_STR_MAX - 1) + "\u2026" : collapsed;
}
function formatValue(value, depth = 0) {
  if (value === null || value === void 0 || typeof value === "boolean" || typeof value === "number")
    return ink.num(String(value));
  if (typeof value === "string")
    return ink.str(flattenString(value));
  if (typeof value !== "object")
    return String(value);
  const pad2 = "  ".repeat(depth + 1);
  const close = "  ".repeat(depth);
  const items = Array.isArray(value) ? value.map((item) => formatValue(item, depth + 1)) : Object.entries(value).map(([key, item]) => ink.key(key) + ink.punct(": ") + formatValue(item, depth + 1));
  const [open, shut] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
  if (!items.length)
    return ink.punct(`${open} ${shut}`);
  const inline = ink.punct(open + " ") + items.join(ink.punct(", ")) + ink.punct(" " + shut);
  if (stripAnsi(inline).length <= 50)
    return inline;
  return ink.punct(open + "\n") + items.map((item) => pad2 + item).join(ink.punct(",\n")) + "\n" + close + ink.punct(shut);
}

// src/tui/theme.ts
var theme = (icon, color) => ({ icon, color });
var SHELL = theme("\u276F", "magenta");
var WRITE = theme("\u2295", "green");
var EDIT = theme("\u0394", "green");
var READ = theme("\u25A4", "blue");
var SEARCH = theme("\u2315", "red");
var WEB = theme("\u21CC", "cyan");
var AGENT = theme("\u{F0495}", "cyan");
var TASK = theme("\u2713", "blue");
var PLAN = theme("\u224B", "cyan");
var IMAGE = theme("\u25A9", "blue");
var POWER = theme("\u23FB", "cyan");
var DEFAULT = theme("\u{F0320}", "blue");
var TOOL_THEMES = {
  "Bash": SHELL,
  "BashCommand": SHELL,
  "Write": WRITE,
  "FileWriteOrEdit": WRITE,
  "Edit": EDIT,
  "MultiEdit": EDIT,
  "FileEdit": EDIT,
  "apply_patch": EDIT,
  "ApplyPatch": EDIT,
  "Read": READ,
  "ReadFiles": READ,
  "read_page": READ,
  "Glob": SEARCH,
  "Grep": SEARCH,
  "WebFetch": WEB,
  "WebSearch": theme("\u2315", "cyan"),
  "ToolSearch": theme("\u2315", "cyan"),
  "query-docs": WEB,
  "navigate": WEB,
  "Task": AGENT,
  "Agent": AGENT,
  "TaskCreate": TASK,
  "TaskUpdate": TASK,
  "TaskList": TASK,
  "TaskStop": theme("\u25A0", "red"),
  "update_plan": PLAN,
  "UpdatePlan": PLAN,
  "TodoWrite": PLAN,
  "TodoRead": PLAN,
  "ExitPlanMode": POWER,
  "Initialize": POWER,
  "ContextSave": theme("\u29FA", "cyan"),
  "AskUserQuestion": theme("?", "brightGreen"),
  "view_image": IMAGE,
  "ViewImage": IMAGE,
  "ReadImage": IMAGE,
  "spawn_agent": theme("\u2B21", "green"),
  "wait_agent": theme("\u25F7", "gray"),
  "followup_task": theme("\u21BB", "cyan"),
  "send_message": theme("\u2192", "cyan"),
  "interrupt_agent": theme("\u25A0", "red"),
  "list_agents": theme("\u224B", "blue")
};
var THEME_BY_VERB = [
  [/bash|command|exec|shell/i, SHELL],
  [/write|edit|create/i, WRITE],
  [/read|get|fetch|load/i, READ],
  [/search|find|grep|query|glob/i, SEARCH]
];
var COLLABORATION_RE = /^collaboration(?:__|[._-])?(spawn_agent|wait_agent|followup_task|send_message|interrupt_agent|list_agents)$/i;
function parseToolName(rawName) {
  if (!rawName || typeof rawName !== "string")
    return { server: null, tool: "Unknown", pretty: "Unknown" };
  const collaboration2 = COLLABORATION_RE.exec(rawName);
  if (collaboration2) {
    const tool = collaboration2[1].toLowerCase();
    return { server: "collaboration", tool, pretty: `collaboration \u25B8 ${tool.replace(/_/g, " ")}` };
  }
  const mcp = /^mcp__([^_].*?)__(.+)$/.exec(rawName);
  if (mcp)
    return { server: mcp[1], tool: mcp[2], pretty: `${mcp[1]} \u25B8 ${mcp[2].replace(/_/g, " ")}` };
  return { server: null, tool: rawName, pretty: rawName };
}
function toolTheme(rawName) {
  const { tool } = parseToolName(rawName);
  return TOOL_THEMES[rawName] ?? TOOL_THEMES[tool] ?? THEME_BY_VERB.find(([pattern]) => pattern.test(tool))?.[1] ?? DEFAULT;
}
var BACKGROUND = {
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
var FOREGROUND = {
  blue: source_default.blue,
  green: source_default.green,
  yellow: source_default.yellow,
  red: source_default.red,
  magenta: source_default.magenta,
  cyan: source_default.cyan,
  gray: source_default.gray,
  white: source_default.white,
  black: source_default.black,
  brightBlue: source_default.blueBright,
  brightGreen: source_default.greenBright,
  brightYellow: source_default.yellowBright,
  brightRed: source_default.redBright,
  brightMagenta: source_default.magentaBright,
  brightCyan: source_default.cyanBright,
  brightGray: source_default.gray,
  brightWhite: source_default.whiteBright
};
var bg = (color) => BACKGROUND[color] ?? source_default.bgBlue;
var fg = (color) => FOREGROUND[color] ?? source_default.blue;

// src/tui/badge.ts
function badge({ label, color, icon }) {
  return { kind: "badge", label: label ?? "", color: color ?? "cyan", icon: icon ?? null };
}
function toolBadge(toolName, overrides = {}) {
  const theme2 = toolTheme(toolName);
  return badge({
    label: overrides.label ?? parseToolName(toolName).pretty,
    color: overrides.color ?? theme2.color,
    icon: overrides.icon === void 0 ? theme2.icon : overrides.icon
  });
}
function isBadge(value) {
  return typeof value === "object" && value !== null && value.kind === "badge";
}
function renderBadge({ label, color, icon }) {
  return bg(color).black(` ${icon ? icon + " " : ""}${label} `);
}
function badgeRule({ color }, length, character = "\u2581") {
  return fg(color)(character.repeat(Math.max(0, length)));
}
function renderBadges(...badges) {
  return badges.filter((item) => Boolean(item)).map((item) => isBadge(item) ? renderBadge(item) : String(item)).join(" ");
}
var RUNNING_BADGE = badge({ label: "Running", color: "magenta", icon: "\u23CE " });
var OUTPUT_BADGE = badge({ label: "Output", color: "brightGreen", icon: "\u2258" });
var META_BADGE = badge({ label: "metadata", color: "gray", icon: "\u26C1" });

// src/tui/card.ts
import fs3 from "node:fs";
import tty2 from "node:tty";

// src/tui/tokens.ts
var TUI_TOKENS = {
  width: {
    fallbackContent: 96,
    maximumLayout: 100,
    outerIndentMargin: 6,
    divider: 60
  },
  card: {
    background: "#302f32",
    commandBackground: "#272629",
    ruleFallback: "#4a4a4a",
    border: "#5a595c",
    horizontalPadding: 2,
    minimumHairline: 4,
    // Cards keep only their top rule. Content spans the whole measured width.
    chromeColumns: 0
  }
};

// src/tui/card.ts
var list = (value) => value === void 0 ? [] : Array.isArray(value) ? [...value] : [value];
var cachedColumns = null;
function terminalColumns() {
  if (cachedColumns !== null)
    return cachedColumns;
  const declared = process.stdout.columns || process.stderr.columns || Number(process.env.COLUMNS) || 0;
  if (declared > 0)
    return cachedColumns = declared;
  try {
    const stream = new tty2.WriteStream(fs3.openSync("/dev/tty", "r+"));
    const columns = stream.columns || 0;
    stream.destroy();
    return cachedColumns = columns;
  } catch {
    return cachedColumns = 0;
  }
}
function layoutWidthForTerminal(columns) {
  const { fallbackContent, maximumLayout, outerIndentMargin } = TUI_TOKENS.width;
  const codexWidth = process.env.PLUGIN_ROOT || process.env.PLUGIN_DATA ? 72 : maximumLayout;
  return Math.max(1, Math.min(codexWidth, (columns > 0 ? columns : fallbackContent) - outerIndentMargin));
}
var getMaxLayoutWidth = () => layoutWidthForTerminal(terminalColumns());
var horizontalPaddingFor = (layoutWidth) => Math.min(TUI_TOKENS.card.horizontalPadding, Math.max(0, Math.floor((layoutWidth - 1) / 2)));
function getMaxContentWidth() {
  const layoutWidth = getMaxLayoutWidth();
  return Math.max(1, layoutWidth - horizontalPaddingFor(layoutWidth) * 2 - TUI_TOKENS.card.chromeColumns);
}
var EDGE_TOP = "\u2581";
var renderBoxTopEdge = (width) => paint256.fg(TUI_TOKENS.card.border)(EDGE_TOP.repeat(Math.max(0, width)));
var WIDTH_PERCENTILE = 0.9;
var WIDTH_SLACK = 8;
var TYPICAL_MINIMUM = 12;
function typicalWidth(widths) {
  if (!widths.length)
    return 0;
  const sorted = [...widths].sort((a, b) => a - b);
  const widest = sorted.at(-1);
  if (sorted.length < TYPICAL_MINIMUM)
    return widest;
  const typical = sorted[Math.floor((sorted.length - 1) * WIDTH_PERCENTILE)];
  return Math.min(widest, typical + WIDTH_SLACK);
}
var fitTitle = (title, layoutWidth) => visibleWidth(title) > layoutWidth ? truncateAnsi(title, layoutWidth - 1) : title;
function prepareRegion(region, layoutWidth) {
  const background = region.background ?? TUI_TOKENS.card.background;
  const fillParams = `48;5;${ansi256(background)}`;
  return {
    background,
    heading: fitTitle(renderBadges(...list(region.heading)), layoutWidth),
    lines: trimBlankEdges(region.content).split("\n").map((line) => reseatBackground(normalizeCardLine(line, region.keepBackground), fillParams)),
    trailingBlank: region.trailingBlank ?? false
  };
}
function wrapRegions(regions, maxWidth) {
  const lines = regions.flatMap((region) => region.lines);
  const headings = regions.map((region) => visibleWidth(region.heading));
  const contentWidth = Math.min(maxWidth, Math.max(typicalWidth(lines.map(visibleWidth)), ...headings));
  return {
    contentWidth,
    regions: regions.map((region) => ({ ...region, lines: region.lines.flatMap((line) => wrapAnsi(line, contentWidth)) }))
  };
}
function prepareBox({ content, minimumWidth = 0, footerText = "" }) {
  const layoutWidth = getMaxLayoutWidth();
  const padding = horizontalPaddingFor(layoutWidth);
  const prepared = (typeof content === "string" ? [{ content }] : content).map((region) => prepareRegion(region, layoutWidth));
  const { regions, contentWidth } = wrapRegions(prepared, getMaxContentWidth());
  const width = Math.min(layoutWidth, Math.max(contentWidth + padding * 2, minimumWidth));
  const rows = [];
  let openedByBlank = false;
  for (const region of regions) {
    const fill = paint256.bg(region.background);
    const frame = (line, left = padding) => fill(" ".repeat(left) + line + " ".repeat(Math.max(0, width - left - visibleWidth(line))));
    if (!openedByBlank)
      rows.push(fill(" ".repeat(width)));
    if (region.heading)
      rows.push(frame(region.heading, 0));
    rows.push(...region.lines.map((line) => frame(line)));
    if (region.trailingBlank)
      rows.push(fill(" ".repeat(width)));
    openedByBlank = region.trailingBlank;
  }
  const lastFill = paint256.bg(regions.at(-1)?.background ?? TUI_TOKENS.card.background);
  const footerWidth = visibleWidth(footerText);
  rows.push(footerWidth > 0 && footerWidth <= width ? lastFill(" ".repeat(width - footerWidth) + footerText) : lastFill(" ".repeat(width)));
  return { lines: rows, width };
}
function renderBox(props) {
  const box = prepareBox(props);
  return ["", renderBoxTopEdge(box.width), ...box.lines, ""].join("\n");
}
function renderCard({ badges, content, minimumWidth = 0, footer }) {
  const badgeList = list(badges);
  const footerText = renderBadges(...list(footer));
  const title = fitTitle(renderBadges(...badgeList), getMaxLayoutWidth());
  const { minimumHairline } = TUI_TOKENS.card;
  if (!title)
    return renderBox({ content, footerText, minimumWidth: Math.max(minimumWidth, visibleWidth(footerText) + minimumHairline) });
  const badgeWidth = visibleWidth(title);
  const box = prepareBox({
    content,
    footerText,
    minimumWidth: Math.max(minimumWidth, badgeWidth + minimumHairline, visibleWidth(footerText) + minimumHairline)
  });
  const ruleLength = Math.max(0, box.width - badgeWidth);
  const ruleBadge = badgeList.find((item) => isBadge(item));
  const rule2 = ruleBadge ? badgeRule(ruleBadge, ruleLength) : paint256.fg(TUI_TOKENS.card.ruleFallback)(EDGE_TOP.repeat(ruleLength));
  return ["", title + rule2, ...box.lines, ""].join("\n");
}
function renderPathCard({ path: path9, content, details = null, badges = [], picture = false }) {
  return renderCard({
    badges: [badge({ label: displayPath(path9), color: "cyan", icon: "\u25A4" }), ...badges],
    footer: details ? badge({ label: details, color: "gray", icon: "\u29D6" }) : void 0,
    content: [{ content, keepBackground: picture }]
  });
}

// src/tui/section.ts
function section(badges, lines = []) {
  const body = lines.filter((line) => Boolean(line));
  return renderBadges(...Array.isArray(badges) ? badges : [badges]) + (body.length ? "\n\n" + body.join("\n") : "");
}
function stack(items) {
  return items.filter((item) => Boolean(item)).map((item) => item.replace(/^\n+|\n+$/g, "")).join("\n\n");
}
var durationLine = (durationMs) => durationMs == null ? null : ink.dim(`\u0394 ${durationMs}ms`);
function prose(text, limit = Infinity, indent = 0) {
  const capped = text.length > limit ? text.slice(0, limit) + "..." : text;
  return wrapText(capped, getMaxContentWidth() - indent);
}
var RULER_RE = /^(-{3,}|={3,}|─{3,}|═{3,})(.*)$/;
function renderRuler(line) {
  const match = RULER_RE.exec(stripAnsi(line).trim());
  if (!match)
    return null;
  const character = "=\u2550".includes(match[1][0]) ? "\u2550" : "\u2500";
  const text = match[2].replace(/[-=─═]{3,}\s*$/, "").trim();
  if (!text)
    return ink.dim(character.repeat(TUI_TOKENS.width.divider));
  const label = ` ${text} `;
  const remaining = Math.max(6, TUI_TOKENS.width.divider - label.length);
  const left = Math.floor(remaining / 2);
  return ink.dim(character.repeat(left)) + ink.strong(label) + ink.dim(character.repeat(remaining - left));
}
function splitRulerSections(text) {
  const sections = [];
  for (const line of String(text).split("\n")) {
    const isRuler = renderRuler(line) !== null;
    const current = sections.at(-1);
    if (isRuler || !current)
      sections.push({ content: line, beginsWithRuler: isRuler });
    else
      current.content += "\n" + line;
  }
  return sections;
}

// src/tui/table.ts
var cellText = (cell) => cell == null ? "" : String(cell);
function columnWidths(grid, columns, maxWidth, minWidth) {
  const widths = Array.from({ length: columns }, (_, column) => Math.max(1, ...grid.map((row) => Math.max(0, ...(row[column] ?? "").split("\n").map(visibleWidth)))));
  const frame = columns * 3 + 1;
  let total = widths.reduce((sum, width) => sum + width, 0) + frame;
  while (total > maxWidth) {
    const widest = widths.indexOf(Math.max(...widths));
    if (widths[widest] <= minWidth)
      break;
    widths[widest] = widths[widest] - 1;
    total -= 1;
  }
  return widths;
}
var pad = (text, width) => text + " ".repeat(Math.max(0, width - visibleWidth(text)));
function renderRow(cells, widths) {
  const wrapped = widths.map((width, column) => (cells[column] ?? "").split("\n").flatMap((line) => wrapAnsi(line, width)));
  const height = Math.max(1, ...wrapped.map((lines) => lines.length));
  return Array.from({ length: height }, (_, line) => ink.punct("\u2502") + widths.map((width, column) => " " + pad(wrapped[column][line] ?? "", width) + " ").join(ink.punct("\u2502")) + ink.punct("\u2502"));
}
var rule = (widths, left, mid, right) => ink.punct(left + widths.map((width) => "\u2500".repeat(width + 2)).join(mid) + right);
function renderTable({ head, rows, maxWidth = getMaxContentWidth(), minColumnWidth = 4 }) {
  const body = rows.map((row) => row.map(cellText));
  const header = head?.map((cell) => ink.strong(cellText(cell)));
  const columns = Math.max(header?.length ?? 0, ...body.map((row) => row.length));
  if (columns === 0)
    return "";
  const widths = columnWidths([...header ? [header] : [], ...body], columns, maxWidth, minColumnWidth);
  const lines = [rule(widths, "\u250C", "\u252C", "\u2510")];
  if (header)
    lines.push(...renderRow(header, widths), rule(widths, "\u251C", "\u253C", "\u2524"));
  for (const row of body)
    lines.push(...renderRow(row, widths));
  lines.push(rule(widths, "\u2514", "\u2534", "\u2518"));
  return lines.join("\n");
}
function metadataTable(value, maxWidth) {
  const entries = value && typeof value === "object" ? Object.entries(value) : [];
  if (!entries.length)
    return formatValue(value);
  return renderTable({
    head: ["key", "value"],
    rows: entries.map(([key, item]) => [ink.key(key), formatValue(item)]),
    maxWidth
  });
}

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
function renderGlyphRows(text, color) {
  const chars = text.toUpperCase().split("");
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
function renderHeading({ word, color = "cyan", event: event2, tone, width = 60, caption }) {
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

// src/render/file-card.ts
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".webp"]);
var extensionOf = (filePath) => path3.extname(String(filePath ?? "")).toLowerCase();
var isImagePath = (filePath) => IMAGE_EXTENSIONS.has(extensionOf(filePath));
var LINE_RANGE_RE = /:(\d+)(?:-(\d+)?)?$/;
function stripLineRange(rawPath) {
  const text = String(rawPath);
  const match = LINE_RANGE_RE.exec(text);
  if (!match)
    return { path: text, range: null };
  return {
    path: text.slice(0, match.index),
    range: { start: Number(match[1]), end: match[2] ? Number(match[2]) : null }
  };
}
var formatRange = ({ start, end }) => end == null ? `line ${start}+` : `lines ${start}-${end}`;
function sliceToRange(content, { start, end }) {
  const lines = content.split("\n");
  return lines.slice(Math.max(0, start - 1), end ?? lines.length).join("\n");
}
function readFile(filePath) {
  try {
    return fs4.readFileSync(filePath);
  } catch {
    return null;
  }
}
var CARD_CHROME = 300;
var CARD_PER_ROW = 34;
var NO_ROOM = ink.note("\u2026 image preview omitted \u2014 no room left in this message \u2026");
function drawImage(data, ext, chars) {
  try {
    let width = getMaxContentWidth();
    let image = imageToAsciiSimple(data, ext, width);
    while (image && image.length + CARD_CHROME + image.split("\n").length * CARD_PER_ROW > chars && width > 1) {
      width = Math.max(1, Math.floor(width * 0.85));
      image = imageToAsciiSimple(data, ext, width);
    }
    return image && image.length + CARD_CHROME + image.split("\n").length * CARD_PER_ROW <= chars ? image : null;
  } catch {
    return null;
  }
}
var imageBody = (data, ext) => (limit) => drawImage(data, ext, limit.chars) ?? NO_ROOM;
function fileBody(filePath, options) {
  const ext = extensionOf(filePath);
  if (isImagePath(filePath)) {
    const data = readFile(filePath);
    if (data)
      return { kind: "image", draw: imageBody(data, ext) };
  }
  const raw = options.readText === false ? null : readFile(filePath)?.toString("utf8") ?? null;
  const text = raw ?? options.fallbackText;
  if (text == null)
    return null;
  const shaped = renderText(options.transform ? options.transform(text) : text, filePath);
  const body = options.range ? sliceToRange(shaped, options.range) : shaped;
  return { kind: "text", draw: (limit) => collapse(body, limit.lines) };
}
function fileCard(rawPath, options = {}) {
  const { path: filePath, range: pathRange } = stripLineRange(rawPath);
  const range = options.range ?? pathRange;
  const body = fileBody(filePath, { ...options, range });
  if (!body)
    return null;
  const details = [options.action, range && body.kind === "text" ? formatRange(range) : null].filter(Boolean).join("  ") || null;
  return (limit) => renderPathCard({
    path: filePath,
    content: body.draw(limit),
    details,
    badges: options.badges,
    picture: body.kind === "image"
  });
}
function inlineImageCard(data, ext, label, action = null) {
  if (!drawImage(data, ext, 4e3))
    return null;
  const draw = imageBody(data, ext);
  return (limit) => renderPathCard({ path: label, content: draw(limit), details: action, picture: true });
}
var QUOTED_CANDIDATE_RE = /["']([^"'\n]+\.(?:png|jpe?g|webp))["']/gi;
var CANDIDATE_RE = /[^\s"'`,;<>|()[\]{}]+\.(?:png|jpe?g|webp)/gi;
var TRAILING_PUNCTUATION = /[.,;:!?)\]}'"`]+$/;
function isReadableFile(candidate) {
  try {
    return fs4.statSync(candidate).isFile();
  } catch {
    return false;
  }
}
function findImagePath(text, cwd = process.cwd()) {
  if (!text)
    return null;
  const source = String(text);
  const candidates = [
    ...Array.from(source.matchAll(QUOTED_CANDIDATE_RE), (match) => match[1]),
    ...Array.from(source.matchAll(CANDIDATE_RE), (match) => match[0])
  ];
  for (const raw of candidates) {
    const candidate = raw.replace(TRAILING_PUNCTUATION, "");
    if (!isImagePath(candidate))
      continue;
    const resolved = path3.isAbsolute(candidate) ? candidate : path3.resolve(cwd, candidate);
    if (isReadableFile(resolved))
      return resolved;
  }
  return null;
}
var MIME_EXTENSIONS = { png: ".png", jpeg: ".jpg", jpg: ".jpg", webp: ".webp" };
function inlineImageOf(value) {
  const block = asRecord(value);
  if (!block || block.type !== "image" && block.type !== "input_image")
    return null;
  const dataUrl = typeof block.image_url === "string" ? /^data:image\/([^;,]+);base64,(.+)$/s.exec(block.image_url) : null;
  const encoded = pickString(block, "data") ?? dataUrl?.[2];
  if (!encoded)
    return null;
  const subtype = String(block.mimeType ?? `image/${dataUrl?.[1] ?? "png"}`).split("/")[1]?.toLowerCase() ?? "png";
  const ext = MIME_EXTENSIONS[subtype];
  return ext ? { data: Buffer.from(encoded, "base64"), ext } : null;
}
function findInlineImage(result) {
  const direct = inlineImageOf(result);
  if (direct)
    return direct;
  const content = asRecord(result)?.content;
  return Array.isArray(content) ? content.map(inlineImageOf).find(Boolean) ?? null : null;
}
function screenshotCard(result, text, action = "screenshot") {
  const file = findImagePath(text);
  if (file)
    return fileCard(file, { action });
  const inline = findInlineImage(result);
  return inline ? inlineImageCard(inline.data, inline.ext, `screenshot${inline.ext}`, action) : null;
}

// src/render/welcome.ts
import fs6 from "node:fs";
import path5 from "node:path";
import { fileURLToPath } from "node:url";

// src/runtime/debug.ts
import fs5 from "node:fs";
import path4 from "node:path";
var HOME = process.env.HOME || process.env.USERPROFILE || "";
var DEBUG_LOG = path4.join(HOME, ".claude", "debug.log");
function detailValue(value) {
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack, cause: value.cause };
  try {
    JSON.stringify(value);
    return value;
  } catch {
    return String(value);
  }
}
function formatDebugEntry(scope, parts, timestamp = /* @__PURE__ */ new Date()) {
  const [first] = parts;
  const labelled = typeof first === "string";
  return `[${timestamp.toISOString()}] [${scope}] ${JSON.stringify({
    stage: labelled ? first : "log",
    details: parts.slice(labelled ? 1 : 0).map(detailValue),
    pid: process.pid,
    ppid: process.ppid,
    runtime: `${process.release.name}@${process.version}`,
    platform: `${process.platform}-${process.arch}`,
    host: process.env.PLUGIN_ROOT || process.env.PLUGIN_DATA ? "codex" : process.env.CLAUDE_PLUGIN_ROOT ? "claude-code" : "direct",
    cwd: process.cwd(),
    entrypoint: process.argv[1] ?? null,
    event: process.argv[2] ?? null
  })}`;
}
function debugLog(scope, ...parts) {
  try {
    fs5.mkdirSync(path4.dirname(DEBUG_LOG), { recursive: true });
    fs5.appendFileSync(DEBUG_LOG, formatDebugEntry(scope, parts) + "\n");
  } catch {
  }
}

// src/render/welcome.ts
var RESERVE = 8;
var MAX_COLS = 100;
var HOME2 = process.env.HOME ?? process.env.USERPROFILE ?? "";
var WELCOME_ASSET = path5.join("assets", "welcome.png");
var ASCII_DIR = path5.join(HOME2, "Documents", "Prompts", "anime-ascii");
function findAsset() {
  const candidates = [];
  if (process.env.CLAUDE_PLUGIN_ROOT)
    candidates.push(path5.join(process.env.CLAUDE_PLUGIN_ROOT, WELCOME_ASSET));
  let dir;
  try {
    dir = path5.dirname(fileURLToPath(import.meta.url));
  } catch {
    dir = process.cwd();
  }
  for (let depth = 0; depth < 6; depth++) {
    candidates.push(path5.join(dir, WELCOME_ASSET));
    const parent = path5.dirname(dir);
    if (parent === dir)
      break;
    dir = parent;
  }
  return candidates.find((candidate) => {
    try {
      return fs6.statSync(candidate).isFile();
    } catch {
      return false;
    }
  }) ?? null;
}
function welcomeImagePath() {
  const override = process.env.CLAUDE_HOOKS_WELCOME_IMAGE;
  if (override)
    return fs6.existsSync(override) ? override : null;
  return findAsset();
}
var fits = (art, spec) => costOf(art.split("\n"), spec) <= spec.total;
function welcomeImage(spec) {
  const file = welcomeImagePath();
  if (!file)
    return null;
  try {
    const data = fs6.readFileSync(file);
    let width = Math.min(MAX_COLS, getMaxLayoutWidth());
    let art = imageToAsciiSimple(data, path5.extname(file), width);
    while (art && !fits(art, spec) && width > 1) {
      width = Math.max(1, Math.floor(width * 0.85));
      art = imageToAsciiSimple(data, path5.extname(file), width);
    }
    return art && fits(art, spec) ? art : null;
  } catch (error) {
    debugLog("SessionStart", "render-welcome-image", error.message);
    return null;
  }
}
function asciiArt(spec) {
  try {
    if (!fs6.existsSync(ASCII_DIR))
      return null;
    const files = fs6.readdirSync(ASCII_DIR).filter((name) => name.endsWith(".txt"));
    for (const pick of files.sort(() => Math.random() - 0.5)) {
      const art = fs6.readFileSync(path5.join(ASCII_DIR, pick), "utf8").replace(/\s+$/, "");
      if (fits(art, spec))
        return art;
    }
  } catch (error) {
    debugLog("SessionStart", "load-ascii", error.message);
  }
  return null;
}
function renderWelcome(headroom) {
  if (headroom <= RESERVE)
    return "";
  const spec = { total: headroom - RESERVE };
  const art = welcomeImage(spec) ?? asciiArt(spec);
  return art ? `
${art}
` : "";
}

// src/runtime/transport.ts
import fs7 from "node:fs";
import os3 from "node:os";
import path6 from "node:path";

// src/render/fit.ts
var MAX_LINES = 4e3;
var unlimited = (chars) => ({ lines: MAX_LINES, chars });
var share = (limit, count) => ({ lines: limit.lines, chars: Math.floor(limit.chars / Math.max(1, count)) });
var constant = (text) => () => text;
function fit(render, budget) {
  const draw = typeof render === "string" ? constant(compactAnsi(render)) : (limit) => compactAnsi(render(limit));
  const full = draw(unlimited(budget));
  if (full.length <= budget)
    return { text: full, full, shrunk: false };
  const at = (scale) => ({
    lines: Math.round(MAX_LINES * scale),
    chars: Math.floor(budget * scale)
  });
  let low = 0;
  let high = 1;
  let best = typeof render === "string" ? full : draw(at(0));
  for (let step = 0; step < 14 && typeof render !== "string"; step++) {
    const mid = (low + high) / 2;
    const candidate = draw(at(mid));
    if (candidate.length <= budget) {
      best = candidate;
      low = mid;
    } else
      high = mid;
  }
  const text = best.length <= budget ? best : truncateChars(best, budget);
  return { text, full, shrunk: true };
}

// src/runtime/transport.ts
var HOOK_FIELD_CHAR_LIMIT = 1e4;
var CLEAR_LINE_PREFIX = "\x1B[1A\x1B[2K\r";
var POINTER_RESERVE = 200;
var MESSAGE_BUDGET = HOOK_FIELD_CHAR_LIMIT - CLEAR_LINE_PREFIX.length;
var PERSIST_DIR = path6.join(os3.tmpdir(), "claude-code-hooks");
var PERSIST_MAX = 20;
function persist(content) {
  try {
    fs7.mkdirSync(PERSIST_DIR, { recursive: true });
    const file = path6.join(PERSIST_DIR, `hook-output-${Date.now()}-${process.pid}.log`);
    fs7.writeFileSync(file, content);
    fs7.readdirSync(PERSIST_DIR).map((name) => path6.join(PERSIST_DIR, name)).sort((a, b) => fs7.statSync(b).mtimeMs - fs7.statSync(a).mtimeMs).slice(PERSIST_MAX).forEach((stale) => fs7.unlinkSync(stale));
    return file;
  } catch {
    return null;
  }
}
function pointer(full) {
  const file = persist(stripAnsi(full));
  const size = full.length.toLocaleString("en-US");
  return ink.note(file ? `  \u2026 full ${size}-character output saved to ${file}` : `  \u2026 full ${size}-character output exceeded the ${HOOK_FIELD_CHAR_LIMIT.toLocaleString("en-US")}-character host limit`);
}
function resolveMessage(message) {
  if (message === void 0 || message === "")
    return null;
  const { text, full, shrunk } = fit(message, MESSAGE_BUDGET - POINTER_RESERVE);
  return shrunk ? `${text}
${pointer(full)}` : text;
}
function serializeHook(output, { ansi = true } = {}) {
  const { systemMessage: message, ...rest } = output;
  const resolved = resolveMessage(message);
  const messageText = resolved === null || ansi ? resolved : stripAnsi(resolved);
  const systemMessage = messageText === null ? null : ansi ? CLEAR_LINE_PREFIX + messageText : messageText;
  const body = systemMessage === null ? rest : { ...rest, systemMessage };
  return { json: JSON.stringify(body, null, 2), systemMessage };
}

// src/tools/kit.ts
var named = (...names) => (toolName) => names.includes(toolName);
var matching = (pattern) => (toolName) => pattern.test(toolName);
function outputCard(text, limit, language = null) {
  const resolved = language ?? detectOutputLanguage(text);
  const body = resolved === "json" ? formatJSON(text) : text;
  return renderCard({
    badges: OUTPUT_BADGE,
    content: collapse(body, limit.lines, { paint: (head) => highlight(head, resolved) })
  });
}
function metaCard(value, limit) {
  return renderCard({ badges: META_BADGE, content: collapse(metadataTable(value), limit.lines) });
}
function statusLine(text, maxLength = 200) {
  const line = firstLine(text.trim(), maxLength);
  const level = severity(line);
  const glyph = level === "error" ? "\u2A02 " : level === "warning" ? "\u26A0 " : "\u2713 ";
  return (level ? SEVERITY_INK[level] : ink.ok)(glyph) + line;
}

// src/tools/agents.ts
var statusBadge = (label, color) => label ? badge({ label: label.replace(/_/g, " "), color }) : null;
var agent = {
  id: "agent",
  match: named("Agent", "Task"),
  render({ input, result }) {
    const record = resultRecord(result);
    const status = pickString(record, "status");
    const outputFile = pickString(record, "outputFile");
    return {
      lines: [
        pickString(input, "description")?.trim() ? prose(pickString(input, "description")) : null,
        outputFile ? displayPath(outputFile) : null
      ],
      badges: [
        statusBadge(status, status && /fail|error|stop/.test(status) ? "red" : "green"),
        statusBadge(pickString(record, "resolvedModel"), "blue"),
        statusBadge(pickId(record, "agentId", "agent_id", "taskId", "task_id"), "gray")
      ]
    };
  }
};
var targetOf = (input, result) => pickString(result, "task_name", "agent_name", "target") ?? pickString(input, "task_name", "target", "agent_name") ?? "agent";
var VIEWS = {
  spawn_agent: (input, result) => ({
    lines: [ink.ok("\u2713 ") + `started ${targetOf(input, result)}`],
    badges: [statusBadge(pickString(input, "agent_type"), "green"), statusBadge(pickString(input, "model"), "gray")]
  }),
  wait_agent: (_input, result) => {
    const timedOut = result?.timed_out === true;
    const message = pickString(result, "message") ?? (timedOut ? "No agents completed yet" : "Agent update received");
    return {
      lines: [timedOut ? ink.dim(message) : ink.ok("\u2713 ") + message],
      badges: [badge({ label: timedOut ? "timed out" : "update", color: timedOut ? "gray" : "green" })]
    };
  },
  followup_task: (input, result) => ({ lines: [ink.key("\u2192 ") + `follow-up sent to ${targetOf(input, result)}`] }),
  send_message: (input, result) => ({ lines: [ink.key("\u2192 ") + `message sent to ${targetOf(input, result)}`] }),
  interrupt_agent: (input, result) => ({
    lines: [ink.err("\u25A0 ") + `interrupted ${targetOf(input, result)}`],
    badges: [statusBadge(pickString(result, "previous_status", "status"), "gray")]
  }),
  list_agents: (_input, result) => {
    const agents = Array.isArray(result?.agents) ? result.agents : [];
    const lines = agents.flatMap((entry) => {
      const data = asRecord(entry);
      const name = pickString(data, "agent_name", "task_name", "name");
      const status = pickString(data, "agent_status", "status");
      return name ? [ink.key("\xB7 ") + name + (status ? ink.dim(` \u2014 ${status.replace(/_/g, " ")}`) : "")] : [];
    });
    return {
      lines: lines.length ? lines : [ink.dim("No active agents")],
      badges: [badge({ label: `${lines.length} agent${lines.length === 1 ? "" : "s"}`, color: lines.length ? "blue" : "gray" })]
    };
  }
};
var operationOf = (toolName) => {
  const { server, tool } = parseToolName(toolName);
  return server === "collaboration" && tool in VIEWS ? tool : null;
};
var collaboration = {
  id: "collaboration",
  match: (toolName) => operationOf(toolName) !== null,
  render({ name, input, result }) {
    const view = VIEWS[operationOf(name) ?? "list_agents"](input, resultRecord(result));
    return { ...view, lines: view.lines.map((line) => line ? prose(line) : line) };
  }
};
var AGENT_RENDERERS = [agent, collaboration];

// src/lib/shell.ts
var HEREDOC_OPEN2 = /^<<-?\s*(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/;
function flush(state, sep) {
  state.rows.push({ text: state.current.trim(), sep });
  state.current = "";
}
function consumeQuoted(state, line, index) {
  const character = line[index];
  state.current += character;
  if (state.quote === '"' && character === "\\" && index + 1 < line.length) {
    state.current += line[index + 1];
    return index + 1;
  }
  if (character === state.quote)
    state.quote = null;
  return index;
}
function consumeSyntax(state, line, index) {
  const character = line[index];
  if (character === '"' || character === "'") {
    state.quote = character;
    state.current += character;
    return index;
  }
  const here = HEREDOC_OPEN2.exec(line.slice(index));
  if (here) {
    state.current += here[0];
    state.heredoc = here[2];
    return index + here[0].length - 1;
  }
  if (character === ";") {
    flush(state, ";");
    return index;
  }
  if ((character === "&" || character === "|") && line[index + 1] === character) {
    flush(state, character + character);
    return index + 1;
  }
  state.current += character;
  return index;
}
function consumeLine(state, line, lineIndex) {
  if (state.heredoc !== null) {
    state.current += (state.current ? "\n" : "") + line;
    if (line.trim() === state.heredoc)
      state.heredoc = null;
    return;
  }
  if (lineIndex > 0)
    state.current += "\n";
  for (let index = 0; index < line.length; index++)
    index = state.quote ? consumeQuoted(state, line, index) : consumeSyntax(state, line, index);
}
function splitCommandRows(command) {
  const state = { rows: [], current: "", quote: null, heredoc: null };
  String(command).split("\n").forEach((line, index) => consumeLine(state, line, index));
  flush(state, "");
  return state.rows.filter((row) => row.text.length > 0);
}
function shellWords(command) {
  const words = [];
  let current = "";
  let quote = null;
  for (let index = 0; index < command.length; index++) {
    const character = command[index];
    if (quote) {
      if (quote === '"' && character === "\\" && index + 1 < command.length)
        current += command[++index];
      else if (character === quote)
        quote = null;
      else
        current += character;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (current)
        words.push(current);
      current = "";
      continue;
    }
    current += character === "\\" && index + 1 < command.length ? command[++index] : character;
  }
  if (current)
    words.push(current);
  return words;
}
var TRAILER_SEP = /\n---\s*\n/;
var TRAILER_KV = /^([a-z_][a-z0-9_ ]*?)\s*=\s*(.*)$/;
function parseWcgwTrailer(raw) {
  const separator = TRAILER_SEP.exec(raw);
  if (!separator)
    return { stdout: raw, status: null, cwd: null, extra: {} };
  const fields = Object.fromEntries(
    raw.slice(separator.index + separator[0].length).split("\n").map((line) => TRAILER_KV.exec(line.trim())).filter((match) => match !== null).map((match) => [match[1].trim(), match[2].trim()])
  );
  const { status = null, cwd = null, ...extra } = fields;
  return { stdout: raw.slice(0, separator.index), status, cwd, extra };
}
var AGENT_BROWSER_VALUE_OPTIONS = /* @__PURE__ */ new Set([
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
function agentBrowserOperation(segment) {
  const words = shellWords(segment);
  const start = words.findIndex((word) => (word.split("/").pop() ?? word) === "agent-browser");
  if (start < 0)
    return null;
  for (let index = start + 1; index < words.length; index++) {
    const word = words[index];
    if (word === "--")
      return words[index + 1] ?? null;
    if (!word.startsWith("-"))
      return word;
    if (!word.includes("=") && AGENT_BROWSER_VALUE_OPTIONS.has(word))
      index++;
  }
  return null;
}
function agentBrowserOperations(command) {
  const operations = splitCommandRows(command).map((row) => agentBrowserOperation(row.text)).filter((operation) => operation !== null);
  return [...new Set(operations)];
}
function playwrightOperation(toolName) {
  return toolName.match(/playwright.*__browser_(.+)$/i)?.[1]?.replace(/_/g, " ") ?? null;
}

// src/tools/bash.ts
function commandOf(input) {
  const raw = pickString(input, "command") ?? (typeof input.action_json === "string" ? input.action_json : null);
  return raw?.trim() || null;
}
function renderCommand(command) {
  return splitCommandRows(command).map(({ text, sep }, index) => (index === 0 ? ink.dim("$ ") : "") + highlight(text, "bash") + (sep ? " " + ink.dim(sep) : "")).join("\n");
}
var EXIT_OK = /^(?:0|process exited|completed|success)$/i;
function footerBadges(status, cwd, extra) {
  const ok = status !== null && EXIT_OK.test(status.trim());
  return [
    ...status !== null ? [badge({ label: `exit ${status}`, color: ok ? "brightGreen" : "brightRed", icon: ok ? "\u2713" : "\u2A02" })] : [],
    ...cwd ? [badge({ label: displayPath(cwd), color: "brightBlue", icon: "\u2302" })] : [],
    ...Object.entries(extra).map(([key, value]) => badge({ label: `${key} ${value}`, color: "brightCyan" }))
  ];
}
var operationBadges = (operations) => operations.map((operation) => badge({ label: operation, color: "brightBlue", icon: "\u0192" }));
function renderOutput(text, language) {
  const painted = highlight(text, language);
  return language === "diff" ? painted : painted.split("\n").map((line) => renderRuler(line) ?? line).join("\n");
}
function outputSections(stdout, language) {
  if (!stdout.trim())
    return [];
  return language === "diff" ? [{ content: stdout, beginsWithRuler: false }] : splitRulerSections(stdout);
}
function withFooter(specs, footer) {
  if (!footer.length)
    return specs;
  if (!specs.length)
    return [{ badges: OUTPUT_BADGE, content: "", footer }];
  return specs.map((spec, index) => index === specs.length - 1 ? { ...spec, footer } : spec);
}
function withOmitted(specs, omitted) {
  if (!omitted)
    return specs;
  const note = omittedNote(omitted);
  const last = specs.at(-1);
  if (!last)
    return [{ badges: OUTPUT_BADGE, content: note }];
  const content = typeof last.content === "string" ? last.content + "\n" + note : last.content.map((region, index) => index === last.content.length - 1 ? { ...region, content: region.content + "\n" + note } : region);
  return [...specs.slice(0, -1), { ...last, content }];
}
function outputSpecs(command, stdout, language, limit) {
  const { text: head, omitted } = clampLines(stdout, limit.lines);
  const sections = outputSections(head, language);
  const specs = [];
  let next = 0;
  if (command) {
    const regions = [{ content: renderCommand(command), background: TUI_TOKENS.card.commandBackground }];
    const first = sections[0];
    if (first && !first.beginsWithRuler) {
      regions[0].trailingBlank = true;
      regions.push({ heading: OUTPUT_BADGE, content: renderOutput(first.content, language) });
      next = 1;
    }
    specs.push({ badges: RUNNING_BADGE, content: regions });
  }
  for (const section2 of sections.slice(next))
    specs.push({ badges: OUTPUT_BADGE, content: renderOutput(section2.content, language) });
  return withOmitted(specs, omitted);
}
function renderCards(command, stdout, footer, screenshot, limit) {
  if (screenshot) {
    const specs = command ? [{ badges: RUNNING_BADGE, content: renderCommand(command) }] : [];
    return [...withFooter(specs, footer).map(renderCard), screenshot(limit)];
  }
  const language = detectOutputLanguage(stdout);
  const body = language === "json" ? formatJSON(stdout) : stdout;
  return withFooter(outputSpecs(command, body, language, limit), footer).map(renderCard);
}
var bash = {
  id: "bash",
  match: named("Bash", "mcp__wcgw__BashCommand"),
  render({ input, result }, limit) {
    const command = commandOf(input);
    const { stdout, status, cwd, extra } = parseWcgwTrailer(resultText(result) ?? "");
    const operations = command ? agentBrowserOperations(command) : [];
    const screenshot = operations.length ? screenshotCard(result, stdout) : null;
    const cards = renderCards(command, stdout, footerBadges(status, cwd, extra), screenshot, limit);
    return { lines: [stack(cards)], badges: operationBadges(operations) };
  }
};

// src/tools/browser.ts
var browser = {
  id: "browser",
  match: matching(/^mcp__playwright__browser_/i),
  render({ name, result }, limit) {
    const operation = playwrightOperation(name);
    const text = resultText(result);
    const shot = screenshotCard(result, text);
    const body = shot ? shot(limit) : text?.trim() ? outputCard(text, limit) : result && typeof result === "object" ? metaCard(result, limit) : null;
    return { lines: [body], badges: operationBadges(operation ? [operation] : []) };
  }
};

// src/tools/files.ts
import path7 from "node:path";
var pathOf = (input) => pickString(input, "file_path", "filePath", "path");
var read = {
  id: "read",
  match: named("Read"),
  render({ input, result }, limit) {
    const filePath = pathOf(input);
    const text = resultText(result);
    const card = filePath ? fileCard(filePath, { action: "read", fallbackText: text }) : null;
    return { lines: [card ? card(limit) : text ? outputCard(text, limit) : null] };
  }
};
var write = {
  id: "write",
  match: named("Write"),
  render({ input, result }, limit) {
    const filePath = pathOf(input) ?? pickString(result, "filePath");
    const card = filePath ? fileCard(filePath, { action: "write" }) : null;
    return { lines: [card ? card(limit) : filePath ? statusLine(`wrote ${filePath}`) : null] };
  }
};
var CONTEXT_LINES = 3;
function editedSpan(result) {
  const hunks = asRecord(result)?.structuredPatch;
  if (!Array.isArray(hunks) || !hunks.length)
    return null;
  const spans = hunks.flatMap((hunk) => {
    const start = Number(asRecord(hunk)?.newStart);
    const count = Number(asRecord(hunk)?.newLines);
    return Number.isFinite(start) ? [{ start, end: start + Math.max(Number.isFinite(count) ? count : 1, 1) - 1 }] : [];
  });
  if (!spans.length)
    return null;
  return {
    start: Math.max(1, Math.min(...spans.map((span) => span.start)) - CONTEXT_LINES),
    end: Math.max(...spans.map((span) => span.end)) + CONTEXT_LINES
  };
}
var edit = {
  id: "edit",
  match: named("Edit", "MultiEdit"),
  render({ name, input, result }, limit) {
    const filePath = pathOf(input) ?? pickString(result, "filePath");
    const card = filePath ? fileCard(filePath, { action: name === "MultiEdit" ? "multi-edit" : "edit", range: editedSpan(result) }) : null;
    const text = resultText(result);
    return { lines: [card ? card(limit) : text ? statusLine(text, 120) : null] };
  }
};
var viewImage = {
  id: "view-image",
  match: named("view_image", "ViewImage"),
  render({ input, result }, limit) {
    const filePath = pathOf(input);
    const card = (filePath ? fileCard(filePath, { action: "view", readText: false }) : null) ?? screenshotCard(result, resultText(result), "view");
    return { lines: [card?.(limit)] };
  }
};
var SEARCH_REPLACE_RE = /<<<<<<< SEARCH\r?\n[\s\S]*?=======\r?\n[\s\S]*?>>>>>>> REPLACE/;
var wcgwFile = {
  id: "wcgw-file",
  match: named("mcp__wcgw__FileWriteOrEdit", "mcp__wcgw__FileEdit"),
  render({ input, result }, limit) {
    const text = resultText(result);
    const filePath = pathOf(input);
    const action = SEARCH_REPLACE_RE.test(String(input.text_or_search_replace_blocks ?? "")) ? "edit" : "write";
    const card = filePath ? fileCard(filePath, { action }) : null;
    return {
      lines: [
        text?.trim() ? statusLine(text) : null,
        card ? card(limit) : text && !text.trim() ? null : !card && text ? outputCard(text, limit) : null
      ]
    };
  }
};
function pathList(input) {
  const raw = pickAny(input, "file_paths", "file_path", "path") ?? [];
  return (Array.isArray(raw) ? raw : [raw]).map(String).filter(Boolean);
}
function inlineContents(result, limit) {
  const record = asRecord(result);
  const contents = pickAny(record, "file-contents-numbered", "file_contets_numbered", "file-contents", "output");
  if (typeof contents === "string")
    return contents ? [outputCard(contents, limit)] : [];
  const files = asRecord(contents);
  if (!files)
    return [];
  return Object.entries(files).filter((entry) => typeof entry[1] === "string").map(([filePath, content]) => renderPathCard({
    path: filePath,
    content: collapse(renderText(content, filePath), limit.lines)
  }));
}
var wcgwRead = {
  id: "wcgw-read",
  match: named("mcp__wcgw__ReadFiles", "mcp__wcgw__ReadImage"),
  render({ input, result }, limit) {
    const paths = pathList(input);
    const each = share(limit, paths.length);
    const cards = paths.map((rawPath) => fileCard(rawPath, { action: "read" })?.(each) ?? ink.err("\u2A02 ") + ink.strong("Path: ") + stripLineRange(rawPath).path);
    const missed = cards.filter((card) => card.includes("\u2A02 ")).length;
    if (paths.length && missed < paths.length)
      return { lines: cards };
    const inline = inlineContents(result, limit);
    const text = resultText(result);
    return { lines: [...cards, ...inline.length ? inline : text ? [outputCard(text, limit)] : []] };
  }
};
var SAVED_PATH_RE = /(\/[^\s"']*\.txt)/;
function savedContextPath(input, text) {
  const fromResult = text ? SAVED_PATH_RE.exec(text)?.[1] : null;
  if (fromResult)
    return fromResult;
  const id = pickString(input, "id");
  if (!id)
    return null;
  const dataHome = process.env.XDG_DATA_HOME || path7.join(process.env.HOME ?? process.env.USERPROFILE ?? "", ".local", "share");
  return path7.join(dataHome, "wcgw", "memory", `${id}.txt`);
}
var RELEVANT_FILES_MARKER = "\n# Relevant Files:";
function dropInlinedFiles(raw) {
  const at = raw.indexOf(RELEVANT_FILES_MARKER);
  if (at === -1)
    return raw;
  const omitted = raw.slice(at + RELEVANT_FILES_MARKER.length).split("\n").length;
  return raw.slice(0, at) + `
# Relevant Files: ${omitted} lines of inlined file content`;
}
var wcgwContext = {
  id: "wcgw-context",
  match: named("mcp__wcgw__ContextSave"),
  render({ input, result }, limit) {
    const text = resultText(result)?.trim() || null;
    const saved = savedContextPath(input, text);
    const status = text && text !== saved ? statusLine(text) : null;
    const card = saved ? fileCard(saved, { action: "context save", transform: dropInlinedFiles }) : null;
    return {
      lines: [
        status,
        card ? card(limit) : text && !status ? ink.ok("\u29FA ") + firstLine(text, 200) : null
      ]
    };
  }
};
var FILE_RENDERERS = [read, write, edit, viewImage, wcgwFile, wcgwRead, wcgwContext];

// src/tools/generic.ts
var PRIMARY_KEYS = {
  Read: ["content", "output", "text"],
  Glob: ["filenames", "result", "output"],
  Grep: ["filenames", "result", "output"],
  // WebFetch answers `{ code, codeText, url, durationMs, result }`.
  WebFetch: ["result", "content", "output", "text"],
  ExitPlanMode: ["plan", "result"],
  NotebookRead: ["output", "content"],
  NotebookEdit: ["result", "output"]
};
var CONTENT_KEYS = ["stdout", "output", "content", "text", "message", "result", "error", "stderr", "filePath", "type"];
var LABELLED = {
  error: (value) => ink.err("\u2A02 ERROR:") + "\n" + value,
  stderr: (value) => ink.err("\u2A02 STDERR:") + "\n" + value,
  filePath: (value) => ink.key("\u{F021A} ") + ink.strong("Path: ") + value,
  type: (value) => ink.key("\u29D6 ") + ink.strong("Action: ") + value
};
var asText = (value) => typeof value === "object" && value !== null ? resultText(value) ?? JSON.stringify(value, null, 2) : String(value);
function takeContent(rest, primary) {
  const parts = primary === null ? [] : [primary];
  for (const key of CONTENT_KEYS) {
    if (rest[key] == null)
      continue;
    const value = asText(rest[key]);
    if (!primary?.includes(value.slice(0, 20)))
      parts.push(LABELLED[key]?.(value) ?? value);
    delete rest[key];
  }
  return parts;
}
function deconstruct(toolName, result) {
  if (typeof result === "string")
    return { primary: result, metadata: null };
  if (Array.isArray(result) || asRecord(result)?.["0"])
    return { primary: resultText(result), metadata: null };
  const record = asRecord(result);
  if (!record)
    return { primary: null, metadata: null };
  const rest = { ...record };
  const primaryKey = (PRIMARY_KEYS[parseToolName(toolName).tool] ?? []).find((key) => rest[key] != null);
  const primary = primaryKey ? asText(rest[primaryKey]) : null;
  if (primaryKey)
    delete rest[primaryKey];
  const parts = takeContent(rest, primary);
  return {
    primary: parts.join("\n\n") || null,
    metadata: Object.keys(rest).length ? rest : null
  };
}
var generic = {
  id: "generic",
  match: () => true,
  render({ name, result }, limit) {
    const { primary, metadata } = deconstruct(name, result);
    return {
      lines: [
        primary ? outputCard(primary, limit) : null,
        metadata ? metaCard(metadata, limit) : null,
        !primary && !metadata && pickAny(result) === void 0 && result && typeof result === "object" ? metaCard(result, limit) : null
      ]
    };
  }
};

// src/tools/misc.ts
function structuredAnswers(result) {
  const answers = asRecord(asRecord(result)?.answers);
  return answers ? Object.entries(answers).map(([question, value]) => ({ question, answer: Array.isArray(value) ? value.map(String).join(", ") : String(value) })) : [];
}
function nativeAnswers(questions, result) {
  const text = resultText(result) ?? "";
  return questions.flatMap((question) => {
    const marker = `"${question}"="`;
    const start = text.indexOf(marker);
    if (start < 0)
      return [];
    const from = start + marker.length;
    const end = text.indexOf('"', from);
    return [{ question, answer: text.slice(from, end < 0 ? void 0 : end) }];
  });
}
var askUserQuestion = {
  id: "ask-user-question",
  match: named("AskUserQuestion"),
  render({ input, result }) {
    const questions = Array.isArray(input.questions) ? input.questions.map((item) => pickString(item, "question")).filter((q) => q !== null) : [];
    const answers = structuredAnswers(result);
    const resolved = answers.length ? answers : nativeAnswers(questions, result);
    return {
      lines: resolved.length ? resolved.flatMap(({ question, answer }) => [ink.dim("\xB7 ") + prose(question, Infinity, 2), ink.ok("\u2192 ") + prose(answer, Infinity, 2)]) : [ink.ok("\u2713 Answers recorded")],
      badges: [badge({ label: `${resolved.length || questions.length} answer${resolved.length === 1 ? "" : "s"}`, color: "brightGreen", icon: "\u2713" })]
    };
  }
};
function loadedToolNames(result, query) {
  const parsed = parseJsonish(result);
  const record = asRecord(parsed);
  const candidates = Array.isArray(parsed) ? parsed : [record?.matches, record?.content].find(Array.isArray) ?? [];
  const names = candidates.flatMap((candidate) => typeof candidate === "string" ? [candidate] : [pickString(candidate, "tool_name", "toolName", "name")].filter((name) => name !== null));
  const selected = query.startsWith("select:") ? query.slice(7).split(",").map((name) => name.trim()).filter(Boolean) : [];
  const deferred = typeof record?.total_deferred_tools === "number" ? record.total_deferred_tools : null;
  return { names: [...new Set(names.length ? names : selected)], deferred };
}
var toolSearch = {
  id: "tool-search",
  match: named("ToolSearch"),
  render({ input, result }) {
    const { names, deferred } = loadedToolNames(result, pickString(input, "query") ?? "");
    return {
      lines: names.length ? names.map((name) => ink.ok("\u2713 ") + parseToolName(name).pretty) : [ink.dim("No tools loaded")],
      badges: [
        badge({ label: `${names.length} loaded`, color: names.length ? "brightGreen" : "gray" }),
        deferred === null ? null : badge({ label: `${deferred} deferred`, color: "gray" })
      ]
    };
  }
};
var PATCH_SUCCESS = /(?:^done!?$|success\.\s+(?:updated|added|deleted) the following files:)/im;
var applyPatch = {
  id: "apply-patch",
  match: named("apply_patch", "ApplyPatch"),
  render({ result }, limit) {
    const text = resultText(result)?.trim() ?? "";
    return { lines: [text && !PATCH_SUCCESS.test(text) ? outputCard(text, limit) : null] };
  }
};
var wcgwInit = {
  id: "wcgw-init",
  match: named("mcp__wcgw__Initialize"),
  render({ result }) {
    const text = pickString(result, "text", "output") ?? resultText(result);
    return { lines: [text ? ink.ok("\u23FB ") + text.split("\n").slice(0, 3).join("\n") : null] };
  }
};
var MISC_RENDERERS = [askUserQuestion, toolSearch, applyPatch, wcgwInit];

// src/tools/tasks.ts
var normalizeStatus = (value, fallback = "pending") => String(value ?? fallback).trim().toLowerCase().replace(/-/g, "_") || fallback;
function normalizeTask(value, fallback = {}, fallbackStatus = "pending") {
  const task = asRecord(value);
  const subject = pickString(task, "subject", "title", "name") ?? pickString(fallback, "subject", "title", "name");
  if (!subject)
    return null;
  const description = pickString(task, "description", "details") ?? pickString(fallback, "description", "details");
  return {
    id: pickId(task, "id", "taskId") ?? pickId(fallback, "id", "task_id"),
    subject,
    ...description ? { description } : {},
    status: normalizeStatus(pickAny(task, "status") ?? pickAny(fallback, "status"), fallbackStatus)
  };
}
var taskFromResult = (input, result, fallbackStatus) => normalizeTask(pickAny(asRecord(result), "task", "item") ?? result, input, fallbackStatus);
function tasksFromResult(result) {
  const parsed = parseJsonish(result);
  const record = asRecord(parsed);
  const candidate = record ? parseJsonish(pickAny(record, "tasks", "items", "result", "output", "content")) : parsed;
  return Array.isArray(candidate) ? candidate.map((item) => normalizeTask(item)).filter((task) => task !== null) : [];
}
var APPEARANCE = {
  completed: { caption: "TASK COMPLETED", checked: true, color: "green" },
  in_progress: { caption: "TASK STARTED", checked: false, color: "yellow" },
  blocked: { caption: "TASK BLOCKED", checked: false, color: "red" },
  cancelled: { caption: "TASK CANCELLED", checked: false, color: "gray" },
  canceled: { caption: "TASK CANCELLED", checked: false, color: "gray" },
  pending: { caption: "TASK QUEUED", checked: false, color: "cyan" },
  todo: { caption: "TASK QUEUED", checked: false, color: "cyan" }
};
var taskAppearance = (status) => APPEARANCE[normalizeStatus(status)] ?? { caption: "TASK UPDATED", checked: false, color: "blue" };
function renderTask(task, caption) {
  const look = taskAppearance(task.status);
  const heading = renderCheckboxHeading({
    caption: caption ?? look.caption,
    checked: look.checked,
    color: look.color,
    description: task.description
  });
  const label = task.id == null ? task.subject : `#${task.id}  ${task.subject}`;
  return [...heading.split("\n"), "", renderBadges(badge({ label, color: look.color }))];
}
var taskCreate = {
  id: "task-create",
  match: named("TaskCreate"),
  render({ input, result }) {
    const task = taskFromResult(input, result, "pending");
    return { lines: task ? renderTask(task, "ADDED TASK") : [] };
  }
};
var taskUpdate = {
  id: "task-update",
  match: named("TaskUpdate"),
  render({ input, result }) {
    const record = asRecord(result);
    const status = normalizeStatus(pickAny(asRecord(record?.statusChange), "to") ?? pickAny(record, "status") ?? pickAny(input, "status"), "updated");
    const task = taskFromResult(input, result, status);
    if (task)
      return { lines: renderTask({ ...task, status }) };
    const id = pickId(record, "taskId", "task_id") ?? pickId(input, "taskId", "task_id", "id");
    const look = taskAppearance(status);
    return {
      lines: [renderBadges(
        badge({ label: look.caption, color: look.color, icon: look.checked ? "\u2713" : "\u21BB" }),
        id === null ? null : badge({ label: `#${id}`, color: "gray" })
      )]
    };
  }
};
var taskList = {
  id: "task-list",
  match: named("TaskList"),
  render({ result }) {
    const tasks = tasksFromResult(result);
    return { lines: tasks.length ? tasks.flatMap((task, index) => [...index ? [""] : [], ...renderTask(task)]) : [ink.dim("No tasks")] };
  }
};
var taskStop = {
  id: "task-stop",
  match: named("TaskStop"),
  render({ input, result }) {
    const record = resultRecord(result);
    const id = pickId(record, "task_id", "taskId") ?? pickId(input, "task_id", "taskId");
    const type = pickString(record, "task_type");
    return {
      lines: [ink.err("\u25A0 ") + source_default.bold.red("TASK STOPPED")],
      badges: [
        id === null ? null : badge({ label: id, color: "brightRed" }),
        type ? badge({ label: type, color: "gray" }) : null
      ]
    };
  }
};
function planItems(value) {
  if (!Array.isArray(value))
    return [];
  return value.flatMap((item) => {
    const text = pickString(item, "step", "content", "activeForm");
    return text ? [{ text: text.trim(), status: normalizeStatus(pickAny(item, "status")) }] : [];
  });
}
var PLAN_GLYPH = {
  completed: ["\u2713", ink.ok],
  in_progress: ["\u25B6", ink.warn],
  blocked: ["\xD7", ink.err]
};
var planUpdate = {
  id: "plan-update",
  match: named("update_plan", "UpdatePlan", "TodoWrite", "TodoRead"),
  render({ input, result }) {
    const record = resultRecord(result);
    const fromInput = planItems(pickAny(input, "plan", "todos"));
    const plan = fromInput.length ? fromInput : planItems(pickAny(record, "plan", "todos"));
    const explanation = pickString(input, "explanation") ?? pickString(record, "explanation");
    const completed = plan.filter((item) => item.status === "completed").length;
    return {
      lines: [
        explanation ? ink.dim(prose(explanation)) : null,
        ...plan.map(({ text, status }) => {
          const [glyph, paint] = PLAN_GLYPH[status] ?? ["\u25CB", ink.key];
          return paint(`${glyph} `) + prose(text, Infinity, 2);
        }),
        plan.length ? null : ink.dim("Plan updated")
      ],
      badges: plan.length ? [badge({ label: `${completed}/${plan.length} complete`, color: completed === plan.length ? "brightGreen" : "brightYellow" })] : []
    };
  }
};
var exitPlan = {
  id: "exit-plan",
  match: named("ExitPlanMode"),
  render: () => ({ lines: renderHeading({ word: "YEET FAFO", color: "cyan", event: "stop" }).split("\n") })
};
var TASK_RENDERERS = [taskCreate, taskUpdate, taskList, taskStop, planUpdate, exitPlan];

// src/tools/web.ts
function collectLinks(value, seen = /* @__PURE__ */ new Set(), out = []) {
  const record = asRecord(value);
  if (record && typeof record.url === "string" && /^https?:/.test(record.url)) {
    if (!seen.has(record.url)) {
      seen.add(record.url);
      out.push({ title: pickString(record, "title", "name") ?? record.url, url: record.url });
    }
    return out;
  }
  if (Array.isArray(value))
    value.forEach((item) => collectLinks(item, seen, out));
  else if (record)
    Object.values(record).forEach((item) => collectLinks(item, seen, out));
  else if (typeof value === "string")
    collectLinks(linksInText(value), seen, out);
  return out;
}
var LINKS_LINE_RE = /^Links:\s*(\[[\s\S]*?\])\s*$/m;
var linksInText = (text) => {
  const match = LINKS_LINE_RE.exec(text);
  return match ? parseJsonish(match[1]) : null;
};
function summaries(value) {
  const parts = Array.isArray(value) ? value : [value];
  return parts.filter((part) => typeof part === "string").map((part) => part.replace(LINKS_LINE_RE, "").replace(/^Web search results for query:.*$/m, "").trim()).filter(Boolean);
}
function linkTable(links, limit) {
  const table = renderTable({
    head: ["#", "title", "url"],
    rows: links.map((link, index) => [ink.num(String(index + 1)), link.title, source_default.gray.underline(link.url)])
  });
  return renderCard({ badges: OUTPUT_BADGE, content: collapse(table, limit.lines, { label: "rows" }) });
}
var webSearch = {
  id: "web-search",
  match: named("WebSearch"),
  render({ input, result }, limit) {
    const record = asRecord(result);
    const payload = record?.results ?? record ?? resultText(result);
    const links = collectLinks(payload);
    const query = pickString(input, "query") ?? pickString(record, "query");
    const seconds = typeof record?.durationSeconds === "number" ? record.durationSeconds : null;
    return {
      lines: [
        query ? ink.dim("\u2315 ") + query : null,
        links.length ? linkTable(links, limit) : null,
        ...summaries(payload).map((text) => ink.dim(prose(text, 600)))
      ],
      badges: [
        badge({ label: `${links.length} result${links.length === 1 ? "" : "s"}`, color: links.length ? "brightGreen" : "gray" }),
        seconds === null ? null : badge({ label: `${seconds.toFixed(1)}s`, color: "gray" })
      ]
    };
  }
};
var WEB_RENDERERS = [webSearch];

// src/tools/index.ts
var RENDERERS = [
  bash,
  ...FILE_RENDERERS,
  ...TASK_RENDERERS,
  ...AGENT_RENDERERS,
  ...WEB_RENDERERS,
  ...MISC_RENDERERS,
  browser,
  generic
];
var rendererFor = (toolName) => RENDERERS.find((renderer) => renderer.match(toolName)) ?? generic;
var renderTool = (view) => (limit) => {
  const { lines, badges = [] } = rendererFor(view.name).render(view, limit);
  return section([toolBadge(view.name), ...badges], [durationLine(view.durationMs), ...lines]);
};

// src/hooks.ts
var HOME3 = process.env.HOME ?? process.env.USERPROFILE ?? "";
var SYSTEM_PROMPT_PATH = path8.join(HOME3, "system-prompt.md");
function loadSystemPrompt() {
  try {
    return fs8.existsSync(SYSTEM_PROMPT_PATH) ? fs8.readFileSync(SYSTEM_PROMPT_PATH, "utf8") : null;
  } catch (error) {
    debugLog("SessionStart", "load-system-prompt", error.message);
    return null;
  }
}
var quoted = (text, limit) => ink.dim(prose(text, limit));
var banner = (word, color, event2, badges, lines = []) => renderHeading({ word, color, event: event2 }) + section(badges, lines);
function toolView(raw) {
  const input = pickAny(raw, "tool_input", "toolInput");
  return {
    name: pickString(raw, "tool_name", "toolName") ?? "Unknown",
    // Freeform tools such as apply_patch put their payload directly in `tool_input`.
    input: asRecord(input) ?? (typeof input === "string" ? { input } : {}),
    result: pickAny(raw, "tool_response", "tool_result", "toolResult") ?? null,
    durationMs: pickNumber(raw, "duration_ms", "durationMs")
  };
}
var HOOKS = {
  // Registered so Codex receives a valid no-op; policy stays host-owned.
  PreToolUse: () => ({}),
  PostToolBatch: () => ({}),
  SessionStart: (raw) => {
    const source = pickString(raw, "source") ?? "startup";
    const model = pickString(raw, "model");
    const agentType = pickString(raw, "agent_type", "agentType");
    const systemPrompt = loadSystemPrompt();
    const isWake = source === "compact";
    const body = banner(isWake ? "WAKE UP" : "BEGIN AGAIN", "cyan", isWake ? "wakeup" : "start", [
      badge({ label: `Session:${source}`, color: "green", icon: "\u23FB" }),
      model ? badge({ label: model, color: "gray" }) : null
    ], [
      ink.ok("Session started"),
      agentType ? ink.dim("Agent: ") + agentType : null,
      systemPrompt ? ink.key("\u2713 ") + "System prompt loaded from: " + SYSTEM_PROMPT_PATH : null
    ]);
    return {
      hookSpecificOutput: { hookEventName: "SessionStart", ...systemPrompt ? { additionalContext: systemPrompt } : {} },
      // The art gets whatever the fixed part of the banner leaves of the limit.
      systemMessage: (limit) => renderWelcome(limit.chars - body.length) + body
    };
  },
  SessionEnd: () => ({ systemMessage: banner("BYE", "red", "bye", [badge({ label: "SessionEnd", color: "red", icon: "\u23FC" })]) }),
  Stop: () => ({ systemMessage: banner("STOP", "red", "stop", [badge({ label: "Stop", color: "red", icon: "\u25A0" })]) }),
  SubagentStart: (raw) => {
    const agentType = pickString(raw, "agent_type", "agentType");
    return {
      systemMessage: banner("BEGIN", "green", "agent", [
        badge({ label: "SubagentStart", color: "green", icon: "\u2B21" }),
        agentType ? badge({ label: agentType, color: "gray" }) : null
      ])
    };
  },
  SubagentStop: (raw) => ({
    systemMessage: banner("GOIN ASLEEP", "green", "agent", [
      badge({ label: "SubagentStop", color: "green", icon: "\u231F" }),
      badge({ label: pickString(raw, "agent_type", "agentType") ?? "Main Process", color: "gray" })
    ])
  }),
  PreCompact: (raw) => {
    const trigger = pickString(raw, "trigger");
    const instructions = pickString(raw, "custom_instructions", "customInstructions");
    return {
      systemMessage: banner("COMPACT", "yellow", "compact", [
        badge({ label: "PreCompact", color: "yellow", icon: "\u27F3" }),
        trigger ? badge({ label: trigger, color: "gray" }) : null
      ], [instructions ? quoted(instructions, 200) : null])
    };
  },
  PostCompact: (raw) => {
    const summary = pickString(raw, "summary", "compact_summary");
    return {
      systemMessage: banner(
        "COMPACT",
        "yellow",
        "compact",
        [badge({ label: "PostCompact", color: "yellow", icon: "\u27F3" })],
        [summary ? quoted(summary, 200) : null]
      )
    };
  },
  InstructionsLoaded: (raw) => {
    const filePath = pickString(raw, "file_path", "filePath");
    const loadReason = pickString(raw, "load_reason", "loadReason");
    return {
      systemMessage: section([
        badge({ label: `Instructions:${pickString(raw, "memory_type", "memoryType") ?? "Unknown"}`, color: "cyan", icon: "\u2713" }),
        loadReason ? badge({ label: loadReason, color: "gray" }) : null
      ], [filePath ? ink.dim("File: ") + filePath : null])
    };
  },
  UserPromptSubmit: (raw) => {
    const prompt = pickString(raw, "prompt", "user_prompt", "userPrompt") ?? "";
    const badges = [badge({ label: "UserPromptSubmit", color: "yellow", icon: "\u270E" })];
    const lines = [prompt ? quoted(prompt, 200) : null];
    const imagePath = findImagePath(prompt, pickString(raw, "cwd") ?? process.cwd());
    const image = imagePath ? fileCard(imagePath, { action: "prompt image" }) : null;
    return { systemMessage: image ? (limit) => section(badges, [...lines, image(limit)]) : section(badges, lines) };
  },
  UserPromptExpansion: (raw) => {
    const expanded = pickString(raw, "expanded_prompt", "expandedPrompt", "expanded", "prompt");
    if (!expanded)
      debugLog("UserPromptExpansion", "unknown-shape", Object.keys(raw));
    return {
      systemMessage: section(
        [badge({ label: "UserPromptExpansion", color: "magenta", icon: "\u2731" })],
        [expanded ? quoted(expanded, 300) : null]
      )
    };
  },
  PostToolUseFailure: (raw) => {
    const view = toolView(raw);
    const error = pickAny(raw, "error", "tool_result") ?? "Unknown error";
    const text = typeof error === "string" ? error : pickString(error, "message") ?? JSON.stringify(error, null, 2);
    return {
      hookSpecificOutput: { hookEventName: "PostToolUseFailure", additionalContext: typeof error === "string" ? error : JSON.stringify(error) },
      systemMessage: section([
        toolBadge(view.name, { color: "red", icon: "\u2A02" }),
        pickBool(raw, "is_interrupt", "isInterrupt") ? badge({ label: "INTERRUPT", color: "yellow" }) : null
      ], [ink.err("\u2A02 ") + source_default.bold.red("Tool failed:"), text, durationLine(view.durationMs)])
    };
  },
  PostToolUse: (raw) => ({ systemMessage: renderTool(toolView(raw)) })
};
function handleHook(event2, raw) {
  try {
    return HOOKS[event2](asRecord(raw) ?? {});
  } catch (error) {
    debugLog("handleHook", "handler-error", event2, error instanceof Error ? error.stack ?? error.message : String(error));
    return {};
  }
}

// src/runtime/io.ts
function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(String(chunk)));
    process.stdin.on("end", () => {
      const raw = chunks.join("");
      if (!raw.trim())
        return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        debugLog("readStdin", "parse-fail", error.message, raw.slice(0, 200));
        resolve(null);
      }
    });
  });
}
function writeResponse(json, systemMessage, { mirrorToStderr: mirrorToStderr2 }) {
  if (mirrorToStderr2 && systemMessage)
    process.stderr.write(systemMessage + "\n");
  process.stdout.write(json);
  process.exit(0);
}

// src/types.ts
var HOOK_EVENTS = [
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
function isHookEvent(value) {
  return typeof value === "string" && HOOK_EVENTS.includes(value);
}

// src/main.ts
var event = process.argv[2];
if (!isHookEvent(event)) {
  debugLog("main", "unknown-event", String(event));
  writeResponse("{}", null, { mirrorToStderr: false });
}
var isCodex = Boolean(process.env.PLUGIN_ROOT || process.env.PLUGIN_DATA);
var mirrorToStderr = !isCodex && event !== "PostToolUse";
try {
  const raw = await readStdin();
  if (isCodex && event !== "SessionStart" && event !== "PostToolUseFailure")
    writeResponse("{}", null, { mirrorToStderr });
  const output = handleHook(event, raw);
  const response = isCodex ? { ...output, systemMessage: void 0 } : output;
  const { json, systemMessage } = serializeHook(response);
  writeResponse(json, systemMessage, { mirrorToStderr });
} catch (error) {
  debugLog(event, "CRASH", error instanceof Error ? error.stack ?? error.message : String(error));
  writeResponse("{}", null, { mirrorToStderr });
}
