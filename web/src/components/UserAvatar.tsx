import { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'

type UserAvatarProps = {
  userId?: string
  name: string
  email?: string
  avatar?: string
  size?: number
  canEdit?: boolean
  showBadge?: boolean
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
  showBadge = false,
  className = '',
  onAvatarChange,
}: UserAvatarProps) {
  const { updateUserAvatar, currentUser } = useApp()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const cleanEmail = email?.trim().toLowerCase() || ''
  const cleanName = name?.trim() || cleanEmail.split('@')[0] || 'U'

  const getFallbackUrl = () =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0f172a&color=fff&bold=true&size=128`

  const getInitialPhoto = () => {
    if (avatar) return avatar
    if (cleanEmail) {
      return `https://unavatar.io/${encodeURIComponent(cleanEmail)}?fallback=${encodeURIComponent(getFallbackUrl())}`
    }
    return getFallbackUrl()
  }

  const [imgSrc, setImgSrc] = useState(getInitialPhoto)

  useEffect(() => {
    setImgSrc(getInitialPhoto())
  }, [avatar, email, name])

  const isEditable = canEdit && Boolean(userId || currentUser?.id)

  function handleClick(e: React.MouseEvent) {
    if (isEditable && !uploading && fileInputRef.current) {
      e.stopPropagation()
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
        display: 'inline-block',
      }}
      onClick={handleClick}
      title={isEditable ? 'Clic para cambiar o subir foto de perfil' : name}
      role={isEditable ? 'button' : undefined}
      tabIndex={isEditable ? 0 : undefined}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#0f172a',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          position: 'relative',
        }}
      >
        <img
          src={imgSrc}
          alt={name}
          onError={() => {
            setImgSrc(getFallbackUrl())
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
              <span className="user-avatar-spinner">⏳</span>
            ) : (
              <span className="user-avatar-camera-icon">📷</span>
            )}
          </div>
        )}
      </div>

      {isEditable && (showBadge || size >= 40) && (
        <div
          className="user-avatar-badge"
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: Math.max(18, Math.round(size * 0.38)),
            height: Math.max(18, Math.round(size * 0.38)),
            borderRadius: '50%',
            background: '#0284c7',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: Math.max(10, Math.round(size * 0.22)),
            border: '2px solid #fff',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
          }}
        >
          {uploading ? '⏳' : '📷'}
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
