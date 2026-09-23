import { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'

type UserAvatarProps = {
  userId?: string
  name: string
  email?: string
  avatar?: string
  size?: number
  canEdit?: boolean
  className?: string
  onAvatarChange?: (newUrl: string) => void
}

export function UserAvatar({
  userId,
  name,
  email,
  avatar,
  size = 46,
  canEdit = true,
  className = '',
  onAvatarChange,
}: UserAvatarProps) {
  const { updateUserAvatar, currentUser } = useApp()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Standard email avatar fallback (Unavatar based on email, falling back to UI Avatars)
  const cleanEmail = email?.trim().toLowerCase() || ''
  const cleanName = name?.trim() || cleanEmail.split('@')[0] || 'U'
  
  const standardEmailAvatar = cleanEmail
    ? `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=${encodeURIComponent(
        `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0f172a&color=fff&bold=true&size=128`
      )}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0f172a&color=fff&bold=true&size=128`

  const currentPhoto = avatar || standardEmailAvatar
  const [imgSrc, setImgSrc] = useState(currentPhoto)

  // Allow editing if canEdit is true and user is logged in
  const isEditable = canEdit && Boolean(userId || currentUser?.id)

  function handleClick() {
    if (isEditable && !uploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = async () => {
        // Resize and optimize to max 256x256 JPEG to keep Firestore documents lightweight
        const canvas = document.createElement('canvas')
        const maxDim = 256
        let w = img.width
        let h = img.height

        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w)
            w = maxDim
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h)
            h = maxDim
          }
        }

        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h)
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85)

          setImgSrc(optimizedDataUrl)

          const targetUserId = userId || currentUser?.id
          if (targetUserId && updateUserAvatar) {
            try {
              await updateUserAvatar(targetUserId, optimizedDataUrl)
              onAvatarChange?.(optimizedDataUrl)
            } catch (err) {
              console.error('Error al actualizar avatar de usuario:', err)
            }
          }
        }
        setUploading(false)
      }
      img.src = e.target?.result as string
    }

    reader.readAsDataURL(file)
  }

  return (
    <div
      className={`user-avatar-wrapper ${isEditable ? 'user-avatar-editable' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        position: 'relative',
        cursor: isEditable ? 'pointer' : 'default',
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        background: '#0f172a',
      }}
      onClick={handleClick}
      title={isEditable ? 'Clic para cambiar o subir foto de perfil' : name}
      role={isEditable ? 'button' : undefined}
      tabIndex={isEditable ? 0 : undefined}
    >
      <img
        src={imgSrc}
        alt={name}
        onError={() => {
          // Fallback on error to clean UI-avatars
          setImgSrc(`https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0f172a&color=fff&bold=true&size=128`)
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {isEditable && (
        <div className="user-avatar-hover-overlay">
          {uploading ? (
            <span className="user-avatar-spinner">⌛</span>
          ) : (
            <span className="user-avatar-camera-icon">📷</span>
          )}
        </div>
      )}

      {isEditable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      )}
    </div>
  )
}
