import { Body, Controller, Post } from '@nestjs/common'

@Controller('/uploads')
export class UploadsController {
  @Post('/s3-sign')
  async sign(@Body() body: { contentType: string; filename: string }) {
    const { AWS_REGION, AWS_S3_BUCKET } = process.env as any
    if (!AWS_REGION || !AWS_S3_BUCKET) {
      return { error: 'not_configured', message: 'Set AWS_REGION and AWS_S3_BUCKET. Requires @aws-sdk/* packages installed.' }
    }
    try {
      // Lazy import to avoid runtime error when deps missing
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
      const key = `uploads/${Date.now()}-${body.filename}`
      const s3 = new S3Client({ region: AWS_REGION })
      const cmd = new PutObjectCommand({ Bucket: AWS_S3_BUCKET, Key: key, ContentType: body.contentType })
      const url = await getSignedUrl(s3, cmd, { expiresIn: 60 })
      const publicUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`
      return { uploadUrl: url, publicUrl }
    } catch (e: any) {
      return { error: 'sign_failed', message: String(e?.message || e) }
    }
  }
}

