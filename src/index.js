/* eslint-disable no-console */
'use strict';

const http = require('http');
const path = require('path');
const formidable = require('formidable');
const fs = require('fs');
const zlib = require('zlib');
const pipeline = require('pipeline');

const server = new http.Server();

server.on('request', (req, res) => {
  if (req.url === '/upload' && req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.statusCode = 400;
        res.end(err);

        return;
      }

      const file = fs.createReadStream(files.file[0].filepath);

      let compression;
      let extension;

      if (fields.compression[0] === 'br') {
        extension = '.br';
        res.setHeader('Content-Encoding', 'br');
        compression = zlib.createBrotliCompress();
      } else {
        extension = '.gz';
        res.setHeader('Content-Encoding', 'gzip');
        compression = zlib.createGzip();
      }

      const newFilePath = files.file[0].originalFilename + extension;
      const newFile = fs.createWriteStream(newFilePath);

      res.setHeader('Content-type', 'application/octet-stream');

      res.setHeader('Content-Disposition',
        `attachment; filename=${file + extension}`);

      pipeline(file, compression, newFile, (error) => {
        if (error) {
          res.end(error);
        }
      });
      res.statusCode = 200;
      res.end('OK');
    });
  } else {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fileName = url.pathname.slice(1) || 'index.html';
    const filePath = path.resolve('public', fileName);

    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('File not found');

      return;
    }

    res.setHeader('Content-type', 'text/html');

    const fileStream = fs.createReadStream(filePath);

    fileStream.pipe(res);

    server.on('close', () => fileStream.destroy());
  }
});

server.listen(3000);
