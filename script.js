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

function configure() {
  var r = prompt("", JSON.stringify({ qlen, qseq, mlenq, start }))
  if (r) ({ qlen, qseq, mlenq, start } = JSON.parse(r))
  file.disabled = false
}

const logoEl = new Image()
logoEl.onload = () => {
  cvs.width = logoEl.width
    //660
  cvs.height = logoEl.height
  cvsCxt.drawImage(logoEl, 0, 0)
}
logoEl.src = "undertale.png"

const cvsCxt = cvs.getContext("2d")
qseqSelect.oninput = function (_event) {
  if (!this.value) return
  qseq = JSON.parse(this.value === "null" ? prompt("Enter a sequence", JSON.stringify(qseq)) : this.value)
  file.disabled = false

  const width = cvs.width = //logoEl.widt,h
    660
  const height = cvs.height = logoEl.height
  const qlenp = width / qseq.length
  qseq.forEach((qp, qi) => {
    cvsCxt.drawImage(logoEl, 0| qp * qlenp, 0, 0| qlenp + 1, height, 0| qi * qlenp, 0, 0| qlenp + 1, height)
  })
}

file.onchange = () => {
  if (!file.files[0]) return;
  file.disabled = true
  qseqSelect.disabled = true
  file.files[0]
    .arrayBuffer()
    .then(
      /** @returns {Promise<AudioBuffer>} */ (arrayBuffer) =>
        new Promise((res, rej) =>
          audioContext.decodeAudioData(arrayBuffer, res, rej)
        )
    )
    .then((aub) => {
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

      var src = audioContext.createBufferSource()
      src.buffer = aub2
      src.connect(audioContext.destination)
      playBtn.onclick = () => {
        src.start()
        playBtn.disabled = true
      }
      playBtn.disabled = false
    })
    .catch((err) => {
      alert(err);
    });
};

document.write('ok')
