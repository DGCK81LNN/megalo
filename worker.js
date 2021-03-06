self.onmessage = function ({ data: { sampleRate, sampleCount, channels } }) {
  var buffer = encodeWav(sampleRate, sampleCount, channels)
  self.postMessage(
    {
      type: "success",
      data: buffer,
    },
    [buffer]
  )
}
self.onmessageerror = function () {
  self.postMessage({
    type: "messageerror",
  })
}

function encodeWav(sampleRate, sampleCount, channels) {
  const channelCount = channels.length === 2 ? 2 : 1
  const bitDepth = 16,
    bytesPerSample = 2
  const blockAlign = channelCount * bytesPerSample
  const dataSize = sampleCount * blockAlign
  const mark = "\r\nGenerated by megalo — https://github.com/DGCK81LNN/megalo"

  const buffer = new ArrayBuffer(44 + dataSize + mark.length)
  const view = new DataView(buffer)

  writeStr(view, 0, "RIFF") // RIFF identifier
  view.setUint32(4, 36 + dataSize, true) // RIFF chunk length
  writeStr(view, 8, "WAVE") // RIFF type
  writeStr(view, 12, "fmt ") // format chunk identifier
  view.setUint32(16, 16, true) // format chunk length
  view.setUint16(20, 1, true) // sample format (16 bit PCM)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true) // byte rate
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeStr(view, 36, "data") // data chunk identifier
  view.setUint32(40, dataSize, true) // data chunk length

  {
    // write data
    let offset = 44
    if (channelCount == 2) {
      let s0 = channels[0],
        s1 = channels[1]
      for (let i = 0; i < sampleCount; ++i, offset += 4) {
        view.setInt16(offset, to16(s0[i]), true)
        view.setInt16(offset + 2, to16(s1[i]), true)
        if (!(i & 0xffff)) reportProgress(i, sampleCount)
      }
    } else {
      let s = channels[0]
      for (let i = 0; i < sampleCount; ++i, offset += 2) {
        view.setInt16(offset, to16(s[i]), true)
        if (!(i & 0xffff)) reportProgress(i, sampleCount)
      }
    }
  }

  writeStr(view, 44 + dataSize, mark)

  return buffer
}

function writeStr(view, offset, string) {
  for (var i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function to16(num) {
  let clamped = num < -1 ? -1 : num > 1 ? 1 : num
  return clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
}

function reportProgress(processed, total) {
  self.postMessage({
    type: "progress",
    data: processed / total,
  })
}
