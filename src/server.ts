import express from 'express';
import path from 'path';

const app = express();

// If __dirname is `XpertBuild/dist`, go up one level to `XpertBuild`, then into `build`
app.use(express.static(path.join(__dirname, '..', 'build')));

// Catch-all AFTER serving static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
