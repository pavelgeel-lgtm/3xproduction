const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const crypto = require('crypto')
const path   = require('path')

const s3 = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

async function uploadFile(buffer, originalName, folder = 'uploads') {
  const ext  = path.extname(originalName)
  const key  = `${folder}/${crypto.randomBytes(16).toString('hex')}${ext}`

  await s3.send(new PutObjectCommand({
    Bucket:      process.env.S3_BUCKET_NAME,
    Key:         key,
    Body:        buffer,
    ContentType: getContentType(ext),
  }))

  return `${process.env.S3_PUBLIC_URL}/${key}`
}

async function deleteFile(url) {
  const key = url.replace(`${process.env.S3_PUBLIC_URL}/`, '')
  await s3.send(new DeleteObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key:    key,
  }))
}

function getContentType(ext) {
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf' }
  return map[ext.toLowerCase()] || 'application/octet-stream'
}

module.exports = { uploadFile, deleteFile }
