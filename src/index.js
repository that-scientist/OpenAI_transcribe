const url = 'https://api.openai.com/v1/audio/transcriptions'

const transcribe = async (apiKey, file, language, response_format) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model', 'whisper-1')
    formData.append('response_format', response_format || 'verbose_json')
    if (language) {
        formData.append('language', language)
    }

    const headers = new Headers()
    headers.append('Authorization', `Bearer ${apiKey}`)

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: headers
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(`API Error: ${response.status} ${response.statusText}${errorData.error?.message ? ` - ${errorData.error.message}` : ''}`)
        }

        // Automatically handle response format
        if (response_format === 'json' || response_format === 'verbose_json') {
            return await response.json()
        } else {
            return await response.text()
        }
    } catch (error) {
        console.error('Transcription error:', error)
        throw error
    }
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
        console.log('saving:', key)
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
    outputElement.innerHTML = `<div class="transcribing">${text}</div>`
}

const setError = (error) => {
    outputElement.innerHTML = `<div class="error">Error: ${error.message}</div>`
}

const showFileInfo = (file) => {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    outputElement.innerHTML = `<div class="file-info">Selected: ${file.name} (${sizeMB} MB)</div>`
}

const setTranscribedPlainText = (text) => {
    // Handle both string and object responses
    if (typeof text === 'object' && text.text) {
        text = text.text
    }
    
    // outputElement.innerText creates unnecessary <br> elements
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
    fileInput.addEventListener('change', async () => {
        const apiKey = localStorage.getItem('api-key')
        
        if (!apiKey) {
            setError(new Error('Please enter your OpenAI API key'))
            return
        }

        const file = fileInput.files[0]
        if (!file) {
            setError(new Error('Please select an audio file'))
            return
        }

        // Show file info first
        showFileInfo(file)

        // Validate file size (25MB limit for Whisper API)
        const maxSize = 25 * 1024 * 1024 // 25MB
        if (file.size > maxSize) {
            setError(new Error('File size exceeds 25MB limit. Please choose a smaller file.'))
            return
        }

        setTranscribingMessage('Transcribing...')

        try {
            const language = document.querySelector('#language').value
            const response_format = document.querySelector('#response_format').value
            const transcription = await transcribe(apiKey, file, language, response_format)

            if (response_format === 'verbose_json') {
                if (transcription.segments && Array.isArray(transcription.segments)) {
                    setTranscribedSegments(transcription.segments)
                } else {
                    setTranscribedPlainText(transcription.text || JSON.stringify(transcription))
                }
            } else {
                setTranscribedPlainText(transcription)
            }

            // Allow multiple uploads without refreshing the page
            fileInput.value = null
        } catch (error) {
            setError(error)
            fileInput.value = null
        }
    })
})