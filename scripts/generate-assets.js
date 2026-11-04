const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createSolidPng(width, height, r, g, b, a = 255) {
  // Simple uncompressed or deflate PNG generator
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type 6 (RGBA)
  ihdrData.writeUInt8(0, 10); // compression 0
  ihdrData.writeUInt8(0, 11); // filter 0
  ihdrData.writeUInt8(0, 12); // interlace 0

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data: for each scanline: 1 filter byte (0) + width * 4 bytes
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw border or accent square in center
      const inCenter = (x > width * 0.4 && x < width * 0.6 && y > height * 0.4 && y < height * 0.6);
      if (inCenter) {
        rawData[pxOffset] = 0;     // R
        rawData[pxOffset + 1] = 229; // G
        rawData[pxOffset + 2] = 255; // B (Electric Cyan #00E5FF)
        rawData[pxOffset + 3] = 255; // A
      } else {
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = a;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(4 + 4 + length + 4);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crcData = buffer.slice(4, 8 + length);
  const crc = crc32(crcData);
  buffer.writeUInt32BE(crc, 8 + length);
  return buffer;
}

// Standard CRC32 table
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = makeCrcTable();
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Navy #001F3F => R: 0, G: 31, B: 63
fs.writeFileSync(path.join(assetsDir, 'icon.png'), createSolidPng(192, 192, 0, 31, 63));
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), createSolidPng(192, 192, 0, 31, 63));
fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), createSolidPng(192, 192, 0, 31, 63));
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), createSolidPng(48, 48, 0, 31, 63));

console.log('Valid PNG assets generated successfully in /assets');
