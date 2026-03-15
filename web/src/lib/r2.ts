/**
 * Cloudflare R2 クライアント & ヘルパー関数
 * 
 * R2が未設定の環境ではnullを返し、ローカルファイルシステムへのフォールバックを可能にする。
 * 環境変数:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_ENDPOINT, R2_BUCKET_NAME, R2_PUBLIC_URL (optional)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

let _client: S3Client | null | undefined = undefined;

/**
 * R2クライアントを返す。環境変数が未設定の場合はnull。
 */
function getR2Client(): S3Client | null {
  if (_client !== undefined) return _client;

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const region = 'auto';

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    _client = null;
    return null;
  }

  _client = new S3Client({
    region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return _client;
}

/**
 * R2が利用可能かどうかを返す（フォールバック判定用）
 */
export function isR2Available(): boolean {
  return getR2Client() !== null;
}

/**
 * R2にファイルをアップロードする
 * @param key - オブジェクトキー (例: "chat/abc12345/uuid.jpg")
 * @param buffer - ファイルデータ
 * @param contentType - MIMEタイプ
 * @returns アップロード後のパブリックURL、またはR2未設定時はnull
 */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const client = getR2Client();
  if (!client) return null;

  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) return null;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return getR2PublicUrl(key);
}

/**
 * R2からオブジェクトを削除する
 * @param key - オブジェクトキー
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  if (!client) return;

  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) return;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

/**
 * R2オブジェクトのパブリックURLを生成する
 * R2_PUBLIC_URL が設定されていればそれを使用、なければ R2_ENDPOINT/R2_BUCKET_NAME/key
 * @param key - オブジェクトキー
 */
export function getR2PublicUrl(key: string): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  }

  const endpoint = process.env.R2_ENDPOINT ?? '';
  const bucketName = process.env.R2_BUCKET_NAME ?? '';
  return `${endpoint.replace(/\/$/, '')}/${bucketName}/${key}`;
}
