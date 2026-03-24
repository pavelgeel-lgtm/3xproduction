const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const crypto = require('crypto')
const path   = require('path')

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

async function uploadFile(buffer, originalName, folder = 'uploads') {
  const ext  = path.extname(originalName)
  const key  = `${folder}/${crypto.randomBytes(16).toString('hex')}${ext}`

  await s3.send(new PutObjectCommand({
    Bucket:      process.env.R2_BUCKET_NAME,
    Key:         key,
    Body:        buffer,
    ContentType: getContentType(ext),
  }))

  return `${process.env.R2_PUBLIC_URL}/${key}`
}

async function deleteFile(url) {
  const key = url.replace(`${process.env.R2_PUBLIC_URL}/`, '')
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key:    key,
  }))
}

function getContentType(ext) {
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf' }
  return map[ext.toLowerCase()] || 'application/octet-stream'
}

module.exports = { uploadFile, deleteFile }
