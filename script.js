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
const qlen = 0.125
/** sequence for rearranging quarter beats */
var qseq = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ]
/** start time of first beat in seconds */
const start = 0

const logoEl = new Image()
logoEl.onload = () => {
  cvs.width = //logoEl.width
    660
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
        channels.push(aub.getChannelData(i).slice(0));

      /** start time of current measure in samples */
      var sample = sampleRate * start
      while (sample < sampleCount) {
        qseq.forEach((qp, qi) => {
          channels.forEach((channel, ci) => {
            /** start time of quarter beat to be copied to, in samples */
            let qps = sample + qlens * qp
            /** start time of quarter beat being copied from, in samples */
            let qis = sample + qlens * qi
            // copying our quarter beat
            let subarr = channel.subarray(0| qps, 0| qps + qlens)
            aub.copyToChannel(subarr, ci, qis)
          })
        })
        sample += qlens * qseq.length
      }

      var src = audioContext.createBufferSource()
      src.buffer = aub
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
