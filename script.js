document.write("and... ")

// prettier-ignore
const tracks = [
  { id: "mglv", name: "MEGALOVANIA", bpm: 120, start: 0 },
  { id: "htch", name: "Heartache", bpm: 119.5, start: 0 },
  { id: "sans", name: "sans.", bpm: 128, start: 0 },
  { id: "btsl", name: "Bonetrousle", bpm: 150, start: 0 },
  { id: "dtst", name: "Dating Start!", bpm: 115, start: 0 },
  { id: "dumy", name: "Dummy!", bpm: 125, start: 0 },
  { id: "spkt", name: "Spooktune", bpm: 122, start: 0 },
  { id: "tmvl", name: "Temmie Village", bpm: 84, start: 0 },
  { id: "sprj", name: "Spear of Justice", bpm: 263, start: 0 },
  { id: "mtcr", name: "Metal Crusher", bpm: 116, start: 0 },
  { id: "cyrc", name: "Can You Really Call This A Hotel, I Didn't Receive A Mint On My Pillow Or Anything", bpm: 127, start: 0 },
  { id: "dtrp", name: "Death Report", bpm: 270, start: 0 },
  { id: "spdd", name: "Spider Dance", bpm: 115, start: 0 },
  { id: "wren", name: "Wrong Enemy !?", bpm: 112, start: 0 },
  { id: "dbgl", name: "Death by Glamour", bpm: 148, start: 0 },
  { id: "stmp", name: "Song That Might Play When You Fight Sans", bpm: 120, start: 2 },
  { id: "finl", name: "Finale", bpm: 95, start: 0 },
  { id: "amlg", name: "Amalgram", bpm: 89.995, start: 0 },
  { id: "bath", name: "Battle Against a True Hero", bpm: 150, start: 0 },
  { id: "lanc", name: "Lancer", bpm: 165, start: 0 },
  { id: "rudb", name: "Rude Buster", bpm: 140, start: 0 },
  { id: "chkd", name: "Checker Dance", bpm: 160, start: 0 },
  { id: "vsus", name: "Vs. Susie", bpm: 148, start: 0 },
  { id: "chkn", name: "Chaos King", bpm: 147, start: 0 },
  { id: "cbbt", name: "Cyber Battle (Solo)", bpm: 125, start: 0 },
  { id: "smrc", name: "Smart Race", bpm: 150, start: 0 },
  { id: "pdrp", name: "Pandora Palace", bpm: 100, start: 0 },
  { id: "ipnr", name: "It's Pronounced “Rules”", bpm: 145, start: 0 },
  { id: "atkq", name: "Attack of the Killer Queen", bpm: 144, start: 0 },
  { id: "bsht", name: "BIG SHOT", bpm: 140, start: 0 },
  //{ id: "", name: "", bpm: 120, start: 0 },
]

trackselect.textContent = ""
tracks.forEach((track, index) => {
  var el = trackselect.appendChild(document.createElement("option"))
  el.textContent = track.name
  el.value = index
})
trackselect.selectedIndex = 0

function myFetch(url) {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest()
    xhr.open("get", url)
    xhr.responseType = "arraybuffer"
    xhr.onload = () => resolve(xhr.response)
    xhr.onerror = ev => reject(ev.error || ev.message)
    xhr.onprogress = ev => {
      if (ev.lengthComputable)
        status(
          ev.loaded / ev.total,
          `下载音频... ${(ev.loaded / 0x100000).toFixed(2)} / ` +
            `${(ev.total / 0x100000).toFixed(2)}MiB`
        )
      else status(null)
    }
    xhr.send(null)
  })
}

const audioContext = new OfflineAudioContext(1, 1, 44100)
const encodeWavWorker = new Worker("worker.js")

var trackid = "",
  idcode = "",
  bloburl = ""
var bpm = 120
/** 0 for one beat, 1 for two beats, -1 half beat, -2 quarter beat, etc */
var unitSize = -1
/** length of unit in seconds */
var unitDur = 0
/** sequence for rearranging units */
var sequence = [0]
/** number of units in each measure */
var unitsPerMeasure = 1
/** start time of first beat in seconds */
var start = 0
/** @type {AudioBuffer} */
var aub = null

trackselect.onchange = () => {
  tracknameEl.textContent = tracks[trackselect.value].name
}

async function generate() {
  trackselect.disabled = true
  generateBtn.disabled = true
  saveBtn.disabled = true
  var stage = ""

  try {
    idcode = idbox.value
    var match = idcode.match(/^(\w)(\w)([\w$]+)$/)
    if (!match) {
      status(0, "变换码格式不对")
      alert("错误：变换码格式不对")
      return
    }
    unitSize = parseInt(match[1], 36)
    if (unitSize >= 18) unitSize -= 36
    unitsPerMeasure = parseInt(match[2], 36) + 1
    sequence = [...match[3]].map(d => (d === "$" ? -1 : parseInt(d, 36)))

    var track = tracks[trackselect.value]
    ;({ id: trackid, bpm, start, aub } = track)
    if (!aub) {
      stage = "下载音频"
      status(0, "下载音频...")
      var arrayBuffer = await myFetch(`assets/${trackid}.mp3`)

      stage = "解析音频数据"
      track.aub = aub = await new Promise((res, rej) => {
        status(null, "解析音频数据...")
        return audioContext.decodeAudioData(arrayBuffer, res, rej)
      })
    }

    stage = "变换"
    unitDur = (60 / bpm) * Math.pow(2, unitSize)

    var channels = []
    const channelCount = aub.numberOfChannels
    const sampleRate = aub.sampleRate
    const len = aub.length
    /** length of unit in samples */
    const unitLen = sampleRate * unitDur
    for (let i = 0; i < channelCount; ++i) channels.push(aub.getChannelData(i))

    var ratio = sequence.length / unitsPerMeasure
    var newDur = start + (aub.duration - start) * ratio
    var newAub = audioContext.createBuffer(
      channelCount,
      0 | (sampleRate * newDur),
      sampleRate
    )

    var t = Date.now()

    /** start time of current measure in source, in samples */
    var fromPos = sampleRate * start
    /** start time of current measure in desination, in samples */
    var toPos = fromPos

    channels.forEach((channel, ci) => {
      newAub.copyToChannel(channel.subarray(0, fromPos), ci, 0)
    })

    while (toPos < len) {
      sequence.forEach((fromUnit, toUnit) => {
        if (fromUnit < 0) return
        channels.forEach((channel, ci) => {
          /** start time of source unit in samples */
          let toUnitPos = toPos + unitLen * fromUnit
          /** start time of destination unit in samples */
          let fromUnitPos = fromPos + unitLen * toUnit
          // copying our unit
          let subarr = channel.subarray(
            0 | toUnitPos,
            0 | (toUnitPos + unitLen)
          )
          newAub.copyToChannel(subarr, ci, fromUnitPos)
        })
      })
      let prog = fromPos / newAub.length
      status(prog, `变换... ${0 | (prog * 100)}%`)
      fromPos += unitLen * sequence.length
      toPos += unitLen * unitsPerMeasure

      var _t = Date.now()
      if (_t - t > 40) {
        t = _t
        await new Promise(r => setTimeout(r, 0))
      }
    }

    await new Promise(r => setTimeout(r, 0))

    stage = "编码 WAV"
    status(0, "编码 WAV...")
    var blob = new Blob([await encodeWav(newAub)], { type: "audio/x-wav" })

    stage = ""
    status(1, "生成完成")
    bloburl = audioEl.src = URL.createObjectURL(blob)
    saveBtn.disabled = false
  } catch (err) {
    error(err, stage)
  } finally {
    trackselect.disabled = false
    generateBtn.disabled = false
  }
}

function savewav() {
  var link = document.createElement("a")
  link.href = bloburl
  link.download = `${trackid}_${idcode}.wav`
  link.click()
}

function encodeWav(aub) {
  var channels = []
  for (let i = 0; i < aub.numberOfChannels; ++i)
    channels.push(aub.getChannelData(i))

  return new Promise((resolve, reject) => {
    encodeWavWorker.onmessage = ({ data }) => {
      switch (data.type) {
        case "progress":
          status(data.data, `编码 WAV... ${0 | (data.data * 100)}%`)
          break
        case "messageerror":
          reject("主线程向子线程传递数据失败")
          break
        case "success":
          resolve(data.data)
          break
      }
    }
    encodeWavWorker.onmessageerror = () => {
      reject("子线程向主线程传递数据失败")
    }
    encodeWavWorker.onerror = ev => {
      reject(ev.error || ev.message)
    }
    encodeWavWorker.postMessage({
      sampleRate: aub.sampleRate,
      sampleCount: aub.length,
      channels,
    })
  })
}

function error(err, context) {
  var title = context ? context + "失败" : "未知错误"
  alert(`${title}：${err}`)
  if (typeof err === "object") throw err
  status(0, title)
}

function status(prog, msg) {
  if (prog === null) progress.removeAttribute("value")
  else progress.value = prog
  if (msg) statusEl.textContent = msg
}

document.write("ok")
