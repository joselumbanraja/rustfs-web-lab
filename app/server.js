const express = require('express');
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

const bucket = process.env.S3_BUCKET || 'notes-bucket';

app.get('/', async (req, res) => {
  let files = [];
  let errorMsg = '';

  try {
    const out = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
    files = (out.Contents || []).map((obj) => obj.Key);
  } catch (err) {
    errorMsg = err.message;
  }

  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>RustFS Web Lab</title>
  <style>
    body { font-family: sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; }
    input, textarea, button { width: 100%; margin-top: 8px; padding: 10px; box-sizing: border-box; }
    button { cursor: pointer; font-weight: bold; }
    .err { color: #991b1b; background: #fee2e2; padding: 10px; border-radius: 6px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <h2>Simple Web + RustFS (S3)</h2>
  <p><b>Endpoint:</b> ${process.env.S3_ENDPOINT || '(belum diatur)'} | <b>Bucket:</b> ${bucket}</p>
  ${errorMsg ? `<div class="err">S3 Error: ${errorMsg}</div>` : ''}
  <form method="POST" action="/upload">
    <label>Nama File</label>
    <input name="filename" placeholder="halo.txt" required />
    <label>Isi Konten</label>
    <textarea name="content" rows="4" placeholder="Tulis isi file..." required></textarea>
    <button type="submit">Upload ke RustFS</button>
  </form>
  <h3>Daftar Objek di Bucket</h3>
  <ul>
    ${files.length ? files.map((f) => `<li>${f}</li>`).join('') : '<li>Kosong</li>'}
  </ul>
</body>
</html>`);
});

app.post('/upload', async (req, res) => {
  try {
    const raw = (req.body.filename || `item-${Date.now()}.txt`).trim();
    const key = raw.endsWith('.txt') ? raw : `${raw}.txt`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.body.content || '',
      })
    );
    res.redirect('/');
  } catch (err) {
    res.status(500).send(`Gagal upload: ${err.message}`);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server jalan di http://localhost:${port}`));
