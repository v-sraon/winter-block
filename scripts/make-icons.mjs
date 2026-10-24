// Renders the app icon (snowy peak on a night sky) to PNGs without any image dependencies.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [14, 17, 22]
const SKY = [28, 38, 56]
const ROCK = [94, 129, 172]
const SNOW = [236, 244, 255]
const MOON = [255, 196, 87]

function colorAt(x, y) {
  // x, y in 0..1
  let c = mix(SKY, BG, Math.min(1, y / 0.8))
  const dx = x - 0.72, dy = y - 0.27
  if (dx * dx + dy * dy < 0.075 * 0.075) c = MOON
  // main peak: apex (0.42, 0.22), base y 0.80 from x 0.06 to 0.86
  const inMain = y > 0.22 && y < 0.8 && Math.abs(x - 0.42) < ((y - 0.22) / 0.58) * 0.4
  // side peak: apex (0.70, 0.42), base 0.80 from 0.46 to 0.96
  const inSide = y > 0.42 && y < 0.8 && Math.abs(x - 0.71) < ((y - 0.42) / 0.38) * 0.25
  if (inSide) c = mix(ROCK, BG, 0.35)
  if (inMain) c = ROCK
  // snow caps with a jagged lower edge
  const jag = 0.02 * Math.sin(x * 60)
  if (inMain && y < 0.4 + jag) c = SNOW
  if (inSide && !inMain && y < 0.52 + jag) c = mix(SNOW, ROCK, 0.25)
  return c
}

function mix(a, b, t) {
  return a.map((v, i) => Math.round(v * (1 - t) + b[i] * t))
}

function render(size, pad = 0) {
  const ss = 3
  const rows = []
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3)
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0]
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const u = ((px + (sx + 0.5) / ss) / size - pad) / (1 - 2 * pad)
          const v = ((py + (sy + 0.5) / ss) / size - pad) / (1 - 2 * pad)
          const c = u < 0 || u > 1 || v < 0 || v > 1 ? BG : colorAt(u, v)
          acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
        }
      row.set(acc.map((v) => Math.round(v / (ss * ss))), 1 + px * 3)
    }
    rows.push(row)
  }
  return png(size, size, Buffer.concat(rows))
}

function png(w, h, raw) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

writeFileSync('public/icon-192.png', render(192))
writeFileSync('public/icon-512.png', render(512))
writeFileSync('public/apple-touch-icon.png', render(180))
console.log('icons written')
