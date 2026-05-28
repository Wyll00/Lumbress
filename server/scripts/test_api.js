const http = require('http');

const bookData = JSON.stringify({
  title: "Test Book",
  author: "Test Author",
  genre: "Test Genre",
  totalPages: 100,
  pagesRead: 0,
  status: "To Read"
});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/books',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bookData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(bookData);
req.end();
