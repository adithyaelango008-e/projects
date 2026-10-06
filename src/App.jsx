import { useState, useEffect, useRef } from 'react';
import './index.css';

const API_URL = 'http://localhost:3000/api';

function App() {
  const [activeTab, setActiveTab] = useState('customer');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // App State
  const [rates, setRates] = useState({ gold: 0, silver: 0, oldSilver: 0 });
  const [storeDetails, setStoreDetails] = useState({ ownerName: '', contactNo: '', address: '' });
  const [ornaments, setOrnaments] = useState([]);
  const [orders, setOrders] = useState([]);

  // Fetch initial data from backend
  useEffect(() => {
    fetch(`${API_URL}/data`)
      .then(res => res.json())
      .then(data => {
        setRates(data.rates || { gold: 0, silver: 0, oldSilver: 0 });
        setStoreDetails(data.storeDetails || { ownerName: '', contactNo: '', address: '' });
        setOrnaments(data.ornaments || []);
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch data", err);
        setLoading(false);
      });
  }, []);

  const handleAddOrder = async (newOrder) => {
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      const data = await res.json();
      setOrders([data.order, ...orders]);
    } catch (err) {
      console.error("Failed to save order", err);
    }
  };

  const handleUpdateRates = async (newRates) => {
    try {
      const res = await fetch(`${API_URL}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRates)
      });
      const data = await res.json();
      setRates(data.rates);
    } catch (err) {
      console.error("Failed to update rates", err);
    }
  };

  const handleUpdateStoreDetails = async (newDetails) => {
    try {
      const res = await fetch(`${API_URL}/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDetails)
      });
      const data = await res.json();
      setStoreDetails(data.storeDetails);
    } catch (err) {
      console.error("Failed to update store details", err);
    }
  };

  const handleAddOrnament = async (newOrnament) => {
    try {
      const res = await fetch(`${API_URL}/ornaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrnament)
      });
      const data = await res.json();
      setOrnaments([...ornaments, data.ornament]);
    } catch (err) {
      console.error("Failed to add ornament", err);
    }
  };

  const handleRemoveOrnament = async (id) => {
    try {
      await fetch(`${API_URL}/ornaments/${id}`, { method: 'DELETE' });
      setOrnaments(ornaments.filter(o => o.id !== id));
    } catch (err) {
      console.error('Failed to remove ornament', err);
    }
  };

  if (loading) {
    return <div className="app-container" style={{ textAlign: 'center', marginTop: '5rem' }}><h2>Loading Shop Data...</h2></div>;
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>SOFIYA JEWELLERS</h1>
        <p style={{ color: 'var(--text-muted)' }}>Elegance crafted for eternity</p>
        
        {/* Store Details Display */}
        {(storeDetails.ownerName || storeDetails.contactNo || storeDetails.address) && (
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-light)', backgroundColor: 'rgba(212, 175, 55, 0.05)', padding: '1rem', borderRadius: '8px', display: 'inline-block', textAlign: 'left' }}>
            {storeDetails.ownerName && <div><strong>Proprietor:</strong> {storeDetails.ownerName}</div>}
            {storeDetails.contactNo && <div><strong>Contact:</strong> {storeDetails.contactNo}</div>}
            {storeDetails.address && <div><strong>Address:</strong> {storeDetails.address}</div>}
          </div>
        )}
      </header>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'customer' ? 'active' : ''}`}
          onClick={() => setActiveTab('customer')}
        >
          Storefront
        </button>
        <button 
          className={`tab-btn ${activeTab === 'host' ? 'active' : ''}`}
          onClick={() => setActiveTab('host')}
        >
          Host Dashboard
        </button>
      </div>

      {activeTab === 'host' ? (
        <HostAuthGuard isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated}>
          <HostDashboard 
            rates={rates} 
            storeDetails={storeDetails}
            ornaments={ornaments}
            onUpdateRates={handleUpdateRates}
            onUpdateStoreDetails={handleUpdateStoreDetails}
            onAddOrnament={handleAddOrnament}
            onRemoveOrnament={handleRemoveOrnament}
            orders={orders}
            onLogout={() => setIsAuthenticated(false)}
          />
        </HostAuthGuard>
      ) : (
        <CustomerView rates={rates} ornaments={ornaments} onAddOrder={handleAddOrder} />
      )}
    </div>
  );
}

// Host Authentication Wrapper
function HostAuthGuard({ isAuthenticated, setIsAuthenticated, children }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch {
      setError('Cannot connect to server. Is the backend running?');
    }
    setLoading(false);
  };

  if (isAuthenticated) return children;

  return (
    <div className="card login-container">
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔐</div>
      <h2>Host Access Required</h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
        Enter your host password to manage the dashboard.
      </p>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <input
            type="password"
            className="form-input"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

// Host Dashboard Component
function HostDashboard({ rates, storeDetails, ornaments, onUpdateRates, onUpdateStoreDetails, onAddOrnament, onRemoveOrnament, orders, onLogout }) {
  // Rates state
  const [goldRate, setGoldRate] = useState(rates.gold);
  const [silverRate, setSilverRate] = useState(rates.silver);
  const [oldSilverRate, setOldSilverRate] = useState(rates.oldSilver);

  // Store Details state
  const [ownerName, setOwnerName] = useState(storeDetails?.ownerName || '');
  const [contactNo, setContactNo] = useState(storeDetails?.contactNo || '');
  const [address, setAddress] = useState(storeDetails?.address || '');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Ornament state
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgType, setNewOrgType] = useState('gold');
  const [newOrgWeight, setNewOrgWeight] = useState('');
  const [newOrgImageFile, setNewOrgImageFile] = useState(null);
  const [newOrgImagePreview, setNewOrgImagePreview] = useState('');
  const [newOrgMaking, setNewOrgMaking] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  
  // Success states
  const [rateSuccess, setRateSuccess] = useState(false);
  const [storeSuccess, setStoreSuccess] = useState(false);
  const [productSuccess, setProductSuccess] = useState(false);

  const handleUpdateRates = (e) => {
    e.preventDefault();
    onUpdateRates({
      gold: Number(goldRate),
      silver: Number(silverRate),
      oldSilver: Number(oldSilverRate)
    });
    setRateSuccess(true);
    setTimeout(() => setRateSuccess(false), 3000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      setPasswordSuccess('');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      setPasswordSuccess('');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!data.success) {
        setPasswordError(data.message || 'Failed to update password.');
        setPasswordSuccess('');
        return;
      }

      setPasswordSuccess('Password updated successfully.');
      setPasswordError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setPasswordError('Could not update password. Please try again.');
      setPasswordSuccess('');
    }
  };

  const handleUpdateStore = (e) => {
    e.preventDefault();
    onUpdateStoreDetails({
      ownerName,
      contactNo,
      address
    });
    setStoreSuccess(true);
    setTimeout(() => setStoreSuccess(false), 3000);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewOrgImageFile(file);
    setNewOrgImagePreview(URL.createObjectURL(file));
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setUploading(true);

    let imageUrl = 'https://images.unsplash.com/photo-1599643478514-4a884f18eb8c?q=80&w=600&auto=format&fit=crop';

    if (newOrgImageFile) {
      const formData = new FormData();
      formData.append('photo', newOrgImageFile);
      try {
        const res = await fetch('http://localhost:3000/api/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        imageUrl = data.imageUrl;
      } catch (err) {
        console.error('Image upload failed', err);
      }
    }

    const newProduct = {
      name: newOrgName,
      type: newOrgType,
      weightGrams: Number(newOrgWeight),
      makingCharges: Number(newOrgMaking) || 10,
      imageUrl,
    };

    onAddOrnament(newProduct);

    setNewOrgName('');
    setNewOrgWeight('');
    setNewOrgMaking('');
    setNewOrgImageFile(null);
    setNewOrgImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploading(false);
    setProductSuccess(true);
    setTimeout(() => setProductSuccess(false), 3000);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--primary-color)', margin: 0 }}>Dashboard Overview</h2>
        <button onClick={onLogout} className="btn btn-secondary" style={{ width: 'auto', marginTop: 0, padding: '0.5rem 1rem' }}>
          Logout
        </button>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Change Host Password</h2>
        {passwordError && <div className="error-message">{passwordError}</div>}
        {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn">Update Password</button>
        </form>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h2>Update Daily Rates</h2>
          {rateSuccess && <div className="success-message">Rates saved to database!</div>}
          <form onSubmit={handleUpdateRates}>
            <div className="form-group">
              <label>Gold Rate (per gram) - ₹</label>
              <input 
                type="number" 
                className="form-input" 
                value={goldRate}
                onChange={(e) => setGoldRate(e.target.value)}
                required 
              />
            </div>
            <div className="form-group">
              <label>Silver Rate (per gram) - ₹</label>
              <input 
                type="number" 
                className="form-input" 
                value={silverRate}
                onChange={(e) => setSilverRate(e.target.value)}
                required 
              />
            </div>
            <div className="form-group">
              <label>Old Silver Rate (per gram) - ₹</label>
              <input 
                type="number" 
                className="form-input" 
                value={oldSilverRate}
                onChange={(e) => setOldSilverRate(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="btn">Save Rates</button>
          </form>
        </div>

        <div className="card">
          <h2>Update Store Info</h2>
          {storeSuccess && <div className="success-message">Store info saved to database!</div>}
          <form onSubmit={handleUpdateStore}>
            <div className="form-group">
              <label>Owner Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. John Doe"
                required 
              />
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input 
                type="text" 
                className="form-input" 
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                placeholder="e.g. +91 9876543210"
                required 
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input 
                type="text" 
                className="form-input" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 123 Main Street, City"
                required 
              />
            </div>
            <button type="submit" className="btn">Save Store Info</button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Add New Ornament</h2>
        {productSuccess && <div className="success-message">Product saved to database!</div>}
        <form onSubmit={handleAddProduct}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Model Name</label>
              <input 
                type="text" 
                className="form-input" 
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Diamond Studded Gold Ring"
                required 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Material</label>
              <select 
                className="form-input" 
                value={newOrgType}
                onChange={(e) => setNewOrgType(e.target.value)}
              >
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Weight (grams)</label>
              <input 
                type="number" 
                step="0.01"
                className="form-input" 
                value={newOrgWeight}
                onChange={(e) => setNewOrgWeight(e.target.value)}
                required 
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Making Charges (%)</label>
              <input 
                type="number" 
                className="form-input" 
                value={newOrgMaking}
                onChange={(e) => setNewOrgMaking(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Ornament Photo</label>
            <div
              className="photo-upload-area"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              {newOrgImagePreview ? (
                <img src={newOrgImagePreview} alt="Preview" className="photo-preview" />
              ) : (
                <div className="photo-placeholder">
                  <span className="photo-upload-icon">📷</span>
                  <span>Click to choose photo from gallery</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>JPG, PNG, WEBP up to 10MB</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </div>
            {newOrgImagePreview && (
              <button
                type="button"
                onClick={() => { setNewOrgImageFile(null); setNewOrgImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                ✕ Remove photo
              </button>
            )}
          </div>
          <button type="submit" className="btn" style={{ maxWidth: '300px' }} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Ornament'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Manage Collection</h2>
          <span style={{ color: 'var(--text-muted)' }}>{ornaments.length} items</span>
        </div>

        {ornaments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No ornaments have been added to the collection yet.</p>
        ) : (
          <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {ornaments.map(product => (
              <div key={product.id} className="product-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <img src={product.imageUrl} alt={product.name} className="product-image" />
                <div className="product-info">
                  <h3 className="product-title">{product.name}</h3>
                  <div className="product-details">
                    <span>Material: <strong style={{ textTransform: 'capitalize' }}>{product.type}</strong></span>
                    <span>Weight: <strong>{product.weightGrams}g</strong></span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => onRemoveOrnament(product.id)}
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    Remove from Collection
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Customer Orders</h2>
        {orders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No orders have been placed yet.</p>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>Item</th>
                  <th>Weight</th>
                  <th>Payment</th>
                  <th>Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>{new Date(order.id).toLocaleDateString()} {new Date(order.id).toLocaleTimeString()}</td>
                    <td>{order.customerName}</td>
                    <td>{order.phone}</td>
                    <td>{order.itemName}</td>
                    <td>{order.weightGrams}g</td>
                    <td>{order.paymentMethod === 'upi' ? 'UPI' : 'Cash'}</td>
                    <td style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Customer View Component
function CustomerView({ rates, ornaments, onAddOrder }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const calculatePrice = (product) => {
    const baseRate = product.type === 'gold' ? rates.gold : rates.silver;
    const materialCost = baseRate * product.weightGrams;
    const makingCost = (materialCost * (product.makingCharges || 0)) / 100;
    return Math.round(materialCost + makingCost);
  };

  const handleOrder = (e) => {
    e.preventDefault();
    
    // Save order details to backend
    onAddOrder({
      customerName,
      phone: customerPhone,
      itemName: selectedProduct.name,
      weightGrams: selectedProduct.weightGrams,
      paymentMethod,
      totalAmount: selectedProduct.finalPrice
    });

    setOrderSuccess(true);
    setTimeout(() => {
      setOrderSuccess(false);
      setSelectedProduct(null);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('upi');
    }, 3000);
  };

  const openOrderModal = (product) => {
    setSelectedProduct({ ...product, finalPrice: calculatePrice(product) });
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <div>
      <div className="rates-banner">
        <div className="rate-item">
          <div className="rate-label">Today's Gold Rate (22K)</div>
          <div className="rate-value">₹{rates.gold.toLocaleString('en-IN')}/g</div>
        </div>
        <div className="rate-item">
          <div className="rate-label">Today's Silver Rate</div>
          <div className="rate-value">₹{rates.silver.toLocaleString('en-IN')}/g</div>
        </div>
        <div className="rate-item">
          <div className="rate-label">Old Silver Exchange</div>
          <div className="rate-value" style={{ color: 'var(--text-light)' }}>₹{rates.oldSilver.toLocaleString('en-IN')}/g</div>
        </div>
      </div>

      <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Our Collection</h2>

      <div className="products-grid">
        {ornaments.map(product => {
          const finalPrice = calculatePrice(product);
          return (
            <div key={product.id} className="product-card">
              <img src={product.imageUrl} alt={product.name} className="product-image" />
              <div className="product-info">
                <h3 className="product-title">{product.name}</h3>
                <div className="product-details">
                  <span>Material: <strong style={{ textTransform: 'capitalize' }}>{product.type}</strong></span>
                  <span>Weight: <strong>{product.weightGrams}g</strong></span>
                </div>
                <div className="product-price">₹{finalPrice.toLocaleString('en-IN')}</div>
                <button 
                  className="btn" 
                  onClick={() => openOrderModal(product)}
                >
                  Order Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedProduct && (
        <div className="modal-overlay" onClick={() => !orderSuccess && setSelectedProduct(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            {orderSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ color: '#4CAF50' }}>Order Placed Successfully!</h3>
                <p style={{ color: 'var(--text-muted)' }}>We have received your order details.</p>
              </div>
            ) : (
              <>
                <h3>Complete Your Order</h3>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p><strong>Item:</strong> {selectedProduct.name}</p>
                  <p><strong>Weight:</strong> {selectedProduct.weightGrams}g</p>
                  <p style={{ fontSize: '1.25rem', marginTop: '1rem', color: 'var(--primary-color)' }}>
                    <strong>Total Amount: ₹{selectedProduct.finalPrice.toLocaleString('en-IN')}</strong>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    *Price dynamically calculated based on today's {selectedProduct.type} rate (₹{selectedProduct.type === 'gold' ? rates.gold : rates.silver}/g) + {selectedProduct.makingCharges}% making charges.
                  </p>
                </div>
                <form onSubmit={handleOrder}>
                  <div className="form-group">
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Full Name" 
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="Phone Number" 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Payment Method</label>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-light)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          value="upi" 
                          checked={paymentMethod === 'upi'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        /> UPI
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          value="cash" 
                          checked={paymentMethod === 'cash'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                        /> Cash
                      </label>
                    </div>
                  </div>
                  <button type="submit" className="btn">Confirm Order</button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setSelectedProduct(null)}
                  >
                    Cancel
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
