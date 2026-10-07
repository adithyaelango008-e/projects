require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ─── Multer Setup ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Data Helpers ─────────────────────────────────────────────────────────────
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return {
      rates: { gold: 7250, silver: 92, oldSilver: 85 },
      storeDetails: { ownerName: '', contactNo: '', address: '' },
      hostPassword: 'admin123',
      hostPhone: '',
      ornaments: [],
      orders: []
    };
  }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ─── General Routes ───────────────────────────────────────────────────────────
app.get('/api/data', (req, res) => res.json(readData()));

app.post('/api/rates', (req, res) => {
  const data = readData();
  data.rates = { ...data.rates, ...req.body };
  writeData(data);
  res.json({ message: 'Rates updated', rates: data.rates });
});

app.post('/api/store', (req, res) => {
  const data = readData();
  data.storeDetails = { ...data.storeDetails, ...req.body };
  if (req.body.contactNo) data.hostPhone = req.body.contactNo;
  writeData(data);
  res.json({ message: 'Store details updated', storeDetails: data.storeDetails });
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ imageUrl: `http://localhost:${PORT}/uploads/${req.file.filename}` });
});

app.post('/api/ornaments', (req, res) => {
  const data = readData();
  const ornament = { id: Date.now(), ...req.body };
  data.ornaments.push(ornament);
  writeData(data);
  res.json({ message: 'Ornament added', ornament });
});

app.delete('/api/ornaments/:id', (req, res) => {
  const data = readData();
  const id = Number(req.params.id);
  const index = data.ornaments.findIndex(o => o.id === id);
  if (index === -1) return res.status(404).json({ error: 'Ornament not found' });
  data.ornaments.splice(index, 1);
  writeData(data);
  res.json({ message: 'Ornament removed successfully' });
});

app.post('/api/orders', (req, res) => {
  const data = readData();
  const order = { id: Date.now(), ...req.body };
  data.orders.unshift(order);
  writeData(data);
  res.json({ message: 'Order placed', order });
});

// ─── Password Routes ─────────────────────────────────────────────────────────

function updatePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const data = readData();
  const hostPassword = data.hostPassword || 'admin123';

  if (!currentPassword || currentPassword !== hostPassword) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  data.hostPassword = newPassword;
  writeData(data);
  console.log('🔑 Host password updated successfully.');
  return res.json({ success: true, message: 'Password updated successfully! You can now login with your new password.' });
}

// Verify current password (login)
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const data = readData();
  const hostPassword = data.hostPassword || 'admin123';
  if (password === hostPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect password' });
  }
});

// Update the host password directly without OTP verification
app.post('/api/auth/reset-password', updatePassword);
app.post('/api/auth/change-password', updatePassword);
// Serve static frontend files from root
app.use(express.static(path.join(__dirname, '..')));
// Serve static frontend files from root
app.use(express.static(path.join(__dirname, '..')));

// Explicitly send index.html on root /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Send index.html page for any other GET request
app.get('{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});
// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
