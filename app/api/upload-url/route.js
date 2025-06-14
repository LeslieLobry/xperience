import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get('fileName');
  const fileType = searchParams.get('fileType');

  if (!fileName || !fileType) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    ContentType: fileType,
  });

  try {
    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Erreur lors de la génération de l’URL signée S3 :', error);
    return NextResponse.json({ error: 'Erreur S3' }, { status: 500 });
  }
}
