const url = 'https://api.openai.com/v1/audio/transcriptions'

const transcribe = (apiKey, file, language, response_format, model, mode) => {
    if (mode === 'batch') {
        return submitBatchTranscription(apiKey, file, language, model)
    }

    const selectedModel = model || 'gpt-4o-mini-transcribe'
    const isWhisper = selectedModel === 'whisper-1'
    const chosenResponseFormat = isWhisper ? (response_format || 'verbose_json') : 'text'

    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', selectedModel)
    formData.append('response_format', chosenResponseFormat)
    if (language) {
        formData.append('language', language)
    }

    const headers = new Headers()
    headers.append('Authorization', `Bearer ${apiKey}`)

    return fetch(url, {
        method: 'POST',
        body: formData,
        headers: headers
    }).then(response => {
        if (chosenResponseFormat === 'json' || chosenResponseFormat === 'verbose_json') {
            return response.json()
        } else {
            return response.text()
        }
    }).catch(error => console.error(error))
}

const submitBatchTranscription = async (apiKey, file, language, model) => {
    // 1) Upload audio file for later referencing by file_id
    const authHeaders = new Headers()
    authHeaders.append('Authorization', `Bearer ${apiKey}`)

    const audioUpload = new FormData()
    audioUpload.append('file', file)
    audioUpload.append('purpose', 'batch')

    const audioRes = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: authHeaders,
        body: audioUpload
    })
    const audioJson = await audioRes.json()
    const audioFileId = audioJson?.id

    // 2) Build a single-line JSONL request targeting /v1/responses with input_audio by file_id
    const requestBody = {
        model: model || 'gpt-4o-mini-transcribe',
        input: [
            {
                role: 'user',
                content: [
                    { type: 'input_text', text: 'Please transcribe this audio.' },
                    { type: 'input_audio', audio: { file_id: audioFileId } }
                ]
            }
        ]
    }
    if (language) {
        requestBody.input_language = language
    }

    const jsonlLine = JSON.stringify({
        custom_id: 'audio-1',
        method: 'POST',
        url: '/v1/responses',
        body: requestBody
    }) + '\n'

    const requestsBlob = new Blob([jsonlLine], { type: 'application/jsonl' })
    const requestsFile = new File([requestsBlob], 'requests.jsonl', { type: 'application/jsonl' })

    // 3) Upload the JSONL requests file with purpose=batch
    const requestsUpload = new FormData()
    requestsUpload.append('file', requestsFile)
    requestsUpload.append('purpose', 'batch')

    const reqRes = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: authHeaders,
        body: requestsUpload
    })
    const reqJson = await reqRes.json()
    const inputFileId = reqJson?.id

    // 4) Create the batch for /v1/responses
    const batchRes = await fetch('https://api.openai.com/v1/batches', {
        method: 'POST',
        headers: new Headers({
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            input_file_id: inputFileId,
            completion_window: '24h',
            endpoint: '/v1/responses'
        })
    })
    const batch = await batchRes.json()
    return { batch_id: batch?.id, status: batch?.status || 'submitted' }
}

const hideStartView = () => {
    document.querySelector('#start-view').classList.add('hidden')
}

const showStartView = () => {
    document.querySelector('#start-view').classList.remove('hidden')
}

const setupAPIKeyInput = () => {
    const element = document.querySelector('#api-key')
    const savedAPIKey = localStorage.getItem('api-key') || ''
    element.value = savedAPIKey
    element.addEventListener('input', () => {
        const key = element.value
        localStorage.setItem('api-key', key)
        if (key) {
            hideStartView()
        } else {
            showStartView()
        }
    })

    if (savedAPIKey) {
        hideStartView()
    }
}

const updateTextareaSize = (element) => {
    element.style.height = 0

    const style = window.getComputedStyle(element)
    const paddingTop = parseFloat(style.getPropertyValue('padding-top'))
    const paddingBottom = parseFloat(style.getPropertyValue('padding-bottom'))

    const height = element.scrollHeight - paddingTop - paddingBottom

    element.style.height = `${height}px`
}

let outputElement

const setTranscribingMessage = (text) => {
    outputElement.innerHTML = text
}

const setTranscribedPlainText = (text) => {
    text = text.replaceAll('&', '&amp;')
    text = text.replaceAll('<', '&lt;')
    text = text.replaceAll('>', '&gt;')
    outputElement.innerHTML = `<pre>${text}</pre>`
}

const setTranscribedSegments = (segments) => {
    outputElement.innerHTML = ''
    for (const segment of segments) {
        const element = document.createElement('div')
        element.classList.add('segment')
        element.innerText = segment.text
        outputElement.appendChild(element)
    }
}

window.addEventListener('load', () => {
    setupAPIKeyInput()
    outputElement = document.querySelector('#output')

    const fileInput = document.querySelector('#audio-file')
    const notice = document.querySelector('#notice')

    const modelSelect = document.querySelector('#model')
    const modeSelect = document.querySelector('#mode')

    const updateNotice = () => {
        const mode = modeSelect.value
        const model = modelSelect.value
        if (mode === 'batch') {
            notice.innerText = 'Batch jobs may take up to 24h and are billed at reduced rates. You will receive a batch id to check status later.'
        } else if (model !== 'whisper-1') {
            notice.innerText = 'Using gpt-4o-mini-transcribe (text output only; SRT/VTT unavailable).'
        } else {
            notice.innerText = ''
        }
    }

    modelSelect.addEventListener('change', updateNotice)
    modeSelect.addEventListener('change', updateNotice)
    updateNotice()

    fileInput.addEventListener('change', () => {
        setTranscribingMessage('Transcribing...')

        const apiKey = localStorage.getItem('api-key')
        const file = fileInput.files[0]
        const language = document.querySelector('#language').value
        const response_format = document.querySelector('#response_format').value
        const model = modelSelect.value
        const mode = modeSelect.value
        const response = transcribe(apiKey, file, language, response_format, model, mode)

        response.then(transcription => {
            if (mode === 'batch') {
                setTranscribedPlainText(JSON.stringify(transcription, null, 2))
            } else if (response_format === 'verbose_json') {
                setTranscribedSegments(transcription.segments)
            } else {
                setTranscribedPlainText(transcription)
            }

            fileInput.value = null
        })
    })
})