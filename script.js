document.write('and... ')

/** @type {AudioContext} */
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Blob.arrayBuffer() polyfill
if (typeof Blob.prototype.arrayBuffer !== "function") {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      var fileReader = new FileReader();
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = () => reject(fileReader.error);
      fileReader.readAsArrayBuffer(this);
    });
  };
}

/** length of quarter beat in seconds */
var qlen = 0.125
/** sequence for rearranging quarter beats */
var qseq = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]
/** number of quarter beats in each measure */
var mlenq = 16
/** start time of first beat in seconds */
var start = 0
/** @type {AudioBuffer} */
var aub = null

file.onchange = () => {
  generateBtn.disabled = true
  file.files[0].arrayBuffer()
    .then(/** @returns {Promise<AudioBuffer>} */
          (arrayBuffer) => new Promise(
            (res, rej) => audioContext.decodeAudioData(arrayBuffer, res, rej)
          ))
    .then(_aub => {
      generateBtn.disabled = false
      aub = _aub
    }, e => {
      alert(e)
    })
}

codebox.value = JSON.stringify({ qlen, qseq, mlenq, start }, null, 1).replace(/\n[ ]*/g, ' ')
function generate() {
  try {
    ({ qlen, qseq, mlenq, start } = JSON.parse(codebox.value))
    var channels = [];
    const channelCount = aub.numberOfChannels;
    const sampleRate = aub.sampleRate
    const sampleCount = aub.length
    /** length of quarter beat in samples */
    const qlens = sampleRate * qlen
    for (let i = 0; i < channelCount; ++i)
      channels.push(aub.getChannelData(i));

    var dur2 = start + (aub.duration -start) / mlenq * qseq.length
    var aub2 = audioContext.createBuffer(channelCount, 0| sampleRate * dur2, sampleRate);

    /** start time of current measure in source, in samples */
    var isample = sampleRate * start
    /** start time of current measure in desination, in samples */
    var psample = isample
    while (isample < sampleCount) {
      qseq.forEach((qp, qi) => {
        channels.forEach((channel, ci) => {
          /** start time of source quarter beat in samples */
          let qps = psample + qlens * qp
          /** start time of destination quarter beat in samples */
          let qis = isample + qlens * qi
          // copying our quarter beat
          let subarr = channel.subarray(0| qps, 0| qps + qlens)
          aub2.copyToChannel(subarr, ci, qis)
        })
      })
      isample += qlens * qseq.length
      psample += qlens * mlenq
    }

    var blob = new Blob([audioBufferToWav(aub2)], { type: "audio/wave" })
    audioEl.src = URL.createObjectURL(blob)
    alert('ok')
  } catch (e) {
    alert(e)
  }
}

document.write('ok')
