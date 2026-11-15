export interface CallEntry {
  id: string
  name: string
  direction: 'incoming' | 'outgoing' | 'missed'
  kind: 'voice' | 'video'
  time: string
  online: boolean
}
