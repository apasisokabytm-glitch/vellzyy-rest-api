import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Database Helper
const getEndpoints = async () => {
  const data = await fs.readFile(path.join(__dirname, 'database', 'endpoint.json'), 'utf-8');
  return JSON.parse(data);
};

// Routes
app.get('/', async (req, res) => {
  const endpoints = await getEndpoints();
  res.render('index', { endpoints });
});

// Dynamic Proxy Engine
app.all('/api/:category/:route', async (req, res) => {
  try {
    const { category, route } = req.params;
    const endpoints = await getEndpoints();
    const target = endpoints.find(e => e.category === category && e.route === `/${route}`);

    if (!target) return res.status(404).json({ error: 'Endpoint not found' });

    const queryParams = new URLSearchParams(req.query).toString();
    const fullUrl = `${target.baseUrl}${queryParams ? (target.baseUrl.includes('?') ? '&' : '?') + queryParams : ''}`;

    const response = await axios({
      method: req.method,
      url: fullUrl,
      data: req.body,
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Vellzyy-API-Platform/1.0' }
    });

    const contentType = response.headers['content-type'];
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.send(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy Error', message: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));