import { describe, expect, it } from 'bun:test'
import {
  formatBytes,
  getKindFromMime,
  isAudio,
  isImage,
  isPdf,
  isPreviewable,
  isText,
  isVideo,
} from './fileTypes'

describe('fileTypes utility', () => {
  describe('formatBytes', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
    })

    it('formats KB, MB correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1024 * 1024)).toBe('1 MB')
      expect(formatBytes(5.5 * 1024 * 1024)).toBe('5.5 MB')
    })

    it('formats bytes under 1KB', () => {
      expect(formatBytes(500)).toBe('500 B')
    })
  })

  describe('isImage', () => {
    it('detects images by mime type', () => {
      expect(isImage('image/jpeg', 'file')).toBe(true)
      expect(isImage('image/png', 'test')).toBe(true)
      expect(isImage('image/webp', 'avatar')).toBe(true)
    })

    it('detects images by extension', () => {
      expect(isImage('', 'photo.jpg')).toBe(true)
      expect(isImage('', 'graphic.PNG')).toBe(true)
      expect(isImage('', 'diagram.svg')).toBe(true)
      expect(isImage('', 'doc.pdf')).toBe(false)
    })
  })

  describe('isVideo', () => {
    it('detects videos by mime type', () => {
      expect(isVideo('video/mp4', 'clip')).toBe(true)
      expect(isVideo('video/webm', 'recording')).toBe(true)
    })

    it('detects videos by extension', () => {
      expect(isVideo('', 'movie.mp4')).toBe(true)
      expect(isVideo('', 'screencast.webm')).toBe(true)
      expect(isVideo('', 'music.mp3')).toBe(false)
    })
  })

  describe('isAudio', () => {
    it('detects audio files correctly', () => {
      expect(isAudio('audio/mpeg', 'song')).toBe(true)
      expect(isAudio('', 'recording.wav')).toBe(true)
      expect(isAudio('', 'track.mp3')).toBe(true)
      expect(isAudio('', 'video.mp4')).toBe(false)
    })
  })

  describe('isPdf', () => {
    it('detects PDF by mime and extension', () => {
      expect(isPdf('application/pdf', 'file')).toBe(true)
      expect(isPdf('', 'document.pdf')).toBe(true)
      expect(isPdf('', 'document.PDF')).toBe(true)
      expect(isPdf('', 'document.docx')).toBe(false)
    })
  })

  describe('isText', () => {
    it('detects text files and code', () => {
      expect(isText('text/plain', 'note')).toBe(true)
      expect(isText('application/json', 'data')).toBe(true)
      expect(isText('', 'readme.md')).toBe(true)
      expect(isText('', 'script.ts')).toBe(true)
      expect(isText('', 'config.yaml')).toBe(true)
      expect(isText('', 'archive.zip')).toBe(false)
    })
  })

  describe('isPreviewable', () => {
    it('returns true for images, videos, pdfs and text documents', () => {
      expect(isPreviewable('image/png', 'sample.png')).toBe(true)
      expect(isPreviewable('video/mp4', 'sample.mp4')).toBe(true)
      expect(isPreviewable('application/pdf', 'sample.pdf')).toBe(true)
      expect(isPreviewable('text/plain', 'sample.txt')).toBe(true)
    })

    it('returns false for archives, binaries, docx, etc.', () => {
      expect(isPreviewable('application/zip', 'files.zip')).toBe(false)
      expect(isPreviewable('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'contract.docx')).toBe(false)
      expect(isPreviewable('application/octet-stream', 'program.exe')).toBe(false)
      expect(isPreviewable('application/x-rar-compressed', 'backup.rar')).toBe(false)
    })
  })

  describe('getKindFromMime', () => {
    it('maps correctly to upload kinds', () => {
      expect(getKindFromMime('image/png', 'test.png')).toBe('CHAT_IMAGE')
      expect(getKindFromMime('video/mp4', 'test.mp4')).toBe('CHAT_VIDEO')
      expect(getKindFromMime('audio/mp3', 'test.mp3')).toBe('CHAT_AUDIO')
      expect(getKindFromMime('application/pdf', 'test.pdf')).toBe('CHAT_FILE')
      expect(getKindFromMime('application/zip', 'test.zip')).toBe('CHAT_FILE')
    })
  })
})

